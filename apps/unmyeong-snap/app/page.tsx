import Link from "next/link";

import { PageEventTracker } from "@/components/page-event-tracker";
import { PRIVACY_NOTICE } from "@/lib/legal";

const bullets = [
  "사주/궁합/운세 핵심만 먼저 보여주는 미리보기",
  "첫 해설 990원 단건 결제",
  "인스타 스토리/카톡 공유 카드 자동 생성"
];

export default function HomePage() {
  return (
    <main className="px-6 pb-14 pt-10">
      <PageEventTracker eventName="landing_viewed" />
      <header className="rounded-3xl border border-ink/10 bg-ink px-6 py-10 text-cream shadow-card">
        <p className="mb-4 inline-block rounded-full bg-mint/35 px-3 py-1 text-xs font-bold text-cream">
          요즘 다들 공유하는 운세 리포트
        </p>
        <h1 className="hero-title font-[var(--font-title)] font-extrabold">
          사주 결과를
          <br />
          액션 카드로
          <br />
          바꿔보세요
        </h1>
        <p className="mt-5 text-sm leading-relaxed text-cream/90">
          연애, 진로, 관계 고민을 60초 입력으로 정리하고 바로 실행 가능한 행동 1개를 받으세요.
        </p>
      </header>

      <section className="mt-6 grid gap-3">
        {bullets.map((item) => (
          <article key={item} className="section-card px-4 py-4 text-sm font-medium text-ink/90">
            {item}
          </article>
        ))}
      </section>

      <section className="mt-7 rounded-2xl border border-coral/30 bg-coral/10 p-4">
        <p className="text-xs font-bold text-ink/70">오늘의 런칭 혜택</p>
        <p className="mt-2 text-3xl font-black tracking-tight text-coral">첫 해설 990원</p>
        <p className="mt-1 text-sm text-ink/70">미리보기는 무료, 결제 후 즉시 전체 해설 오픈</p>
      </section>

      <div className="mt-8 flex flex-col gap-3">
        <Link
          href="/quiz"
          className="rounded-2xl bg-ink px-5 py-4 text-center text-base font-bold text-cream transition hover:opacity-90"
        >
          60초 운명 진단 시작
        </Link>
        <Link
          href="/daily"
          className="rounded-2xl border border-ink/20 bg-white px-5 py-4 text-center text-sm font-semibold text-ink"
        >
          오늘의 한줄 운세 먼저 보기
        </Link>
      </div>

      <footer className="mt-8 text-xs leading-relaxed text-ink/60">
        <p>{PRIVACY_NOTICE}</p>
      </footer>
    </main>
  );
}
