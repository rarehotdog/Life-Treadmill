# WorkPilot MVP (Next.js 14)

Record -> Compile -> Run 흐름을 제공하는 해커톤용 MVP입니다.

## 핵심 기능
- Builder(`/`): Capture / Describe / Prompt 방식으로 업무 기록
- Compile: OpenAI Responses API 기반 워크플로우 스펙 생성
- Runner(`/pilot/[id]`): 단계 실행, 승인 체크포인트, 결과 마크다운
- Audit Log: 최근 실행 이력(시간/입력/결과 프리뷰/토큰)
- Credits: 기본 50, 실행 시 1 차감
- Edit/Patch: one-liner, 승인 토글, openai 프롬프트 수정 + version 증가

## 저장 전략 (1단계)
- 기본 저장소: Supabase Postgres
- 폴백 저장소: in-memory Map
- 정책: Supabase 호출 실패 시 자동으로 인메모리 폴백
- 공유 링크 접근: 공개 링크 유지 (익명 실행)
- RunLog 보존: 90일, 하루 1회 정리
  - 트리거: `POST /api/run` 시작 시점
  - 정리 실패: 요청 실패로 전파하지 않고 경고 로그만 남김

## Health Endpoint
- `GET /api/health`
- 응답 필드:
  - `storageMode`: `supabase` | `memory-fallback`
  - `dbReachable`: DB 연결 가능 여부
  - `openAIConfigured`: OpenAI 키 설정 여부
  - `version`
  - `fallbackReason`

## 기술 스택
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- shadcn 스타일 컴포넌트(Button/Input/Textarea/Card/Badge/Tabs/Separator)
- sonner toast
- OpenAI JS SDK (Responses API)
- Supabase JS SDK (서버 전용 키)
- react-markdown + remark-gfm

## 실행 방법
```bash
cd /Users/taehyeonkim/Documents/New project/workpilot
npm install
npm run dev
```

## 환경 변수
`.env.local` 파일 생성:
```bash
OPENAI_API_KEY=
OPENAI_MODEL=gpt-4o-mini

SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

설명:
- `OPENAI_API_KEY` 미설정 시 compile/run fallback 경로로 동작합니다.
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` 미설정 시 memory-fallback 모드로 동작합니다.

## DB Schema 적용
`workpilot/supabase/schema.sql`을 Supabase SQL Editor에서 실행합니다.

스키마 개요:
- `pilots`
- `run_logs`
- `app_meta`
- `commit_run_log(...)` RPC 함수 (credits 차감 + run log 저장 원자 처리)

## API
- `POST /api/pilots` (multipart/form-data)
  - 입력: `name`, `recordMode`, `captureFile`, `captureNote`, `taskDescription`, `inputsCsv`, `prompt`, `exampleInput`, `exampleOutput`
  - 반환: `{ pilot, url, compileMode }`
- `GET /api/pilots/[id]`
  - 반환: `{ pilot, runLogsLast3 }`
- `POST /api/run`
  - 입력: `{ pilotId, values }`
  - 반환: `{ output, creditsLeft, totalTokens?, runLog, mode }`
- `PATCH /api/pilots/[id]`
  - 입력: `{ oneLiner?, inputs?, steps? }`
  - 반환: `{ pilot }` (version 증가)
- `GET /api/health`
  - 반환: `{ ok, storageMode, dbReachable, openAIConfigured, version, ... }`

## 제약 사항
- 이미지 업로드: `image/*`만 허용, 5MB 이하
- Markdown 렌더: raw HTML 미허용
- 공개 링크는 인증 없이 접근 가능
- DB 장애 시 in-memory 폴백으로 가용성을 우선합니다

## 운영 원칙
- 이번 단계는 **Vercel Production 환경만** Supabase 키를 연결합니다.
- Preview/Development 환경은 DB 미연결을 기본값으로 둡니다.

## 수동 검증 체크리스트
1. `npm run lint`
2. `npm run typecheck`
3. `npm run build`
4. `GET /api/health`에서 `storageMode`/`dbReachable` 확인
5. Capture/Describe/Prompt 각각 `POST /api/pilots` 성공
6. `POST /api/run` 성공 시 credits 감소 + run log 저장 확인
7. credits 0에서 `POST /api/run`이 402 반환
8. `PATCH /api/pilots/[id]` 성공 시 `version` 증가

## 배포 추적
- 기준 문서: `workpilot/docs/DEPLOYMENT_TRACE.md`
