"use client";

import { useEffect, useState } from "react";

import { trackClientEvent } from "@/lib/client-telemetry";
import type { DailyFortune } from "@/lib/types";

export default function DailyPage() {
  const [daily, setDaily] = useState<DailyFortune | null>(null);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    fetch("/api/daily/today")
      .then(async (response) => {
        if (!response.ok) {
          throw new Error("데일리 운세 로드 실패");
        }
        const json = (await response.json()) as { daily: DailyFortune };
        setDaily(json.daily);
        trackClientEvent({
          eventName: "daily_viewed",
          eventType: "product",
          pagePath: "/daily",
          payload: {
            daily_date: json.daily.date
          }
        });
      })
      .catch(() => {
        setDaily(null);
      });
  }, []);

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">오늘의 운세</h1>
      <p className="mt-2 text-sm text-ink/70">매일 오전 07:00 KST 기준 갱신</p>

      <section className="mt-6 section-card p-5">
        {!daily ? (
          <p className="text-sm text-ink/60">불러오는 중...</p>
        ) : (
          <>
            <p className="text-xs font-bold uppercase tracking-wide text-coral">One Liner</p>
            <p className="mt-2 text-lg font-bold text-ink">{daily.oneLiner}</p>
            <label className="mt-5 flex items-start gap-3 rounded-xl border border-ink/10 bg-white px-3 py-3 text-sm font-medium text-ink">
              <input checked={checked} onChange={(event) => setChecked(event.target.checked)} type="checkbox" />
              <span>{daily.actionCheck}</span>
            </label>
          </>
        )}
      </section>
    </main>
  );
}
