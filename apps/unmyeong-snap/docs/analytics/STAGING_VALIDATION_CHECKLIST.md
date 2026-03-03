# STAGING_VALIDATION_CHECKLIST

## 0. 사전 준비

- [ ] Supabase 스키마 적용 (`supabase/schema.sql`)
- [ ] retry queue 마이그레이션 적용 (`supabase/migrations/20260303_analytics_retry_queue.sql`)
- [ ] `.env`에 필수 키 주입
  - [ ] `SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY`
  - [ ] `CRON_SECRET`
  - [ ] `AMPLITUDE_API_KEY_STAGING`
  - [ ] `META_TEST_PIXEL_ID`
  - [ ] `META_ACCESS_TOKEN`
- [ ] `UNMYEONG_STAGE=staging`

## 1. API Health

- [ ] `GET /api/analytics/health` -> `ok: true` (destination 설정 누락 시 `ok: false` + `missingConfigKeys` 확인)
- [ ] destinations 설정값이 기대치와 일치
- [ ] `deliveryQueue.ready/pending/dead` 값 확인
- [ ] 자동 검증 스크립트 통과  
  `BASE_URL=https://<staging-domain> npm run analytics:staging:check`

## 1-1. Retry Worker

- [ ] `POST /api/analytics/retry` 인증 실패 시 401 확인 (Bearer 누락)
- [ ] `POST /api/analytics/retry?dryRun=true` 응답 집계 확인
- [ ] `POST /api/analytics/retry` 실행 후 `processed/sent/failed/remaining` 수치 확인
- [ ] 실패 이벤트 존재 시 재시도 후 `telemetry_delivery_queue.status=sent` 회복 확인

## 2. Consent

- [ ] 첫 진입 시 `marketing_tracking=false`
- [ ] 토글 저장 시 `consent_updated` 이벤트 수집
- [ ] `marketing_tracking=false` 상태에서 Meta 전송 `skipped`
- [ ] `marketing_tracking=true`로 변경 후 Meta 전송 `sent`

## 3. 퍼널 시나리오

- [ ] `landing_viewed`
- [ ] `quiz_started`
- [ ] `quiz_completed`
- [ ] `preview_viewed`
- [ ] `paywall_clicked`
- [ ] `payment_create_requested`
- [ ] `payment_webview_opened` (`simulated=true`)
- [ ] `payment_confirmed` 또는 `payment_failed`
- [ ] `full_report_viewed`
- [ ] `share_card_created`
- [ ] `invite_link_created`
- [ ] `invite_redeemed`
- [ ] `daily_viewed`

## 4. 결제 실패 복구

- [ ] 결제 실패 강제 후 `payment_failed` 수집
- [ ] 재시도 후 `payment_confirmed` 수집
- [ ] `event_delivery_logs`에 실패/성공 이력 누적 확인

## 5. Idempotency/중복

- [ ] 동일 `idempotency_key`로 주문 재요청 시 order 중복 생성 없음
- [ ] 동일 `event_id` 재전송 시 telemetry 중복 저장 없음

## 6. Supabase Required 동작

- [ ] Supabase env 제거 후 API 호출 시 503 + 명시적 오류

## 7. 최종 승인 기준

- [ ] 누락 이벤트 없음
- [ ] Meta는 동의 사용자만 수신
- [ ] failed queue 자동 회복(5회 내) 확인, dead backlog 모니터링 가능
- [ ] KPI 차트 7종 구성 완료
