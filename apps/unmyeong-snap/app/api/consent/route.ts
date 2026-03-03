import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, fail, ok } from "@/lib/api";
import { createSession, getOrCreateConsent, getSession, updateConsent } from "@/lib/store";
import {
  getAttributionFromCookie,
  getSessionIdFromRequest,
  getUserAgent,
  setSessionCookie
} from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { consentUpdateSchema } from "@/lib/validators";

async function ensureSessionIdFromRequest(requestSessionId?: string) {
  let sessionId = getSessionIdFromRequest(requestSessionId) ?? undefined;
  if (sessionId) {
    const existing = await getSession(sessionId);
    if (existing) {
      return sessionId;
    }
  }

  const created = await createSession(getAttributionFromCookie(), getUserAgent());
  sessionId = created.sessionId;
  setSessionCookie(sessionId);
  return sessionId;
}

async function ensureKnownSessionId(requestSessionId?: string) {
  const sessionId = await ensureSessionIdFromRequest(requestSessionId);
  const existing = await getSession(sessionId);
  if (existing) {
    return sessionId;
  }

  const created = await createSession(getAttributionFromCookie(), getUserAgent());
  setSessionCookie(created.sessionId);
  return created.sessionId;
}

export async function GET(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const sessionId = await ensureKnownSessionId(request.nextUrl.searchParams.get("sessionId") ?? undefined);
  const consent = await getOrCreateConsent(sessionId);

  return ok({ sessionId, consent });
}

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!json) {
    return fail("유효한 JSON body가 필요합니다.", 400);
  }

  const parsed = consentUpdateSchema.safeParse(json);
  if (!parsed.success) {
    return fail("동의 업데이트 값이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  const inputSessionId = typeof json.sessionId === "string" ? json.sessionId : undefined;
  const sessionId = await ensureKnownSessionId(inputSessionId);
  const consent = await updateConsent(sessionId, parsed.data.marketingTracking);

  await trackServerEvent({
    eventName: "consent_updated",
    eventType: "system",
    sessionId,
    pagePath: "/api/consent",
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      essential_analytics: true,
      marketing_tracking: consent.marketingTracking
    }
  });

  return ok({ sessionId, consent });
}
