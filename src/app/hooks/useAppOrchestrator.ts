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
import { flushSyncOutbox, isSupabaseConfigured } from '../../lib/supabase';
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
  getSyncDiagnostics,
  getOrInitJSON,
  recordQualitySnapshot,
  STORAGE_KEYS,
  getItemJSON,
  getItemString,
  migrateStorageIfNeeded,
  setItemJSON,
  setItemString,
} from '../../lib/app-storage';
import {
  advanceTechTree,
  buildDecisionLogView,
  calculateDecisionQuality,
  computeExecutionMetrics,
  computeSafetyMetrics,
  createDefaultProfile,
  createDeterministicFallbackQuests,
  extractVoiceEnergyHint,
  getRecentFailurePatternLabel,
  parseMinutes,
  rerouteTechTreeForRecovery,
  validateDecisionRecord,
} from '../../lib/app-domain';
import {
  trackDecisionQuality,
  trackError,
  trackEvent,
  trackTiming,
} from '../../lib/telemetry';
import {
  getTodayString,
  persistCustomizationFlag,
  persistDecisionRecord,
  persistExecutionRecord,
  persistGovernanceAudit,
  persistIntentState,
  persistProfile,
  persistQuestHistory,
  persistQuests,
  persistTechTree,
} from '../actions/orchestration';
import type {
  DecisionLogViewItem,
  DecisionQualitySnapshot,
  DecisionRecord,
  ExecutionMetrics,
  ExecutionRecord,
  FailureLogEntry,
  GovernanceAuditLog,
  IntentState,
  Quest,
  SafetyMetrics,
  Screen,
  SyncDiagnostics,
  UserProfile,
  VoiceCheckInEntry,
} from '../../types/app';
import type { FailureResolutionMeta } from '../../components/mobile/FailureSheet';
import {
  buildAuditEvent,
  requiresExplicitApproval,
} from '../../lib/governance';
import { isFlagEnabled } from '../../config/flags';

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
  intentState: IntentState | null;
  decisionQualitySnapshot: DecisionQualitySnapshot | null;
  decisionQualityHistory: DecisionQualitySnapshot[];
  decisionLogItems: DecisionLogViewItem[];
  decisionLogWindowDays: number;
  decisionLogLastUpdatedAt: string | null;
  executionMetrics: ExecutionMetrics;
  safetyMetrics: SafetyMetrics;
  syncDiagnostics: SyncDiagnostics;
  isSyncing: boolean;
  remoteSyncEnabled: boolean;
  decisionTerminalEnabled: boolean;
  decisionLogUiEnabled: boolean;
  syncStatusUiEnabled: boolean;
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
  handleSyncRetry: () => Promise<void>;
}

export function useAppOrchestrator(): UseAppOrchestratorResult {
  const decisionTerminalEnabled = isFlagEnabled('decision_terminal_v1');
  const decisionLogUiEnabled = isFlagEnabled('decision_log_ui_v1');
  const syncStatusUiEnabled = isFlagEnabled('sync_status_ui_v1');
  const governanceAuditEnabled = isFlagEnabled('governance_audit_v1');
  const remoteSyncEnabled = isSupabaseConfigured();

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
  const [intentState, setIntentState] = useState<IntentState | null>(null);
  const [decisionQualitySnapshot, setDecisionQualitySnapshot] =
    useState<DecisionQualitySnapshot | null>(null);
  const [decisionQualityHistory, setDecisionQualityHistory] = useState<
    DecisionQualitySnapshot[]
  >([]);
  const [decisionLogItems, setDecisionLogItems] = useState<DecisionLogViewItem[]>([]);
  const [decisionLogLastUpdatedAt, setDecisionLogLastUpdatedAt] = useState<string | null>(null);
  const [executionMetrics, setExecutionMetrics] = useState<ExecutionMetrics>({
    windowDays: 7,
    total: 0,
    appliedCount: 0,
    delayedCount: 0,
    skippedCount: 0,
    appliedRate: 0,
    delayedRate: 0,
    onTimeRate: 0,
  });
  const [safetyMetrics, setSafetyMetrics] = useState<SafetyMetrics>({
    windowDays: 7,
    totalAudits: 0,
    riskCounts: {
      low: 0,
      medium: 0,
      high: 0,
    },
    highRiskViolations: 0,
    highRiskViolationRate: 0,
  });
  const [syncDiagnostics, setSyncDiagnostics] = useState<SyncDiagnostics>(() =>
    getSyncDiagnostics(),
  );
  const [isSyncing, setIsSyncing] = useState(false);

  const completedCount = todayQuests.filter((quest) => quest.completed).length;
  const totalCount = todayQuests.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;
  const decisionLogWindowDays = 30;

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

  const refreshSyncDiagnostics = useCallback(() => {
    setSyncDiagnostics(getSyncDiagnostics());
  }, []);

  const logGovernanceEvent = useCallback(
    (scope: 'health' | 'decision' | 'task' | 'profile', approved: boolean) => {
      if (!governanceAuditEnabled) return;

      const needsApproval = requiresExplicitApproval(scope);
      if (needsApproval) {
        trackEvent('governance.permission_prompted', {
          scope,
        });
      }

      const eventType = approved
        ? 'permission_granted'
        : 'permission_denied';
      const audit = buildAuditEvent({
        eventType,
        scope,
        approved,
      });
      persistGovernanceAudit(audit);

      trackEvent(
        approved
          ? 'governance.permission_granted'
          : 'governance.permission_denied',
        {
          scope,
          riskLevel: audit.riskLevel,
        },
      );

      if (!approved && audit.riskLevel === 'high') {
        trackEvent('governance.risk_flagged', {
          scope,
          riskLevel: audit.riskLevel,
        });
      }
    },
    [governanceAuditEnabled],
  );

  const buildQuestDecisionRecord = useCallback(
    (
      profile: UserProfile,
      quests: Quest[],
      source: 'ai' | 'fallback',
      voiceText?: string,
    ): DecisionRecord => {
      const now = new Date().toISOString();
      const options = quests.slice(0, 3).map((quest, index) => {
        const minutes = parseMinutes(quest.duration) ?? 20;
        return {
          id: `opt-${index + 1}-${quest.id}`,
          title: quest.title,
          estimatedCost: minutes,
          estimatedBenefit: Math.max(40, 90 - index * 10),
          counterArguments: [
            '현재 에너지 대비 과도할 수 있음',
            '예정된 일정과 충돌할 수 있음',
          ],
          recommended: index === 0,
        };
      });

      while (options.length < 3) {
        const index = options.length + 1;
        options.push({
          id: `opt-${index}-fallback`,
          title: `보완 옵션 ${index}`,
          estimatedCost: 15,
          estimatedBenefit: 60,
          counterArguments: ['맥락 데이터가 부족할 수 있음', '실행 시간이 제한될 수 있음'],
          recommended: false,
        });
      }

      const evidence: DecisionRecord['evidence'] = [
        {
          id: `e-goal-${now}`,
          title: `핵심 목표: ${profile.goal}`,
          sourceKind: 'manual' as const,
          sourceRef: 'profile.goal',
          capturedAt: now,
        },
        {
          id: `e-constraints-${now}`,
          title: `제약: ${profile.constraints || '없음'}`,
          sourceKind: 'manual' as const,
          sourceRef: 'profile.constraints',
          capturedAt: now,
        },
        {
          id: `e-source-${now}`,
          title:
            source === 'ai'
              ? 'AI 기반 맥락 추론 결과'
              : '결정론적 fallback 규칙 기반',
          sourceKind: 'note' as const,
          sourceRef: source,
          capturedAt: now,
        },
      ];

      if (voiceText?.trim()) {
        evidence.push({
          id: `e-voice-${now}`,
          title: '최근 음성 체크인 맥락 반영',
          sourceKind: 'voice',
          sourceRef: 'voice_checkin',
          capturedAt: now,
        });
      }

      const record: DecisionRecord = {
        id: `decision-${now}`,
        intentId: `${profile.joinedDate}:${profile.goal}`,
        question: '오늘 가장 실행 가능성이 높은 다음 행동은 무엇인가?',
        options,
        evidence: evidence.slice(0, 5),
        selectedOptionId: options[0].id,
        createdAt: now,
      };

      return record;
    },
    [],
  );

  const recordExecution = useCallback(
    (status: ExecutionRecord['status'], actionType: string, delayMinutes = 0) => {
      if (!decisionTerminalEnabled) return;

      const latestDecision =
        getItemJSON<DecisionRecord[]>(STORAGE_KEYS.decisionLog)?.[0];
      const now = new Date().toISOString();

      persistExecutionRecord({
        id: `execution-${actionType}-${now}`,
        decisionId: latestDecision?.id ?? 'legacy-decision',
        actionType,
        scheduledAt: now,
        executedAt: now,
        status,
        delayMinutes,
      });

      trackEvent(`execution.${status}`, {
        actionType,
        delayMinutes,
      });
    },
    [decisionTerminalEnabled],
  );

  const refreshDecisionQualityState = useCallback(
    (options?: { persist?: boolean; emit?: boolean }) => {
      if (!decisionTerminalEnabled) return;

      const decisionRecords =
        getItemJSON<DecisionRecord[]>(STORAGE_KEYS.decisionLog) ?? [];
      const executionRecords =
        getItemJSON<ExecutionRecord[]>(STORAGE_KEYS.executionLog) ?? [];
      const governanceLogs =
        getItemJSON<GovernanceAuditLog[]>(STORAGE_KEYS.governanceAuditLog) ?? [];
      const failureLogs = getItemJSON<FailureLogEntry[]>(STORAGE_KEYS.failureLog) ?? [];
      const nextDecisionLogItems = buildDecisionLogView(
        decisionRecords,
        executionRecords,
        {
          windowDays: decisionLogWindowDays,
        },
      );

      const nextExecutionMetrics = computeExecutionMetrics(executionRecords, 7);
      const nextSafetyMetrics = computeSafetyMetrics(governanceLogs, 7);
      const recoveryApplied = executionRecords.filter(
        (record) => record.actionType === 'recovery_quest' && record.status === 'applied',
      ).length;
      const recoveryAttempts = failureLogs.length;

      const snapshot = calculateDecisionQuality({
        decisionRecords,
        executionMetrics: nextExecutionMetrics,
        recoveryAcceptRate:
          recoveryAttempts > 0 ? recoveryApplied / recoveryAttempts : 1,
        rerouteSuccessRate:
          recoveryAttempts > 0 ? Math.min(1, recoveryApplied / recoveryAttempts) : 1,
        safetyMetrics: nextSafetyMetrics,
      });

      setExecutionMetrics(nextExecutionMetrics);
      setSafetyMetrics(nextSafetyMetrics);
      setDecisionQualitySnapshot(snapshot);
      setDecisionLogItems(nextDecisionLogItems);
      setDecisionLogLastUpdatedAt(new Date().toISOString());

      if (options?.persist) {
        const nextHistory = recordQualitySnapshot(snapshot);
        setDecisionQualityHistory(nextHistory);
      }

      if (options?.emit) {
        trackDecisionQuality(snapshot);
      }
    },
    [decisionLogWindowDays, decisionTerminalEnabled],
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
      const adaptedQuests = adaptQuestsForContext(quests);
      persistTodayQuests(adaptedQuests);

      if (decisionTerminalEnabled) {
        const record = buildQuestDecisionRecord(profile, adaptedQuests, 'fallback');
        persistDecisionRecord(record);
        trackEvent('decision.generated', {
          source: 'fallback',
          valid: validateDecisionRecord(record).pass,
        });
      }
    },
    [
      adaptQuestsForContext,
      buildQuestDecisionRecord,
      decisionTerminalEnabled,
      energy,
      latestVoiceCheckIn?.text,
      persistTodayQuests,
    ],
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
          if (decisionTerminalEnabled) {
            const record = buildQuestDecisionRecord(profile, aiQuests, 'ai');
            persistDecisionRecord(record);
            trackEvent('decision.generated', {
              source: 'ai',
              valid: validateDecisionRecord(record).pass,
            });
          }
        } else {
          setDefaultQuests(profile);
          if (decisionTerminalEnabled) {
            const fallbackQuests = createDeterministicFallbackQuests(profile, {
              energy,
              voiceHint: latestVoiceCheckIn?.text,
            });
            const record = buildQuestDecisionRecord(
              profile,
              fallbackQuests,
              'fallback',
            );
            persistDecisionRecord(record);
            trackEvent('decision.generated', {
              source: 'fallback',
              valid: validateDecisionRecord(record).pass,
            });
          }
        }

        trackTiming('ai.generate.daily_quests', performance.now() - startedAt, {
          hasResult: !!aiQuests?.length,
        });
        refreshDecisionQualityState({
          persist: true,
          emit: true,
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
    [
      adaptQuestsForContext,
      buildQuestDecisionRecord,
      decisionTerminalEnabled,
      energy,
      getQuestGenerationContext,
      latestVoiceCheckIn?.text,
      persistTodayQuests,
      refreshDecisionQualityState,
      setDefaultQuests,
      techTree,
    ],
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

      if (decisionTerminalEnabled) {
        const record = buildQuestDecisionRecord(profile, updatedQuests, 'ai', voiceText);
        persistDecisionRecord(record);
        trackEvent('decision.generated', {
          source: 'ai',
          valid: validateDecisionRecord(record).pass,
        });
      }

      return true;
    },
    [
      adaptQuestsForContext,
      buildQuestDecisionRecord,
      decisionTerminalEnabled,
      getQuestGenerationContext,
      persistTodayQuests,
      techTree,
    ],
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

      recordExecution('applied', 'energy_checkin', 0);
      logGovernanceEvent('health', true);
      refreshDecisionQualityState({
        persist: true,
        emit: true,
      });
    },
    [
      addXP,
      logGovernanceEvent,
      recordExecution,
      refreshDecisionQualityState,
      stats,
    ],
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

      if (decisionTerminalEnabled) {
        const state: IntentState = {
          goal: newProfile.goal,
          values: [newProfile.goal],
          constraints: newProfile.constraints
            .split(',')
            .map((value) => value.trim())
            .filter(Boolean),
          timeHorizon: newProfile.deadline,
          updatedAt: new Date().toISOString(),
          source: 'onboarding',
        };
        setIntentState(state);
        persistIntentState(state);
        trackEvent('intent.state_updated', {
          source: 'onboarding',
        });
      }

      if (!isGeminiConfigured()) {
        const fallbackQuests = createDeterministicFallbackQuests(newProfile, {
          energy,
          voiceHint: latestVoiceCheckIn?.text,
        });
        persistTodayQuests(adaptQuestsForContext(fallbackQuests));

        if (decisionTerminalEnabled) {
          const record = buildQuestDecisionRecord(newProfile, fallbackQuests, 'fallback');
          persistDecisionRecord(record);
          trackEvent('decision.generated', {
            source: 'fallback',
            valid: validateDecisionRecord(record).pass,
          });
          logGovernanceEvent('decision', true);
          refreshDecisionQualityState({
            persist: true,
            emit: true,
          });
        }
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

          if (decisionTerminalEnabled) {
            const record = buildQuestDecisionRecord(newProfile, aiQuests, 'ai');
            persistDecisionRecord(record);
            trackEvent('decision.generated', {
              source: 'ai',
              valid: validateDecisionRecord(record).pass,
            });
            logGovernanceEvent('decision', true);
          }
        } else {
          setDefaultQuests(newProfile);

          if (decisionTerminalEnabled) {
            const fallbackQuests = createDeterministicFallbackQuests(newProfile, {
              energy,
              voiceHint: latestVoiceCheckIn?.text,
            });
            const record = buildQuestDecisionRecord(
              newProfile,
              fallbackQuests,
              'fallback',
            );
            persistDecisionRecord(record);
            trackEvent('decision.generated', {
              source: 'fallback',
              valid: validateDecisionRecord(record).pass,
            });
          }
        }

        if (aiTree) {
          setTechTree(aiTree);
          persistTechTree(aiTree);
        }

        trackTiming('app.onboarding_complete', performance.now() - startedAt);
        showTransientMessage(insight || 'AI가 맞춤 퀘스트를 생성했어요! 🎯', 5000);
        refreshDecisionQualityState({
          persist: true,
          emit: true,
        });
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
      buildQuestDecisionRecord,
      decisionTerminalEnabled,
      getQuestGenerationContext,
      logGovernanceEvent,
      energy,
      latestVoiceCheckIn?.text,
      persistTodayQuests,
      refreshDecisionQualityState,
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
        if (decisionTerminalEnabled && userProfile) {
          const record = buildQuestDecisionRecord(userProfile, aiQuests, 'ai');
          persistDecisionRecord(record);
          trackEvent('decision.generated', {
            source: 'ai',
            valid: validateDecisionRecord(record).pass,
          });
          logGovernanceEvent('decision', true);
        }
        showTransientMessage('새로운 퀘스트가 준비되었어요! ✨');
      } else {
        setDefaultQuests(userProfile);
        if (decisionTerminalEnabled) {
          const fallbackQuests = createDeterministicFallbackQuests(userProfile, {
            energy,
            voiceHint: latestVoiceCheckIn?.text,
          });
          const record = buildQuestDecisionRecord(
            userProfile,
            fallbackQuests,
            'fallback',
          );
          persistDecisionRecord(record);
          trackEvent('decision.generated', {
            source: 'fallback',
            valid: validateDecisionRecord(record).pass,
          });
        }
      }
      refreshDecisionQualityState({
        persist: true,
        emit: true,
      });
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
    buildQuestDecisionRecord,
    decisionTerminalEnabled,
    energy,
    getQuestGenerationContext,
    latestVoiceCheckIn?.text,
    logGovernanceEvent,
    persistTodayQuests,
    refreshDecisionQualityState,
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

      const toggledQuest = updatedQuests.find((quest) => quest.id === questId);
      if (toggledQuest?.completed) {
        recordExecution('applied', 'quest_toggle', 0);
        trackEvent('decision.selected', {
          questId,
          action: 'complete',
        });
      } else {
        recordExecution('skipped', 'quest_toggle', 0);
      }

      const wasCompleting = !previousQuests.find((quest) => quest.id === questId)?.completed;
      if (!wasCompleting) {
        refreshDecisionQualityState({
          persist: true,
          emit: true,
        });
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

      refreshDecisionQualityState({
        persist: true,
        emit: true,
      });
    },
    [
      addXP,
      loadAIInsight,
      persistTodayQuests,
      recordExecution,
      refreshDecisionQualityState,
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
      recordExecution('delayed', 'quest_failure', parseMinutes(quest.duration) ?? 15);
      trackEvent('quest.failed', {
        questId,
      });
      refreshDecisionQualityState({
        persist: true,
        emit: true,
      });
    },
    [recordExecution, refreshDecisionQualityState, todayQuests],
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
      recordExecution('applied', 'recovery_quest', 0);
      trackEvent('decision.selected', {
        action: 'recovery',
        rootCause: meta.rootCause,
      });
      logGovernanceEvent('task', true);
      trackEvent('quest.recovery_accepted', {
        rootCause: meta.rootCause,
      });
      refreshDecisionQualityState({
        persist: true,
        emit: true,
      });
    },
    [
      addXP,
      energy,
      failureQuest,
      logGovernanceEvent,
      persistTodayQuests,
      recordExecution,
      refreshDecisionQualityState,
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
      logGovernanceEvent('health', true);
      recordExecution('applied', 'voice_checkin', 0);

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

      refreshDecisionQualityState({
        persist: true,
        emit: true,
      });
    },
    [
      adaptQuestsForContext,
      logGovernanceEvent,
      persistTodayQuests,
      recordExecution,
      refreshDecisionQualityState,
      refreshNextQuestFromVoiceContext,
      showTransientMessage,
      todayQuests,
      userProfile,
    ],
  );

  const handleSyncRetry = useCallback(async () => {
    trackEvent('sync.manual_retry_clicked', {
      online: typeof navigator === 'undefined' ? true : navigator.onLine,
    });

    if (!isSupabaseConfigured()) {
      showTransientMessage('클라우드 동기화가 비활성화되어 있어요.', 2500);
      refreshSyncDiagnostics();
      return;
    }

    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      showTransientMessage('오프라인 상태예요. 연결되면 자동 동기화돼요.', 2500);
      refreshSyncDiagnostics();
      return;
    }

    setIsSyncing(true);
    try {
      const summary = await flushSyncOutbox();
      refreshSyncDiagnostics();

      if (!summary.success) {
        trackEvent('sync.manual_retry_failed', {
          reason: summary.reason ?? 'unknown',
          remaining: summary.remaining,
          dropped: summary.dropped,
        });
        showTransientMessage('동기화 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.', 3000);
        return;
      }

      trackEvent('sync.manual_retry_succeeded', {
        processed: summary.processed,
        remaining: summary.remaining,
        dropped: summary.dropped,
      });

      if (summary.remaining > 0 || summary.dropped > 0) {
        showTransientMessage(`동기화 완료: 남은 ${summary.remaining}건`, 2500);
      } else {
        showTransientMessage('동기화를 완료했어요.', 2200);
      }
    } catch (error) {
      trackError(error, {
        phase: 'handleSyncRetry',
      });
      trackEvent('sync.manual_retry_failed', {
        reason: error instanceof Error ? error.message : String(error),
      });
      showTransientMessage('동기화 중 문제가 발생했어요. 잠시 후 다시 시도해 주세요.', 3000);
    } finally {
      setIsSyncing(false);
      refreshSyncDiagnostics();
    }
  }, [refreshSyncDiagnostics, showTransientMessage]);

  useEffect(() => {
    return () => {
      clearAiMessageTimer();
    };
  }, [clearAiMessageTimer]);

  useEffect(() => {
    const onOnline = () => {
      void (async () => {
        setIsSyncing(true);
        try {
          const summary = await flushSyncOutbox();
          if (summary.success && summary.processed > 0) {
            showTransientMessage('대기 중이던 동기화를 완료했어요.', 2200);
          }
        } finally {
          setIsSyncing(false);
          refreshSyncDiagnostics();
        }
      })();
    };

    const onOffline = () => {
      refreshSyncDiagnostics();
    };

    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, [refreshSyncDiagnostics, showTransientMessage]);

  useEffect(() => {
    if (bootstrapGuardRef.current) return;
    bootstrapGuardRef.current = true;

    let energyTimer: number | null = null;

    const bootstrap = async () => {
      const bootstrapStartedAt = performance.now();

      try {
        migrateStorageIfNeeded();
        await flushSyncOutbox();
        refreshSyncDiagnostics();

        const persistedProfile = getItemJSON<UserProfile>(STORAGE_KEYS.profile);
        const persistedQuests = getItemJSON<Quest[]>(STORAGE_KEYS.quests);
        const persistedTree = getItemJSON<TechTreeResponse>(STORAGE_KEYS.techTree);
        const persistedVoiceCheckIn = getItemJSON<VoiceCheckInEntry>(STORAGE_KEYS.voiceCheckIn);
        const persistedIntentState = getItemJSON<IntentState>(STORAGE_KEYS.intentState);
        const persistedQualityHistory =
          getOrInitJSON<DecisionQualitySnapshot[]>(
            STORAGE_KEYS.decisionQualitySnapshots,
            [],
          );
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

        if (persistedIntentState) {
          setIntentState(persistedIntentState);
        } else if (decisionTerminalEnabled) {
          const inferredIntent: IntentState = {
            goal: profile.goal,
            values: [profile.goal],
            constraints: profile.constraints
              .split(',')
              .map((value) => value.trim())
              .filter(Boolean),
            timeHorizon: profile.deadline,
            updatedAt: new Date().toISOString(),
            source: 'manual',
          };
          setIntentState(inferredIntent);
          persistIntentState(inferredIntent);
        }

        setDecisionQualityHistory(persistedQualityHistory);
        if (persistedQualityHistory[0]) {
          setDecisionQualitySnapshot(persistedQualityHistory[0]);
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

        if (decisionTerminalEnabled) {
          const existingDecisionRecords =
            getItemJSON<DecisionRecord[]>(STORAGE_KEYS.decisionLog) ?? [];
          if (existingDecisionRecords.length === 0) {
            const bootstrapQuests = getItemJSON<Quest[]>(STORAGE_KEYS.quests) ?? [];
            if (bootstrapQuests.length > 0) {
              const seedRecord = buildQuestDecisionRecord(
                profile,
                bootstrapQuests,
                'fallback',
              );
              persistDecisionRecord(seedRecord);
              trackEvent('decision.generated', {
                source: 'bootstrap_seed',
                valid: validateDecisionRecord(seedRecord).pass,
              });
            }
          }
        }

        if (persistedProfile && persistedEnergyDate !== getTodayString()) {
          energyTimer = window.setTimeout(() => setIsEnergyOpen(true), 1000);
        }

        if (persistedProfile && isGeminiConfigured()) {
          void loadAIInsight(profile);
        }

        refreshDecisionQualityState({
          persist: false,
          emit: false,
        });

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
        refreshSyncDiagnostics();
      }
    };

    void bootstrap();

    return () => {
      if (energyTimer !== null) {
        window.clearTimeout(energyTimer);
      }
    };
  }, [
    buildQuestDecisionRecord,
    decisionTerminalEnabled,
    loadAIInsight,
    refreshSyncDiagnostics,
    refreshDailyQuests,
    refreshDecisionQualityState,
    setDefaultQuests,
  ]);

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
    intentState,
    decisionQualitySnapshot,
    decisionQualityHistory,
    decisionLogItems,
    decisionLogWindowDays,
    decisionLogLastUpdatedAt,
    executionMetrics,
    safetyMetrics,
    syncDiagnostics,
    isSyncing,
    remoteSyncEnabled,
    decisionTerminalEnabled,
    decisionLogUiEnabled,
    syncStatusUiEnabled,
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
    handleSyncRetry,
  };
}
