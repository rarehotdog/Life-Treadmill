"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";

import type { FullReport } from "@/lib/types";

export default function FullReportPage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;

  const [report, setReport] = useState<FullReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [needsPayment, setNeedsPayment] = useState(false);

  useEffect(() => {
    if (!reportId) {
      return;
    }

    fetch(`/api/report/${reportId}`)
      .then(async (response) => {
        if (response.status === 402) {
          setNeedsPayment(true);
          return null;
        }

        if (!response.ok) {
          throw new Error("리포트 로드 실패");
        }

        const json = (await response.json()) as { report: FullReport };
        setReport(json.report);
        return json;
      })
      .catch((caught) => {
        const message = caught instanceof Error ? caught.message : "오류가 발생했습니다.";
        setError(message);
      });
  }, [reportId]);

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">풀 리포트</h1>
      <p className="mt-2 text-sm text-ink/70">연애/재물/관계/커리어 + 이번주 행동 카드</p>

      {needsPayment ? (
        <section className="mt-6 section-card p-5">
          <p className="text-sm font-semibold text-ink">결제가 필요한 리포트입니다.</p>
          <Link
            href={`/payment?reportId=${reportId}`}
            className="mt-4 inline-block rounded-xl bg-coral px-4 py-3 text-sm font-extrabold text-cream"
          >
            990원 결제하러 가기
          </Link>
        </section>
      ) : null}

      {error ? <p className="mt-6 text-sm font-semibold text-coral">{error}</p> : null}

      {!report && !error && !needsPayment ? (
        <section className="mt-6 section-card p-5 text-sm text-ink/60">리포트 생성 중...</section>
      ) : null}

      {report ? (
        <>
          <section className="mt-6 section-card grid gap-4 p-5">
            {Object.entries(report.sections).map(([key, value]) => (
              <article key={key} className="rounded-xl border border-ink/10 bg-white p-4">
                <p className="text-xs font-bold uppercase tracking-wide text-coral">{key}</p>
                <p className="mt-2 text-sm leading-relaxed text-ink/85">{value}</p>
              </article>
            ))}
          </section>

          <section className="mt-4 rounded-2xl border border-mint/40 bg-mint/15 p-4">
            <p className="text-xs font-bold uppercase tracking-wide text-ink/60">이번주 행동 카드</p>
            <p className="mt-2 text-sm font-semibold leading-relaxed text-ink">{report.weeklyActionCard}</p>
          </section>

          <div className="mt-6 grid gap-3">
            <Link
              href={`/share/${report.reportId}`}
              className="rounded-2xl bg-ink px-4 py-4 text-center text-sm font-bold text-cream"
            >
              공유 카드 만들기
            </Link>
            <p className="text-xs text-ink/55">{report.disclaimer}</p>
          </div>
        </>
      ) : null}
    </main>
  );
}
