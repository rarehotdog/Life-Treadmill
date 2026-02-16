# LIFE TREADMILLS (LTR)

AI가 사용자 맥락을 기반으로 오늘 실행할 "다음 한 걸음"을 제안하는 모바일 중심 Life OS입니다.

## Core Loop
1. Context: 에너지, 음성 체크인, 실패 로그, 완료 이력 수집
2. Think: Gemini 기반 퀘스트/테크트리/인사이트 추론
3. Action: 오늘의 퀘스트 실행, 실패 복구, 진행 경로 갱신

## 현재 구현 범위
- 게스트 시작 + 온보딩 기반 커스터마이징
- Today 퀘스트 생성/완료/실패 복구 루프
- 음성 체크인 기반 다음 퀘스트 조정
- Energy 체크인 + XP/레벨/스트릭 반영
- TechTree 진행/리루트
- Share/FutureSelf/LevelUp 모달
- 경량 UI 컴포넌트 세트 (`src/components/ui`)

## 기술 스택
- React 18 + TypeScript
- Vite 6
- Tailwind CSS v4
- Motion
- Gemini API (`@google/generative-ai`)
- Supabase (`@supabase/supabase-js`)

## 로컬 실행
```bash
npm install
npm run dev
```

## 정적 검증
```bash
npm run lint
npm run build
```

## 환경 변수
`.env` 파일에 아래 값을 설정하면 AI/백엔드 기능이 활성화됩니다.

```bash
VITE_GEMINI_API_KEY=...
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

설정이 없으면 앱은 로컬 fallback 모드로 동작합니다.

## 프로젝트 구조
```text
.
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── types/
│   │   └── app.ts
│   ├── lib/
│   │   ├── app-domain.ts
│   │   ├── app-storage.ts
│   │   ├── gamification.ts
│   │   ├── gemini.ts
│   │   └── supabase.ts
│   ├── components/
│   │   ├── OnboardingFlow.tsx
│   │   ├── gamification/
│   │   ├── mobile/
│   │   └── ui/
│   └── styles/
│       └── globals.css
├── docs/
│   ├── DEPLOYMENT_GUIDE.md
│   ├── HACKATHON_ONE_PAGER.md
│   ├── GEMINI_PROMPTS.md
│   └── DEMO_SCRIPT_3MIN.md
├── index.html
├── package.json
└── vite.config.ts
```

## 문서
- 배포 가이드: [`docs/DEPLOYMENT_GUIDE.md`](docs/DEPLOYMENT_GUIDE.md)
- 해커톤 원페이저: [`docs/HACKATHON_ONE_PAGER.md`](docs/HACKATHON_ONE_PAGER.md)
- Gemini 프롬프트 팩: [`docs/GEMINI_PROMPTS.md`](docs/GEMINI_PROMPTS.md)
- 3분 데모 스크립트: [`docs/DEMO_SCRIPT_3MIN.md`](docs/DEMO_SCRIPT_3MIN.md)
