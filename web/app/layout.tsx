import type { Metadata, Viewport } from 'next';

import './globals.css';

export const metadata: Metadata = {
  title: '농지 경계 열람 | LX',
  description: '항공사진 위에서 농지 경계를 안전하게 열람합니다.',
};

export const viewport: Viewport = {
  themeColor: '#07110e',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
