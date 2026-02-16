# LIFE TREADMILLS (LTR)

> AI가 오늘의 맥락을 읽고, 실행 가능한 "다음 한 걸음"을 제안하는 모바일 중심 Life OS

![Version](https://img.shields.io/badge/version-1.0.0-7C3AED)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

## 왜 LTR인가
기존 목표 앱은 기록과 리마인드에 강하지만, "지금 무엇을 해야 하는가" 결정은 여전히 사용자 몫인 경우가 많습니다.
LTR는 이 결정을 줄이는 데 집중합니다.

- 문제: 의지 부족보다 **결정 피로(Decision Fatigue)**
- 해법: Context -> Think -> Action 루프 자동화
- 원칙: 실패는 리셋이 아니라 **경로 재계산 데이터**

## 핵심 루프
1. Context
- 에너지 체크인, 음성 텍스트, 실패 로그, 완료 이력을 수집

2. Think
- Gemini 추론으로 오늘의 퀘스트/인사이트/경로를 계산
- TechTree를 현재 상태 기준으로 갱신

3. Action
- Today 퀘스트 실행
- 실패 시 Recovery Quest로 즉시 전환
- XP/레벨/스트릭으로 행동 피드백 강화

## 현재 구현 기능
- 게스트 모드 즉시 시작 + 온보딩 기반 커스터마이징
- 오늘의 퀘스트 생성/재생성/완료/실패 처리
- 실패 원인 분석 + 대안 퀘스트 제안(Recovery Sheet)
- 음성 체크인 기반 저에너지 모드/다음 퀘스트 조정
- Energy Check-in + XP/레벨/배지/스트릭 반영
- TechTree 진행 및 복구 기반 reroute
- Share Card, Future Self Visualizer, LevelUp 모달
- 경량 UI 컴포넌트 세트(`src/components/ui/*`)

## 기술 스택
- Framework: React 18, TypeScript
- Build: Vite 6
- Style: Tailwind CSS v4
- Motion: motion
- AI: @google/generative-ai (Gemini)
- Backend(Optional): @supabase/supabase-js

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
│   │   ├── character/
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
```

- 현재 lint는 error 0 기준이며, 일부 `react-refresh/only-export-components` warning이 존재할 수 있습니다.

## 환경 변수
`.env` (루트) 예시:

```bash
VITE_GEMINI_API_KEY=your_gemini_key
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

- 미설정 시 Gemini/Supabase 기능은 자동 비활성화되고, 로컬 fallback 로직으로 동작합니다.

## 배포
배포 절차는 아래 문서를 참고하세요.

- [docs/DEPLOYMENT_GUIDE.md](docs/DEPLOYMENT_GUIDE.md)

요약:
- Build Command: `npm run build`
- Output Directory: `dist`
- SPA Redirect: `/* -> /index.html`

## 문서 모음
- 해커톤 원페이저: [docs/HACKATHON_ONE_PAGER.md](docs/HACKATHON_ONE_PAGER.md)
- Gemini 프롬프트 팩: [docs/GEMINI_PROMPTS.md](docs/GEMINI_PROMPTS.md)
- 3분 데모 스크립트: [docs/DEMO_SCRIPT_3MIN.md](docs/DEMO_SCRIPT_3MIN.md)

## 제품 방향성 (Roadmap)
- Context 신호 확장(일정/캘린더/행동 로그)
- 멀티모달 입력 고도화(voice/image)
- 장기 리포트(주간/월간 회고 자동 생성)
- 협업/코치 모드(피드백 루프)

## 라이선스
MIT

---
"성공은 의지를 더 쓰는 것이 아니라, 결정을 덜 하게 만드는 것에서 시작된다."
