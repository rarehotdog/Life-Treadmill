import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { createSession, getOrCreateConsent } from "@/lib/store";
import { getAttributionFromCookie, getUserAgent, setSessionCookie } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { startSessionSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = startSessionSchema.safeParse(json);

  if (!parsed.success) {
    return fail("잘못된 세션 시작 요청입니다.", 400, parsed.error.flatten());
  }

  const attribution = parsed.data.attribution ?? getAttributionFromCookie();
  const session = await createSession(attribution, parsed.data.userAgent ?? getUserAgent());
  const consent = await getOrCreateConsent(session.sessionId);

  setSessionCookie(session.sessionId);
  await trackServerEvent({
    eventName: "session_started",
    eventType: "system",
    sessionId: session.sessionId,
    pagePath: "/api/session/start",
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      ...attribution
    }
  });

  return ok(
    {
      session,
      consent,
      locale: "ko-KR"
    },
    201
  );
}
