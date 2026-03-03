import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { getOrCreateConsent, getOrCreateFullReport, hasActiveEntitlement } from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";

export async function GET(_: Request, context: { params: { reportId: string } }) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const sessionId = getSessionIdFromRequest();
  if (!sessionId) {
    return fail("세션이 필요합니다.", 401);
  }

  if (!(await hasActiveEntitlement(sessionId, context.params.reportId))) {
    return fail("결제가 필요한 리포트입니다.", 402);
  }

  const report = await getOrCreateFullReport(sessionId, context.params.reportId);
  if (!report) {
    return fail("리포트를 생성할 수 없습니다.", 404);
  }

  const consent = await getOrCreateConsent(sessionId);
  await trackServerEvent({
    eventName: "full_report_viewed",
    eventType: "product",
    sessionId,
    pagePath: `/report/${context.params.reportId}`,
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      report_id: context.params.reportId
    }
  });

  return ok({ report });
}
