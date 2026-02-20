import type { Pilot, RunLog } from '@/lib/types';

type StoreState = {
  pilots: Map<string, Pilot>;
  runLogsByPilot: Map<string, RunLog[]>;
};

const globalStore = globalThis as typeof globalThis & {
  __workpilotStore?: StoreState;
};

function getStore(): StoreState {
  if (!globalStore.__workpilotStore) {
    globalStore.__workpilotStore = {
      pilots: new Map<string, Pilot>(),
      runLogsByPilot: new Map<string, RunLog[]>()
    };
  }
  return globalStore.__workpilotStore;
}

export function savePilot(pilot: Pilot): Pilot {
  const store = getStore();
  store.pilots.set(pilot.id, pilot);
  return pilot;
}

export function getPilot(id: string): Pilot | undefined {
  return getStore().pilots.get(id);
}

export function updatePilot(id: string, updater: (pilot: Pilot) => Pilot): Pilot | undefined {
  const pilot = getPilot(id);
  if (!pilot) return undefined;
  const updated = updater(pilot);
  savePilot(updated);
  return updated;
}

export function addRunLog(log: RunLog): RunLog {
  const store = getStore();
  const existing = store.runLogsByPilot.get(log.pilotId) ?? [];
  const next = [log, ...existing].slice(0, 100);
  store.runLogsByPilot.set(log.pilotId, next);
  return log;
}

export function getRunLogs(pilotId: string, limit = 3): RunLog[] {
  return (getStore().runLogsByPilot.get(pilotId) ?? []).slice(0, limit);
}
