# SLO (Service Level Objectives)

## 목표
- Crash-free sessions: **99.9% 이상**
- 핵심 액션(quest save/complete) 성공률: **99.95% 이상**
- AI 실패 시 fallback quest 제공률: **100%**
- 모바일 p95 초기 렌더: **2.5s 이하**
- 인터랙션 지연 p95: **100ms 이하**
- Incident MTTR: **30분 이내**
- DQI 계산 가능률: **99% 이상**
- Decision structure 규칙 충족률(3옵션/2반증/3근거): **90% 이상**
- 고위험 권한 무승인 실행: **0건**
- Decision detail open rate(주간 활성 사용자 기준): **20% 이상**
- Manual sync retry success rate: **95% 이상**
- Outbox pending p95(24h): **10건 이하**

## SLI 정의
- `app.error` 이벤트 / 총 세션 수
- `sync.outbox_enqueued`, `sync.outbox_drain` 추이
- `ai.generate_quests_failed` 대비 fallback 적용률
- Web Vitals(FCP/LCP/INP) p95
- `decision.quality_scored` 생성률 및 score 분포
- `execution.applied|delayed|skipped` 비율
- `governance.permission_*`, `governance.risk_flagged` 비율
- `qa:goldenset` pass/fail 추이
- `ui.decision_log_opened`, `ui.decision_log_item_opened` 이벤트 비율
- `sync.manual_retry_clicked/succeeded/failed` 비율
- `sync.outbox_drain.remaining`의 p95

## 에러 버짓
- 월 단위 가용성 기준 99.9% 유지
- 버짓 초과 시 기능 확장 중단, 안정화 작업 우선
- DQI 급락(주간 평균 15% 이상 하락) 시 안정화 스프린트 우선

## 측정 주기
- 일간: 에러/동기화 지표
- 주간: 성능 p95, 실패 패턴, 골든셋 회귀
- 월간: 버짓 소진율, MTTR 회고, 실제 결정 케이스 추가
