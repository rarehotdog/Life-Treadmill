# 운명스냅 (Unmyeong Snap)

한국 2030 대상 바이럴 운세-사주 PWA MVP입니다.

> 분리 공지: Telegram AI 비서는 이제 `apps/telegram-assistant` 전용 서비스로 분리 운영합니다.
> `unmyeong-snap`은 바이럴 앱 기능만 담당합니다.

## Stack

- Next.js App Router
- Tailwind CSS
- Supabase (required)
- Telegram Bot API (webhook + polling dev loop)
- OpenAI Responses API (primary)
- Anthropic Messages API (fallback)
- PortOne-ready payment flow (MVP mock confirm)
- Analytics fan-out: Amplitude + Meta Test Pixel
- PWA (manifest + service worker)

## Run

```bash
cd apps/unmyeong-snap
npm install
npm run dev
```

서버 시작 전에 `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 반드시 필요합니다.
누락 시 앱 부팅이 실패합니다.

## Environment

`.env.example`을 복사해 `.env.local`을 만드세요.

```bash
cp .env.example .env.local
```

## Public APIs

- `POST /api/session/start`
- `GET /api/consent`
- `POST /api/consent`
- `POST /api/profile`
- `POST /api/report/preview`
- `POST /api/payment/create`
- `POST /api/payment/confirm`
- `GET /api/report/:reportId`
- `POST /api/share/card`
- `POST /api/invite/create`
- `POST /api/invite/redeem`
- `GET /api/daily/today`
- `GET /api/analytics/health`

추가 내부 API:

- `GET /api/report/preview/:reportId`
- `POST /api/telemetry`

Telegram Assistant API:

- `POST /api/telegram/webhook`
- `POST /api/telegram/webhook/:botId`
- `POST /api/telegram/reminder/run`
- `GET /api/telegram/health`

## Data Flow

1. `session/start`: 유입 파라미터 + 익명 세션 생성
2. `profile`: 사용자 입력 저장
3. `report/preview`: 미리보기 생성
4. `payment/create -> payment/confirm`: 결제 생성/승인
5. `report/:reportId`: entitlement 확인 후 풀리포트 반환
6. `share/card`, `invite/*`: 공유 카드 + 친구 초대 궁합
7. `daily/today`: KST 기준 데일리 운세

## Supabase

- SQL 스키마: `supabase/schema.sql`
- 증분 마이그레이션: `supabase/migrations/20260227_growth_analytics.sql`
- 증분 마이그레이션(assistant): `supabase/migrations/20260227_telegram_assistant.sql`
- 증분 마이그레이션(assistant multi-bot): `supabase/migrations/20260227_telegram_multi_bot_v31.sql`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`가 없으면 API가 503으로 실패합니다.
- 분석 이벤트, 동의, attribution, 퍼널 이벤트는 SQL에서 바로 집계할 수 있도록 저장됩니다.

## Telegram Assistant Setup

5봇 이름(표시명):
- Tyler.Durden (orchestrator)
- 제갈량 / Zhuge Liang (LENS)
- Jensen Huang (BOLT)
- Hemingway, Ernest (INK)
- Alfred.Sentry (SENTRY)

1. `.env.local`에 Assistant 관련 환경변수를 채웁니다.
2. Supabase에 `20260227_telegram_assistant.sql` 마이그레이션을 적용합니다.
3. 로컬에서 Next 서버 실행 후 polling 개발 루프를 켭니다.

```bash
cd apps/unmyeong-snap
npm run dev
```

다른 터미널:

```bash
cd apps/unmyeong-snap
npm run telegram:dev:polling
```

운영(Vercel)에서는 `webhook` + `vercel.json` cron(UTC `23:00`, `13:00`)으로
KST `08:00`, `22:00` 리마인드가 동작합니다.

### Telegram 운영 스크립트

```bash
# webhook 상태 확인
npm run telegram:webhook:info -- tyler_durden

# 봇 명령어 등록 (botId 인자 필수)
npm run telegram:commands:set -- tyler_durden

# 봇 표시명/설명/About 텍스트 반영
npm run telegram:profile:set -- tyler_durden

# allowlist 설정을 위한 user_id/chat_id 확인
# (먼저 해당 bot에 아무 메시지 1개 전송)
npm run telegram:whoami -- tyler_durden

# webhook 등록 (botId별 endpoint)
TELEGRAM_WEBHOOK_URL=https://your-domain/api/telegram/webhook/tyler_durden npm run telegram:webhook:set -- tyler_durden

# webhook 등록/해제 스모크 테스트
TELEGRAM_WEBHOOK_URL=https://your-domain/api/telegram/webhook/tyler_durden npm run telegram:webhook:smoke -- tyler_durden

# 리마인드 수동 실행
npm run telegram:reminder:run
```

### Telegram 명령어

- `/start`
- `/help`
- `/pause`
- `/resume`
- `/summary`
- `/daily`
- `/review`
- `/panel`
- `/check`
- `/cost`

## Analytics Docs

- `docs/analytics/EVENT_TAXONOMY.md`
- `docs/analytics/KPI_DASHBOARD_SPEC.md`
- `docs/analytics/STAGING_VALIDATION_CHECKLIST.md`

## Staging Validation Script

```bash
cd apps/unmyeong-snap
BASE_URL=https://your-staging-domain npm run analytics:staging:check
```

GitHub Actions에서도 수동 실행 가능:
`.github/workflows/unmyeong-staging-validation.yml` (input: `base_url`)

## Company PC Lunch Workflow

- 운영 가이드: `docs/ops/COMPANY_PC_LUNCH_WORKFLOW.md`
- 커밋 범위 검증:

```bash
cd apps/unmyeong-snap
npm run office:verify:scope
```

- 점심시간 표준 검증:

```bash
cd apps/unmyeong-snap
npm run office:verify:lunch
```

- 보안 마감(`.env.local` 삭제):

```bash
cd apps/unmyeong-snap
npm run office:security:close -- --delete-env
```

## Notes

- 결제는 PortOne 연동을 위한 구조를 포함하고, 현재는 서버 confirm API로 모킹된 MVP입니다.
- 법적 고지(의료/투자 확정적 표현 금지)는 리포트 응답에 포함됩니다.
