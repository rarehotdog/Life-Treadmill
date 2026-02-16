import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import confetti from 'canvas-confetti';
import OnboardingFlow from './components/OnboardingFlow';
import HomeScreen from './components/mobile/HomeScreen';
import TechTreeScreen from './components/mobile/TechTreeScreen';
import ProgressScreen from './components/mobile/ProgressScreen';
import ProfileScreen from './components/mobile/ProfileScreen';
import BottomNavigation from './components/mobile/BottomNavigation';
import FailureSheet, { type FailureResolutionMeta } from './components/mobile/FailureSheet';
import EnergyCheckIn from './components/mobile/EnergyCheckIn';
import ShareCard from './components/mobile/ShareCard';
import FutureSelfVisualizer from './components/mobile/FutureSelfVisualizer';
import VoiceCheckIn from './components/mobile/VoiceCheckIn';
import LevelUpModal from './components/gamification/LevelUpModal';
import {
  generatePersonalizedQuests,
  generateTechTree,
  getAIInsight,
  isGeminiConfigured,
  type QuestGenerationContext,
  type TechTreeResponse,
} from './lib/gemini';
import {
  saveProfile,
  saveQuests,
  saveQuestHistory,
  saveTechTree,
  isSupabaseConfigured,
} from './lib/supabase';
import {
  calculateEnergyCheckXP,
  calculatePerfectDayXP,
  calculateQuestXP,
  calculateRecoveryXP,
  getLevelFromXP,
  loadStats,
  saveStats,
  type UserStats,
} from './lib/gamification';
import {
  STORAGE_KEYS,
  getItemJSON,
  getItemString,
  setItemJSON,
  setItemString,
} from './lib/app-storage';
import {
  advanceTechTree,
  createDefaultProfile,
  createDefaultQuests,
  extractVoiceEnergyHint,
  getRecentFailurePatternLabel,
  parseMinutes,
  rerouteTechTreeForRecovery,
} from './lib/app-domain';
import type {
  FailureLogEntry,
  Quest,
  Screen,
  UserProfile,
  VoiceCheckInEntry,
} from './types/app';

export type { Quest, UserProfile } from './types/app';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export default function App() {
  // ── state ───────────────────────────────────────────────────────────────
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

  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; xp: number } | null>(null);
  const [isEnergyOpen, setIsEnergyOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [isFutureSelfOpen, setIsFutureSelfOpen] = useState(false);
  const [futureSelfPrompt, setFutureSelfPrompt] = useState('');
  const [isVoiceCheckInOpen, setIsVoiceCheckInOpen] = useState(false);
  const [latestVoiceCheckIn, setLatestVoiceCheckIn] = useState<VoiceCheckInEntry | null>(null);

  // ── derived ─────────────────────────────────────────────────────────────
  const completedCount = todayQuests.filter((quest) => quest.completed).length;
  const totalCount = todayQuests.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const bootstrapGuardRef = useRef(false);
  const aiMessageTimerRef = useRef<number | null>(null);

  // ── helper callbacks ────────────────────────────────────────────────────
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
        const shouldSoften = !softened && !quest.completed && (index === 0 || (minutes !== null && minutes > 15));

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
    setItemJSON(STORAGE_KEYS.quests, quests);
    setItemString(STORAGE_KEYS.questDate, getTodayString());

    if (isSupabaseConfigured()) {
      void saveQuests(quests);
    }
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

  const setDefaultQuests = useCallback(() => {
    const quests = createDefaultQuests();
    persistTodayQuests(adaptQuestsForContext(quests));
  }, [adaptQuestsForContext, persistTodayQuests]);

  const loadAIInsight = useCallback(async (profile: UserProfile) => {
    try {
      const savedQuests = getItemJSON<Quest[]>(STORAGE_KEYS.quests) ?? [];
      const rate =
        savedQuests.length > 0
          ? (savedQuests.filter((quest) => quest.completed).length / savedQuests.length) * 100
          : 0;
      const insight = await getAIInsight(profile, rate);
      if (insight) setAiMessage(insight);
    } catch {
      // Ignore insight failure.
    }
  }, []);

  const refreshDailyQuests = useCallback(
    async (profile: UserProfile) => {
      if (!isGeminiConfigured()) return;

      setIsGeneratingQuests(true);
      try {
        const aiQuests = await generatePersonalizedQuests(
          profile,
          techTree,
          getQuestGenerationContext(),
        );

        if (aiQuests && aiQuests.length > 0) {
          persistTodayQuests(adaptQuestsForContext(aiQuests));
        } else {
          setDefaultQuests();
        }
      } catch {
        setDefaultQuests();
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

  // ── actions ─────────────────────────────────────────────────────────────
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
      setItemJSON(STORAGE_KEYS.profile, newProfile);
      setItemString(STORAGE_KEYS.customized, 'true');

      if (isSupabaseConfigured()) {
        void saveProfile(newProfile);
      }

      if (!isGeminiConfigured()) {
        setDefaultQuests();
        return;
      }

      setIsGeneratingQuests(true);
      setAiMessage('AI가 맞춤 퀘스트를 생성하고 있어요...');

      try {
        const [aiQuests, aiTree, insight] = await Promise.all([
          generatePersonalizedQuests(newProfile, undefined, getQuestGenerationContext()),
          generateTechTree(newProfile),
          getAIInsight(newProfile, 0),
        ]);

        if (aiQuests?.length) {
          persistTodayQuests(adaptQuestsForContext(aiQuests));
        } else {
          setDefaultQuests();
        }

        if (aiTree) {
          setTechTree(aiTree);
          setItemJSON(STORAGE_KEYS.techTree, aiTree);
          if (isSupabaseConfigured()) {
            void saveTechTree(aiTree);
          }
        }

        showTransientMessage(insight || 'AI가 맞춤 퀘스트를 생성했어요! 🎯', 5000);
      } catch {
        setDefaultQuests();
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
      }
    } catch {
      showTransientMessage('퀘스트 생성에 실패했어요.');
    } finally {
      setIsGeneratingQuests(false);
    }
  }, [
    adaptQuestsForContext,
    getQuestGenerationContext,
    persistTodayQuests,
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

      if (isSupabaseConfigured()) {
        void saveQuestHistory(
          updatedQuests.filter((quest) => quest.completed).length,
          updatedQuests.length,
        );
      }

      const wasCompleting = !previousQuests.find((quest) => quest.id === questId)?.completed;
      if (!wasCompleting) {
        const history = getItemJSON<Record<string, { completed: number; total: number }>>(
          STORAGE_KEYS.questHistory,
        ) || {};

        history[getTodayString()] = {
          completed: updatedQuests.filter((quest) => quest.completed).length,
          total: updatedQuests.length,
        };

        setItemJSON(STORAGE_KEYS.questHistory, history);
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
        setItemJSON(STORAGE_KEYS.profile, updatedProfile);

        if (isSupabaseConfigured()) {
          void saveProfile(updatedProfile);
        }

        if (techTree) {
          const advancedTree = advanceTechTree(techTree);
          setTechTree(advancedTree);
          setItemJSON(STORAGE_KEYS.techTree, advancedTree);
          if (isSupabaseConfigured()) {
            void saveTechTree(advancedTree);
          }
        }

        if (isGeminiConfigured()) {
          void loadAIInsight(updatedProfile);
        }
      }

      const history = getItemJSON<Record<string, { completed: number; total: number }>>(
        STORAGE_KEYS.questHistory,
      ) || {};

      history[getTodayString()] = {
        completed: updatedQuests.filter((quest) => quest.completed).length,
        total: updatedQuests.length,
      };

      setItemJSON(STORAGE_KEYS.questHistory, history);
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
      }

      if (techTree) {
        const reroutedTree = rerouteTechTreeForRecovery(techTree, meta.rootCause);
        if (JSON.stringify(reroutedTree) !== JSON.stringify(techTree)) {
          setTechTree(reroutedTree);
          setItemJSON(STORAGE_KEYS.techTree, reroutedTree);
          if (isSupabaseConfigured()) {
            void saveTechTree(reroutedTree);
          }
          showTransientMessage('복구 경로를 반영해 테크트리를 조정했어요 🔄', 2500);
        }
      }

      setFailureQuest(null);
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
    setItemJSON(STORAGE_KEYS.techTree, tree);
  }, []);

  const handleStartCustomization = useCallback(() => {
    setCurrentScreen('onboarding');
  }, []);

  // ── effects ──────────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      clearAiMessageTimer();
    };
  }, [clearAiMessageTimer]);

  useEffect(() => {
    if (bootstrapGuardRef.current) return;
    bootstrapGuardRef.current = true;

    let energyTimer: number | null = null;

    const bootstrap = async () => {
      try {
        // Step 1: persisted data read
        const persistedProfile = getItemJSON<UserProfile>(STORAGE_KEYS.profile);
        const persistedQuests = getItemJSON<Quest[]>(STORAGE_KEYS.quests);
        const persistedTree = getItemJSON<TechTreeResponse>(STORAGE_KEYS.techTree);
        const persistedVoiceCheckIn = getItemJSON<VoiceCheckInEntry>(STORAGE_KEYS.voiceCheckIn);
        const persistedEnergy = getItemString(STORAGE_KEYS.energyToday);
        const persistedFuturePrompt = getItemString(STORAGE_KEYS.futureSelfPrompt);
        const persistedQuestDate = getItemString(STORAGE_KEYS.questDate);
        const persistedEnergyDate = getItemString(STORAGE_KEYS.energyDate);
        const customizedFlag = getItemString(STORAGE_KEYS.customized);

        // Step 2: fallback/default apply
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
          setDefaultQuests();
        }

        // Step 3: initial follow-up
        if (persistedProfile && persistedEnergyDate !== getTodayString()) {
          energyTimer = window.setTimeout(() => setIsEnergyOpen(true), 1000);
        }

        if (persistedProfile && isGeminiConfigured()) {
          void loadAIInsight(profile);
        }
      } finally {
        setIsLoading(false);
      }
    };

    void bootstrap();

    return () => {
      if (energyTimer !== null) {
        window.clearTimeout(energyTimer);
      }
    };
  }, [loadAIInsight, refreshDailyQuests, setDefaultQuests]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F9FAFB] max-w-[430px] mx-auto">
      {currentScreen !== 'onboarding' ? (
        <div className="fixed top-0 left-0 right-0 max-w-[430px] mx-auto h-11 bg-white/80 backdrop-blur-md z-50 flex items-center justify-between px-6 text-sm border-b border-[#F3F4F6]">
          <span className="font-semibold text-gray-900">
            {new Date().toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <div className="flex items-center gap-2">
            <span className="text-11 font-semibold text-[#7C3AED]">Lv.{stats.level}</span>
            <div className="w-6 h-3 bg-[#7C3AED] rounded-sm flex items-center justify-end pr-0.5">
              <div className="w-0.5 h-2 bg-purple-900 rounded-full" />
            </div>
          </div>
        </div>
      ) : null}

      <AnimatePresence mode="wait">
        {currentScreen === 'onboarding' ? (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </motion.div>
        ) : null}

        {currentScreen === 'home' && userProfile ? (
          <motion.div key="home" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <HomeScreen
              profile={userProfile}
              quests={todayQuests}
              onQuestToggle={handleQuestToggle}
              onQuestFail={handleQuestFail}
              completionRate={completionRate}
              isGeneratingQuests={isGeneratingQuests}
              onRegenerateQuests={handleRegenerateQuests}
              aiMessage={aiMessage}
              isAiEnabled={isGeminiConfigured()}
              stats={stats}
              energy={energy}
              onOpenShare={() => setIsShareOpen(true)}
              onOpenEnergy={() => setIsEnergyOpen(true)}
              onOpenFutureSelf={() => setIsFutureSelfOpen(true)}
              futureSelfPrompt={futureSelfPrompt}
              onOpenVoiceCheckIn={() => setIsVoiceCheckInOpen(true)}
              latestVoiceCheckIn={latestVoiceCheckIn?.text}
            />
          </motion.div>
        ) : null}

        {currentScreen === 'techTree' && userProfile ? (
          <motion.div key="techTree" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <TechTreeScreen profile={userProfile} techTree={techTree} onTechTreeUpdate={handleTechTreeUpdate} />
          </motion.div>
        ) : null}

        {currentScreen === 'progress' && userProfile ? (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <ProgressScreen
              profile={userProfile}
              completionRate={completionRate}
              completedCount={completedCount}
              totalCount={totalCount}
              stats={stats}
            />
          </motion.div>
        ) : null}

        {currentScreen === 'profile' && userProfile ? (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <ProfileScreen
              profile={userProfile}
              onStartCustomization={handleStartCustomization}
              isCustomized={isCustomized}
            />
          </motion.div>
        ) : null}
      </AnimatePresence>

      {currentScreen !== 'onboarding' ? (
        <BottomNavigation
          currentScreen={currentScreen}
          onNavigate={(screen) => setCurrentScreen(screen as Screen)}
        />
      ) : null}

      {userProfile ? (
        <>
          <FailureSheet
            isOpen={isFailureSheetOpen}
            onClose={() => setIsFailureSheetOpen(false)}
            quest={failureQuest}
            profile={userProfile}
            energy={energy}
            onAcceptRecovery={handleAcceptRecovery}
          />
          <EnergyCheckIn
            isOpen={isEnergyOpen}
            onClose={() => setIsEnergyOpen(false)}
            onSubmit={handleEnergySubmit}
          />
          <FutureSelfVisualizer
            isOpen={isFutureSelfOpen}
            onClose={() => setIsFutureSelfOpen(false)}
            userName={userProfile.name}
            goal={userProfile.goal}
            initialPrompt={futureSelfPrompt}
            onSave={(prompt) => {
              setFutureSelfPrompt(prompt);
              setItemString(STORAGE_KEYS.futureSelfPrompt, prompt);
              showTransientMessage('미래 자아 비전 카드가 저장됐어요 ✨', 2500);
            }}
          />
          <VoiceCheckIn
            isOpen={isVoiceCheckInOpen}
            onClose={() => setIsVoiceCheckInOpen(false)}
            initialText={latestVoiceCheckIn?.text}
            onSave={async (entry) => {
              setLatestVoiceCheckIn(entry);
              setItemJSON(STORAGE_KEYS.voiceCheckIn, entry);

              const adjustedQuests = adaptQuestsForContext(todayQuests, entry.text);
              persistTodayQuests(adjustedQuests);

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
                } catch {
                  showTransientMessage('음성 체크인이 저장됐어요 🎙️');
                }
              } else {
                showTransientMessage('음성 체크인이 저장됐어요 🎙️', 2500);
              }
            }}
          />
          <ShareCard
            isOpen={isShareOpen}
            onClose={() => setIsShareOpen(false)}
            profile={userProfile}
            streak={stats.currentStreak}
            level={stats.level}
            completionRate={completionRate}
            questTitle={todayQuests.find((quest) => quest.completed)?.title}
          />
          <LevelUpModal
            isOpen={!!levelUpInfo}
            onClose={() => setLevelUpInfo(null)}
            newLevel={levelUpInfo?.level || 1}
            xpGained={levelUpInfo?.xp || 0}
          />
        </>
      ) : null}
    </div>
  );
}
