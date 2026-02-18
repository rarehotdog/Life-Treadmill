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
- Layout guard:
  - 상단 시스템 바 렌더
  - 하단 네비게이션 렌더
  - 수평 오버플로우 없음
  - 핵심 CTA 터치 영역 `44x44` 이상

## 2) 실제 기기 수동 QA

자동 캡처 후, iOS/Android 실기기에서 아래 항목을 최종 확인합니다.

### 타이포/자간
- `heading-1 / heading-2 / heading-3` 계층이 화면 간 동일한지
- `body-15 / body-14 / body-13 / caption-*`가 의도대로 유지되는지
- 인라인 임시 자간 스타일이 다시 유입되지 않았는지

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
