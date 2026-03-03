import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { createInviteLink, getOrCreateConsent, hasActiveEntitlement } from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { inviteCreateSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = inviteCreateSchema.safeParse(json);

  if (!parsed.success) {
    return fail("초대 링크 생성 요청이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  const sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  if (!sessionId) {
    return fail("세션이 필요합니다.", 401);
  }

  if (!(await hasActiveEntitlement(sessionId, parsed.data.reportId))) {
    return fail("초대 링크 생성은 결제 완료 리포트에서만 가능합니다.", 402);
  }

  const invite = await createInviteLink(sessionId, parsed.data.reportId);
  const base = process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000";

  const consent = await getOrCreateConsent(sessionId);
  await trackServerEvent({
    eventName: "invite_link_created",
    eventType: "product",
    sessionId,
    pagePath: "/api/invite/create",
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      report_id: parsed.data.reportId,
      invite_code: invite.code
    }
  });

  return ok(
    {
      invite,
      inviteUrl: `${base}/invite/${invite.code}`
    },
    201
  );
}
