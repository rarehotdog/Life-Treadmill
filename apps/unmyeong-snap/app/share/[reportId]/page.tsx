"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";

import type { ShareCard } from "@/lib/types";

export default function SharePage() {
  const params = useParams<{ reportId: string }>();
  const reportId = params.reportId;

  const [card, setCard] = useState<ShareCard | null>(null);
  const [shareUrl, setShareUrl] = useState("");
  const [inviteUrl, setInviteUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!reportId) {
      return;
    }

    (async () => {
      try {
        const cardRes = await fetch("/api/share/card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId })
        });

        if (!cardRes.ok) {
          throw new Error("공유 카드 생성 실패");
        }

        const cardJson = (await cardRes.json()) as { card: ShareCard; shareUrl: string };
        setCard(cardJson.card);
        setShareUrl(cardJson.shareUrl);

        const inviteRes = await fetch("/api/invite/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ reportId })
        });

        if (inviteRes.ok) {
          const inviteJson = (await inviteRes.json()) as { inviteUrl: string };
          setInviteUrl(inviteJson.inviteUrl);
        }
      } catch (caught) {
        const message = caught instanceof Error ? caught.message : "오류가 발생했습니다.";
        setError(message);
      }
    })();
  }, [reportId]);

  async function copy(text: string) {
    await navigator.clipboard.writeText(text);
  }

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">공유 카드</h1>
      <p className="mt-2 text-sm text-ink/70">스토리 업로드/카톡 전달에 맞춘 9:16 카드</p>

      {error ? <p className="mt-6 text-sm font-semibold text-coral">{error}</p> : null}

      {!card && !error ? (
        <section className="mt-6 section-card p-5 text-sm text-ink/60">카드 생성 중...</section>
      ) : null}

      {card ? (
        <>
          <section className="mt-6 overflow-hidden rounded-2xl border border-ink/15 bg-white p-2">
            <Image
              alt="share-card"
              src={card.imageSvgDataUrl}
              width={1080}
              height={1920}
              unoptimized
              className="h-auto w-full rounded-xl"
            />
          </section>

          <div className="mt-4 grid gap-2">
            <button
              type="button"
              onClick={() => copy(shareUrl)}
              className="rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              리포트 링크 복사
            </button>

            {inviteUrl ? (
              <button
                type="button"
                onClick={() => copy(inviteUrl)}
                className="rounded-xl border border-ink/20 bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                친구 초대 링크 복사 (궁합 생성)
              </button>
            ) : null}

            <Link
              href={`/daily`}
              className="rounded-xl bg-ink px-4 py-3 text-center text-sm font-bold text-cream"
            >
              데일리 운세로 돌아가기
            </Link>
          </div>
        </>
      ) : null}
    </main>
  );
}
