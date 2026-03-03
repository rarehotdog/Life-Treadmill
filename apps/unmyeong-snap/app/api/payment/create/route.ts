import { NextRequest } from "next/server";
import { nanoid } from "nanoid";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import { createPaymentOrder, getOrCreateConsent, getPreviewReport, getSession } from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { paymentCreateSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = paymentCreateSchema.safeParse(json);

  if (!parsed.success) {
    return fail("결제 생성 요청이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  const sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  if (!sessionId) {
    return fail("세션이 필요합니다.", 401);
  }
  const session = await getSession(sessionId);
  if (!session) {
    return fail("세션이 만료되었습니다. 다시 시작해주세요.", 401);
  }

  const preview = await getPreviewReport(parsed.data.reportId);
  if (!preview) {
    return fail("미리보기 리포트를 먼저 생성해주세요.", 404);
  }

  const idempotencyKey =
    parsed.data.idempotencyKey ?? request.headers.get("idempotency-key") ?? nanoid(12);

  const order = await createPaymentOrder(
    session.sessionId,
    parsed.data.reportId,
    parsed.data.productCode,
    idempotencyKey
  );

  const consent = await getOrCreateConsent(session.sessionId);
  await trackServerEvent({
    eventName: "payment_create_requested",
    eventType: "marketing",
    sessionId: session.sessionId,
    pagePath: "/api/payment/create",
    sourceChannel: "server",
    consentSnapshot: consent,
    payload: {
      report_id: order.reportId,
      product_code: order.productCode,
      amount_krw: order.amountKRW,
      order_id: order.orderId,
      payment_status: order.status
    },
    context: {
      ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
      userAgent: request.headers.get("user-agent") ?? undefined,
      url: request.nextUrl.toString()
    }
  });

  return ok(
    {
      order,
      portone: {
        storeId: process.env.NEXT_PUBLIC_PORTONE_STORE_ID ?? "",
        channelKey: process.env.NEXT_PUBLIC_PORTONE_CHANNEL_KEY ?? "",
        payMethod: "CARD"
      }
    },
    201
  );
}
