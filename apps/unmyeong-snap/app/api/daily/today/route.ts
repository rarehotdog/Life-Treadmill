import { ensureSupabaseOrFail, ok } from "@/lib/api";
import { getKSTDateString } from "@/lib/date";
import { getDailyFortune, getOrCreateConsent } from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";

export async function GET() {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const sessionId = getSessionIdFromRequest();
  const date = getKSTDateString();
  const daily = getDailyFortune(date, sessionId ?? undefined);

  if (sessionId) {
    const consent = await getOrCreateConsent(sessionId);
    await trackServerEvent({
      eventName: "daily_viewed",
      eventType: "product",
      sessionId,
      pagePath: "/daily",
      sourceChannel: "server",
      consentSnapshot: consent,
      payload: {
        daily_date: date
      }
    });
  }

  return ok({ daily });
}
