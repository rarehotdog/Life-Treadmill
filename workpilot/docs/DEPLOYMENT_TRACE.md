# Deployment Trace

## Rule
Production 배포 추적은 아래 3개를 함께 기록합니다.

1. Production URL
2. Inspect URL
3. Commit SHA

## Latest
- Production URL: https://workpilot-lemon.vercel.app
- Vercel URL: https://workpilot-79tihz6ps-dydrnsj-5767s-projects.vercel.app
- Inspect URL: https://vercel.com/dydrnsj-5767s-projects/workpilot/GevQ9UKjvyd74x2CqaNqJ29Mzeic
- Commit SHA: `14ebc5c`
- Timestamp: 2026-02-21

## Notes
- 이번 단계는 **Vercel Production 환경만** Supabase 키를 연결합니다.
- Preview/Development 환경은 DB 미연결 상태를 기본값으로 유지합니다.

## Pending Rollout
- Pushed to `workpilot/main`: `d40e2f3`
- Source branch: `codex/workpilot` (subtree split from monorepo `workpilot/` prefix)
- Verification time (UTC): 2026-02-21
- Observation: `https://workpilot-lemon.vercel.app/api/health` is still returning 404 HTML.
- Action needed: Vercel dashboard에서 연결 레포/프로덕션 브랜치/Root Directory와 Environment Variables를 확인 후 재배포.
