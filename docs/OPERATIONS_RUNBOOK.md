# Operations Runbook

## 1) 배포 전 체크
1. `npm run lint`
2. `npm run build`
3. `npx tsc --noEmit`
4. `npm run qa:screenshots:dry`
5. `npm run qa:goldenset`
6. 핵심 플로우 수동 검증
7. `qa:screenshots` report에서 `failedChecks=0` 확인
8. warning은 릴리즈 차단 없이 backlog 이슈로 등록

## 2) 점진 롤아웃 절차
1. 1차 배포(10%):
   - `VITE_FLAG_DECISION_LOG_UI_V1_ROLLOUT=10`
   - `VITE_FLAG_SYNC_STATUS_UI_V1_ROLLOUT=10`
2. 최소 24시간 관측:
   - `sync.manual_retry_succeeded/failed`
   - `sync.outbox_drain remaining`
   - Decision detail open 이벤트 추이
3. 2차 배포(50%): 동일 변수 50으로 상향
4. 최소 24시간 관측 후 3차 배포(100%)
5. 이상 시 즉시 0으로 rollback:
   - `VITE_FLAG_DECISION_LOG_UI_V1_ROLLOUT=0`
   - `VITE_FLAG_SYNC_STATUS_UI_V1_ROLLOUT=0`

## 3) 런타임 점검 포인트
- `sync.outbox_enqueued` 급증 여부
- `sync.outbox_drain` 처리량/잔량
- `sync.manual_retry_clicked/succeeded/failed` 비율
- `ai.generate_quests_failed` 비율
- `app.error` 증가 추이
- `decision.quality_scored` 누락 여부
- `ui.decision_log_item_opened` 추이(회고 기능 사용률)
- `execution.applied|delayed|skipped` 비율 이상치
- `governance.risk_flagged` 및 high-risk 무승인 시도

## 4) Outbox 운영
- 네트워크 불안정 시 enqueue 증가 가능
- 온라인 복귀 후 자동 drain 확인
- outbox 잔량이 지속 증가하면 Supabase 쓰기 경로 점검

## 5) Decision/Governance 운영
- 주 1회: `npm run qa:goldenset` 실행
- 월 1회: `npm run qa:goldenset:add -- --category ... --prompt ...`로 실제 결정 케이스 추가
- DQI 급락 시:
1. 최근 decision log 구조 규칙 위반률 확인
2. execution 지연 급증 구간 확인
3. governance 알림과 동시 발생 여부 확인

## 6) 데이터 호환성
- schema migration은 앱 부트스트랩 시 자동 실행
- `ltr_year_image` 레거시 키는 scoped key로 이관
- `v2 -> v3`에서 questHistory 일부를 execution_log로 초기 변환
- 데이터 리셋 없이 무손실 호환 유지
