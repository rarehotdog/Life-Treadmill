import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { createSession, getSession, upsertProfile } from "@/lib/store";
import { getAttributionFromCookie, getSessionIdFromRequest, setSessionCookie } from "@/lib/session";
import { profileSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = profileSchema.safeParse(json);

  if (!parsed.success) {
    return fail("프로필 입력값이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  let sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  let session = await getSession(sessionId ?? undefined);

  if (!sessionId || !session) {
    session = await createSession(parsed.data.attribution ?? getAttributionFromCookie());
    sessionId = session.sessionId;
    setSessionCookie(sessionId);
  }

  const profile = await upsertProfile({
    sessionId,
    name: parsed.data.name,
    birthDate: parsed.data.birthDate,
    birthTime: parsed.data.birthTime,
    isBirthTimeUnknown: parsed.data.isBirthTimeUnknown,
    calendarType: parsed.data.calendarType,
    gender: parsed.data.gender,
    concernTopic: parsed.data.concernTopic
  });

  return ok({ profile }, 201);
}
