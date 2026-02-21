# LIFE TREADMILLS (LTR)

> **LTR는 목표 관리 앱이 아니라 Decision Terminal입니다.**  
> 목표를 기록하는 앱이 아니라, 매일의 맥락을 실행 가능한 다음 행동으로 바꾸는 Life/Agency OS입니다.

![Version](https://img.shields.io/badge/version-1.0.0-7C3AED)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

## TL;DR
- 문제: 사람은 의지가 약해서가 아니라, 결정을 너무 많이 해서 목표를 놓칩니다.
- 해법: LTR는 Context -> Think -> Action 루프로 불필요한 결정을 제거합니다.
- 현재 강점: 실패 복구 루프, Decision Log, Sync Reliability, DQI, GoldenSet/QA 운영 기반.
- 방향: App Store 상위 생산성 앱의 UX 트렌드를 흡수하되, KPI는 체류시간이 아닌 **결정 품질 개선**으로 고정.

## Why LTR
대부분의 생산성 앱은 기록과 리마인더에 강합니다.  
하지만 실제로 필요한 것은 "지금 당장 무엇을 할지"에 대한 **판단 비용 절감**입니다.

LTR는 아래 가설로 설계됩니다.
1. 실행 실패의 핵심 원인은 의지력보다 결정 피로다.
2. 실패를 리셋하지 않고 데이터로 재해석하면 다음 실행 확률이 올라간다.
3. 좋은 제품은 사용시간을 늘리는 것이 아니라, 좋은 결정을 더 빨리 내리게 한다.

## Core Thesis
1. **불필요한 결정을 제거하면 실행률이 오른다.**
2. **실패는 리셋이 아니라 라우팅 데이터다.**
3. **사용시간이 아니라 Decision Quality가 핵심 KPI다.**

이 철학은 `docs/HACKATHON_ONE_PAGER.md`와 `docs/DEMO_SCRIPT_3MIN.md`에 있는 스토리 라인을 코드 구조로 고정한 결과입니다.

## Trend-Informed Product Strategy (2025)
아래는 요청하신 트렌드 레퍼런스를 현재 코드베이스에 맞게 정리한 매핑입니다.

| 트렌드 레퍼런스 | 시장 신호 | LTR 현재 상태 | LTR 다음 단계 |
| --- | --- | --- | --- |
| Todoist / Todo 계열 | 우선순위 시각화 | Home에 Eisenhower Matrix 적용 | 매트릭스 자동 분류 정확도 고도화 |
| Daily - Life Calendar | 장기 진행률 시각화 | Year Progress + GitHub형 히트맵 위젯 구현 | 리캡 카드 자동 생성 연결 |
| Duolingo / Habitica | 강한 게임 루프 | XP/레벨/레벨업 모달/배지 컴포넌트 기반 존재 | 배지 획득 UX 및 보상 루프 강화 |
| Sunsama / Lifestack | 컨디션 반영 | Energy/Voice 체크인 + 저에너지 fallback 반영 | 스케줄 우선순위 자동 재배치 |
| 성장형 캐릭터 앱 | 감정적 리텐션 | 캐릭터 컴포넌트(Tready) 기반 존재 | 메인 루프 내 캐릭터 전진 연동 |
| 바이럴 공유 카드 | 자연 유입 | ShareCard/FutureSelf 모달 구현 | 자동 밈/주간 리캡 생성 v1 |

중요: 위 표에서 "현재 상태"는 저장소에 실제 존재/동작하는 항목만 표기했고, 나머지는 "다음 단계"로 분리했습니다.

## How LTR Works
LTR는 "챗봇"이 아니라 3엔진 + 1안전장치 구조를 지향합니다.

1. **Intent Engine (Context)**
- 입력: 에너지, 음성 체크인, 실패 로그, 루틴/제약, 완료 히스토리
- 역할: 오늘의 상태를 구조화

2. **Decision Engine (Think)**
- Gemini/OpenAI 기반 추론 + deterministic fallback
- TechTree advance/reroute, Decision Record 검증(3/2/3), DQI 계산

3. **Execution Engine (Action)**
- Today Quest/Recovery Quest 적용
- 완료/실패/지연을 Execution Record로 누적

4. **Safety/Governance**
- 권한/리스크 감사 로그
- Outbox + 재시도 + idempotency 기반 동기화 복구

## Live Product Scope (현재 구현 기준)
| 영역 | 구현됨 (현재) | 상태 |
| --- | --- | --- |
| Home | Today Quest, AI Insight, Energy/Voice/Future/Share 진입, Eisenhower Matrix | 구현됨 |
| TechTree | 진행 상태 반영, 실패 시 reroute, 완료 상태 업데이트 | 구현됨 |
| Progress | DQI Breakdown, Decision Log v1.1(14/30일, 검색, validation/status 필터), Sync Reliability 카드 | 구현됨 |
| Profile | 사용자 정보, 온보딩 재진입/커스터마이징 진입 | 구현됨 |
| Recovery Loop | Quest fail -> FailureSheet -> recovery quest 반영 | 구현됨 |
| AI Layer | Gemini/OpenAI provider fallback + timeout/circuit guardrails | 구현됨 |
| Reliability | Supabase outbox drain, sync diagnostics, manual retry | 구현됨 |
| Quality Ops | screenshot QA, golden set regression, runbook/SLO 문서화 | 구현됨 |

## Decision Terminal Features (현재 사용자가 체감하는 것)
1. **Decision Log (Progress)**
- 최근 14/30일 의사결정 로그 조회
- 검색 + validation(status) 필터
- 상세 바텀시트에서 선택 근거/반증/실행 결과 확인
- 개인정보 보호를 위해 `sourceRef`는 UI 비노출

2. **Sync Reliability (Progress)**
- online/offline 상태
- outbox pending 개수, last drain 처리량, dropped 개수
- "지금 동기화" 수동 재시도

3. **Adaptive Recovery**
- 실패 시 root cause 기반 recovery quest 제안
- TechTree reroute로 실패를 다음 경로 설계에 반영

4. **Decision Quality Index (DQI)**
- Structure / Execution / Recovery / Safety를 0-100으로 집계
- 주간 스냅샷 기반 품질 추세 확인

## Product Positioning
LTR의 포지셔닝은 "시간 관리"가 아니라 "결정 품질 개선"입니다.

| 비교 항목 | 일반 To-do 앱 | LTR |
| --- | --- | --- |
| 핵심 가치 | 기록/리마인더 | 맥락 기반 실행 결정 |
| 실패 처리 | 체크 해제/리셋 | 실패 분석 + 복구 + 경로 재설계 |
| 설명 가능성 | 결과 위주 | Decision Log로 근거/검증/실행 상태 제공 |
| 신뢰성 | 로컬 상태 중심 | outbox, retry, idempotency, QA gate |
| KPI | 사용시간/완료 수 | DQI, applied rate, recovery quality |

## 3-Min Demo Flow
`docs/DEMO_SCRIPT_3MIN.md`를 코드 흐름에 맞게 요약하면 아래 순서입니다.
1. Hook: "의지 문제가 아니라 결정 피로 문제"
2. Context: Energy/Voice/Failure 신호 확인
3. Think: AI 인사이트 + 경로 추론
4. Action: 퀘스트 실패 -> 복구 퀘스트 -> TechTree reroute
5. Close: 기록이 아닌 달성 확률을 높이는 OS라는 메시지

## Quick Start
### 1) Install
```bash
npm install
```

### 2) Run
```bash
npm run dev
```

기본 URL: [http://localhost:3000](http://localhost:3000)

### 3) Static Validation
```bash
npm run lint
npx tsc --noEmit
npm run build
```

### 4) Quality Validation
```bash
npm run qa:screenshots:dry
npm run qa:goldenset
```

Playwright 기반 실캡처 QA:
```bash
npm install -D playwright
npm run qa:screenshots
```

## Environment Variables
LTR는 provider fallback 구조로 동작합니다. (Gemini -> OpenAI -> deterministic local fallback)

```bash
# AI Providers
VITE_GEMINI_API_KEY=
VITE_OPENAI_API_KEY=
VITE_OPENAI_MODEL=gpt-4o-mini
VITE_OPENAI_BASE_URL=https://api.openai.com/v1

# AI Guardrails
VITE_AI_TIMEOUT_MS=12000
VITE_GEMINI_TIMEOUT_MS=12000
VITE_OPENAI_TIMEOUT_MS=12000

# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=

# Feature Rollout (0~100)
VITE_FLAG_RELIABLE_STORAGE_V2_ROLLOUT=100
VITE_FLAG_AI_GUARDRAILS_V2_ROLLOUT=100
VITE_FLAG_TELEMETRY_V1_ROLLOUT=100
VITE_FLAG_DECISION_TERMINAL_V1_ROLLOUT=100
VITE_FLAG_DECISION_LOG_UI_V1_ROLLOUT=100
VITE_FLAG_SYNC_STATUS_UI_V1_ROLLOUT=100
VITE_FLAG_GOVERNANCE_AUDIT_V1_ROLLOUT=100
VITE_FLAG_GOLDENSET_V1_ROLLOUT=100
```

## Quality & Release Gate
- 게이트 정책: `error_only`
- 차단 조건: `failedChecks > 0`
- warning은 배포 차단 없이 backlog로 추적

권장 게이트 순서:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. `npm run qa:screenshots:dry`
5. `npm run qa:goldenset`

## Architecture Snapshot
```text
src/
├── App.tsx
├── app/
│   ├── actions/orchestration.ts
│   └── hooks/useAppOrchestrator.ts
├── lib/
│   ├── gemini.ts          # Gemini/OpenAI fallback + timeout/circuit guard
│   ├── supabase.ts        # outbox + retry + idempotent sync
│   ├── app-storage.ts     # schema migration + diagnostics
│   ├── app-domain.ts      # DQI/validation/execution metrics
│   ├── telemetry.ts       # typed app events
│   └── governance.ts      # permission/risk/audit helpers
├── components/
│   ├── mobile/            # Home/TechTree/Progress/Profile + sheets
│   ├── gamification/      # XP/Badge/LevelUp
│   ├── character/         # Tready
│   └── ui/                # lightweight UI primitives
└── types/app.ts
```

## Docs Index
### 제품/데모
- [Hackathon One Pager](docs/HACKATHON_ONE_PAGER.md)
- [3-Min Demo Script](docs/DEMO_SCRIPT_3MIN.md)
- [Gemini Prompts](docs/GEMINI_PROMPTS.md)

### 배포/운영
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Incident Playbook](docs/INCIDENT_PLAYBOOK.md)
- [SLO](docs/SLO.md)

### 품질/거버넌스
- [Screenshot QA Checklist](docs/SCREENSHOT_QA_CHECKLIST.md)
- [GoldenSet Harness](docs/GOLDENSET_HARNESS.md)
- [Privacy Governance Checklist](docs/PRIVACY_GOVERNANCE_CHECKLIST.md)

## Roadmap (Next)
### Iteration A: Decision Log v1.2
- 회고 액션(다음 날 계획/재시도) 연결
- validation reason 기반 개선 추천 자동화

### Iteration B: Sync Reliability v1.1
- drain 이력 상세 시각화
- offline -> online 복귀 자동 복구 UX 강화

### Iteration C: Trend Upgrades (Planned)
- 트레드밀 캐릭터 메인 루프 결합
- 자동 밈/주간 리캡 카드
- 위젯(잠금화면/홈) 연동

## Disclaimer
이 저장소는 빠른 제품 검증과 신뢰성 실험을 위한 코드베이스입니다.  
헬스케어/재무/법률 영역의 자동 의사결정을 직접 대체하지 않으며, 사용자 승인 기반 실행 원칙을 유지합니다.

## License
MIT
