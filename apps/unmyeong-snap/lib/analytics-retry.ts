import { getSupabaseAdmin } from "@/lib/supabase";
import {
  getTelemetryEvent,
  persistTelemetryDeliveryFailed,
  sendTelemetryToDestination,
  updateEventDelivery,
  writeDeliveryLog
} from "@/lib/telemetry";
import type {
  TelemetryRetryDestination,
  TelemetryRetryJob,
  TelemetryRetryStatus
} from "@/lib/types";

const RETRY_BACKOFF_MINUTES = [1, 5, 15, 60, 360] as const;
export const MAX_RETRY_ATTEMPTS = 5;

export type RetryWorkerDestination = TelemetryRetryDestination | "all";

export interface TelemetryRetryRunOptions {
  limit?: number;
  destination?: RetryWorkerDestination;
  dryRun?: boolean;
}

export interface TelemetryRetryRunResult {
  processed: number;
  sent: number;
  failed: number;
  skipped: number;
  remaining: number;
  runAt: string;
}

export interface TelemetryDeliveryQueueSummary {
  ready: number;
  pending: number;
  processing: number;
  dead: number;
}

function redactError(message: string) {
  return message.length > 500 ? `${message.slice(0, 497)}...` : message;
}

function addMinutes(iso: string, minutes: number) {
  const base = new Date(iso).getTime();
  return new Date(base + minutes * 60_000).toISOString();
}

export function getRetryBackoffMinutes(attempt: number) {
  const index = Math.min(Math.max(attempt, 1), RETRY_BACKOFF_MINUTES.length) - 1;
  return RETRY_BACKOFF_MINUTES[index];
}

export function isRetryAttemptDead(attempt: number) {
  return attempt >= MAX_RETRY_ATTEMPTS;
}

function toRetryJob(row: Record<string, unknown>): TelemetryRetryJob {
  return {
    jobId: Number(row.job_id),
    eventId: String(row.event_id),
    destination: row.destination as TelemetryRetryDestination,
    status: row.status as TelemetryRetryStatus,
    attemptCount: Number(row.attempt_count ?? 0),
    nextRetryAt: String(row.next_retry_at),
    lastError: typeof row.last_error === "string" ? row.last_error : undefined,
    lockedAt: typeof row.locked_at === "string" ? row.locked_at : undefined,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at)
  };
}

async function countQueueByStatus(
  statuses: TelemetryRetryStatus[],
  destination: RetryWorkerDestination,
  nextRetryState?: "ready" | "pending",
  referenceTime?: string
) {
  const supabase = getSupabaseAdmin();
  let query = supabase
    .from("telemetry_delivery_queue")
    .select("job_id", { count: "exact", head: true })
    .in("status", statuses as never);

  if (destination !== "all") {
    query = query.eq("destination", destination as never);
  }

  if (nextRetryState === "ready" && referenceTime) {
    query = query.lte("next_retry_at", referenceTime);
  } else if (nextRetryState === "pending" && referenceTime) {
    query = query.gt("next_retry_at", referenceTime);
  }

  const { count, error } = await query;
  if (error) {
    throw error;
  }

  return count ?? 0;
}

async function fetchReadyJobs(limit: number, destination: RetryWorkerDestination, runAt: string) {
  const supabase = getSupabaseAdmin();

  let query = supabase
    .from("telemetry_delivery_queue")
    .select("*")
    .in("status", ["pending", "failed"] as never)
    .lte("next_retry_at", runAt)
    .order("next_retry_at", { ascending: true })
    .order("job_id", { ascending: true })
    .limit(limit);

  if (destination !== "all") {
    query = query.eq("destination", destination as never);
  }

  const { data, error } = await query;
  if (error) {
    throw error;
  }

  return ((data ?? []) as Array<Record<string, unknown>>).map(toRetryJob);
}

async function claimJob(job: TelemetryRetryJob, runAt: string) {
  const supabase = getSupabaseAdmin();

  const { data, error } = await supabase
    .from("telemetry_delivery_queue")
    .update({
      status: "processing",
      locked_at: runAt,
      updated_at: runAt
    } as never)
    .eq("job_id", job.jobId as never)
    .in("status", ["pending", "failed"] as never)
    .lte("next_retry_at", runAt)
    .select("*")
    .maybeSingle();

  if (error) {
    throw error;
  }

  if (!data) {
    return null;
  }

  return toRetryJob(data);
}

async function markJobSent(jobId: number, runAt: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("telemetry_delivery_queue")
    .update({
      status: "sent",
      locked_at: null,
      last_error: null,
      updated_at: runAt
    } as never)
    .eq("job_id", jobId as never)
    .throwOnError();
}

async function markJobFailure(job: TelemetryRetryJob, runAt: string, error: string) {
  const nextAttempt = job.attemptCount + 1;
  const isDead = isRetryAttemptDead(nextAttempt);

  const supabase = getSupabaseAdmin();
  await supabase
    .from("telemetry_delivery_queue")
    .update({
      status: isDead ? "dead" : "failed",
      attempt_count: nextAttempt,
      next_retry_at: isDead ? runAt : addMinutes(runAt, getRetryBackoffMinutes(nextAttempt)),
      last_error: redactError(error),
      locked_at: null,
      updated_at: runAt
    } as never)
    .eq("job_id", job.jobId as never)
    .throwOnError();

  return {
    nextAttempt,
    isDead
  };
}

async function markJobDead(jobId: number, runAt: string, error: string) {
  const supabase = getSupabaseAdmin();
  await supabase
    .from("telemetry_delivery_queue")
    .update({
      status: "dead",
      locked_at: null,
      last_error: redactError(error),
      updated_at: runAt
    } as never)
    .eq("job_id", jobId as never)
    .throwOnError();
}

export async function getTelemetryDeliveryQueueSummary(
  destination: RetryWorkerDestination = "all"
): Promise<TelemetryDeliveryQueueSummary> {
  const now = new Date().toISOString();

  const [ready, pending, processing, dead] = await Promise.all([
    countQueueByStatus(["pending", "failed"], destination, "ready", now),
    countQueueByStatus(["pending", "failed"], destination, "pending", now),
    countQueueByStatus(["processing"], destination),
    countQueueByStatus(["dead"], destination)
  ]);

  return {
    ready,
    pending,
    processing,
    dead
  };
}

export async function runTelemetryRetryWorker(
  options: TelemetryRetryRunOptions = {}
): Promise<TelemetryRetryRunResult> {
  const destination = options.destination ?? "all";
  const limit = Math.min(Math.max(options.limit ?? 100, 1), 500);
  const dryRun = options.dryRun ?? false;
  const runAt = new Date().toISOString();

  const candidateJobs = await fetchReadyJobs(limit, destination, runAt);

  if (dryRun) {
    const remaining = await countQueueByStatus(["pending", "failed"], destination, "ready", runAt);

    return {
      processed: candidateJobs.length,
      sent: 0,
      failed: 0,
      skipped: 0,
      remaining,
      runAt
    };
  }

  const result: TelemetryRetryRunResult = {
    processed: 0,
    sent: 0,
    failed: 0,
    skipped: 0,
    remaining: 0,
    runAt
  };

  for (const job of candidateJobs) {
    const claimed = await claimJob(job, runAt);
    if (!claimed) {
      continue;
    }

    result.processed += 1;

    const event = await getTelemetryEvent(claimed.eventId);
    if (!event) {
      await markJobDead(claimed.jobId, runAt, "telemetry event not found");
      result.failed += 1;
      continue;
    }

    try {
      const sendStatus = await sendTelemetryToDestination(event, claimed.destination);
      await markJobSent(claimed.jobId, runAt);

      const nextDelivery = {
        ...event.delivery,
        [claimed.destination]: sendStatus
      };
      await updateEventDelivery(event.eventId, nextDelivery, event.retryCount);

      await writeDeliveryLog({
        eventId: event.eventId,
        destination: claimed.destination,
        status: sendStatus,
        attempt: sendStatus === "skipped" ? claimed.attemptCount : claimed.attemptCount + 1,
        createdAt: runAt
      });

      if (sendStatus === "skipped") {
        result.skipped += 1;
      } else {
        result.sent += 1;
      }
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "retry delivery failed";
      const { nextAttempt } = await markJobFailure(claimed, runAt, message);

      const nextDelivery = {
        ...event.delivery,
        [claimed.destination]: "failed" as const
      };
      await updateEventDelivery(event.eventId, nextDelivery, event.retryCount + 1);

      await writeDeliveryLog({
        eventId: event.eventId,
        destination: claimed.destination,
        status: "failed",
        attempt: nextAttempt,
        error: redactError(message),
        createdAt: runAt
      });

      await persistTelemetryDeliveryFailed(event, claimed.destination, message);
      result.failed += 1;
    }
  }

  result.remaining = await countQueueByStatus(["pending", "failed"], destination, "ready", runAt);

  return result;
}
