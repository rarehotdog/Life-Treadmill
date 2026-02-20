# LIFE TREADMILLS (LTR)

LTR는 단순 챗봇이 아니라, 개인의 결정을 돕는 **Decision Terminal**입니다.  
수평 LLM과 정면 경쟁하지 않고, System-of-Record + 행동 루프 + 거버넌스 + 실행 레이어로 방어력을 만듭니다.

![Version](https://img.shields.io/badge/version-1.0.0-7C3AED)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

## Product Loop
1. Context: 에너지, 음성 체크인, 실패 로그, 완료 히스토리 수집
2. Think: Gemini 추론 + TechTree 갱신 + 실패 복구 경로 계산
3. Action: 오늘 퀘스트 실행, 실패 시 Recovery Quest 전환, XP/레벨 피드백

## Decision Terminal 프레임
- Intent Engine: 목표/가치/제약 상태화(`IntentState`)
- Decision Engine: 선택지/반증/근거/결정로그(`DecisionRecord`)
- Execution Engine: 실행/지연/스킵 기록(`ExecutionRecord`)
- Safety/Governance: 권한·감사·리스크(`GovernanceAuditLog`)
- KPI: 사용시간이 아닌 **DQI(Decision Quality Index)**

## 이번 라운드 고도화 핵심
- `App` 오케스트레이션 분리: `src/app/hooks/useAppOrchestrator.ts`
- 액션 경계 분리: `src/app/actions/orchestration.ts`
- 스토리지 신뢰성: schema migration + outbox + legacy key migration
- AI/DB 가드레일: timeout/retry/circuit-breaker/validation
- 모바일 타이포/간격: 토큰 클래스(`heading-*`, `body-*`, `screen-wrap-*`, `card-padding`, `modal-*`, `cta-*`) 통일
- Progress 고도화:
  - Decision Log(최근 14일) 목록 + 상세 바텀시트 회고 UI
  - Sync Reliability(online/offline, pending outbox, last drain, manual retry)
- 관측성 기반: `src/lib/telemetry.ts` + feature flag 기반 점진 적용
- 전략 고정: 최소수집·로컬우선 + Decision Quality 운영 + 골든셋 회귀

## 빠른 시작
```bash
npm install
npm run dev
```

개발 서버: [http://localhost:3000](http://localhost:3000)

## 검증
```bash
npm run lint
npm run build
npx tsc --noEmit
npm run qa:goldenset
```

현재 lint 기준:
- Error: 0
- Warning: `react-refresh/only-export-components` 경고 6건(의도적으로 유지)

## 실제 기기 기준 스크린샷 QA 자동화
모바일 QA를 375/390/430 기준으로 자동 캡처하고 체크리스트 리포트를 생성합니다.

1. Playwright 설치
```bash
npm install -D playwright
```

2. 앱 실행 중 QA 실행
```bash
npm run qa:screenshots
```

3. 출력
- 스크린샷: `artifacts/qa-screenshots/<timestamp>/`
- 리포트(JSON): `artifacts/qa-screenshots/<timestamp>/report.json`
- 리포트(Markdown): `artifacts/qa-screenshots/<timestamp>/report.md`
- 게이트 정책: `gatePolicy=error_only` (`failedChecks`만 차단, `warningChecks`는 보고용)

옵션:
```bash
# 실행 템플릿만 생성
npm run qa:screenshots:dry

# 외부 URL 대상 QA
node scripts/qa/screenshot-checklist.mjs --base-url https://your-staging-url
```

## GoldenSet 회귀 하니스
Decision 품질 회귀를 주간 자동 점검합니다.

```bash
# 주간 회귀
npm run qa:goldenset

# 월간 실제 결정 케이스 추가
npm run qa:goldenset:add -- --category B_decision_quality --prompt "실제 결정 사례 요약"
```

## 환경 변수
```bash
# AI / DB
VITE_GEMINI_API_KEY=
VITE_OPENAI_API_KEY=
VITE_OPENAI_MODEL=gpt-4o-mini
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Reliability feature rollouts (0-100)
VITE_FLAG_RELIABLE_STORAGE_V2_ROLLOUT=100
VITE_FLAG_AI_GUARDRAILS_V2_ROLLOUT=100
VITE_FLAG_TELEMETRY_V1_ROLLOUT=100
VITE_FLAG_DECISION_TERMINAL_V1_ROLLOUT=100
VITE_FLAG_DECISION_LOG_UI_V1_ROLLOUT=100
VITE_FLAG_SYNC_STATUS_UI_V1_ROLLOUT=100
VITE_FLAG_GOVERNANCE_AUDIT_V1_ROLLOUT=100
VITE_FLAG_GOLDENSET_V1_ROLLOUT=100

# Optional
VITE_GEMINI_TIMEOUT_MS=12000
VITE_AI_TIMEOUT_MS=12000
```

Gemini/OpenAI/Supabase 미설정 시, 앱은 로컬 fallback 경로로 동작합니다.

## 프로젝트 구조
```text
.
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── app/
│   │   ├── actions/
│   │   │   └── orchestration.ts
│   │   └── hooks/
│   │       └── useAppOrchestrator.ts
│   ├── config/
│   │   └── flags.ts
│   ├── types/
│   │   └── app.ts
│   ├── lib/
│   │   ├── app-domain.ts
│   │   ├── app-storage.ts
│   │   ├── gamification.ts
│   │   ├── gemini.ts
│   │   ├── governance.ts
│   │   ├── goldenset.ts
│   │   ├── supabase.ts
│   │   └── telemetry.ts
│   ├── components/
│   │   ├── OnboardingFlow.tsx
│   │   ├── gamification/
│   │   ├── mobile/
│   │   └── ui/
│   └── styles/
│       └── globals.css
├── docs/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── SLO.md
│   ├── OPERATIONS_RUNBOOK.md
│   ├── INCIDENT_PLAYBOOK.md
│   ├── GOLDENSET_HARNESS.md
│   ├── PRIVACY_GOVERNANCE_CHECKLIST.md
│   ├── goldenset/
│   │   └── cases.v1.json
│   ├── HACKATHON_ONE_PAGER.md
│   ├── GEMINI_PROMPTS.md
│   └── DEMO_SCRIPT_3MIN.md
├── index.html
├── package.json
└── vite.config.ts
```

## Reliability Design (요약)
- Storage
`migrateStorageIfNeeded()`로 schema version 관리

`ltr_year_image` -> `ltr_year_image_<goalId>` 무손실 마이그레이션

`enqueueOutbox()` / `drainOutbox()`로 쓰기 실패 복구

- Supabase
retry(지수 백오프) + outbox enqueue

idempotency key 기반 중복 write 완화

online 이벤트 시 outbox flush

- Gemini
timeout + circuit-breaker + 응답 schema validation

유효하지 않은 응답은 null 처리 후 deterministic fallback

## 문서
- 배포: [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)
- 운영 런북: [docs/OPERATIONS_RUNBOOK.md](docs/OPERATIONS_RUNBOOK.md)
- SLO: [docs/SLO.md](docs/SLO.md)
- 인시던트 대응: [docs/INCIDENT_PLAYBOOK.md](docs/INCIDENT_PLAYBOOK.md)
- 스크린샷 QA 체크리스트: [docs/SCREENSHOT_QA_CHECKLIST.md](docs/SCREENSHOT_QA_CHECKLIST.md)
- 골든셋 하니스: [docs/GOLDENSET_HARNESS.md](docs/GOLDENSET_HARNESS.md)
- 프라이버시/거버넌스 체크리스트: [docs/PRIVACY_GOVERNANCE_CHECKLIST.md](docs/PRIVACY_GOVERNANCE_CHECKLIST.md)
- 해커톤 원페이저: [docs/HACKATHON_ONE_PAGER.md](docs/HACKATHON_ONE_PAGER.md)
- Gemini 프롬프트: [docs/GEMINI_PROMPTS.md](docs/GEMINI_PROMPTS.md)
- 3분 데모 스크립트: [docs/DEMO_SCRIPT_3MIN.md](docs/DEMO_SCRIPT_3MIN.md)

## 라이선스
MIT
