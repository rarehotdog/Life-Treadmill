import { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  saveTechTree,
  saveQuestHistory,
  isSupabaseConfigured,
} from './lib/supabase';
import {
  loadStats,
  saveStats,
  getLevelFromXP,
  calculateQuestXP,
  calculatePerfectDayXP,
  calculateRecoveryXP,
  calculateEnergyCheckXP,
  type UserStats,
} from './lib/gamification';

type Screen = 'onboarding' | 'home' | 'techTree' | 'progress' | 'profile';

export interface UserProfile {
  name: string;
  goal: string;
  deadline: string;
  routineTime: string;
  constraints: string;
  currentDay: number;
  streak: number;
  weeklyCompletion: number;
  estimatedGoalDate: string;
  joinedDate: string;
  daysUntilDeadline?: number;
}

export interface Quest {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  alternative?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  description?: string;
}

interface FailureLogEntry {
  timestamp: string;
  questId: string;
  questTitle: string;
  reasonCode: FailureResolutionMeta['reasonCode'];
  reasonText: string;
  rootCause: FailureResolutionMeta['rootCause'];
  energy?: number;
}

interface VoiceCheckInEntry {
  text: string;
  createdAt: string;
}

function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function parseMinutes(duration: string): number | null {
  const m = duration.match(/(\d+)/);
  if (!m) return null;
  return parseInt(m[1], 10);
}

function extractVoiceEnergyHint(text: string): number | undefined {
  const t = text.toLowerCase();
  const lowSignals = ['피곤', '지침', '힘들', '기운이 없', '무기력', '바빠', '스트레스'];
  const highSignals = ['상쾌', '집중 잘', '컨디션 좋', '에너지 좋', '의욕', '할 수 있'];

  if (lowSignals.some((s) => t.includes(s))) return 2;
  if (highSignals.some((s) => t.includes(s))) return 4;
  return undefined;
}

function getRecentFailurePatternLabel(): string | undefined {
  const raw = localStorage.getItem('ltr_failureLog');
  const logs = safeParseJSON<Array<{ rootCause?: string }>>(raw) || [];
  if (!logs.length) return undefined;
  const counts: Record<string, number> = {};
  for (const log of logs.slice(0, 20)) {
    const key = log.rootCause || 'other';
    counts[key] = (counts[key] || 0) + 1;
  }
  const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0];
  const labels: Record<string, string> = {
    time: '시간 압박',
    motivation: '동기 저하',
    difficulty: '난이도 과부하',
    environment: '환경 제약',
    other: '기타',
  };
  return labels[top || 'other'] || '기타';
}

export default function App() {
  const [currentScreen, setCurrentScreen] = useState<Screen>('home');
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [todayQuests, setTodayQuests] = useState<Quest[]>([]);
  const [isCustomized, setIsCustomized] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingQuests, setIsGeneratingQuests] = useState(false);
  const [techTree, setTechTree] = useState<TechTreeResponse | null>(null);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

  // Failure sheet
  const [failureQuest, setFailureQuest] = useState<Quest | null>(null);
  const [isFailureSheetOpen, setIsFailureSheetOpen] = useState(false);

  // Gamification
  const [stats, setStats] = useState<UserStats>(loadStats());

  // Modals
  const [levelUpInfo, setLevelUpInfo] = useState<{ level: number; xp: number } | null>(null);
  const [isEnergyOpen, setIsEnergyOpen] = useState(false);
  const [isShareOpen, setIsShareOpen] = useState(false);
  const [energy, setEnergy] = useState<number | undefined>(undefined);
  const [isFutureSelfOpen, setIsFutureSelfOpen] = useState(false);
  const [futureSelfPrompt, setFutureSelfPrompt] = useState('');
  const [isVoiceCheckInOpen, setIsVoiceCheckInOpen] = useState(false);
  const [latestVoiceCheckIn, setLatestVoiceCheckIn] = useState<VoiceCheckInEntry | null>(null);

  const adaptQuestsForContext = useCallback((inputQuests: Quest[], voiceTextOverride?: string): Quest[] => {
    if (!inputQuests.length) return inputQuests;

    const explicitEnergy = energy;
    const voiceSource = voiceTextOverride ?? latestVoiceCheckIn?.text;
    const voiceHint = voiceSource ? extractVoiceEnergyHint(voiceSource) : undefined;
    const effectiveEnergy = explicitEnergy ?? voiceHint;
    const isLowEnergyMode = typeof effectiveEnergy === 'number' && effectiveEnergy <= 2;

    if (!isLowEnergyMode) return inputQuests;

    let softened = false;
    const adjusted = inputQuests.map((quest, idx) => {
      const minutes = parseMinutes(quest.duration);
      const shouldSoften = !softened && !quest.completed && (idx === 0 || (minutes !== null && minutes > 15));
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

    return adjusted;
  }, [energy, latestVoiceCheckIn]);

  const persistTodayQuests = useCallback((quests: Quest[]) => {
    setTodayQuests(quests);
    localStorage.setItem('ltr_quests', JSON.stringify(quests));
    localStorage.setItem('ltr_questDate', new Date().toISOString().split('T')[0]);
    if (isSupabaseConfigured()) saveQuests(quests);
  }, []);

  const getQuestGenerationContext = useCallback((voiceTextOverride?: string): QuestGenerationContext => {
    return {
      energy,
      voiceCheckIn: voiceTextOverride ?? latestVoiceCheckIn?.text,
      recentFailurePattern: getRecentFailurePatternLabel(),
    };
  }, [energy, latestVoiceCheckIn]);

  const refreshNextQuestFromVoiceContext = useCallback(async (
    profile: UserProfile,
    currentQuests: Quest[],
    voiceText: string
  ): Promise<boolean> => {
    if (!isGeminiConfigured()) return false;
    const targetIndex = currentQuests.findIndex((q) => !q.completed);
    if (targetIndex < 0) return false;

    const aiQuests = await generatePersonalizedQuests(profile, techTree, getQuestGenerationContext(voiceText));
    if (!aiQuests?.length) return false;

    const replacementSource = aiQuests[0];
    const updated = [...currentQuests];
    const targetQuest = updated[targetIndex];
    updated[targetIndex] = {
      ...replacementSource,
      id: targetQuest.id,
      completed: false,
    };

    persistTodayQuests(adaptQuestsForContext(updated, voiceText));
    return true;
  }, [techTree, getQuestGenerationContext, persistTodayQuests, adaptQuestsForContext]);

  // ── Load state ──
  /* eslint-disable react-hooks/exhaustive-deps */
  useEffect(() => {
    const savedProfile = localStorage.getItem('ltr_profile');
    const savedQuests = localStorage.getItem('ltr_quests');
    const savedTree = localStorage.getItem('ltr_techTree');
    const customized = localStorage.getItem('ltr_customized');
    const savedEnergy = localStorage.getItem('ltr_energyToday');
    const savedFutureSelfPrompt = localStorage.getItem('ltr_futureSelfPrompt');
    const savedVoiceCheckIn = localStorage.getItem('ltr_voiceCheckIn');

    const parsedProfile = safeParseJSON<UserProfile>(savedProfile);
    const parsedSavedQuests = safeParseJSON<Quest[]>(savedQuests);
    const parsedSavedTree = safeParseJSON<TechTreeResponse>(savedTree);
    const parsedSavedVoiceCheckIn = safeParseJSON<VoiceCheckInEntry>(savedVoiceCheckIn);

    if (parsedProfile) {
      const profile = parsedProfile;
      setUserProfile(profile);
      setIsCustomized(customized === 'true');

      const lastQuestDate = localStorage.getItem('ltr_questDate');
      const todayStr = new Date().toISOString().split('T')[0];

      if (lastQuestDate !== todayStr && isGeminiConfigured()) {
        refreshDailyQuests(profile);
      } else if (parsedSavedQuests) {
        setTodayQuests(parsedSavedQuests);
      } else {
        setDefaultQuests();
      }

      // Show energy check-in if not done today
      const energyDate = localStorage.getItem('ltr_energyDate');
      if (energyDate !== todayStr) {
        setTimeout(() => setIsEnergyOpen(true), 1000);
      } else if (savedEnergy) {
        setEnergy(parseInt(savedEnergy));
      }
      if (savedFutureSelfPrompt) {
        setFutureSelfPrompt(savedFutureSelfPrompt);
      }
      if (parsedSavedVoiceCheckIn) {
        setLatestVoiceCheckIn(parsedSavedVoiceCheckIn);
      }

      if (isGeminiConfigured()) loadAIInsight(profile);
    } else {
      const defaultProfile: UserProfile = {
        name: '게스트',
        goal: '하루 하루 성장하기',
        deadline: '무제한',
        routineTime: 'morning',
        constraints: '없음',
        currentDay: 1,
        streak: 0,
        weeklyCompletion: 0,
        estimatedGoalDate: '지속적',
        joinedDate: new Date().toISOString().split('T')[0],
      };
      setUserProfile(defaultProfile);
      setDefaultQuests();
      if (savedFutureSelfPrompt) {
        setFutureSelfPrompt(savedFutureSelfPrompt);
      }
      if (parsedSavedVoiceCheckIn) {
        setLatestVoiceCheckIn(parsedSavedVoiceCheckIn);
      }
    }

    if (parsedSavedTree) {
      setTechTree(parsedSavedTree);
    }

    setIsLoading(false);
  }, []);
  /* eslint-enable react-hooks/exhaustive-deps */

  // ── Helpers ──
  const loadAIInsight = async (profile: UserProfile) => {
    try {
      const savedQuests = localStorage.getItem('ltr_quests');
      const quests: Quest[] = safeParseJSON<Quest[]>(savedQuests) || [];
      const rate = quests.length > 0 ? (quests.filter(q => q.completed).length / quests.length) * 100 : 0;
      const insight = await getAIInsight(profile, rate);
      if (insight) setAiMessage(insight);
    } catch { /* silent */ }
  };

  const refreshDailyQuests = async (profile: UserProfile) => {
    if (!isGeminiConfigured()) return;
    setIsGeneratingQuests(true);
    try {
      const aiQuests = await generatePersonalizedQuests(profile, techTree, getQuestGenerationContext());
      if (aiQuests && aiQuests.length > 0) {
        persistTodayQuests(adaptQuestsForContext(aiQuests));
      } else setDefaultQuests();
    } catch { setDefaultQuests(); }
    finally { setIsGeneratingQuests(false); }
  };

  const setDefaultQuests = () => {
    const quests: Quest[] = [
      { id: '1', title: '오늘의 목표 설정하기', duration: '5분', completed: false, timeOfDay: 'morning', description: '하루를 시작하기 전 목표를 정해보세요' },
      { id: '2', title: '집중 시간 갖기', duration: '25분', completed: false, timeOfDay: 'afternoon', description: '포모도로 타이머로 집중해보세요' },
      { id: '3', title: '하루 되돌아보기', duration: '10분', completed: false, timeOfDay: 'evening', description: '오늘 무엇을 이뤘는지 기록해보세요' },
    ];
    persistTodayQuests(adaptQuestsForContext(quests));
  };

  // ── Add XP and check badges/level ──
  const addXP = useCallback((amount: number, currentStats: UserStats): UserStats => {
    const newXP = currentStats.xp + amount;
    const oldLevel = currentStats.level;
    const newLevel = getLevelFromXP(newXP);

    const updated = { ...currentStats, xp: newXP, level: newLevel };

    if (newLevel > oldLevel) {
      setLevelUpInfo({ level: newLevel, xp: amount });
    }

    saveStats(updated);
    setStats(updated);
    return updated;
  }, []);

  // ── Energy check ──
  const handleEnergySubmit = (energyLevel: number, mood: string) => {
    void mood;
    setEnergy(energyLevel);
    localStorage.setItem('ltr_energyToday', String(energyLevel));
    localStorage.setItem('ltr_energyDate', new Date().toISOString().split('T')[0]);

    const updated = addXP(calculateEnergyCheckXP(), stats);
    setStats({ ...updated, totalDaysActive: updated.totalDaysActive + 1 });
    saveStats({ ...updated, totalDaysActive: updated.totalDaysActive + 1 });
  };

  // ── Onboarding ──
  const handleOnboardingComplete = async (profile: UserProfile) => {
    const newProfile: UserProfile = { ...profile, joinedDate: new Date().toISOString().split('T')[0] };
    setUserProfile(newProfile);
    setIsCustomized(true);
    setCurrentScreen('home');
    localStorage.setItem('ltr_profile', JSON.stringify(newProfile));
    localStorage.setItem('ltr_customized', 'true');
    if (isSupabaseConfigured()) saveProfile(newProfile);

    if (isGeminiConfigured()) {
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
        } else setDefaultQuests();
        if (aiTree) {
          setTechTree(aiTree);
          localStorage.setItem('ltr_techTree', JSON.stringify(aiTree));
          if (isSupabaseConfigured()) saveTechTree(aiTree);
        }
        if (insight) setAiMessage(insight);
        else setAiMessage('AI가 맞춤 퀘스트를 생성했어요! 🎯');
      } catch { setDefaultQuests(); }
      finally { setIsGeneratingQuests(false); setTimeout(() => setAiMessage(null), 5000); }
    } else setDefaultQuests();
  };

  // ── Regenerate quests ──
  const handleRegenerateQuests = useCallback(async () => {
    if (!userProfile || !isGeminiConfigured()) return;
    setIsGeneratingQuests(true);
    setAiMessage('새로운 퀘스트를 생성하고 있어요...');
    try {
      const aiQuests = await generatePersonalizedQuests(userProfile, techTree, getQuestGenerationContext());
      if (aiQuests?.length) {
        persistTodayQuests(adaptQuestsForContext(aiQuests));
        setAiMessage('새로운 퀘스트가 준비되었어요! ✨');
      }
    } catch { setAiMessage('퀘스트 생성에 실패했어요.'); }
    finally { setIsGeneratingQuests(false); setTimeout(() => setAiMessage(null), 3000); }
  }, [userProfile, techTree, adaptQuestsForContext, persistTodayQuests, getQuestGenerationContext]);

  // ── Quest toggle ──
  const handleQuestToggle = useCallback((questId: string) => {
    if (!userProfile) return;

    setTodayQuests(prev => {
      const updated = prev.map(q => q.id === questId ? { ...q, completed: !q.completed } : q);
      localStorage.setItem('ltr_quests', JSON.stringify(updated));

      const wasCompleting = !prev.find(q => q.id === questId)?.completed;
      if (isSupabaseConfigured()) {
        saveQuests(updated);
        saveQuestHistory(updated.filter(q => q.completed).length, updated.length);
      }

      if (wasCompleting) {
        // Add XP for quest completion
        const xp = calculateQuestXP(stats.currentStreak);
        const newStats = addXP(xp, {
          ...stats,
          totalQuestsCompleted: stats.totalQuestsCompleted + 1,
        });

        // Check perfect day
        const allCompleted = updated.every(q => q.completed);
        const wasAllCompleted = prev.every(q => q.completed);

        if (allCompleted && !wasAllCompleted) {
          // Perfect day bonus
          const perfectStats = addXP(calculatePerfectDayXP(), {
            ...newStats,
            perfectDays: newStats.perfectDays + 1,
            currentStreak: newStats.currentStreak + 1,
            longestStreak: Math.max(newStats.longestStreak, newStats.currentStreak + 1),
          });
          setStats(perfectStats);
          saveStats(perfectStats);

          // Confetti!
          confetti({ particleCount: 100, spread: 80, origin: { y: 0.7 }, colors: ['#7C3AED', '#10B981', '#F59E0B'] });
          setTimeout(() => confetti({ particleCount: 50, spread: 60, origin: { y: 0.5 } }), 300);

          // Update profile
          const updatedProfile: UserProfile = {
            ...userProfile,
            currentDay: userProfile.currentDay + 1,
            streak: userProfile.streak + 1,
            weeklyCompletion: Math.min(100, userProfile.weeklyCompletion + 14),
          };
          setUserProfile(updatedProfile);
          localStorage.setItem('ltr_profile', JSON.stringify(updatedProfile));
          if (isSupabaseConfigured()) saveProfile(updatedProfile);

          // Advance tech tree
          if (techTree) {
            const advancedTree = advanceTechTree(techTree);
            setTechTree(advancedTree);
            localStorage.setItem('ltr_techTree', JSON.stringify(advancedTree));
            if (isSupabaseConfigured()) saveTechTree(advancedTree);
          }

          if (isGeminiConfigured()) loadAIInsight(updatedProfile);
        }
      }

      // Save quest history for life calendar
      const history: Record<string, { completed: number; total: number }> = {};
      const saved = localStorage.getItem('ltr_questHistory');
      if (saved) try { Object.assign(history, JSON.parse(saved)); } catch { /* ignore */ }
      const todayStr = new Date().toISOString().split('T')[0];
      history[todayStr] = { completed: updated.filter(q => q.completed).length, total: updated.length };
      localStorage.setItem('ltr_questHistory', JSON.stringify(history));

      return updated;
    });
  }, [userProfile, techTree, stats, addXP]);

  // ── Tech tree advance ──
  function advanceTechTree(tree: TechTreeResponse): TechTreeResponse {
    const t = JSON.parse(JSON.stringify(tree)) as TechTreeResponse;
    if (!t.root.children) return t;
    for (const phase of t.root.children) {
      if (phase.status === 'in_progress' && phase.children) {
        for (let i = 0; i < phase.children.length; i++) {
          if (phase.children[i].status === 'in_progress') {
            phase.children[i].status = 'completed';
            if (i + 1 < phase.children.length && phase.children[i + 1].status === 'locked')
              phase.children[i + 1].status = 'in_progress';
            break;
          }
        }
        if (phase.children.every(q => q.status === 'completed')) {
          phase.status = 'completed';
          const idx = t.root.children.indexOf(phase);
          if (idx + 1 < t.root.children.length) {
            t.root.children[idx + 1].status = 'in_progress';
            if (t.root.children[idx + 1].children?.[0])
              t.root.children[idx + 1].children![0].status = 'in_progress';
          }
        }
        break;
      }
    }
    if (t.root.children.every(p => p.status === 'completed')) t.root.status = 'completed';
    return t;
  }

  // ── Failure ──
  const handleQuestFail = useCallback((questId: string) => {
    const quest = todayQuests.find(q => q.id === questId);
    if (quest) { setFailureQuest(quest); setIsFailureSheetOpen(true); }
  }, [todayQuests]);

  const handleAcceptRecovery = useCallback((recoveryQuest: Quest, meta: FailureResolutionMeta) => {
    const xp = calculateRecoveryXP();
    const newStats = addXP(xp, { ...stats, failureRecoveries: stats.failureRecoveries + 1 });
    setStats(newStats);

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
      const raw = localStorage.getItem('ltr_failureLog');
      const prev: FailureLogEntry[] = safeParseJSON<FailureLogEntry[]>(raw) || [];
      const next = [logEntry, ...prev].slice(0, 100);
      localStorage.setItem('ltr_failureLog', JSON.stringify(next));
    }

    setTodayQuests(prev => {
      const updated = prev.map(q => q.id === failureQuest?.id ? { ...recoveryQuest, id: q.id } : q);
      localStorage.setItem('ltr_quests', JSON.stringify(updated));
      if (isSupabaseConfigured()) saveQuests(updated);
      return updated;
    });
    setFailureQuest(null);
  }, [failureQuest, stats, addXP, energy]);

  const handleTechTreeUpdate = useCallback((tree: TechTreeResponse) => {
    setTechTree(tree);
    localStorage.setItem('ltr_techTree', JSON.stringify(tree));
  }, []);

  const handleStartCustomization = () => setCurrentScreen('onboarding');

  const completedCount = todayQuests.filter(q => q.completed).length;
  const totalCount = todayQuests.length;
  const completionRate = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F9FAFB] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen bg-[#F9FAFB] max-w-[430px] mx-auto">
      {/* Status Bar */}
      {currentScreen !== 'onboarding' && (
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
      )}

      <AnimatePresence mode="wait">
        {currentScreen === 'onboarding' && (
          <motion.div key="onboarding" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <OnboardingFlow onComplete={handleOnboardingComplete} />
          </motion.div>
        )}
        {currentScreen === 'home' && userProfile && (
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
        )}
        {currentScreen === 'techTree' && userProfile && (
          <motion.div key="techTree" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <TechTreeScreen profile={userProfile} techTree={techTree} onTechTreeUpdate={handleTechTreeUpdate} />
          </motion.div>
        )}
        {currentScreen === 'progress' && userProfile && (
          <motion.div key="progress" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <ProgressScreen profile={userProfile} completionRate={completionRate} completedCount={completedCount} totalCount={totalCount} stats={stats} />
          </motion.div>
        )}
        {currentScreen === 'profile' && userProfile && (
          <motion.div key="profile" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="pt-11 pb-24">
            <ProfileScreen profile={userProfile} onStartCustomization={handleStartCustomization} isCustomized={isCustomized} />
          </motion.div>
        )}
      </AnimatePresence>

      {currentScreen !== 'onboarding' && (
        <BottomNavigation currentScreen={currentScreen} onNavigate={(s) => setCurrentScreen(s as Screen)} />
      )}

      {/* ── Modals ── */}
      {userProfile && (
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
              localStorage.setItem('ltr_futureSelfPrompt', prompt);
              setAiMessage('미래 자아 비전 카드가 저장됐어요 ✨');
              setTimeout(() => setAiMessage(null), 2500);
            }}
          />
          <VoiceCheckIn
            isOpen={isVoiceCheckInOpen}
            onClose={() => setIsVoiceCheckInOpen(false)}
            initialText={latestVoiceCheckIn?.text}
            onSave={async (entry) => {
              setLatestVoiceCheckIn(entry);
              localStorage.setItem('ltr_voiceCheckIn', JSON.stringify(entry));
              const adjusted = adaptQuestsForContext(todayQuests, entry.text);
              persistTodayQuests(adjusted);

              if (userProfile && isGeminiConfigured()) {
                setAiMessage('체크인을 반영해 다음 퀘스트를 조정하고 있어요...');
                try {
                  const replaced = await refreshNextQuestFromVoiceContext(userProfile, adjusted, entry.text);
                  setAiMessage(replaced ? '음성 맥락을 반영해 다음 퀘스트를 업데이트했어요 🎯' : '음성 체크인이 저장됐어요 🎙️');
                } catch {
                  setAiMessage('음성 체크인이 저장됐어요 🎙️');
                }
                setTimeout(() => setAiMessage(null), 3000);
              } else {
                setAiMessage('음성 체크인이 저장됐어요 🎙️');
                setTimeout(() => setAiMessage(null), 2500);
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
            questTitle={todayQuests.find(q => q.completed)?.title}
          />
          <LevelUpModal
            isOpen={!!levelUpInfo}
            onClose={() => setLevelUpInfo(null)}
            newLevel={levelUpInfo?.level || 1}
            xpGained={levelUpInfo?.xp || 0}
          />
        </>
      )}
    </div>
  );
}
