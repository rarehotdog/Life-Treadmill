import { createClient } from '@supabase/supabase-js';
import { isFlagEnabled } from '../config/flags';
import {
  STORAGE_KEYS,
  drainOutbox,
  enqueueOutbox,
  getItemString,
  setItemString,
} from './app-storage';
import { trackError, trackEvent } from './telemetry';
import type {
  Quest,
  SyncOperationType,
  SyncOutboxItem,
  UserProfile,
} from '../types/app';
import type { TechTreeResponse } from './gemini';

// ── Init ──
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const supabase = (SUPABASE_URL && SUPABASE_ANON_KEY)
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const MAX_RETRY = 3;
const BASE_RETRY_MS = 250;

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
  user_id: string;
  tree_data: TechTreeResponse;
}

interface DBQuestHistory {
  id: string;
  user_id: string;
  quest_date: string;
  quests_completed: number;
  quests_total: number;
  completion_rate: number;
}

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    globalThis.setTimeout(resolve, ms);
  });
}

function stableHash(value: string): string {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `${hash >>> 0}`;
}

function buildIdempotencyKey(operation: SyncOperationType, userId: string, payload: unknown): string {
  const serializedPayload = JSON.stringify(payload);
  const payloadHash = stableHash(`${operation}:${serializedPayload}`);
  return `${operation}:${userId}:${payloadHash}`;
}

async function withRetry<T>(
  fn: () => Promise<T>,
  context: { operation: SyncOperationType; idempotencyKey: string },
): Promise<T> {
  let attempt = 0;

  while (attempt < MAX_RETRY) {
    try {
      return await fn();
    } catch (error) {
      attempt += 1;
      if (attempt >= MAX_RETRY) {
        throw error;
      }

      trackError(error, {
        phase: 'retry',
        operation: context.operation,
        idempotencyKey: context.idempotencyKey,
        attempt,
      });

      const delay = BASE_RETRY_MS * Math.pow(2, attempt - 1);
      await sleep(delay);
    }
  }

  throw new Error('Retry exhausted');
}

// ── Helper: get or create user ID ──
function getUserId(): string {
  const existing = getItemString(STORAGE_KEYS.userId);
  if (existing) return existing;

  const generated = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

  setItemString(STORAGE_KEYS.userId, generated);
  return generated;
}

function isQuestArray(value: unknown): value is Quest[] {
  return Array.isArray(value);
}

function isProfile(value: unknown): value is UserProfile {
  if (!value || typeof value !== 'object') return false;

  const candidate = value as Partial<UserProfile>;
  return (
    typeof candidate.name === 'string' &&
    typeof candidate.goal === 'string' &&
    typeof candidate.deadline === 'string' &&
    typeof candidate.routineTime === 'string'
  );
}

function isTechTree(value: unknown): value is TechTreeResponse {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<TechTreeResponse>;
  return !!candidate.root && typeof candidate.estimatedCompletionDate === 'string';
}

function isQuestHistoryPayload(
  value: unknown,
): value is { completedCount: number; totalCount: number } {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<{ completedCount: number; totalCount: number }>;
  return typeof candidate.completedCount === 'number' && typeof candidate.totalCount === 'number';
}

async function writeProfileRaw(userId: string, profile: UserProfile): Promise<void> {
  if (!supabase) return;

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

  const { error } = await supabase.from('profiles').upsert(data, { onConflict: 'id' });
  if (error) throw error;
}

async function writeQuestsRaw(userId: string, quests: Quest[]): Promise<void> {
  if (!supabase) return;

  const todayStr = getTodayString();

  const { error: deleteError } = await supabase
    .from('quests')
    .delete()
    .eq('user_id', userId)
    .eq('quest_date', todayStr);
  if (deleteError) throw deleteError;

  const rows = quests.map((quest) => ({
    id: `${userId}__${quest.id}__${todayStr}`,
    user_id: userId,
    title: quest.title,
    duration: quest.duration,
    completed: quest.completed,
    alternative: quest.alternative || null,
    time_of_day: quest.timeOfDay,
    description: quest.description || null,
    quest_date: todayStr,
  }));

  const { error: upsertError } = await supabase.from('quests').upsert(rows);
  if (upsertError) throw upsertError;
}

function extractQuestId(compositeId: string, userId: string, todayStr: string): string {
  // Current stable format: <userId>__<questId>__<YYYY-MM-DD>
  const currentDelimiter = '__';
  if (compositeId.includes(currentDelimiter)) {
    const [idPrefix, questId] = compositeId.split(currentDelimiter);
    if (idPrefix === userId && questId) return questId;
  }

  // Legacy format: <userId>-<questId>-<YYYY-MM-DD> (questId may include '-')
  const legacyPrefix = `${userId}-`;
  const legacySuffix = `-${todayStr}`;
  if (compositeId.startsWith(legacyPrefix) && compositeId.endsWith(legacySuffix)) {
    return compositeId.slice(legacyPrefix.length, compositeId.length - legacySuffix.length);
  }

  return compositeId;
}

async function writeTechTreeRaw(userId: string, tree: TechTreeResponse): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from('tech_trees').upsert(
    {
      id: userId,
      user_id: userId,
      tree_data: tree,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

async function writeQuestHistoryRaw(
  userId: string,
  completedCount: number,
  totalCount: number,
): Promise<void> {
  if (!supabase) return;

  const todayStr = getTodayString();

  const { error } = await supabase.from('quest_history').upsert(
    {
      id: `${userId}-${todayStr}`,
      user_id: userId,
      quest_date: todayStr,
      quests_completed: completedCount,
      quests_total: totalCount,
      completion_rate:
        totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0,
    },
    { onConflict: 'id' },
  );

  if (error) throw error;
}

async function replayOutboxItem(item: SyncOutboxItem, userId: string): Promise<boolean> {
  switch (item.operation) {
    case 'save_profile':
      if (!isProfile(item.payload)) return true;
      await writeProfileRaw(userId, item.payload);
      return true;

    case 'save_quests':
      if (!isQuestArray(item.payload)) return true;
      await writeQuestsRaw(userId, item.payload);
      return true;

    case 'save_tech_tree':
      if (!isTechTree(item.payload)) return true;
      await writeTechTreeRaw(userId, item.payload);
      return true;

    case 'save_quest_history':
      if (!isQuestHistoryPayload(item.payload)) return true;
      await writeQuestHistoryRaw(userId, item.payload.completedCount, item.payload.totalCount);
      return true;

    default:
      return true;
  }
}

export async function flushSyncOutbox(): Promise<void> {
  if (!supabase || !isFlagEnabled('reliable_storage_v2')) return;

  const userId = getUserId();
  const result = await drainOutbox((item) => replayOutboxItem(item, userId));

  if (result.processed > 0 || result.remaining > 0 || result.dropped > 0) {
    trackEvent('sync.outbox_drain', {
      processed: result.processed,
      remaining: result.remaining,
      dropped: result.dropped,
    });
  }
}

async function performReliableWrite<TPayload>(
  operation: SyncOperationType,
  payload: TPayload,
  writer: (userId: string, payload: TPayload) => Promise<void>,
): Promise<void> {
  if (!supabase) return;

  const userId = getUserId();
  const idempotencyKey = buildIdempotencyKey(operation, userId, payload);

  if (isFlagEnabled('reliable_storage_v2')) {
    await flushSyncOutbox();
  }

  try {
    await withRetry(() => writer(userId, payload), {
      operation,
      idempotencyKey,
    });
  } catch (error) {
    if (isFlagEnabled('reliable_storage_v2')) {
      enqueueOutbox(operation, payload, idempotencyKey);
      trackEvent('sync.outbox_enqueued', {
        operation,
      });
    }

    trackError(error, {
      operation,
      idempotencyKey,
    });
  }
}

// ── Profile ──
export async function saveProfile(profile: UserProfile): Promise<void> {
  if (!supabase) return;

  await performReliableWrite('save_profile', profile, writeProfileRaw);
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

  await performReliableWrite('save_quests', quests, writeQuestsRaw);
}

export async function loadQuests(): Promise<Quest[] | null> {
  if (!supabase) return null;

  const userId = getUserId();
  const todayStr = getTodayString();

  const { data, error } = await supabase
    .from('quests')
    .select('*')
    .eq('user_id', userId)
    .eq('quest_date', todayStr)
    .order('created_at', { ascending: true });

  if (error || !data || data.length === 0) return null;

  return (data as DBQuest[]).map((row) => ({
    id: extractQuestId(row.id, userId, todayStr),
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

  await performReliableWrite('save_tech_tree', tree, writeTechTreeRaw);
}

export async function loadTechTree(): Promise<TechTreeResponse | null> {
  if (!supabase) return null;

  const userId = getUserId();

  const { data, error } = await supabase
    .from('tech_trees')
    .select('user_id, tree_data')
    .eq('user_id', userId)
    .single();

  if (error || !data) return null;
  return (data as DBTechTree).tree_data;
}

// ── Quest History (for Progress screen) ──
export async function saveQuestHistory(
  completedCount: number,
  totalCount: number,
): Promise<void> {
  if (!supabase) return;

  await performReliableWrite(
    'save_quest_history',
    {
      completedCount,
      totalCount,
    },
    async (userId, payload) => {
      await writeQuestHistoryRaw(userId, payload.completedCount, payload.totalCount);
    },
  );
}

export async function loadQuestHistory(days = 30): Promise<{
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

  return (data as DBQuestHistory[]).map((row) => ({
    date: row.quest_date,
    completed: row.quests_completed,
    total: row.quests_total,
    rate: row.completion_rate,
  }));
}
