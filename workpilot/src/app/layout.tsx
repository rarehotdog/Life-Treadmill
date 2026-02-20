import type { Metadata } from 'next';
import { Toaster } from 'sonner';

import './globals.css';

export const metadata: Metadata = {
  title: 'WorkPilot',
  description: 'Record → Compile → Run'
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased">
        {children}
        <Toaster richColors theme="dark" position="top-right" />
      </body>
    </html>
  );
}
