# WorkPilot MVP (Next.js 14)

Record → Compile → Run 흐름을 제공하는 해커톤용 MVP입니다.

## 핵심 기능
- Builder(`/`): Capture / Describe / Prompt 방식으로 업무 기록
- Compile: OpenAI Responses API 기반 워크플로우 스펙 생성
- Runner(`/pilot/[id]`): 단계 실행, 승인 체크포인트, 결과 마크다운
- Audit Log: 최근 실행 이력(시간/입력/결과 프리뷰/토큰)
- Credits: 기본 50, 실행 시 1 차감
- Edit/Patch: one-liner, 승인 토글, openai 프롬프트 수정 + version 증가

## 기술 스택
- Next.js 14 App Router + TypeScript
- Tailwind CSS
- shadcn 스타일 컴포넌트(Button/Input/Textarea/Card/Badge/Tabs/Separator)
- sonner toast
- OpenAI JS SDK (Responses API)
- react-markdown + remark-gfm
- 인메모리 저장(Map)

## 실행 방법
```bash
cd /Users/taehyeonkim/Documents/New project/workpilot
npm install
npm run dev
```

## 환경변수
`.env.local` 파일 생성:
```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-4o-mini
```

OpenAI 키가 없어도 fallback compile/run으로 앱은 동작합니다.

## API
- `POST /api/pilots` (multipart/form-data)
  - 입력: `name`, `recordMode`, `captureFile`, `captureNote`, `taskDescription`, `inputsCsv`, `prompt`, `exampleInput`, `exampleOutput`
  - 반환: `{ pilot, url }`
- `GET /api/pilots/[id]`
  - 반환: `{ pilot, runLogsLast3 }`
- `POST /api/run`
  - 입력: `{ pilotId, values }`
  - 반환: `{ output, creditsLeft, totalTokens?, runLog }`
- `PATCH /api/pilots/[id]`
  - 입력: `{ oneLiner?, inputs?, steps? }`
  - 반환: `{ pilot }` (version 증가)

## 제약 사항
- 이미지 업로드: `image/*`만 허용, 5MB 이하
- Markdown 렌더: raw HTML 미허용
- 저장소는 인메모리이므로 서버 재시작 시 데이터가 초기화됩니다.
