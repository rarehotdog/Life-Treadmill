import { deleteRunLogsOlderThan, getAppMeta, setAppMeta } from '@/lib/store';
import type { StoreContext } from '@/lib/store-contract';

const RETENTION_META_KEY = 'last_retention_at';
const RETENTION_DAYS = 90;
const RETENTION_INTERVAL_MS = 24 * 60 * 60 * 1000;

type RetentionMeta = {
  executedAt: string;
  deletedCount: number;
};

export type RetentionResult = {
  attempted: boolean;
  skipped: boolean;
  deletedCount: number;
  error?: string;
};

function nowIso(): string {
  return new Date().toISOString();
}

function parseRetentionMeta(value: unknown): RetentionMeta | undefined {
  if (!value || typeof value !== 'object') return undefined;

  const candidate = value as Partial<RetentionMeta>;
  if (typeof candidate.executedAt !== 'string') return undefined;
  if (typeof candidate.deletedCount !== 'number') return undefined;

  return {
    executedAt: candidate.executedAt,
    deletedCount: candidate.deletedCount,
  };
}

function shouldSkipExecution(lastExecutedAt: string): boolean {
  const lastTime = new Date(lastExecutedAt).getTime();
  if (Number.isNaN(lastTime)) return false;

  return Date.now() - lastTime < RETENTION_INTERVAL_MS;
}

export async function cleanupRunLogsOlderThan90Days(context?: StoreContext): Promise<RetentionResult> {
  try {
    const lastMeta = parseRetentionMeta(await getAppMeta<unknown>(RETENTION_META_KEY, context));
    if (lastMeta && shouldSkipExecution(lastMeta.executedAt)) {
      return {
        attempted: false,
        skipped: true,
        deletedCount: 0,
      };
    }

    const cutoff = new Date(Date.now() - RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();
    const deletedCount = await deleteRunLogsOlderThan(cutoff, context);

    await setAppMeta<RetentionMeta>(
      RETENTION_META_KEY,
      {
        executedAt: nowIso(),
        deletedCount,
      },
      context,
    );

    return {
      attempted: true,
      skipped: false,
      deletedCount,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown';
    const requestSuffix = context?.requestId ? ` requestId=${context.requestId}` : '';
    console.warn(`[retention] cleanup failed${requestSuffix} reason=${message}`);

    return {
      attempted: true,
      skipped: false,
      deletedCount: 0,
      error: message,
    };
  }
}
