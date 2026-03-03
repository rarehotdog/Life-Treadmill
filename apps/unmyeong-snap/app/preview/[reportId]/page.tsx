"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import type { PreviewReport } from "@/lib/types";
import { trackClientEvent } from "@/lib/client-telemetry";

export default function PreviewReportPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;

  const [preview, setPreview] = useState<PreviewReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      return;
    }

    fetch(`/api/report/preview/${reportId}`)
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("미리보기 로드에 실패했습니다.");
        }
        const json = (await response.json()) as { preview: PreviewReport };
        setPreview(json.preview);
        trackClientEvent({
          eventName: "preview_viewed",
          eventType: "marketing",
          pagePath: `/preview/${reportId}`,
          payload: {
            report_id: reportId
          }
        });
      })
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "오류가 발생했습니다.";
        setError(message);
      });
  }, [reportId]);

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">
        미리보기 결과
      </h1>
      <p className="mt-2 text-sm text-ink/70">핵심 3줄과 행동 1개를 먼저 확인하세요.</p>

      {error ? <p className="mt-6 text-sm font-semibold text-coral">{error}</p> : null}

      {!preview && !error ? (
        <div className="mt-6 section-card p-5 text-sm text-ink/60">결과를 불러오는 중...</div>
      ) : null}

      {preview ? (
        <>
          <section className="mt-6 section-card space-y-3 p-5">
            {preview.summary.map((line) => (
              <p key={line} className="text-sm leading-relaxed text-ink/90">
                {line}
              </p>
            ))}
          </section>

          <section className="mt-4 section-card p-5">
            <p className="text-xs font-bold uppercase tracking-wide text-coral">이번주 행동 카드</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">{preview.actionCard}</p>
          </section>

          <section className="mt-4 section-card p-5">
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink/50">상세 해설 미리보기</p>
            <div className="blur-wall rounded-xl border border-ink/10 p-4">
              <p className="text-sm leading-relaxed text-ink/65">{preview.blurredDetail}</p>
            </div>
          </section>

          <div className="mt-6 grid gap-3">
            <Link
              href={`/payment?reportId=${preview.reportId}`}
              onClick={() =>
                trackClientEvent({
                  eventName: "paywall_clicked",
                  eventType: "product",
                  pagePath: `/preview/${preview.reportId}`,
                  payload: {
                    report_id: preview.reportId,
                    amount_krw: preview.priceKRW
                  }
                })
              }
              className="rounded-2xl bg-coral px-4 py-4 text-center text-base font-extrabold text-cream"
            >
              {preview.priceKRW.toLocaleString("ko-KR")}원으로 전체 해설 열기
            </Link>
            <Link
              href="/quiz"
              className="rounded-2xl border border-ink/20 bg-white px-4 py-4 text-center text-sm font-semibold text-ink"
            >
              입력 다시 하기
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
