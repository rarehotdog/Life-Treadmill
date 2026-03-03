"use client";

import { FormEvent, useState } from "react";
import { useParams } from "next/navigation";

export default function InviteRedeemPage() {
  const params = useParams<{ code: string }>();
  const code = params.code;

  const [partnerName, setPartnerName] = useState("");
  const [result, setResult] = useState<{
    compatibilityScore: number;
    summary: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/invite/redeem", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, partnerName })
      });

      if (!response.ok) {
        throw new Error("초대 코드 처리 실패");
      }

      const json = (await response.json()) as {
        result: { compatibilityScore: number; summary: string };
      };

      setResult(json.result);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">친구 초대 궁합</h1>
      <p className="mt-2 text-sm text-ink/70">초대코드: {code}</p>

      <form onSubmit={onSubmit} className="mt-6 grid gap-3">
        <input
          value={partnerName}
          onChange={(event) => setPartnerName(event.target.value)}
          className="rounded-xl border border-ink/20 bg-white px-3 py-3"
          placeholder="상대 이름"
          required
        />
        <button
          disabled={loading || !partnerName}
          type="submit"
          className="rounded-xl bg-ink px-4 py-3 text-sm font-bold text-cream disabled:opacity-50"
        >
          {loading ? "궁합 계산 중..." : "궁합 생성하기"}
        </button>
      </form>

      {error ? <p className="mt-5 text-sm font-semibold text-coral">{error}</p> : null}

      {result ? (
        <section className="mt-6 section-card p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-coral">궁합 점수</p>
          <p className="mt-2 text-3xl font-black text-ink">{result.compatibilityScore}점</p>
          <p className="mt-3 text-sm leading-relaxed text-ink/85">{result.summary}</p>
        </section>
      ) : null}
    </main>
  );
}
