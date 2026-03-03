import type { Metadata, Viewport } from "next";
import { Suspense } from "react";

import "@/app/globals.css";
import { ConsentBootstrap } from "@/components/consent-bootstrap";
import { UTMTracker } from "@/components/utm-tracker";
import { ServiceWorkerRegister } from "@/components/sw-register";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL ?? "http://localhost:3000"),
  title: "운명스냅 | 요즘 2030이 공유하는 사주 액션카드",
  description:
    "60초 입력으로 만드는 사주 미리보기. 990원으로 풀해설 열고, 인스타/카톡 공유카드까지 바로 생성하세요.",
  appleWebApp: {
    capable: true,
    title: "운명스냅",
    statusBarStyle: "default"
  },
  icons: {
    icon: "/icon-192.svg",
    apple: "/icon-192.svg"
  },
  manifest: "/manifest.webmanifest"
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#ff7159"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body className="font-sans">
        <Suspense fallback={null}>
          <UTMTracker />
        </Suspense>
        <ConsentBootstrap />
        <ServiceWorkerRegister />
        <div className="main-shell">{children}</div>
      </body>
    </html>
  );
}
