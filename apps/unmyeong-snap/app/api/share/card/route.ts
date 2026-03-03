import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { createShareCard, getOrCreateConsent, getOrCreateFullReport, hasActiveEntitlement } from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { shareCardSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = shareCardSchema.safeParse(json);

  if (!parsed.success) {
    return fail("공유 카드 생성 요청이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  const sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  if (!sessionId) {
    return fail("세션이 필요합니다.", 401);
  }

  if (!(await hasActiveEntitlement(sessionId, parsed.data.reportId))) {
    return fail("공유 카드를 만들려면 리포트 결제가 필요합니다.", 402);
  }

  const report = await getOrCreateFullReport(sessionId, parsed.data.reportId);
  if (!report) {
    return fail("리포트를 찾을 수 없습니다.", 404);
  }

  const card = await createShareCard(
    sessionId,
    parsed.data.reportId,
    "이번 주 운세 핵심",
    report.sections.relationship,
    report.weeklyActionCard
  );

  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const consent = await getOrCreateConsent(sessionId);
  await trackServerEvent({
    eventName: "share_card_created",
    eventType: "product",
    sessionId,
    pagePath: "/api/share/card",
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      report_id: parsed.data.reportId
    }
  });

  return ok({
    card,
    shareUrl: `${base}/report/${parsed.data.reportId}`
  });
}
