import { NextRequest } from "next/server";

import { runTelemetryRetryWorker } from "@/lib/analytics-retry";
import { isCronAuthorized } from "@/lib/assistant-cron";
import { ensureSupabaseOrFail, fail, ok } from "@/lib/api";
import type { RetryWorkerDestination } from "@/lib/analytics-retry";

interface RetryRequestOptions {
  limit: number;
  destination: RetryWorkerDestination;
  dryRun: boolean;
}

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") {
    return value;
  }
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }
  if (normalized === "false") {
    return false;
  }
  return fallback;
}

function parseDestination(value: unknown): RetryWorkerDestination | null {
  if (typeof value !== "string" || !value.trim()) {
    return "all";
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "all" || normalized === "amplitude" || normalized === "meta") {
    return normalized;
  }

  return null;
}

function parseLimit(value: unknown) {
  if (value === undefined || value === null || value === "") {
    return 100;
  }

  const numeric = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(numeric)) {
    return 100;
  }

  return Math.min(Math.max(Math.floor(numeric), 1), 500);
}

async function readOptions(request: NextRequest): Promise<RetryRequestOptions | null> {
  const searchParams = request.nextUrl.searchParams;

  let body: Record<string, unknown> = {};
  if (request.method === "POST") {
    const parsed = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    body = parsed ?? {};
  }

  const destination = parseDestination(body.destination ?? searchParams.get("destination"));
  if (!destination) {
    return null;
  }

  return {
    limit: parseLimit(body.limit ?? searchParams.get("limit")),
    destination,
    dryRun: parseBoolean(body.dryRun ?? searchParams.get("dryRun"), false)
  };
}

function ensureAuthorized(request: NextRequest) {
  const cronSecret = process.env.CRON_SECRET?.trim();
  if (!cronSecret) {
    return fail("CRON_SECRET is not configured.", 503);
  }

  if (!isCronAuthorized(request)) {
    return fail("Unauthorized", 401);
  }

  return null;
}

async function handle(request: NextRequest) {
  const authError = ensureAuthorized(request);
  if (authError) {
    return authError;
  }

  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const options = await readOptions(request);
  if (!options) {
    return fail("destination은 amplitude|meta|all 이어야 합니다.", 400);
  }

  try {
    const result = await runTelemetryRetryWorker(options);
    return ok({ ...result });
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "retry worker execution failed";
    return fail(message, 500);
  }
}

export async function GET(request: NextRequest) {
  return handle(request);
}

export async function POST(request: NextRequest) {
  return handle(request);
}
