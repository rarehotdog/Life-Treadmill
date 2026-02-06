// User Profile Types
export interface UserProfile {
  id?: string;
  name: string;
  goal: string;
  deadline: string;
  routineTime: 'morning' | 'evening';
  constraints: string;
  currentDay: number;
  streak: number;
  weeklyCompletion: number;
  estimatedGoalDate: string;
  joinedDate: string;
  daysUntilDeadline?: number;
}

// Quest Types
export interface Quest {
  id: string;
  title: string;
  duration: string;
  completed: boolean;
  alternative?: string;
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  description?: string;
  goal_id?: string;
  why?: string;
  status?: 'pending' | 'completed' | 'failed' | 'skipped';
  scheduled_date?: string;
}

// Tech Tree Types
export interface TechTree {
  root: TechTreeNode;
  recommended_first_quest?: Quest;
  estimated_completion_date: string;
}

export interface TechTreeNode {
  id: string;
  title: string;
  description?: string;
  status: 'completed' | 'in_progress' | 'pending' | 'locked';
  estimated_days?: number;
  children?: TechTreeNode[];
  position?: { x: number; y: number };
}

// Goal Types (legacy support)
export interface Goal {
  id: string;
  user_id: string;
  title: string;
  deadline: string;
  routine_time: 'morning' | 'evening';
  constraints: GoalConstraints;
  tech_tree: TechTree;
  created_at: string;
}

export interface GoalConstraints {
  time_per_day: string;
  energy_level: 'low' | 'medium' | 'high';
  budget?: string;
  environment?: string;
}

// Context Log Types
export interface ContextLog {
  id: string;
  user_id: string;
  type: 'text' | 'audio' | 'image' | 'video';
  content: string;
  metadata?: ContextMetadata;
  created_at: string;
}

export interface ContextMetadata {
  emotion?: string;
  energy_level?: number;
  tags?: string[];
}

// Onboarding Types
export interface OnboardingData {
  name: string;
  goal: string;
  deadline: string;
  routineTime: 'morning' | 'evening';
  constraints: string;
}

// Daily Quest Response from Gemini
export interface DailyQuestResponse {
  today_quest: Quest;
  message: string;
  stats: {
    streak: number;
    weekly_completion_rate: number;
    estimated_goal_date: string;
  };
}

// Future Self Image
export interface FutureSelfImage {
  id: string;
  goal_id: string;
  prompt: string;
  image_url: string;
  created_at: string;
}

// Screen Types
export type Screen = 'onboarding' | 'home' | 'techTree' | 'progress' | 'profile';
