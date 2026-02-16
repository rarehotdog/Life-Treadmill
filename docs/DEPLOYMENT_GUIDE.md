# Deployment Guide

LTR는 Vite SPA이며 빌드 산출물은 `dist/`입니다.

## 1) 사전 확인
```bash
npm install
npm run lint
npm run build
```

`npm run build`는 `tsc && vite build`를 실행합니다.

## 2) 공통 배포 설정
- Build Command: `npm run build`
- Output Directory: `dist`
- Node Version: 18+
- SPA redirect 필요 (`/* -> /index.html`)

## 3) Vercel
1. GitHub 저장소 연결
2. Framework Preset: `Vite`
3. Build Command / Output Directory를 위 공통값으로 설정
4. 배포

## 4) Netlify
`netlify.toml` 예시:

```toml
[build]
  command = "npm run build"
  publish = "dist"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 5) GitHub Pages
1. `gh-pages` 설치
```bash
npm i -D gh-pages
```
2. `package.json`에 배포 스크립트 추가
```json
{
  "scripts": {
    "deploy": "npm run build && gh-pages -d dist"
  }
}
```
3. 배포
```bash
npm run deploy
```

## 6) 선택 기능 (Optional)
- PWA(`vite-plugin-pwa`)
- Analytics(GA/Mixpanel)
- Error Monitoring(Sentry)

선택 기능은 현재 기본 빌드 경로와 분리해 점진적으로 추가하는 것을 권장합니다.

## 7) 런타임 환경 변수
필요 시 플랫폼 환경변수에 다음 키를 등록합니다.

- `VITE_GEMINI_API_KEY`
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

미설정 시 앱은 로컬 fallback 모드로 동작합니다.
