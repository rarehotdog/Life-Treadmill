import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, Goal, Quest, OnboardingData, TechTree, ContextLog } from '@/types';

interface AppState {
  // User
  user: User | null;
  setUser: (user: User | null) => void;

  // Current Goal
  currentGoal: Goal | null;
  setCurrentGoal: (goal: Goal | null) => void;

  // Tech Tree
  techTree: TechTree | null;
  setTechTree: (tree: TechTree | null) => void;

  // Today's Quest
  todayQuest: Quest | null;
  setTodayQuest: (quest: Quest | null) => void;

  // Quest History
  questHistory: Quest[];
  addQuestToHistory: (quest: Quest) => void;
  updateQuestInHistory: (questId: string, updates: Partial<Quest>) => void;

  // Context Logs
  contextLogs: ContextLog[];
  addContextLog: (log: ContextLog) => void;

  // Stats
  stats: {
    streak: number;
    totalCompleted: number;
    totalFailed: number;
    weeklyCompletionRate: number;
  };
  updateStats: (updates: Partial<AppState['stats']>) => void;

  // Onboarding
  onboardingData: OnboardingData | null;
  setOnboardingData: (data: OnboardingData | null) => void;
  onboardingStep: number;
  setOnboardingStep: (step: number) => void;

  // UI State
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;

  // Reset
  reset: () => void;
}

const initialState = {
  user: null,
  currentGoal: null,
  techTree: null,
  todayQuest: null,
  questHistory: [],
  contextLogs: [],
  stats: {
    streak: 0,
    totalCompleted: 0,
    totalFailed: 0,
    weeklyCompletionRate: 0,
  },
  onboardingData: null,
  onboardingStep: 0,
  isLoading: false,
};

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setUser: (user) => set({ user }),

      setCurrentGoal: (currentGoal) => set({ currentGoal }),

      setTechTree: (techTree) => set({ techTree }),

      setTodayQuest: (todayQuest) => set({ todayQuest }),

      addQuestToHistory: (quest) =>
        set((state) => ({
          questHistory: [...state.questHistory, quest],
        })),

      updateQuestInHistory: (questId, updates) =>
        set((state) => ({
          questHistory: state.questHistory.map((q) =>
            q.id === questId ? { ...q, ...updates } : q
          ),
        })),

      addContextLog: (log) =>
        set((state) => ({
          contextLogs: [...state.contextLogs, log],
        })),

      updateStats: (updates) =>
        set((state) => ({
          stats: { ...state.stats, ...updates },
        })),

      setOnboardingData: (onboardingData) => set({ onboardingData }),

      setOnboardingStep: (onboardingStep) => set({ onboardingStep }),

      setIsLoading: (isLoading) => set({ isLoading }),

      reset: () => set(initialState),
    }),
    {
      name: 'life-treadmill-storage',
      partialize: (state) => ({
        user: state.user,
        currentGoal: state.currentGoal,
        techTree: state.techTree,
        questHistory: state.questHistory,
        contextLogs: state.contextLogs,
        stats: state.stats,
        onboardingData: state.onboardingData,
      }),
    }
  )
);

// Selectors
export const selectUser = (state: AppState) => state.user;
export const selectTechTree = (state: AppState) => state.techTree;
export const selectTodayQuest = (state: AppState) => state.todayQuest;
export const selectStats = (state: AppState) => state.stats;
export const selectIsOnboarded = (state: AppState) => state.techTree !== null;
