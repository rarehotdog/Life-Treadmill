import type {
  StorageSchemaVersion,
  SyncOperationType,
  SyncOutboxItem,
} from '../types/app';

export const STORAGE_KEYS = {
  schemaVersion: 'ltr_schema_version',
  rolloutSeed: 'ltr_rollout_seed',
  syncOutbox: 'ltr_sync_outbox',

  profile: 'ltr_profile',
  quests: 'ltr_quests',
  questDate: 'ltr_questDate',
  techTree: 'ltr_techTree',
  customized: 'ltr_customized',
  energyToday: 'ltr_energyToday',
  energyDate: 'ltr_energyDate',
  futureSelfPrompt: 'ltr_futureSelfPrompt',
  voiceCheckIn: 'ltr_voiceCheckIn',
  failureLog: 'ltr_failureLog',
  questHistory: 'ltr_questHistory',
  userId: 'ltr_userId',

  stats: 'ltr_stats',
  badges: 'ltr_badges',

  yearImageLegacy: 'ltr_year_image',
  yearImage: (goalId: string) => `ltr_year_image_${goalId}`,
} as const;

const CURRENT_STORAGE_SCHEMA_VERSION: StorageSchemaVersion = 2;
const OUTBOX_MAX_ATTEMPTS = 15;

function canUseStorage(): boolean {
  return typeof window !== 'undefined' && !!window.localStorage;
}

export function safeParseJSON<T>(raw: string | null): T | null {
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export function getItemString(key: string): string | null {
  if (!canUseStorage()) return null;

  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function setItemString(key: string, value: string): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage write failures.
  }
}

export function getItemJSON<T>(key: string): T | null {
  return safeParseJSON<T>(getItemString(key));
}

export function setItemJSON<T>(key: string, value: T): void {
  setItemString(key, JSON.stringify(value));
}

export function removeItem(key: string): void {
  if (!canUseStorage()) return;

  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage remove failures.
  }
}

function getStorageSchemaVersion(): StorageSchemaVersion | 0 {
  const raw = getItemString(STORAGE_KEYS.schemaVersion);
  if (!raw) return 0;

  const parsed = Number.parseInt(raw, 10);
  if (parsed === 1 || parsed === 2) {
    return parsed;
  }

  return 0;
}

function migrateSchemaV1ToV2(): void {
  const legacyYearImage = getItemString(STORAGE_KEYS.yearImageLegacy);
  if (!legacyYearImage) return;

  const defaultGoalScopedKey = STORAGE_KEYS.yearImage('default');
  const alreadyScoped = getItemString(defaultGoalScopedKey);

  if (!alreadyScoped) {
    setItemString(defaultGoalScopedKey, legacyYearImage);
  }

  removeItem(STORAGE_KEYS.yearImageLegacy);
}

export function migrateStorageIfNeeded(): StorageSchemaVersion {
  if (!canUseStorage()) return CURRENT_STORAGE_SCHEMA_VERSION;

  const currentVersion = getStorageSchemaVersion();
  if (currentVersion >= CURRENT_STORAGE_SCHEMA_VERSION) {
    return CURRENT_STORAGE_SCHEMA_VERSION;
  }

  if (currentVersion < 2) {
    migrateSchemaV1ToV2();
  }

  setItemString(STORAGE_KEYS.schemaVersion, String(CURRENT_STORAGE_SCHEMA_VERSION));
  return CURRENT_STORAGE_SCHEMA_VERSION;
}

function readOutbox(): SyncOutboxItem[] {
  return getItemJSON<SyncOutboxItem[]>(STORAGE_KEYS.syncOutbox) ?? [];
}

function writeOutbox(items: SyncOutboxItem[]): void {
  setItemJSON(STORAGE_KEYS.syncOutbox, items);
}

export function getOutboxSize(): number {
  return readOutbox().length;
}

export function enqueueOutbox(
  operation: SyncOperationType,
  payload: unknown,
  idempotencyKey: string,
): SyncOutboxItem {
  const now = new Date().toISOString();
  const item: SyncOutboxItem = {
    id: `${operation}:${idempotencyKey}:${now}`,
    operation,
    idempotencyKey,
    payload,
    createdAt: now,
    updatedAt: now,
    attempts: 0,
  };

  const outbox = readOutbox();
  const deduped = outbox.filter((entry) => entry.idempotencyKey !== idempotencyKey);
  deduped.push(item);

  writeOutbox(deduped.slice(-300));

  return item;
}

export async function drainOutbox(
  executor: (item: SyncOutboxItem) => Promise<boolean>,
): Promise<{ processed: number; remaining: number; dropped: number }> {
  const outbox = readOutbox();
  if (!outbox.length) {
    return {
      processed: 0,
      remaining: 0,
      dropped: 0,
    };
  }

  const nextQueue: SyncOutboxItem[] = [];
  let processed = 0;
  let dropped = 0;

  for (const item of outbox) {
    try {
      const success = await executor(item);
      if (success) {
        processed += 1;
        continue;
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const nextAttempts = item.attempts + 1;
      if (nextAttempts >= OUTBOX_MAX_ATTEMPTS) {
        dropped += 1;
        continue;
      }

      nextQueue.push({
        ...item,
        attempts: nextAttempts,
        lastError: errorMessage,
        updatedAt: new Date().toISOString(),
      });

      continue;
    }

    const nextAttempts = item.attempts + 1;
    if (nextAttempts >= OUTBOX_MAX_ATTEMPTS) {
      dropped += 1;
      continue;
    }

    nextQueue.push({
      ...item,
      attempts: nextAttempts,
      updatedAt: new Date().toISOString(),
    });
  }

  writeOutbox(nextQueue);

  return {
    processed,
    remaining: nextQueue.length,
    dropped,
  };
}

export function getYearImage(goalId: string): string | null {
  const scopedKey = STORAGE_KEYS.yearImage(goalId);
  const scoped = getItemString(scopedKey);
  if (scoped) return scoped;

  const legacy = getItemString(STORAGE_KEYS.yearImageLegacy);
  if (!legacy) return null;

  // One-time migration from legacy key to goal-scoped key.
  setItemString(scopedKey, legacy);
  removeItem(STORAGE_KEYS.yearImageLegacy);
  return legacy;
}
