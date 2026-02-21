import type { Pilot, RunLog } from '@/lib/types';

export type StorageMode = 'supabase' | 'memory-fallback';

export type StoreContext = {
  requestId?: string;
};

export type CommitRunInput = {
  pilotId: string;
  log: RunLog;
};

export type CommitRunResult =
  | { status: 'success'; creditsLeft: number }
  | { status: 'insufficient_credits' }
  | { status: 'not_found' };

export interface PilotStoreAdapter {
  readonly adapterName: string;
  isConfigured(): boolean;
  ping(context?: StoreContext): Promise<boolean>;
  savePilot(pilot: Pilot, context?: StoreContext): Promise<Pilot>;
  getPilot(id: string, context?: StoreContext): Promise<Pilot | undefined>;
  updatePilot(id: string, updater: (pilot: Pilot) => Pilot, context?: StoreContext): Promise<Pilot | undefined>;
  getRunLogs(pilotId: string, limit: number, context?: StoreContext): Promise<RunLog[]>;
  commitRun(input: CommitRunInput, context?: StoreContext): Promise<CommitRunResult>;
  deleteRunLogsOlderThan(cutoffIso: string, context?: StoreContext): Promise<number>;
  getMeta<T = unknown>(key: string, context?: StoreContext): Promise<T | undefined>;
  setMeta<T = unknown>(key: string, value: T, context?: StoreContext): Promise<void>;
}
