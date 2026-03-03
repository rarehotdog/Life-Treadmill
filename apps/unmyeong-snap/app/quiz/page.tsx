"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { setClientConsentState, setClientSessionId } from "@/lib/client-consent";
import { trackClientEvent } from "@/lib/client-telemetry";

type ConcernTopic = "love" | "career" | "relationship" | "wealth" | "health";

const concernOptions: { value: ConcernTopic; label: string }[] = [
  { value: "love", label: "연애" },
  { value: "career", label: "진로" },
  { value: "relationship", label: "인간관계" },
  { value: "wealth", label: "재물" },
  { value: "health", label: "건강" }
];

export default function QuizPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [birthTime, setBirthTime] = useState("");
  const [unknownTime, setUnknownTime] = useState(false);
  const [calendarType, setCalendarType] = useState<"solar" | "lunar">("solar");
  const [gender, setGender] = useState<"male" | "female" | "other">("female");
  const [concernTopic, setConcernTopic] = useState<ConcernTopic>("love");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const disabled = useMemo(() => loading || !name || !birthDate, [loading, name, birthDate]);

  useEffect(() => {
    trackClientEvent({
      eventName: "quiz_started",
      eventType: "product",
      pagePath: "/quiz"
    });
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const attributionRaw = localStorage.getItem("us_utm");
      const attribution = attributionRaw ? JSON.parse(attributionRaw) : undefined;

      const sessionRes = await fetch("/api/session/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attribution })
      });

      if (!sessionRes.ok) {
        throw new Error("세션 생성에 실패했습니다.");
      }

      const sessionJson = (await sessionRes.json()) as {
        session: { sessionId: string };
        consent?: {
          essentialAnalytics: true;
          marketingTracking: boolean;
          updatedAt: string;
        };
      };

      const sessionId = sessionJson.session.sessionId;
      setClientSessionId(sessionId);
      if (sessionJson.consent) {
        setClientConsentState(sessionJson.consent);
      }

      const profileRes = await fetch("/api/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId,
          name,
          birthDate,
          birthTime: unknownTime ? undefined : birthTime,
          isBirthTimeUnknown: unknownTime,
          calendarType,
          gender,
          concernTopic,
          attribution
        })
      });

      if (!profileRes.ok) {
        throw new Error("프로필 저장에 실패했습니다.");
      }

      const previewRes = await fetch("/api/report/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId })
      });

      if (!previewRes.ok) {
        throw new Error("미리보기 생성에 실패했습니다.");
      }

      const previewJson = (await previewRes.json()) as {
        preview: { reportId: string };
      };

      trackClientEvent({
        eventName: "quiz_completed",
        eventType: "product",
        sessionId,
        pagePath: "/quiz",
        payload: { concern_topic: concernTopic }
      });
      router.push(`/preview/${previewJson.preview.reportId}`);
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "오류가 발생했습니다.";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="px-6 pb-14 pt-8">
      <h1 className="font-[var(--font-title)] text-3xl font-extrabold tracking-tight text-ink">
        60초 운명 입력
      </h1>
      <p className="mt-2 text-sm text-ink/70">출생시를 몰라도 진행할 수 있어요.</p>

      <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
        <label className="grid gap-2 text-sm font-medium">
          이름
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-xl border border-ink/20 bg-white px-3 py-3"
            placeholder="홍길동"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          생년월일
          <input
            value={birthDate}
            onChange={(event) => setBirthDate(event.target.value)}
            className="rounded-xl border border-ink/20 bg-white px-3 py-3"
            placeholder="1998-07-11"
            required
          />
        </label>

        <label className="grid gap-2 text-sm font-medium">
          출생시
          <input
            value={birthTime}
            onChange={(event) => setBirthTime(event.target.value)}
            disabled={unknownTime}
            className="rounded-xl border border-ink/20 bg-white px-3 py-3 disabled:opacity-50"
            placeholder="09:30"
          />
        </label>

        <label className="flex items-center gap-2 text-sm">
          <input
            checked={unknownTime}
            onChange={(event) => setUnknownTime(event.target.checked)}
            type="checkbox"
          />
          출생시 모름
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setCalendarType("solar")}
            className={`rounded-xl border px-3 py-3 text-sm font-bold ${
              calendarType === "solar" ? "border-ink bg-ink text-cream" : "border-ink/20 bg-white"
            }`}
          >
            양력
          </button>
          <button
            type="button"
            onClick={() => setCalendarType("lunar")}
            className={`rounded-xl border px-3 py-3 text-sm font-bold ${
              calendarType === "lunar" ? "border-ink bg-ink text-cream" : "border-ink/20 bg-white"
            }`}
          >
            음력
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2">
          {[
            { value: "female", label: "여성" },
            { value: "male", label: "남성" },
            { value: "other", label: "기타" }
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => setGender(option.value as "male" | "female" | "other")}
              className={`rounded-xl border px-3 py-3 text-sm font-bold ${
                gender === option.value ? "border-ink bg-ink text-cream" : "border-ink/20 bg-white"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <fieldset className="grid gap-2">
          <legend className="text-sm font-semibold text-ink/80">가장 궁금한 주제</legend>
          <div className="grid grid-cols-2 gap-2">
            {concernOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setConcernTopic(option.value)}
                className={`rounded-xl border px-3 py-3 text-sm font-bold ${
                  concernTopic === option.value
                    ? "border-coral bg-coral text-cream"
                    : "border-ink/20 bg-white"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </fieldset>

        {error ? <p className="text-sm font-medium text-coral">{error}</p> : null}

        <button
          disabled={disabled}
          type="submit"
          className="mt-1 rounded-2xl bg-ink px-4 py-4 text-base font-bold text-cream disabled:opacity-50"
        >
          {loading ? "분석 준비 중..." : "무료 미리보기 만들기"}
        </button>
      </form>
    </main>
  );
}
