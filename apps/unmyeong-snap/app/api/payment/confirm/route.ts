import { NextRequest } from "next/server";

import { ensureSupabaseOrFail, ok, fail } from "@/lib/api";
import {
  confirmPaymentOrder,
  findActiveEntitlement,
  getOrCreateConsent,
  getPaymentOrder,
  getSession,
  grantEntitlement
} from "@/lib/store";
import { getSessionIdFromRequest } from "@/lib/session";
import { trackServerEvent } from "@/lib/telemetry";
import { paymentConfirmSchema } from "@/lib/validators";

export async function POST(request: NextRequest) {
  const supabaseError = ensureSupabaseOrFail();
  if (supabaseError) {
    return supabaseError;
  }

  const json = await request.json().catch(() => ({}));
  const parsed = paymentConfirmSchema.safeParse(json);

  if (!parsed.success) {
    return fail("결제 승인 요청이 유효하지 않습니다.", 400, parsed.error.flatten());
  }

  const sessionId = getSessionIdFromRequest(parsed.data.sessionId);
  if (!sessionId) {
    return fail("세션이 필요합니다.", 401);
  }
  const session = await getSession(sessionId);
  if (!session) {
    return fail("세션이 만료되었습니다. 다시 시작해주세요.", 401);
  }

  const order = await getPaymentOrder(parsed.data.orderId);
  if (!order || order.sessionId !== session.sessionId) {
    return fail("주문 정보를 찾을 수 없습니다.", 404);
  }

  const updatedOrder = await confirmPaymentOrder(order.orderId, parsed.data.status);
  if (!updatedOrder) {
    return fail("주문 업데이트에 실패했습니다.", 500);
  }

  let entitlement = null;
  const consent = await getOrCreateConsent(session.sessionId);
  const context = {
    ip: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined,
    userAgent: request.headers.get("user-agent") ?? undefined,
    url: request.nextUrl.toString()
  };

  if (updatedOrder.status === "paid") {
    entitlement = await findActiveEntitlement(updatedOrder.sessionId, updatedOrder.reportId);
    if (!entitlement) {
      entitlement = await grantEntitlement(updatedOrder);
    }

    await trackServerEvent({
      eventName: "payment_confirmed",
      eventType: "marketing",
      sessionId: session.sessionId,
      pagePath: "/api/payment/confirm",
      sourceChannel: "server",
      consentSnapshot: consent,
      payload: {
        report_id: updatedOrder.reportId,
        product_code: updatedOrder.productCode,
        amount_krw: updatedOrder.amountKRW,
        order_id: updatedOrder.orderId,
        payment_status: updatedOrder.status
      },
      context
    });
  } else {
    await trackServerEvent({
      eventName: "payment_failed",
      eventType: "product",
      sessionId: session.sessionId,
      pagePath: "/api/payment/confirm",
      sourceChannel: "server",
      consentSnapshot: consent,
      payload: {
        report_id: updatedOrder.reportId,
        product_code: updatedOrder.productCode,
        amount_krw: updatedOrder.amountKRW,
        order_id: updatedOrder.orderId,
        payment_status: updatedOrder.status
      },
      context
    });
  }

  return ok({
    order: updatedOrder,
    entitlement
  });
}
