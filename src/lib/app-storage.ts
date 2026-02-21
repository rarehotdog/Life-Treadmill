import type {
  DecisionQualitySnapshot,
  DecisionRecord,
  ExecutionRecord,
  GovernanceAuditLog,
  IntentState,
  StorageSchemaVersion,
  SyncDiagnostics,
  SyncDrainSummary,
  SyncOperationType,
  SyncOutboxItem,
} from '../types/app';

export const STORAGE_KEYS = {
  schemaVersion: 'ltr_schema_version',
  rolloutSeed: 'ltr_rollout_seed',
  syncOutbox: 'ltr_sync_outbox',
  syncLastDrain: 'ltr_sync_last_drain',

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
  intentState: 'ltr_intent_state',
  decisionLog: 'ltr_decision_log',
  executionLog: 'ltr_execution_log',
  governanceAuditLog: 'ltr_governance_audit_log',
  decisionQualitySnapshots: 'ltr_decision_quality_snapshots',
  goldenSetCases: 'ltr_golden_set_cases',
  privacyPrefs: 'ltr_privacy_prefs',

  stats: 'ltr_stats',
  badges: 'ltr_badges',

  yearImageLegacy: 'ltr_year_image',
  yearImage: (goalId: string) => `ltr_year_image_${goalId}`,
} as const;

const CURRENT_STORAGE_SCHEMA_VERSION: StorageSchemaVersion = 3;
const OUTBOX_MAX_ATTEMPTS = 15;

export type StorageWriteFailReason =
  | 'storage_unavailable'
  | 'serialization_failed'
  | 'write_failed';

export interface StorageWriteResult {
  success: boolean;
  reason?: StorageWriteFailReason;
}

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

export function setItemString(key: string, value: string): StorageWriteResult {
  if (!canUseStorage()) {
    return {
      success: false,
      reason: 'storage_unavailable',
    };
  }

  try {
    window.localStorage.setItem(key, value);
    return {
      success: true,
    };
  } catch {
    return {
      success: false,
      reason: 'write_failed',
    };
  }
}

export function getItemJSON<T>(key: string): T | null {
  return safeParseJSON<T>(getItemString(key));
}

export function setItemJSON<T>(key: string, value: T): StorageWriteResult {
  try {
    return setItemString(key, JSON.stringify(value));
  } catch {
    return {
      success: false,
      reason: 'serialization_failed',
    };
  }
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
  if (parsed === 1 || parsed === 2 || parsed === 3) {
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

function migrateSchemaV2ToV3(): void {
  const existingExecutionLog = getItemJSON<ExecutionRecord[]>(STORAGE_KEYS.executionLog) ?? [];
  if (existingExecutionLog.length > 0) return;

  const questHistory =
    getItemJSON<Record<string, { completed: number; total: number }>>(
      STORAGE_KEYS.questHistory,
    ) ?? {};
  const entries = Object.entries(questHistory);
  if (!entries.length) return;

  const migrated: ExecutionRecord[] = entries
    .sort((a, b) => (a[0] > b[0] ? -1 : 1))
    .map(([date, value], index) => {
      const completed = value.completed ?? 0;
      const total = value.total ?? 0;
      const status =
        total > 0 && completed >= total
          ? 'applied'
          : completed === 0
            ? 'delayed'
            : 'skipped';
      const delayMinutes = status === 'delayed' ? 15 : 0;
      const timestamp = `${date}T09:00:00.000Z`;

      return {
        id: `migration-v3-${index + 1}`,
        decisionId: 'migration-v2-history',
        actionType: 'quest_day_summary',
        scheduledAt: timestamp,
        executedAt: timestamp,
        status,
        delayMinutes,
      };
    });

  setItemJSON(STORAGE_KEYS.executionLog, migrated.slice(0, 365));
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

  if (currentVersion < 3) {
    migrateSchemaV2ToV3();
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

export function getOrInitJSON<T>(key: string, fallback: T): T {
  const existing = getItemJSON<T>(key);
  if (existing !== null) return existing;
  setItemJSON(key, fallback);
  return fallback;
}

export function appendBoundedArray<T>(key: string, item: T, maxLen: number): T[] {
  const existing = getItemJSON<T[]>(key) ?? [];
  const next = [item, ...existing].slice(0, maxLen);
  setItemJSON(key, next);
  return next;
}

export function recordIntentState(state: IntentState): IntentState {
  setItemJSON(STORAGE_KEYS.intentState, state);
  return state;
}

export function recordDecisionLog(record: DecisionRecord): DecisionRecord[] {
  return appendBoundedArray(STORAGE_KEYS.decisionLog, record, 500);
}

export function recordExecutionLog(record: ExecutionRecord): ExecutionRecord[] {
  return appendBoundedArray(STORAGE_KEYS.executionLog, record, 1000);
}

export function recordAuditLog(log: GovernanceAuditLog): GovernanceAuditLog[] {
  return appendBoundedArray(STORAGE_KEYS.governanceAuditLog, log, 1000);
}

export function recordQualitySnapshot(
  snapshot: DecisionQualitySnapshot,
): DecisionQualitySnapshot[] {
  return appendBoundedArray(STORAGE_KEYS.decisionQualitySnapshots, snapshot, 180);
}

export function recordSyncDrainSummary(summary: SyncDrainSummary): SyncDrainSummary {
  setItemJSON(STORAGE_KEYS.syncLastDrain, summary);
  return summary;
}

export function getSyncDiagnostics(): SyncDiagnostics {
  const online =
    typeof navigator === 'undefined' ? true : navigator.onLine;
  const outboxSize = getOutboxSize();
  const lastDrain = getItemJSON<SyncDrainSummary>(STORAGE_KEYS.syncLastDrain);

  return {
    online,
    outboxSize,
    lastDrain,
  };
}
