// ── XP & Level System ──

const XP_TABLE = {
  questComplete: 100,
  streakBonus: 50,      // per streak day multiplier
  perfectDay: 200,      // all quests done
  weeklyChallenge: 500,
  failureRecovery: 75,  // accepted recovery quest
  energyCheckIn: 25,    // daily energy check
};

// Level thresholds: level N requires sum of (N * 100) XP
export function getLevelFromXP(xp: number): number {
  let level = 1;
  let required = 0;
  while (true) {
    required += level * 100;
    if (xp < required) break;
    level++;
  }
  return level;
}

export function getXPForNextLevel(xp: number): { current: number; required: number; progress: number } {
  let level = 1;
  let cumulative = 0;
  while (true) {
    const needed = level * 100;
    if (xp < cumulative + needed) {
      return {
        current: xp - cumulative,
        required: needed,
        progress: ((xp - cumulative) / needed) * 100,
      };
    }
    cumulative += needed;
    level++;
  }
}

export function getLevelTitle(level: number): string {
  if (level <= 3) return '초보 러너';
  if (level <= 6) return '습관 빌더';
  if (level <= 10) return '퀘스트 헌터';
  if (level <= 15) return '스트릭 마스터';
  if (level <= 20) return '목표 달성자';
  if (level <= 30) return '인생 설계자';
  return '레전드';
}

// ── XP Rewards ──
export function calculateQuestXP(streak: number): number {
  const base = XP_TABLE.questComplete;
  const streakMultiplier = Math.min(streak * 0.1, 2); // max 2x
  return Math.round(base * (1 + streakMultiplier));
}

export function calculatePerfectDayXP(): number {
  return XP_TABLE.perfectDay;
}

export function calculateRecoveryXP(): number {
  return XP_TABLE.failureRecovery;
}

export function calculateEnergyCheckXP(): number {
  return XP_TABLE.energyCheckIn;
}

// ── Badge System ──
export interface Badge {
  id: string;
  title: string;
  description: string;
  emoji: string;
  condition: (stats: UserStats) => boolean;
}

export interface UserStats {
  xp: number;
  level: number;
  currentStreak: number;
  longestStreak: number;
  streakFreezes: number;
  totalQuestsCompleted: number;
  totalDaysActive: number;
  perfectDays: number;
  failureRecoveries: number;
  treeNodesCompleted: number;
}

export const BADGES: Badge[] = [
  {
    id: 'first_quest',
    title: '첫 걸음',
    description: '첫 번째 퀘스트를 완료했어요',
    emoji: '🌱',
    condition: (s) => s.totalQuestsCompleted >= 1,
  },
  {
    id: 'streak_3',
    title: '3일 연속',
    description: '3일 연속 퀘스트를 완료했어요',
    emoji: '🔥',
    condition: (s) => s.currentStreak >= 3 || s.longestStreak >= 3,
  },
  {
    id: 'streak_7',
    title: '일주일 전사',
    description: '7일 연속 달성!',
    emoji: '⚔️',
    condition: (s) => s.currentStreak >= 7 || s.longestStreak >= 7,
  },
  {
    id: 'streak_30',
    title: '월간 챔피언',
    description: '30일 연속 달성!',
    emoji: '🏆',
    condition: (s) => s.currentStreak >= 30 || s.longestStreak >= 30,
  },
  {
    id: 'perfect_day_1',
    title: '퍼펙트 데이',
    description: '하루의 모든 퀘스트를 완료했어요',
    emoji: '⭐',
    condition: (s) => s.perfectDays >= 1,
  },
  {
    id: 'perfect_week',
    title: '퍼펙트 위크',
    description: '일주일 동안 매일 모든 퀘스트를 완료했어요',
    emoji: '🌟',
    condition: (s) => s.perfectDays >= 7,
  },
  {
    id: 'level_5',
    title: '습관 빌더',
    description: '레벨 5 달성!',
    emoji: '🎯',
    condition: (s) => s.level >= 5,
  },
  {
    id: 'level_10',
    title: '퀘스트 헌터',
    description: '레벨 10 달성!',
    emoji: '🗡️',
    condition: (s) => s.level >= 10,
  },
  {
    id: 'recovery_master',
    title: '실패 복구 마스터',
    description: '3번 이상 실패를 회복했어요',
    emoji: '💪',
    condition: (s) => s.failureRecoveries >= 3,
  },
  {
    id: 'early_bird',
    title: '새벽형 인간',
    description: '10일 이상 활동한 숙련자',
    emoji: '🌅',
    condition: (s) => s.totalDaysActive >= 10,
  },
  {
    id: 'quests_50',
    title: '50개 돌파',
    description: '총 50개의 퀘스트를 완료했어요',
    emoji: '🎖️',
    condition: (s) => s.totalQuestsCompleted >= 50,
  },
  {
    id: 'tree_complete',
    title: 'Tech-Tree 마스터',
    description: '테크트리 노드를 10개 이상 완료',
    emoji: '🌳',
    condition: (s) => s.treeNodesCompleted >= 10,
  },
];

export function checkNewBadges(stats: UserStats, earnedBadgeIds: string[]): Badge[] {
  return BADGES.filter(badge =>
    !earnedBadgeIds.includes(badge.id) && badge.condition(stats)
  );
}

// ── Streak Freeze ──
export function useStreakFreeze(freezesRemaining: number): { success: boolean; remaining: number } {
  if (freezesRemaining <= 0) return { success: false, remaining: 0 };
  return { success: true, remaining: freezesRemaining - 1 };
}

// ── Default Stats ──
export function createDefaultStats(): UserStats {
  return {
    xp: 0,
    level: 1,
    currentStreak: 0,
    longestStreak: 0,
    streakFreezes: 2,
    totalQuestsCompleted: 0,
    totalDaysActive: 0,
    perfectDays: 0,
    failureRecoveries: 0,
    treeNodesCompleted: 0,
  };
}

// ── Load/Save ──
export function loadStats(): UserStats {
  const saved = localStorage.getItem('ltr_stats');
  if (saved) {
    try { return { ...createDefaultStats(), ...JSON.parse(saved) }; }
    catch { /* ignore */ }
  }
  return createDefaultStats();
}

export function saveStats(stats: UserStats): void {
  localStorage.setItem('ltr_stats', JSON.stringify(stats));
}

export function loadEarnedBadges(): string[] {
  const saved = localStorage.getItem('ltr_badges');
  if (saved) {
    try { return JSON.parse(saved); }
    catch { /* ignore */ }
  }
  return [];
}

export function saveEarnedBadges(ids: string[]): void {
  localStorage.setItem('ltr_badges', JSON.stringify(ids));
}
