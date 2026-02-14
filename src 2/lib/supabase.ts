import { createClient } from '@supabase/supabase-js';
import type { UserProfile, Quest } from '../../App';
import type { TechTreeResponse } from './gemini';

// ── Init ──
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

export function isSupabaseConfigured(): boolean {
  return !!supabase;
}

// ── Database Types ──
interface DBProfile {
  id: string;
  name: string;
  goal: string;
  deadline: string;
  routine_time: string;
  constraints: string;
  current_day: number;
  streak: number;
  weekly_completion: number;
  estimated_goal_date: string;
  joined_date: string;
  updated_at: string;
}

interface DBQuest {
  id: string;
  user_id: string;
  title: string;
  duration: string;
  completed: boolean;
  alternative: string | null;
  time_of_day: string;
  description: string | null;
  quest_date: string;
  created_at: string;
}

interface DBTechTree {
  id: string;
  user_id: string;
  tree_data: TechTreeResponse;
  updated_at: string;
}

interface DBQuestHistory {
  id: string;
  user_id: string;
  quest_date: string;
  quests_completed: number;
  quests_total: number;
  completion_rate: number;
  created_at: string;
}

// ── Helper: get or create user ID ──
function getUserId(): string {
  let userId = localStorage.getItem('ltr_userId');
  if (!userId) {
    userId = crypto.randomUUID();
    localStorage.setItem('ltr_userId', userId);
  }
  return userId;
}

// ── Profile ──
export async function saveProfile(profile: UserProfile): Promise<void> {
  if (!supabase) return;
  const userId = getUserId();

  const data: Partial<DBProfile> = {
    id: userId,
    name: profile.name,
    goal: profile.goal,
    deadline: profile.deadline,
    routine_time: profile.routineTime,
    constraints: profile.constraints,
    current_day: profile.currentDay,
    streak: profile.streak,
    weekly_completion: profile.weeklyCompletion,
    estimated_goal_date: profile.estimatedGoalDate,
    joined_date: profile.joinedDate,
    updated_at: new Date().toISOString(),
  };

  await supabase.from('profiles').upsert(data, { onConflict: 'id' });
}

export async function loadProfile(): Promise<UserProfile | null> {
  if (!supabase) return null;
  const userId = getUserId();

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error || !data) return null;

  const row = data as DBProfile;
  return {
    name: row.name,
    goal: row.goal,
    deadline: row.deadline,
    routineTime: row.routine_time,
    constraints: row.constraints,
    currentDay: row.current_day,
    streak: row.streak,
    weeklyCompletion: row.weekly_completion,
    estimatedGoalDate: row.estimated_goal_date,
    joinedDate: row.joined_date,
  };
}

// ── Quests ──
export async function saveQuests(quests: Quest[]): Promise<void> {
  if (!supabase) return;
  const userId = getUserId();
  const todayStr = new Date().toISOString().split('T')[0];

  // Delete today's quests first
  await supabase
    .from('quests')
    .delete()
    .eq('user_id', userId)
    .eq('quest_date', todayStr);

  // Insert new ones
  const rows = quests.map(q => ({
    id: `${userId}-${q.id}-${todayStr}`,
    user_id: userId,
    title: q.title,
    duration: q.duration,
    completed: q.completed,
    alternative: q.alternative || null,
    time_of_day: q.timeOfDay,
    description: q.description || null,
    quest_date: todayStr,
  }));

  await supabase.from('quests').upsert(rows);
}

export async function loadQuests(): Promise<Quest[] | null> {
  if (!supabase) return null;
  const userId = getUserId();
  const todayStr = new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_date', todayStr)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return null;

  return (data as DBQuest[]).map(row => ({
    id: row.id.split('-').pop() || row.id,
    title: row.title,
    duration: row.duration,
    completed: row.completed,
    alternative: row.alternative || undefined,
    timeOfDay: row.time_of_day as Quest['timeOfDay'],
    description: row.description || undefined,
  }));
}

// ── Tech Tree ──
export async function saveTechTree(tree: TechTreeResponse): Promise<void> {
  if (!supabase) return;
  const userId = getUserId();

  await supabase.from('tech_trees').upsert({
    id: userId,
    user_id: userId,
    tree_data: tree,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'id' });
}

export async function loadTechTree(): Promise<TechTreeResponse | null> {
  if (!supabase) return null;
  const userId = getUserId();

  const { data, error } = await supabase
    .from('tech_trees')
    .select('tree_data')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return (data as DBTechTree).tree_data;
}

// ── Quest History (for Progress screen) ──
export async function saveQuestHistory(
  completedCount: number,
  totalCount: number
): Promise<void> {
  if (!supabase) return;
  const userId = getUserId();
  const todayStr = new Date().toISOString().split('T')[0];

  await supabase.from('quest_history').upsert({
    id: `${userId}-${todayStr}`,
    user_id: userId,
    quest_date: todayStr,
    quests_completed: completedCount,
    quests_total: totalCount,
    completion_rate: totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
  }, { onConflict: 'id' });
}

export async function loadQuestHistory(days: number = 30): Promise<{
  date: string;
  completed: number;
  total: number;
  rate: number;
}[]> {
  if (!supabase) return [];
  const userId = getUserId();

  const fromDate = new Date();
  fromDate.setDate(fromDate.getDate() - days);

  const { data, error } = await supabase
    .from('quest_history')
    .select('*')
    .eq('user_id', userId)
    .gte('quest_date', fromDate.toISOString().split('T')[0])
    .order('quest_date', { ascending: true });

  if (error || !data) return [];

  return (data as DBQuestHistory[]).map(row => ({
    date: row.quest_date,
    completed: row.quests_completed,
    total: row.quests_total,
    rate: row.completion_rate,
  }));
}
