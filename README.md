# 🏃 LIFE TREADMILLS (LTR)

> AI가 내 삶의 맥락을 읽고, 오늘 당장 실행할 '진짜 다음 한 걸음'을 설계해주는 Life OS

## ✨ Features

- 🎯 **맞춤형 온보딩** - 나의 목표, 제약, 루틴을 파악
- 🌳 **테크트리 시각화** - 목표까지의 여정을 트리 구조로 확인
- 📊 **진행 현황** - GitHub 스타일 기여 차트, 연간 진행률
- 🔥 **스트릭 & 보상** - 연속 달성으로 동기부여

## 🛠 Tech Stack

- **React 18** + TypeScript
- **Vite** - 초고속 빌드 도구
- **Tailwind CSS v4** - 모던 스타일링
- **Motion (Framer Motion)** - 부드러운 애니메이션
- **Lucide Icons** - 아이콘 세트

## 🚀 Quick Start

```bash
# Clone
git clone https://github.com/rarehotdog/Life-Treadmill.git
cd life-treadmill

# Install
npm install

# Run
npm run dev
```

브라우저에서 `http://localhost:3000` 접속

## 📁 Project Structure

```
life-treadmill/
├── App.tsx                    # 메인 앱 컴포넌트
├── index.html                 # HTML 진입점
├── vite.config.ts             # Vite 설정
├── src/
│   ├── main.tsx               # React 진입점
│   ├── styles/
│   │   └── globals.css        # Tailwind CSS
│   └── components/
│       ├── OnboardingFlow.tsx          # 온보딩 플로우
│       ├── figma/
│       │   └── ImageWithFallback.tsx   # 이미지 폴백
│       └── mobile/
│           ├── HomeScreen.tsx          # 홈 화면
│           ├── TechTreeScreen.tsx      # 테크트리
│           ├── ProgressScreen.tsx      # 진행 현황
│           ├── ProfileScreen.tsx       # 프로필
│           ├── BottomNavigation.tsx    # 하단 네비게이션
│           └── widgets/
│               ├── GitHubContributionChart.tsx  # GitHub 스타일 차트
│               └── YearProgressWidget.tsx       # 연간 진행률
└── public/
    └── manifest.json          # PWA 매니페스트
```

## 📱 Screens

1. **홈 (Home)** - 오늘의 퀘스트, 스트릭, 활동 기록
2. **테크트리 (TechTree)** - 목표까지의 단계별 시각화
3. **진행 (Progress)** - 상세 통계, 주간 차트, 뱃지
4. **프로필 (Profile)** - 설정, 목표 변경

## 🎨 Design Principles

- 모바일 퍼스트 (max-width: 430px)
- 라이트 테마 + Emerald 액센트
- 부드러운 애니메이션 & 터치 피드백
- 깔끔한 카드 UI

## 📦 Scripts

```bash
npm run dev      # 개발 서버
npm run build    # 프로덕션 빌드
npm run preview  # 빌드 미리보기
```

## 🌐 Deployment

### Vercel (추천)
```bash
npm i -g vercel
vercel
```

### Netlify
```bash
npm i -g netlify-cli
netlify deploy --prod
```

## 📄 License

MIT License

---

Made with ❤️ by Tyler & Poby
