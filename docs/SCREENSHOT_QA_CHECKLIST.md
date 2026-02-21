# Screenshot QA Checklist (Device First)

LTR 모바일 UI를 실제 기기 기준으로 검수하기 위한 자동 + 수동 체크리스트입니다.

## 1) 자동 QA

### 사전 준비
```bash
npm install -D playwright
npm run dev
```

### 실행
```bash
npm run qa:screenshots
```

### 생성 산출물
- `artifacts/qa-screenshots/<timestamp>/report.json`
- `artifacts/qa-screenshots/<timestamp>/report.md`
- `artifacts/qa-screenshots/<timestamp>/**/*.png`

### 자동 검증 범위
- Viewport: `375 / 390 / 430`
- Screen: `Home`, `Journey`, `Progress`, `Profile`
- Modal: `Energy`, `Voice`, `Future`, `Share`, `Failure`
- Progress 확장:
  - `Decision Log` 카드 존재
  - Decision Log `14일/30일` 토글, 검색 인풋, validation/status 필터 존재
  - 검색 no-match 시 empty-state 노출 + 필터 초기화 동작
  - Decision item 탭 시 `DecisionLogDetailSheet` 렌더/닫힘
  - `Sync Reliability` 카드 + `지금 동기화` 버튼 존재
- Layout guard:
  - 상단 시스템 바 렌더
  - 하단 네비게이션 렌더
  - 수평 오버플로우 없음
  - 핵심 CTA 터치 영역 `44x44` 이상
- Typography guard:
  - 메인 화면 컨테이너 내 금지 raw class 탐지: `text-xs|text-sm|text-lg|text-2xl|text-3xl`
  - 모달 5종의 `.modal-title`, `.modal-subtle`, `.cta-*` 존재 체크
  - `Pretendard` 폰트 패밀리 감지 (warning)
- Gate policy:
  - `gatePolicy=error_only`
  - `failedChecks > 0` 이면 배포 차단
  - `warningChecks`는 차단하지 않고 backlog 이슈로 추적

## 2) 실제 기기 수동 QA

자동 캡처 후, iOS/Android 실기기에서 아래 항목을 최종 확인합니다.

### 타이포/자간
- `heading-1 / heading-2 / heading-3` 계층이 화면 간 동일한지
- `body-15 / body-14 / body-13 / caption-*`가 의도대로 유지되는지
- 인라인 임시 자간 스타일이 다시 유입되지 않았는지
- `display-36 / stat-18 / label-12`가 숫자/메타 텍스트에 일관되게 쓰였는지
- 허용 예외: 장식용 이모지(`text-2xl`, `text-3xl`)는 타이포 규칙 위반으로 간주하지 않음

### 레이아웃 리듬
- `screen-wrap-*` 패딩 리듬이 화면 간 일관적인지
- 카드 내부 `card-padding`과 CTA 높이가 균일한지
- 모달 헤더/본문/CTA 간격이 일치하는지

### 인터랙션
- 하단 탭 전환 시 active 상태가 정확한지
- 모달 오픈/닫기 시 배경 스크롤/오버레이 동작이 자연스러운지
- 실패 복구(Quest fail -> FailureSheet) 플로우가 항상 동작하는지

### 접근성/사용성
- 최소 터치 영역(44x44) 위반 UI가 없는지
- 텍스트 대비가 낮아지지 않았는지
- 시스템 폰트 배율(크게)에서도 레이아웃 깨짐이 없는지

## 3) 릴리즈 게이트

- `npm run lint` : error 0
- `npm run build` : pass
- `report.md`의 failed check : 0
- 실기기 스모크 QA : Blocker/P1 없음
