# Company PC Lunch Workflow (unmyeong-snap only)

`workpilot`과 완전히 분리해서 `apps/unmyeong-snap`만 작업하기 위한 운영 절차입니다.

## 0) 고정 원칙

- 코드 동기화: Private GitHub + 개인 계정
- 작업 범위: `apps/unmyeong-snap`, `.github/workflows/unmyeong-staging-validation.yml`
- 비밀정보: `.env.local`은 회사 PC에서만 생성, 커밋 금지

## 1) 개인 PC 1회 준비

```bash
cd /Users/taehyeonkim/Documents/New\ project

git checkout -b codex/unmyeong-snap-office-lunch

# 커밋 범위 제한 체크
cd apps/unmyeong-snap
npm run office:verify:scope
```

푸시:

```bash
cd /Users/taehyeonkim/Documents/New\ project
git push -u origin codex/unmyeong-snap-office-lunch
```

## 2) 회사 PC 최초 세팅

```bash
git clone --filter=blob:none https://github.com/rarehotdog/Life-Treadmill.git
cd Life-Treadmill

git sparse-checkout init --cone
git sparse-checkout set apps/unmyeong-snap .github/workflows/unmyeong-staging-validation.yml

git checkout codex/unmyeong-snap-office-lunch

cd apps/unmyeong-snap
npm ci
cp .env.example .env.local
```

필수 환경변수:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `NEXT_PUBLIC_BASE_URL`

옵션(분석 전송 검증용):

- `AMPLITUDE_API_KEY_STAGING`
- `META_TEST_PIXEL_ID`
- `META_ACCESS_TOKEN`
- `META_TEST_EVENT_CODE`

## 3) 점심시간 작업 루프

시작:

```bash
cd <repo-root>
git pull --rebase

cd apps/unmyeong-snap
npm ci
```

검증:

```bash
cd apps/unmyeong-snap
npm run office:verify:lunch
BASE_URL=<staging-url> npm run analytics:staging:check
```

커밋 전 범위 체크:

```bash
cd apps/unmyeong-snap
npm run office:verify:scope
```

종료:

```bash
cd <repo-root>
git add apps/unmyeong-snap .github/workflows/unmyeong-staging-validation.yml
git commit -m "chore(unmyeong-snap): office lunch update"
git push
```

## 4) 회사 PC 보안 마감

`.env.local` 삭제(권장):

```bash
cd apps/unmyeong-snap
npm run office:security:close -- --delete-env
```

또는 보안 폴더로 이동:

```bash
cd apps/unmyeong-snap
npm run office:security:close -- --move-env /secure/path
```

추가:

- GitHub 세션 로그아웃
- 필요 시 access token revoke

## 5) 대체안 (정책 차단 시)

1. ZIP/USB: 빠르지만 이력 충돌 위험이 높음
2. git bundle: 외부망 차단 환경에서 유효하지만 반복비용 큼
3. 원격 접속: 보안정책/네트워크 의존

## 6) 검증 포인트

- 새 clone에서 `npm run typecheck` 통과
- `.env.local` 미설정 시 `npm run build` 실패(의도된 가드)
- `.env.local` 설정 후 `analytics:staging:check` 실행 가능
- `git status`에 `.env.local` 미포함
