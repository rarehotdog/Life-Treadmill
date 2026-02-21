# LIFE TREADMILLS (LTR)

> **LTR는 목표 관리 앱이 아니라 Decision Terminal입니다.**  
> 사용자의 맥락을 해석하고, 다음 행동을 “고민”이 아니라 “실행” 가능한 형태로 내려주는 Life/Agency OS입니다.

![Version](https://img.shields.io/badge/version-1.0.0-7C3AED)
![React](https://img.shields.io/badge/React-18.3-61DAFB)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-3178C6)
![Vite](https://img.shields.io/badge/Vite-6.0-646CFF)
![Tailwind](https://img.shields.io/badge/Tailwind-4.0-06B6D4)

## Why LTR (문제와 기회)
사람이 목표를 놓치는 이유는 대개 의지 부족보다 **의사결정 과부하(Decision Fatigue)** 에 가깝습니다.  
하루 동안 반복되는 미세한 판단이 누적되면, 실행 에너지는 빠르게 떨어지고 회피 행동이 늘어납니다.

LTR의 문제 정의는 명확합니다.
1. 사용자는 “무엇을 할지”를 매번 다시 결정하느라 소모된다.
2. 기존 앱은 실패를 리셋으로 처리해 학습이 누적되지 않는다.
3. 조언은 많지만, 지금 당장 실행 가능한 다음 행동은 부족하다.

LTR는 이 간극을 **맥락 기반 실행 루프**로 해결합니다.

## Core Thesis
LTR의 제품 철학은 아래 3문장으로 요약됩니다.
1. **불필요한 결정을 제거하면 실행률이 오른다.**
2. **실패는 리셋이 아니라 라우팅 데이터다.**
3. **사용시간이 아니라 결정 품질(Decision Quality)이 핵심 KPI다.**

## How It Works (3-Layer Loop)
LTR는 Context → Think → Action 루프를 고정합니다.

1. **Context Layer**
- 입력 신호: 에너지 체크인, 음성 체크인, 실패 로그, 완료 히스토리, 루틴/제약
- 목적: “오늘의 실제 상태”를 구조화

2. **Think Layer**
- AI 추론: Gemini/OpenAI 기반 퀘스트/인사이트 생성
- 경로 계산: TechTree 진행/복구 reroute
- 품질 계산: DQI(Decision Quality Index), 실행/안전 지표 집계

3. **Action Layer**
- 출력: 오늘의 실행 퀘스트, 대체 퀘스트, 복구 퀘스트
- 피드백: 완료/실패/복구가 즉시 다음 경로에 반영

이 루프는 “한 번 계획하고 끝”이 아니라 “실행할수록 더 잘 맞아지는” 적응형 구조입니다.

## What’s Different (일반 앱과 차이)
| 비교 항목 | 일반 할 일/습관 앱 | LTR |
| --- | --- | --- |
| 추천 방식 | 고정 템플릿/리마인더 중심 | 사용자 맥락 기반 동적 퀘스트 |
| 실패 처리 | 체크 해제 또는 리셋 | 실패 원인 분석 + 복구 퀘스트 + 경로 재설계 |
| 설명 가능성 | 결과 중심 UI | Decision Log로 선택 근거/검증/실행 상태 제공 |
| 실행 강제력 | 기록/추적 중심 | 다음 행동 제시 + 대체 행동까지 제공 |
| 운영 신뢰성 | 클라이언트 상태 의존 | Outbox, Idempotency, QA Gate, SLO 기반 운영 |

## Live Product Scope (현재 동작 범위)
아래는 “이미 구현됨”과 “다음 단계”를 분리한 현재 범위입니다.

| 영역 | 현재 구현됨 | 다음 단계 |
| --- | --- | --- |
| Home | 오늘의 퀘스트, AI Insight, 에너지/음성/공유 진입 | 개인화 카드 우선순위 고도화 |
| TechTree | 진행 상태 반영, 실패 시 reroute | 노드별 설명/근거 강화 |
| Progress | DQI Breakdown, Decision Log v1.1(14/30일·검색·필터), Sync Reliability | Decision Log v1.2(회고 액션 연결) |
| Profile | 사용자/목표 정보 및 커스터마이징 진입 | 계정/권한 관리 UI 보강 |
| Reliability | Outbox + 재시도 + sync diagnostics | Sync Reliability v1.1(드레인 이력 상세/자동 복구 안내) |
| Quality Ops | Screenshot QA, GoldenSet, 문서화된 SLO/Runbook | CI 기반 실캡처 자동화 확대 |

## 누구를 위한 제품인가 (현재 웨지)
LTR는 모든 사람을 한 번에 타깃으로 하지 않습니다. 현재는 **전환기(high-growth transition)** 사용자에 맞춰 설계되어 있습니다.

대표 페르소나:
1. 유학/이직/창업처럼 마감이 명확한 목표를 가진 사용자
2. 목표는 크지만 하루 실행 루틴이 흔들리는 사용자
3. 실패를 반복할수록 동기보다 불안이 커지는 사용자

왜 이 세그먼트가 중요한가:
1. 맥락 데이터가 빠르게 쌓여 개인화 루프가 빨리 학습됨
2. 실행률 개선과 불안 감소라는 ROI가 비교적 명확함
3. “기록 앱”보다 “결정 품질 앱”의 차별 가치가 명확하게 보임

즉, LTR의 KPI는 체류시간이 아니라 **의미 있는 결정 후 실행으로 이어지는 비율**입니다.

## 운영 원칙 (최소수집 · 로컬우선 · 승인기반)
LTR는 모델 경쟁보다 운영 신뢰성을 우선합니다. 이를 위해 아래 원칙을 고정합니다.

1. **최소수집(Minimum Necessary Data)**  
결정 품질 개선에 필요한 데이터만 저장합니다. 원문 전체보다 요약/지표 중심으로 다룹니다.

2. **로컬우선(Local-First)**  
외부 서비스가 불안정해도 기본 실행 루프가 멈추지 않도록 로컬 fallback을 유지합니다.

3. **승인기반(Approval-Oriented Execution)**  
민감 범위는 감사 로그와 위험 등급을 남기고, 무승인 고위험 실행 0건을 운영 목표로 둡니다.

4. **복구가능성(Recoverability)**  
네트워크 실패 시 outbox로 기록하고, 온라인 복귀 시 재전송합니다. 실패를 “소실”이 아닌 “지연”으로 처리합니다.

5. **설명가능성(Explainability)**  
Decision Log에서 선택 근거, 검증 상태, 실행 결과를 사용자 관점으로 확인 가능해야 합니다.

## 현재 운영 지표 (What we measure now)
LTR는 “좋아 보이는 UI”보다 “실행으로 이어지는 품질”을 측정합니다.

핵심 지표:
1. **DQI(Decision Quality Index)**: 구조/실행/복구/안전 점수 합산
2. **Execution Metrics**: applied/delayed/skipped 및 on-time rate
3. **Sync Reliability**: outbox pending, drain success, manual retry success
4. **Governance Metrics**: high-risk violation rate, permission grant/deny 패턴

운영 해석 원칙:
1. 점수 단일값보다 추세(주간 변화)를 우선 본다
2. 실패율 상승 시 기능 추가보다 원인 제거를 먼저 수행한다
3. QA warning은 누적 추적하되, 배포 차단은 failed checks 중심으로 운영한다

## 3-Min Demo Flow (발표/소개용)
`docs/DEMO_SCRIPT_3MIN.md`를 기반으로, 아래 5단계가 핵심 흐름입니다.

1. **Hook**  
의지 문제가 아니라 결정 피로 문제라는 점을 명확히 제시

2. **Context 시연**  
오늘의 컨디션/제약/스트릭 신호를 보여주며 “정적 목표 앱과의 차이” 설명

3. **Think 시연**  
AI가 맥락을 해석해 퀘스트와 경로를 조정하는 과정 제시

4. **Action + Recovery 시연**  
퀘스트 실패를 입력하고, 복구 퀘스트와 경로 조정이 즉시 반영되는 장면 시연

5. **Close**  
“실패→복구→경로 재설계”가 자동으로 누적되며 목표 달성 확률을 높인다는 메시지로 마무리

## Quick Start
### 1) 설치
```bash
npm install
```

### 2) 개발 서버
```bash
npm run dev
```

기본 주소: [http://localhost:3000](http://localhost:3000)

### 3) 정적 검증
```bash
npm run lint
npx tsc --noEmit
npm run build
```

### 4) 품질 검증
```bash
# 스크린샷 QA 템플릿(환경 무관)
npm run qa:screenshots:dry

# Decision 품질 회귀
npm run qa:goldenset
```

현재 lint 기준:
- Error: 0
- Warning: `react-refresh/only-export-components` 6건(게이트 차단 아님, backlog 추적)

## Environment Variables
LTR는 **Gemini/OpenAI/Supabase**를 선택적으로 사용하며, 미설정 시 로컬 fallback 경로로 동작합니다.

### 필수(기능 사용 시)
```bash
VITE_GEMINI_API_KEY=
VITE_OPENAI_API_KEY=
VITE_OPENAI_MODEL=gpt-4o-mini

VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

### 타임아웃/가드레일
```bash
VITE_AI_TIMEOUT_MS=12000
VITE_GEMINI_TIMEOUT_MS=12000
```

### 롤아웃 플래그(0~100)
```bash
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
릴리즈 게이트 정책은 **error_only** 입니다.

1. `gatePolicy=error_only`
2. `failedChecks > 0` 이면 배포 차단
3. `warningChecks`는 차단하지 않고 backlog 이슈로 추적

권장 체크 순서:
1. `npm run lint`
2. `npx tsc --noEmit`
3. `npm run build`
4. `npm run qa:screenshots:dry`
5. `npm run qa:goldenset`

실캡처 QA가 필요하면 Playwright 설치 후 실행:
```bash
npm install -D playwright
npm run qa:screenshots
```

## Architecture Snapshot (간결)
```text
src/
├── App.tsx
├── app/
│   ├── actions/orchestration.ts
│   └── hooks/useAppOrchestrator.ts
├── lib/
│   ├── gemini.ts            # Gemini/OpenAI provider + guardrails
│   ├── app-storage.ts       # schema migration + outbox + diagnostics
│   ├── app-domain.ts        # DQI/validation/metrics pure logic
│   ├── supabase.ts          # idempotent write + retry + outbox drain
│   ├── telemetry.ts         # typed events + timing/error
│   └── governance.ts        # risk/approval/audit helpers
├── components/
│   ├── mobile/              # Home/TechTree/Progress/Profile + sheets
│   └── ui/                  # lightweight UI primitives
└── types/app.ts             # app domain types and event schema
```

## Docs Index
### 배포/런타임
- [Deployment Guide](docs/DEPLOYMENT_GUIDE.md)
- [Operations Runbook](docs/OPERATIONS_RUNBOOK.md)
- [Incident Playbook](docs/INCIDENT_PLAYBOOK.md)

### 품질/신뢰성
- [SLO](docs/SLO.md)
- [Screenshot QA Checklist](docs/SCREENSHOT_QA_CHECKLIST.md)
- [GoldenSet Harness](docs/GOLDENSET_HARNESS.md)
- [Privacy Governance Checklist](docs/PRIVACY_GOVERNANCE_CHECKLIST.md)

### 전략/스토리
- [Hackathon One Pager](docs/HACKATHON_ONE_PAGER.md)
- [3-Min Demo Script](docs/DEMO_SCRIPT_3MIN.md)
- [Gemini Prompts](docs/GEMINI_PROMPTS.md)

## Roadmap (다음 2개 이터레이션)
1. **Decision Log v1.2**
- 회고 액션(재시도/다음날 반영) 연결
- validation reason 기반 개선 제안 자동 생성

2. **Sync Reliability v1.1**
- 드레인 이력 상세 표시
- 수동 재시도 결과 가시성 강화
- 오프라인 복귀 후 자동 복구 상태 안내 고도화

## 라이선스
MIT
