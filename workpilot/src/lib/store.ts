import type { Pilot, RunLog } from '@/lib/types';
import type {
  CommitRunInput,
  CommitRunResult,
  StorageMode,
  StoreContext,
} from '@/lib/store-contract';
import { memoryStore } from '@/lib/store-memory';
import { supabaseStore } from '@/lib/store-supabase';

type StoreFallbackState = {
  lastReason?: string;
  lastAt?: string;
};

const globalStoreState = globalThis as typeof globalThis & {
  __workpilotStoreFallbackState?: StoreFallbackState;
};

function getFallbackState(): StoreFallbackState {
  if (!globalStoreState.__workpilotStoreFallbackState) {
    globalStoreState.__workpilotStoreFallbackState = {};
  }

  return globalStoreState.__workpilotStoreFallbackState;
}

function toReason(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'UNKNOWN_ERROR';
}

function trackFallback(operation: string, error: unknown, context?: StoreContext): void {
  const reason = toReason(error);
  const state = getFallbackState();
  state.lastReason = `${operation}:${reason}`;
  state.lastAt = new Date().toISOString();

  const requestSuffix = context?.requestId ? ` requestId=${context.requestId}` : '';
  console.warn(`[store] fallback to memory op=${operation}${requestSuffix} reason=${reason}`);
}

async function runWithFallback<T>(
  operation: string,
  context: StoreContext | undefined,
  supabaseOperation: () => Promise<T>,
  memoryOperation: () => Promise<T>,
): Promise<T> {
  if (!supabaseStore.isConfigured()) {
    return memoryOperation();
  }

  try {
    return await supabaseOperation();
  } catch (error) {
    trackFallback(operation, error, context);
    return memoryOperation();
  }
}

export type StorageHealth = {
  storageMode: StorageMode;
  dbReachable: boolean;
  fallbackReason?: string;
  fallbackAt?: string;
  supabaseConfigured: boolean;
};

export async function getStorageHealth(context?: StoreContext): Promise<StorageHealth> {
  const fallbackState = getFallbackState();

  if (!supabaseStore.isConfigured()) {
    return {
      storageMode: 'memory-fallback',
      dbReachable: false,
      supabaseConfigured: false,
      fallbackReason: fallbackState.lastReason ?? 'SUPABASE_NOT_CONFIGURED',
      fallbackAt: fallbackState.lastAt,
    };
  }

  try {
    const dbReachable = await supabaseStore.ping(context);
    return {
      storageMode: dbReachable ? 'supabase' : 'memory-fallback',
      dbReachable,
      supabaseConfigured: true,
      fallbackReason: dbReachable ? fallbackState.lastReason : fallbackState.lastReason ?? 'SUPABASE_UNREACHABLE',
      fallbackAt: fallbackState.lastAt,
    };
  } catch (error) {
    trackFallback('health', error, context);
    return {
      storageMode: 'memory-fallback',
      dbReachable: false,
      supabaseConfigured: true,
      fallbackReason: getFallbackState().lastReason,
      fallbackAt: getFallbackState().lastAt,
    };
  }
}

export async function savePilot(pilot: Pilot, context?: StoreContext): Promise<Pilot> {
  return runWithFallback(
    'savePilot',
    context,
    () => supabaseStore.savePilot(pilot, context),
    () => memoryStore.savePilot(pilot, context),
  );
}

export async function getPilot(id: string, context?: StoreContext): Promise<Pilot | undefined> {
  return runWithFallback(
    'getPilot',
    context,
    () => supabaseStore.getPilot(id, context),
    () => memoryStore.getPilot(id, context),
  );
}

export async function updatePilot(
  id: string,
  updater: (pilot: Pilot) => Pilot,
  context?: StoreContext,
): Promise<Pilot | undefined> {
  return runWithFallback(
    'updatePilot',
    context,
    () => supabaseStore.updatePilot(id, updater, context),
    () => memoryStore.updatePilot(id, updater, context),
  );
}

export async function getRunLogs(pilotId: string, limit = 3, context?: StoreContext): Promise<RunLog[]> {
  return runWithFallback(
    'getRunLogs',
    context,
    () => supabaseStore.getRunLogs(pilotId, limit, context),
    () => memoryStore.getRunLogs(pilotId, limit, context),
  );
}

export async function commitRun(input: CommitRunInput, context?: StoreContext): Promise<CommitRunResult> {
  return runWithFallback(
    'commitRun',
    context,
    () => supabaseStore.commitRun(input, context),
    () => memoryStore.commitRun(input, context),
  );
}

export async function deleteRunLogsOlderThan(cutoffIso: string, context?: StoreContext): Promise<number> {
  return runWithFallback(
    'deleteRunLogsOlderThan',
    context,
    () => supabaseStore.deleteRunLogsOlderThan(cutoffIso, context),
    () => memoryStore.deleteRunLogsOlderThan(cutoffIso, context),
  );
}

export async function getAppMeta<T = unknown>(key: string, context?: StoreContext): Promise<T | undefined> {
  return runWithFallback(
    'getAppMeta',
    context,
    () => supabaseStore.getMeta<T>(key, context),
    () => memoryStore.getMeta<T>(key, context),
  );
}

export async function setAppMeta<T = unknown>(key: string, value: T, context?: StoreContext): Promise<void> {
  await runWithFallback(
    'setAppMeta',
    context,
    () => supabaseStore.setMeta<T>(key, value, context),
    () => memoryStore.setMeta<T>(key, value, context),
  );
}
