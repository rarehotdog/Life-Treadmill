import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { buildInviteResult } from "@/lib/report-engine";
import { createSession, getInvite, getOrCreateConsent, getProfile, redeemInvite } from "@/lib/store";
import { getSessionIdFromRequest, setSessionCookie } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { inviteRedeemSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = inviteRedeemSchema.safeParse(json);

  if (!parsed.success) {
    return fail("초대 리딤 요청이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  let sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  if (!sessionId) {
    const session = await createSession();
    sessionId = session.sessionId;
    setSessionCookie(sessionId);
  }

  const invite = await getInvite(parsed.data.code);
  if (!invite) {
    return fail("유효하지 않은 초대 코드입니다.", 404);
  }

  const ownerProfile = await getProfile(invite.ownerSessionId);
  const ownerName = ownerProfile?.name ?? "친구";

  const updated = await redeemInvite(parsed.data.code, sessionId);
  if (!updated) {
    return fail("초대 코드 처리에 실패했습니다.", 500);
  }

  const result = buildInviteResult(ownerName, parsed.data.partnerName, parsed.data.code);
  result.ownerSessionId = invite.ownerSessionId;
  result.redeemerSessionId = sessionId;

  const consent = await getOrCreateConsent(sessionId);
  await trackServerEvent({
    eventName: "invite_redeemed",
    eventType: "product",
    sessionId,
    pagePath: "/api/invite/redeem",
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      invite_code: parsed.data.code,
      owner_session_id: invite.ownerSessionId
    }
  });

  return ok({
    result,
    rewardGranted: true
  });
}
