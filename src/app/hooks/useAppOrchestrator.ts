import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from 'react';
import confetti from 'canvas-confetti';
import {
  generatePersonalizedQuests,
  generateTechTree,
  getAIInsight,
  isGeminiConfigured,
  type QuestGenerationContext,
  type TechTreeResponse,
} from '../../lib/gemini';
import { flushSyncOutbox } from '../../lib/supabase';
import {
  calculateEnergyCheckXP,
  calculatePerfectDayXP,
  calculateQuestXP,
  calculateRecoveryXP,
  getLevelFromXP,
  loadStats,
  saveStats,
  type UserStats,
} from '../../lib/gamification';
import {
  STORAGE_KEYS,
  getItemJSON,
  getItemString,
  migrateStorageIfNeeded,
  setItemJSON,
  setItemString,
} from '../../lib/app-storage';
import {
  advanceTechTree,
  createDefaultProfile,
  createDeterministicFallbackQuests,
  extractVoiceEnergyHint,
  getRecentFailurePatternLabel,
  parseMinutes,
  rerouteTechTreeForRecovery,
} from '../../lib/app-domain';
import { trackError, trackEvent, trackTiming } from '../../lib/telemetry';
import {
  getTodayString,
  persistCustomizationFlag,
  persistProfile,
  persistQuestHistory,
  persistQuests,
  persistTechTree,
} from '../actions/orchestration';
import type {
  FailureLogEntry,
  Quest,
  Screen,
  UserProfile,
  VoiceCheckInEntry,
} from '../../types/app';
import type { FailureResolutionMeta } from '../../components/mobile/FailureSheet';

interface LevelUpState {
  level: number;
  xp: number;
}

interface UseAppOrchestratorResult {
  currentScreen: Screen;
  setCurrentScreen: Dispatch<SetStateAction<Screen>>;
  userProfile: UserProfile | null;
  todayQuests: Quest[];
  isCustomized: boolean;
  isLoading: boolean;
  isGeneratingQuests: boolean;
  techTree: TechTreeResponse | null;
  aiMessage: string | null;
  failureQuest: Quest | null;
  isFailureSheetOpen: boolean;
  stats: UserStats;
  levelUpInfo: LevelUpState | null;
  isEnergyOpen: boolean;
  isShareOpen: boolean;
  energy: number | undefined;
  isFutureSelfOpen: boolean;
  futureSelfPrompt: string;
  isVoiceCheckInOpen: boolean;
  latestVoiceCheckIn: VoiceCheckInEntry | null;
  completedCount: number;
  totalCount: number;
  completionRate: number;
  setIsFailureSheetOpen: Dispatch<SetStateAction<boolean>>;
  setIsEnergyOpen: Dispatch<SetStateAction<boolean>>;
  setIsShareOpen: Dispatch<SetStateAction<boolean>>;
  setIsFutureSelfOpen: Dispatch<SetStateAction<boolean>>;
  setIsVoiceCheckInOpen: Dispatch<SetStateAction<boolean>>;
  setLevelUpInfo: Dispatch<SetStateAction<LevelUpState | null>>;
  handleEnergySubmit: (energyLevel: number, mood: string) => void;
  handleOnboardingComplete: (profile: UserProfile) => Promise<void>;
  handleRegenerateQuests: () => Promise<void>;
  handleQuestToggle: (questId: string) => void;
  handleQuestFail: (questId: string) => void;
  handleAcceptRecovery: (recoveryQuest: Quest, meta: FailureResolutionMeta) => void;
  handleTechTreeUpdate: (tree: TechTreeResponse) => void;
  handleStartCustomization: () => void;
  handleFutureSelfSave: (prompt: string) => void;
  handleVoiceCheckInSave: (entry: VoiceCheckInEntry) => Promise<void>;
}

export function useAppOrchestrator(): UseAppOrchestratorResult {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayQuests, setTodayQuests] = useState<Quest[]>([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
  const [techTree, setTechTree] = useState<TechTreeResponse | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  const [failureQuest, setFailureQuest] = useState<Quest | null>(null);
  const [isFailureSheetOpen, setIsFailureSheetOpen] = useState(false);

  const [stats, setStats] = useState<UserStats>(loadStats());

  const [levelUpInfo, setLevelUpInfo] = useState<LevelUpState | null>(null);
  const [isEnergyOpen, setIsEnergyOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [isFutureSelfOpen, setIsFutureSelfOpen] = useState(false);
  const [futureSelfPrompt, setFutureSelfPrompt] = useState('');
  const [isVoiceCheckInOpen, setIsVoiceCheckInOpen] = useState(false);
  const [latestVoiceCheckIn, setLatestVoiceCheckIn] = useState<VoiceCheckInEntry | null>(null);

  const completedCount = todayQuests.filter((quest) => quest.completed).length;
  const totalCount = todayQuests.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const bootstrapGuardRef = useRef(false);
  const aiMessageTimerRef = useRef<number | null>(null);

  const clearAiMessageTimer = useCallback(() => {
    if (aiMessageTimerRef.current !== null) {
      window.clearTimeout(aiMessageTimerRef.current);
      aiMessageTimerRef.current = null;
    }
  }, []);

  const showTransientMessage = useCallback(
    (message: string, durationMs = 3000) => {
      clearAiMessageTimer();
      setAiMessage(message);

      if (durationMs <= 0) return;

      aiMessageTimerRef.current = window.setTimeout(() => {
        setAiMessage(null);
        aiMessageTimerRef.current = null;
      }, durationMs);
    },
    [clearAiMessageTimer],
  );

  const adaptQuestsForContext = useCallback(
    (inputQuests: Quest[], voiceTextOverride?: string): Quest[] => {
      if (!inputQuests.length) return inputQuests;

      const explicitEnergy = energy;
      const voiceSource = voiceTextOverride ?? latestVoiceCheckIn?.text;
      const voiceHint = voiceSource ? extractVoiceEnergyHint(voiceSource) : undefined;
      const effectiveEnergy = explicitEnergy ?? voiceHint;
      const isLowEnergyMode = typeof effectiveEnergy === 'number' && effectiveEnergy <= 2;

      if (!isLowEnergyMode) return inputQuests;

      let softened = false;
      return inputQuests.map((quest, index) => {
        const minutes = parseMinutes(quest.duration);
        const shouldSoften =
          !softened && !quest.completed && (index === 0 || (minutes !== null && minutes > 15));

        if (!shouldSoften) return quest;

        softened = true;
        const shortened = minutes ? Math.max(5, Math.min(10, Math.floor(minutes / 2))) : 10;

        return {
          ...quest,
          duration: `${shortened}분`,
          alternative: quest.alternative || `${shortened}분 버전으로 아주 작게 시작하기`,
          description: `${quest.description ? `${quest.description} · ` : ''}저에너지 모드로 난이도를 자동 조정했어요.`,
        };
      });
    },
    [energy, latestVoiceCheckIn],
  );

  const persistTodayQuests = useCallback((quests: Quest[]) => {
    setTodayQuests(quests);
    persistQuests(quests);
  }, []);

  const getQuestGenerationContext = useCallback(
    (voiceTextOverride?: string): QuestGenerationContext => {
      const failureLog = getItemJSON<FailureLogEntry[]>(STORAGE_KEYS.failureLog) ?? [];

      return {
        energy,
        voiceCheckIn: voiceTextOverride ?? latestVoiceCheckIn?.text,
        recentFailurePattern: getRecentFailurePatternLabel(failureLog),
      };
    },
    [energy, latestVoiceCheckIn],
  );

  const setDefaultQuests = useCallback(
    (profile?: UserProfile) => {
      if (!profile) {
        persistTodayQuests(createDeterministicFallbackQuests(createDefaultProfile()));
        return;
      }

      const quests = createDeterministicFallbackQuests(profile, {
        energy,
        voiceHint: latestVoiceCheckIn?.text,
      });
      persistTodayQuests(adaptQuestsForContext(quests));
    },
    [adaptQuestsForContext, energy, latestVoiceCheckIn?.text, persistTodayQuests],
  );

  const loadAIInsight = useCallback(async (profile: UserProfile) => {
    try {
      const savedQuests = getItemJSON<Quest[]>(STORAGE_KEYS.quests) ?? [];
      const rate =
        savedQuests.length > 0
          ? (savedQuests.filter((quest) => quest.completed).length / savedQuests.length) * 100
          : 0;
      const insight = await getAIInsight(profile, rate);
      if (insight) setAiMessage(insight);
    } catch (error) {
      trackError(error, { phase: 'loadAIInsight' });
    }
  }, []);

  const refreshDailyQuests = useCallback(
    async (profile: UserProfile) => {
      if (!isGeminiConfigured()) return;

      setIsGeneratingQuests(true);
      const startedAt = performance.now();

      try {
        const aiQuests = await generatePersonalizedQuests(
          profile,
          techTree,
          getQuestGenerationContext(),
        );

        if (aiQuests && aiQuests.length > 0) {
          persistTodayQuests(adaptQuestsForContext(aiQuests));
        } else {
          setDefaultQuests(profile);
        }

        trackTiming('ai.generate.daily_quests', performance.now() - startedAt, {
          hasResult: !!aiQuests?.length,
        });
      } catch (error) {
        trackError(error, {
          phase: 'refreshDailyQuests',
        });
        setDefaultQuests(profile);
      } finally {
        setIsGeneratingQuests(false);
      }
    },
    [adaptQuestsForContext, getQuestGenerationContext, persistTodayQuests, setDefaultQuests, techTree],
  );

  const refreshNextQuestFromVoiceContext = useCallback(
    async (
      profile: UserProfile,
      currentQuests: Quest[],
      voiceText: string,
    ): Promise<boolean> => {
      if (!isGeminiConfigured()) return false;

      const targetIndex = currentQuests.findIndex((quest) => !quest.completed);
      if (targetIndex < 0) return false;

      const aiQuests = await generatePersonalizedQuests(
        profile,
        techTree,
        getQuestGenerationContext(voiceText),
      );
      if (!aiQuests?.length) return false;

      const replacementSource = aiQuests[0];
      const updatedQuests = [...currentQuests];
      const targetQuest = updatedQuests[targetIndex];

      updatedQuests[targetIndex] = {
        ...replacementSource,
        id: targetQuest.id,
        completed: false,
      };

      persistTodayQuests(adaptQuestsForContext(updatedQuests, voiceText));
      return true;
    },
    [adaptQuestsForContext, getQuestGenerationContext, persistTodayQuests, techTree],
  );

  const addXP = useCallback(
    (amount: number, currentStats: UserStats): UserStats => {
      const newXP = currentStats.xp + amount;
      const oldLevel = currentStats.level;
      const newLevel = getLevelFromXP(newXP);
      const updatedStats = {
        ...currentStats,
        xp: newXP,
        level: newLevel,
      };

      if (newLevel > oldLevel) {
        setLevelUpInfo({
          level: newLevel,
          xp: amount,
        });
      }

      saveStats(updatedStats);
      setStats(updatedStats);

      return updatedStats;
    },
    [],
  );

  const handleEnergySubmit = useCallback(
    (energyLevel: number, mood: string) => {
      void mood;

      setEnergy(energyLevel);
      setItemString(STORAGE_KEYS.energyToday, String(energyLevel));
      setItemString(STORAGE_KEYS.energyDate, getTodayString());

      addXP(calculateEnergyCheckXP(), {
        ...stats,
        totalDaysActive: stats.totalDaysActive + 1,
      });
    },
    [addXP, stats],
  );

  const handleOnboardingComplete = useCallback(
    async (profile: UserProfile) => {
      const newProfile: UserProfile = {
        ...profile,
        joinedDate: getTodayString(),
      };

      setUserProfile(newProfile);
      setIsCustomized(true);
      setCurrentScreen('home');
      persistProfile(newProfile);
      persistCustomizationFlag(true);

      if (!isGeminiConfigured()) {
        setDefaultQuests(newProfile);
        return;
      }

      setIsGeneratingQuests(true);
      setAiMessage('AI가 맞춤 퀘스트를 생성하고 있어요...');

      try {
        const startedAt = performance.now();
        const [aiQuests, aiTree, insight] = await Promise.all([
          generatePersonalizedQuests(newProfile, undefined, getQuestGenerationContext()),
          generateTechTree(newProfile),
          getAIInsight(newProfile, 0),
        ]);

        if (aiQuests?.length) {
          persistTodayQuests(adaptQuestsForContext(aiQuests));
        } else {
          setDefaultQuests(newProfile);
        }

        if (aiTree) {
          setTechTree(aiTree);
          persistTechTree(aiTree);
        }

        trackTiming('app.onboarding_complete', performance.now() - startedAt);
        showTransientMessage(insight || 'AI가 맞춤 퀘스트를 생성했어요! 🎯', 5000);
      } catch (error) {
        trackError(error, {
          phase: 'handleOnboardingComplete',
        });
        setDefaultQuests(newProfile);
      } finally {
        setIsGeneratingQuests(false);
      }
    },
    [
      adaptQuestsForContext,
      getQuestGenerationContext,
      persistTodayQuests,
      setDefaultQuests,
      showTransientMessage,
    ],
  );

  const handleRegenerateQuests = useCallback(async () => {
    if (!userProfile || !isGeminiConfigured()) return;

    setIsGeneratingQuests(true);
    setAiMessage('새로운 퀘스트를 생성하고 있어요...');

    try {
      const aiQuests = await generatePersonalizedQuests(
        userProfile,
        techTree,
        getQuestGenerationContext(),
      );

      if (aiQuests?.length) {
        persistTodayQuests(adaptQuestsForContext(aiQuests));
        showTransientMessage('새로운 퀘스트가 준비되었어요! ✨');
      } else {
        setDefaultQuests(userProfile);
      }
    } catch (error) {
      trackError(error, {
        phase: 'handleRegenerateQuests',
      });
      showTransientMessage('퀘스트 생성에 실패했어요. 기본 플랜으로 전환합니다.');
      setDefaultQuests(userProfile);
    } finally {
      setIsGeneratingQuests(false);
    }
  }, [
    adaptQuestsForContext,
    getQuestGenerationContext,
    persistTodayQuests,
    setDefaultQuests,
    showTransientMessage,
    techTree,
    userProfile,
  ]);

  const handleQuestToggle = useCallback(
    (questId: string) => {
      if (!userProfile) return;

      const previousQuests = todayQuests;
      const updatedQuests = previousQuests.map((quest) =>
        quest.id === questId ? { ...quest, completed: !quest.completed } : quest,
      );

      persistTodayQuests(updatedQuests);
      persistQuestHistory(updatedQuests);
      trackEvent('quest.toggled', {
        questId,
      });

      const wasCompleting = !previousQuests.find((quest) => quest.id === questId)?.completed;
      if (!wasCompleting) {
        return;
      }

      const baseStats = addXP(calculateQuestXP(stats.currentStreak), {
        ...stats,
        totalQuestsCompleted: stats.totalQuestsCompleted + 1,
      });

      const allCompleted = updatedQuests.every((quest) => quest.completed);
      const wasAllCompleted = previousQuests.every((quest) => quest.completed);

      if (allCompleted && !wasAllCompleted) {
        addXP(calculatePerfectDayXP(), {
          ...baseStats,
          perfectDays: baseStats.perfectDays + 1,
          currentStreak: baseStats.currentStreak + 1,
          longestStreak: Math.max(baseStats.longestStreak, baseStats.currentStreak + 1),
        });

        confetti({
          particleCount: 100,
          spread: 80,
          origin: { y: 0.7 },
          colors: ['#7C3AED', '#10B981', '#F59E0B'],
        });
        window.setTimeout(() => {
          confetti({
            particleCount: 50,
            spread: 60,
            origin: { y: 0.5 },
          });
        }, 300);

        const updatedProfile: UserProfile = {
          ...userProfile,
          currentDay: userProfile.currentDay + 1,
          streak: userProfile.streak + 1,
          weeklyCompletion: Math.min(100, userProfile.weeklyCompletion + 14),
        };

        setUserProfile(updatedProfile);
        persistProfile(updatedProfile);
        trackEvent('quest.completed_all', {
          currentDay: updatedProfile.currentDay,
          streak: updatedProfile.streak,
        });

        if (techTree) {
          const advancedTree = advanceTechTree(techTree);
          setTechTree(advancedTree);
          persistTechTree(advancedTree);
        }

        if (isGeminiConfigured()) {
          void loadAIInsight(updatedProfile);
        }
      }
    },
    [
      addXP,
      loadAIInsight,
      persistTodayQuests,
      stats,
      techTree,
      todayQuests,
      userProfile,
    ],
  );

  const handleQuestFail = useCallback(
    (questId: string) => {
      const quest = todayQuests.find((item) => item.id === questId);
      if (!quest) return;

      setFailureQuest(quest);
      setIsFailureSheetOpen(true);
      trackEvent('quest.failed', {
        questId,
      });
    },
    [todayQuests],
  );

  const handleAcceptRecovery = useCallback(
    (recoveryQuest: Quest, meta: FailureResolutionMeta) => {
      addXP(calculateRecoveryXP(), {
        ...stats,
        failureRecoveries: stats.failureRecoveries + 1,
      });

      if (failureQuest) {
        const logEntry: FailureLogEntry = {
          timestamp: new Date().toISOString(),
          questId: failureQuest.id,
          questTitle: failureQuest.title,
          reasonCode: meta.reasonCode,
          reasonText: meta.reasonText,
          rootCause: meta.rootCause,
          energy,
        };

        const previousLog = getItemJSON<FailureLogEntry[]>(STORAGE_KEYS.failureLog) ?? [];
        setItemJSON(STORAGE_KEYS.failureLog, [logEntry, ...previousLog].slice(0, 100));

        const updatedQuests = todayQuests.map((quest) =>
          quest.id === failureQuest.id ? { ...recoveryQuest, id: quest.id } : quest,
        );
        persistTodayQuests(updatedQuests);
        persistQuestHistory(updatedQuests);
      }

      if (techTree) {
        const reroutedTree = rerouteTechTreeForRecovery(techTree, meta.rootCause);
        if (JSON.stringify(reroutedTree) !== JSON.stringify(techTree)) {
          setTechTree(reroutedTree);
          persistTechTree(reroutedTree);
          showTransientMessage('복구 경로를 반영해 테크트리를 조정했어요 🔄', 2500);
        }
      }

      setFailureQuest(null);
      trackEvent('quest.recovery_accepted', {
        rootCause: meta.rootCause,
      });
    },
    [
      addXP,
      energy,
      failureQuest,
      persistTodayQuests,
      showTransientMessage,
      stats,
      techTree,
      todayQuests,
    ],
  );

  const handleTechTreeUpdate = useCallback((tree: TechTreeResponse) => {
    setTechTree(tree);
    persistTechTree(tree);
  }, []);

  const handleStartCustomization = useCallback(() => {
    setCurrentScreen('onboarding');
  }, []);

  const handleFutureSelfSave = useCallback(
    (prompt: string) => {
      setFutureSelfPrompt(prompt);
      setItemString(STORAGE_KEYS.futureSelfPrompt, prompt);
      showTransientMessage('미래 자아 비전 카드가 저장됐어요 ✨', 2500);
    },
    [showTransientMessage],
  );

  const handleVoiceCheckInSave = useCallback(
    async (entry: VoiceCheckInEntry) => {
      setLatestVoiceCheckIn(entry);
      setItemJSON(STORAGE_KEYS.voiceCheckIn, entry);

      const adjustedQuests = adaptQuestsForContext(todayQuests, entry.text);
      persistTodayQuests(adjustedQuests);
      persistQuestHistory(adjustedQuests);

      if (userProfile && isGeminiConfigured()) {
        setAiMessage('체크인을 반영해 다음 퀘스트를 조정하고 있어요...');
        try {
          const replaced = await refreshNextQuestFromVoiceContext(
            userProfile,
            adjustedQuests,
            entry.text,
          );
          showTransientMessage(
            replaced
              ? '음성 맥락을 반영해 다음 퀘스트를 업데이트했어요 🎯'
              : '음성 체크인이 저장됐어요 🎙️',
          );
        } catch (error) {
          trackError(error, {
            phase: 'handleVoiceCheckInSave',
          });
          showTransientMessage('음성 체크인이 저장됐어요 🎙️');
        }
      } else {
        showTransientMessage('음성 체크인이 저장됐어요 🎙️', 2500);
      }
    },
    [
      adaptQuestsForContext,
      persistTodayQuests,
      refreshNextQuestFromVoiceContext,
      showTransientMessage,
      todayQuests,
      userProfile,
    ],
  );

  useEffect(() => {
    return () => {
      clearAiMessageTimer();
    };
  }, [clearAiMessageTimer]);

  useEffect(() => {
    const onOnline = () => {
      void flushSyncOutbox();
    };

    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('online', onOnline);
    };
  }, []);

  useEffect(() => {
    if (bootstrapGuardRef.current) return;
    bootstrapGuardRef.current = true;

    let energyTimer: number | null = null;

    const bootstrap = async () => {
      const bootstrapStartedAt = performance.now();

      try {
        migrateStorageIfNeeded();
        await flushSyncOutbox();

        const persistedProfile = getItemJSON<UserProfile>(STORAGE_KEYS.profile);
        const persistedQuests = getItemJSON<Quest[]>(STORAGE_KEYS.quests);
        const persistedTree = getItemJSON<TechTreeResponse>(STORAGE_KEYS.techTree);
        const persistedVoiceCheckIn = getItemJSON<VoiceCheckInEntry>(STORAGE_KEYS.voiceCheckIn);
        const persistedEnergy = getItemString(STORAGE_KEYS.energyToday);
        const persistedFuturePrompt = getItemString(STORAGE_KEYS.futureSelfPrompt);
        const persistedQuestDate = getItemString(STORAGE_KEYS.questDate);
        const persistedEnergyDate = getItemString(STORAGE_KEYS.energyDate);
        const customizedFlag = getItemString(STORAGE_KEYS.customized);

        const profile = persistedProfile ?? createDefaultProfile();

        setUserProfile(profile);
        setIsCustomized(customizedFlag === 'true');

        if (persistedTree) {
          setTechTree(persistedTree);
        }

        if (persistedFuturePrompt) {
          setFutureSelfPrompt(persistedFuturePrompt);
        }

        if (persistedVoiceCheckIn) {
          setLatestVoiceCheckIn(persistedVoiceCheckIn);
        }

        if (persistedEnergyDate === getTodayString() && persistedEnergy) {
          const parsedEnergy = Number.parseInt(persistedEnergy, 10);
          if (!Number.isNaN(parsedEnergy)) {
            setEnergy(parsedEnergy);
          }
        }

        if (persistedProfile && persistedQuestDate !== getTodayString() && isGeminiConfigured()) {
          await refreshDailyQuests(profile);
        } else if (persistedQuests) {
          setTodayQuests(persistedQuests);
        } else {
          setDefaultQuests(profile);
        }

        if (persistedProfile && persistedEnergyDate !== getTodayString()) {
          energyTimer = window.setTimeout(() => setIsEnergyOpen(true), 1000);
        }

        if (persistedProfile && isGeminiConfigured()) {
          void loadAIInsight(profile);
        }

        trackEvent('app.bootstrap', {
          customized: customizedFlag === 'true',
          hasProfile: !!persistedProfile,
        });
      } catch (error) {
        trackError(error, {
          phase: 'bootstrap',
        });
      } finally {
        setIsLoading(false);
        trackTiming('app.bootstrap.duration', performance.now() - bootstrapStartedAt);
      }
    };

    void bootstrap();

    return () => {
      if (energyTimer !== null) {
        window.clearTimeout(energyTimer);
      }
    };
  }, [loadAIInsight, refreshDailyQuests, setDefaultQuests]);

  return {
    currentScreen,
    setCurrentScreen,
    userProfile,
    todayQuests,
    isCustomized,
    isLoading,
    isGeneratingQuests,
    techTree,
    aiMessage,
    failureQuest,
    isFailureSheetOpen,
    stats,
    levelUpInfo,
    isEnergyOpen,
    isShareOpen,
    energy,
    isFutureSelfOpen,
    futureSelfPrompt,
    isVoiceCheckInOpen,
    latestVoiceCheckIn,
    completedCount,
    totalCount,
    completionRate,
    setIsFailureSheetOpen,
    setIsEnergyOpen,
    setIsShareOpen,
    setIsFutureSelfOpen,
    setIsVoiceCheckInOpen,
    setLevelUpInfo,
    handleEnergySubmit,
    handleOnboardingComplete,
    handleRegenerateQuests,
    handleQuestToggle,
    handleQuestFail,
    handleAcceptRecovery,
    handleTechTreeUpdate,
    handleStartCustomization,
    handleFutureSelfSave,
    handleVoiceCheckInSave,
  };
}
