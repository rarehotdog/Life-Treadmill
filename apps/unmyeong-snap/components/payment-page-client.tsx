"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { trackClientEvent } from "@/lib/client-telemetry";

const PLANS = [
  { code: "single_990", title: "첫 해설 단건", price: 990, desc: "오늘 리포트 즉시 오픈" },
  { code: "premium_monthly_4900", title: "프리미엄 구독", price: 4900, desc: "월간 리포트 + 데일리 강화" },
  { code: "special_2900", title: "특집 리포트", price: 2900, desc: "시즌 운세/분기 리포트" }
] as const;

const PAYMENT_METHODS = [
  { code: "card", title: "카드 결제", desc: "일반 결제 + 3DS 인증" },
  { code: "kakaopay", title: "카카오페이", desc: "간편 인증 후 결제" },
  { code: "naverpay", title: "네이버페이", desc: "네이버페이로 빠르게 결제" }
] as const;

type PlanCode = (typeof PLANS)[number]["code"];
type PaymentMethodCode = (typeof PAYMENT_METHODS)[number]["code"];
type SimulatedResult = "paid" | "failed" | "cancelled" | "3ds_failed";

interface RecoveryState {
  mode: Exclude<SimulatedResult, "paid">;
  orderId: string;
  message: string;
}

export function PaymentPageClient({ reportId }: { reportId: string }) {
  const router = useRouter();

  const [selected, setSelected] = useState<PlanCode>("single_990");
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethodCode>("card");
  const [loading, setLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [simulatorOpen, setSimulatorOpen] = useState(false);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [recovery, setRecovery] = useState<RecoveryState | null>(null);

  const selectedPlan = useMemo(
    () => PLANS.find((plan) => plan.code === selected) ?? PLANS[0],
    [selected]
  );

  const selectedMethodLabel = useMemo(
    () => PAYMENT_METHODS.find((method) => method.code === selectedMethod)?.title ?? "카드 결제",
    [selectedMethod]
  );

  function getFailureMessage(result: Exclude<SimulatedResult, "paid">) {
    if (result === "cancelled") {
      return "결제가 취소되었습니다. 다시 시도하거나 결제 수단을 변경해주세요.";
    }
    if (result === "3ds_failed") {
      return "3DS 본인인증이 완료되지 않았습니다. 인증 가능한 카드로 다시 시도해주세요.";
    }
    return "결제 승인에 실패했습니다. 결제 수단을 변경하거나 잠시 후 재시도해주세요.";
  }

  function getPaymentStatus(result: SimulatedResult) {
    if (result === "paid") {
      return "paid";
    }
    if (result === "cancelled") {
      return "cancelled";
    }
    return "failed";
  }

  async function createOrder() {
    const createRes = await fetch("/api/payment/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": `pay-${reportId}-${selected}-${selectedMethod}-${Date.now()}`
      },
      body: JSON.stringify({
        reportId,
        productCode: selected
      })
    });

    if (!createRes.ok) {
      throw new Error("결제 주문 생성에 실패했습니다.");
    }

    const createJson = (await createRes.json()) as {
      order: { orderId: string };
    };

    const orderId = createJson.order.orderId;
    setActiveOrderId(orderId);

    trackClientEvent({
      eventName: "payment_webview_opened",
      eventType: "product",
      pagePath: "/payment",
      payload: {
        report_id: reportId,
        order_id: orderId,
        product_code: selected,
        amount_krw: selectedPlan.price,
        payment_method: selectedMethod,
        simulated: true
      }
    });

    return orderId;
  }

  async function openPaymentSimulator() {
    if (!reportId) {
      setError("reportId가 누락되었습니다.");
      return;
    }

    if (simulatorOpen || loading || simulating) {
      return;
    }

    setError(null);
    setRecovery(null);
    setLoading(true);

    try {
      await createOrder();
      setSimulatorOpen(true);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "결제 주문 생성 중 오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  async function confirmPayment(result: SimulatedResult) {
    if (!activeOrderId) {
      setError("주문 정보가 없습니다. 결제를 다시 시작해주세요.");
      setSimulatorOpen(false);
      return;
    }

    setSimulating(true);
    setError(null);

    try {
      const paymentStatus = getPaymentStatus(result);
      const confirmRes = await fetch("/api/payment/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: activeOrderId,
          status: paymentStatus
        })
      });

      if (!confirmRes.ok) {
        throw new Error("결제 승인 처리에 실패했습니다.");
      }

      if (result === "paid") {
        setSimulatorOpen(false);
        setRecovery(null);
        router.replace(`/report/${reportId}`);
        return;
      }

      const message = getFailureMessage(result);
      setRecovery({
        mode: result,
        orderId: activeOrderId,
        message
      });
      setSimulatorOpen(false);

      trackClientEvent({
        eventName: "payment_failed",
        eventType: "product",
        pagePath: "/payment",
        payload: {
          report_id: reportId,
          order_id: activeOrderId,
          product_code: selected,
          amount_krw: selectedPlan.price,
          payment_status: paymentStatus,
          payment_method: selectedMethod,
          failure_mode: result,
          simulated: true
        }
      });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "결제 처리 중 오류가 발생했습니다.";
      setError(message);
      setSimulatorOpen(false);
    } finally {
      setSimulating(false);
    }
  }

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">
        결제하기
      </h1>
      <p className="mt-2 text-sm text-ink/70">
        PortOne 실결제 전 단계로, 실패 복구 UX를 포함한 모의 결제 흐름입니다.
      </p>

      <section className="mt-6 grid gap-3">
        {PLANS.map((plan) => (
          <button
            key={plan.code}
            type="button"
            onClick={() => setSelected(plan.code)}
            className={`section-card p-4 text-left ${
              selected === plan.code ? "border-coral ring-2 ring-coral/40" : ""
            }`}
          >
            <p className="text-xs font-bold uppercase tracking-wide text-ink/60">{plan.title}</p>
            <p className="mt-1 text-2xl font-black tracking-tight text-ink">
              {plan.price.toLocaleString("ko-KR")}원
            </p>
            <p className="mt-1 text-sm text-ink/70">{plan.desc}</p>
          </button>
        ))}
      </section>

      <section className="mt-5 section-card p-4">
        <p className="text-xs font-bold uppercase tracking-wide text-ink/60">결제 수단 선택</p>
        <div className="mt-3 grid gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method.code}
              type="button"
              onClick={() => setSelectedMethod(method.code)}
              className={`rounded-xl border px-3 py-3 text-left transition ${
                selectedMethod === method.code
                  ? "border-coral bg-coral/10"
                  : "border-ink/15 bg-white hover:border-ink/30"
              }`}
            >
              <p className="text-sm font-bold text-ink">{method.title}</p>
              <p className="mt-0.5 text-xs text-ink/65">{method.desc}</p>
            </button>
          ))}
        </div>
      </section>

      {recovery ? (
        <section className="mt-5 rounded-2xl border border-coral/35 bg-coral/10 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-coral">결제 복구 안내</p>
          <p className="mt-2 text-sm font-semibold text-ink">{recovery.message}</p>
          <p className="mt-1 text-xs text-ink/70">주문번호: {recovery.orderId}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void openPaymentSimulator()}
              className="rounded-xl bg-ink px-3 py-2 text-sm font-bold text-cream"
            >
              같은 수단으로 재시도
            </button>
            <button
              type="button"
              onClick={() => setRecovery(null)}
              className="rounded-xl border border-ink/25 bg-white px-3 py-2 text-sm font-semibold text-ink"
            >
              수단 바꿔서 시도
            </button>
            <button
              type="button"
              onClick={() => router.push(`/preview/${reportId}`)}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-semibold text-ink"
            >
              미리보기로 이동
            </button>
          </div>
        </section>
      ) : null}

      {error ? (
        <section className="mt-5 rounded-2xl border border-coral/30 bg-coral/10 p-4">
          <p className="text-sm font-semibold text-coral">{error}</p>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={() => void openPaymentSimulator()}
              className="rounded-xl bg-ink px-3 py-2 text-sm font-bold text-cream"
            >
              다시 시도
            </button>
            <button
              type="button"
              onClick={() => router.push("/")}
              className="rounded-xl border border-ink/20 bg-white px-3 py-2 text-sm font-semibold text-ink"
            >
              홈으로
            </button>
          </div>
        </section>
      ) : null}

      <button
        disabled={loading || simulating}
        type="button"
        onClick={() => void openPaymentSimulator()}
        className="mt-6 w-full rounded-2xl bg-coral px-4 py-4 text-base font-extrabold text-cream disabled:opacity-50"
      >
        {loading
          ? "주문 생성 중..."
          : `${selectedPlan.price.toLocaleString("ko-KR")}원 결제창 열기 (${selectedMethodLabel})`}
      </button>

      <p className="mt-3 text-xs text-ink/55">실패/취소/3DS 실패를 모의 재현해 복구 시나리오를 검증할 수 있습니다.</p>

      {simulatorOpen ? (
        <div className="fixed inset-0 z-50 bg-ink/45 px-4 py-8">
          <div className="mx-auto max-w-md rounded-3xl border border-ink/10 bg-cream p-5 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-coral">Mock Payment WebView</p>
            <h2 className="mt-1 text-xl font-black text-ink">모의 결제창</h2>
            <p className="mt-2 text-sm text-ink/75">
              주문번호 {activeOrderId ?? "-"} / {selectedMethodLabel} / {selectedPlan.price.toLocaleString("ko-KR")}원
            </p>

            <div className="mt-4 grid grid-cols-1 gap-2">
              <button
                type="button"
                disabled={simulating}
                onClick={() => void confirmPayment("paid")}
                className="rounded-xl bg-ink px-3 py-3 text-sm font-bold text-cream disabled:opacity-50"
              >
                결제 성공
              </button>
              <button
                type="button"
                disabled={simulating}
                onClick={() => void confirmPayment("failed")}
                className="rounded-xl border border-coral/45 bg-coral/10 px-3 py-3 text-sm font-semibold text-ink disabled:opacity-50"
              >
                승인 실패
              </button>
              <button
                type="button"
                disabled={simulating}
                onClick={() => void confirmPayment("3ds_failed")}
                className="rounded-xl border border-coral/45 bg-white px-3 py-3 text-sm font-semibold text-ink disabled:opacity-50"
              >
                3DS 인증 실패
              </button>
              <button
                type="button"
                disabled={simulating}
                onClick={() => void confirmPayment("cancelled")}
                className="rounded-xl border border-ink/25 bg-white px-3 py-3 text-sm font-semibold text-ink disabled:opacity-50"
              >
                사용자 취소
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  );
}
