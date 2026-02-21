import type { Pilot, RunLog } from '@/lib/types';
import type {
  CommitRunInput,
  CommitRunResult,
  PilotStoreAdapter,
  StoreContext,
} from '@/lib/store-contract';

type MemoryStoreState = {
  pilots: Map<string, Pilot>;
  runLogsByPilot: Map<string, RunLog[]>;
  meta: Map<string, unknown>;
};

const globalStore = globalThis as typeof globalThis & {
  __workpilotMemoryStore?: MemoryStoreState;
};

function getStore(): MemoryStoreState {
  if (!globalStore.__workpilotMemoryStore) {
    globalStore.__workpilotMemoryStore = {
      pilots: new Map<string, Pilot>(),
      runLogsByPilot: new Map<string, RunLog[]>(),
      meta: new Map<string, unknown>(),
    };
  }

  return globalStore.__workpilotMemoryStore;
}

function addRunLogInternal(log: RunLog): void {
  const store = getStore();
  const existing = store.runLogsByPilot.get(log.pilotId) ?? [];
  store.runLogsByPilot.set(log.pilotId, [log, ...existing].slice(0, 200));
}

export const memoryStore: PilotStoreAdapter = {
  adapterName: 'memory',

  isConfigured(): boolean {
    return true;
  },

  async ping(_context?: StoreContext): Promise<boolean> {
    return true;
  },

  async savePilot(pilot: Pilot, _context?: StoreContext): Promise<Pilot> {
    const store = getStore();
    store.pilots.set(pilot.id, pilot);
    return pilot;
  },

  async getPilot(id: string, _context?: StoreContext): Promise<Pilot | undefined> {
    return getStore().pilots.get(id);
  },

  async updatePilot(
    id: string,
    updater: (pilot: Pilot) => Pilot,
    _context?: StoreContext,
  ): Promise<Pilot | undefined> {
    const store = getStore();
    const existing = store.pilots.get(id);
    if (!existing) return undefined;

    const updated = updater(existing);
    store.pilots.set(id, updated);
    return updated;
  },

  async getRunLogs(pilotId: string, limit: number, _context?: StoreContext): Promise<RunLog[]> {
    return (getStore().runLogsByPilot.get(pilotId) ?? []).slice(0, limit);
  },

  async commitRun(input: CommitRunInput, _context?: StoreContext): Promise<CommitRunResult> {
    const store = getStore();
    const pilot = store.pilots.get(input.pilotId);

    if (!pilot) {
      return { status: 'not_found' };
    }

    if (pilot.credits <= 0) {
      return { status: 'insufficient_credits' };
    }

    const updatedPilot: Pilot = {
      ...pilot,
      credits: Math.max(0, pilot.credits - 1),
    };

    store.pilots.set(updatedPilot.id, updatedPilot);
    addRunLogInternal(input.log);

    return {
      status: 'success',
      creditsLeft: updatedPilot.credits,
    };
  },

  async deleteRunLogsOlderThan(cutoffIso: string, _context?: StoreContext): Promise<number> {
    const store = getStore();
    let deletedCount = 0;
    const cutoffTime = new Date(cutoffIso).getTime();

    for (const [pilotId, logs] of store.runLogsByPilot.entries()) {
      const nextLogs = logs.filter((log) => {
        const keep = new Date(log.createdAt).getTime() >= cutoffTime;
        if (!keep) deletedCount += 1;
        return keep;
      });
      store.runLogsByPilot.set(pilotId, nextLogs);
    }

    return deletedCount;
  },

  async getMeta<T = unknown>(key: string, _context?: StoreContext): Promise<T | undefined> {
    return getStore().meta.get(key) as T | undefined;
  },

  async setMeta<T = unknown>(key: string, value: T, _context?: StoreContext): Promise<void> {
    getStore().meta.set(key, value);
  },
};
