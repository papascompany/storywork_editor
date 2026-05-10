import { ThemeProvider, ToastProvider } from '@storywork/ui'
import type { Metadata, Viewport } from 'next'

import './globals.css'

const BASE_URL = 'https://storywork-editor-web.vercel.app'

export const metadata: Metadata = {
  title: {
    default: '스토리워크 — AI 스토리보드 편집기',
    template: '%s | 스토리워크',
  },
  description:
    '1,270+ 포즈 라이브러리와 AI 자동 배치로 콘티 작가급 스토리보드를 5분 만에. POD 출판까지 한 번에.',
  metadataBase: new URL(BASE_URL),
  openGraph: {
    title: '스토리워크 — AI 스토리보드 편집기',
    description:
      '1,270+ 포즈 라이브러리와 AI 자동 배치로 콘티 작가급 스토리보드를 5분 만에. POD 출판까지 한 번에.',
    url: BASE_URL,
    siteName: '스토리워크',
    locale: 'ko_KR',
    type: 'website',
    images: [
      {
        url: `${BASE_URL}/api/og/landing`,
        width: 1200,
        height: 630,
        alt: '스토리워크 — 대본만 쓰세요. AI가 페이지를 그립니다.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '스토리워크 — AI 스토리보드 편집기',
    description: '대본 → 자동 페이지 → POD 인쇄. 콘티 작가의 5분.',
    images: [`${BASE_URL}/api/og/landing`],
  },
  alternates: {
    canonical: BASE_URL,
  },
  robots: {
    index: true,
    follow: true,
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#000000',
}

// FOUC 방지: html.dark 클래스를 렌더 전에 설정하는 인라인 스크립트
const themeInitScript = `(function(){try{var s=localStorage.getItem('sw-ui-theme');var d=s==='light'||s==='dark'?s:s==='system'||!s?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'light';if(d==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <ThemeProvider defaultTheme="system" storageKey="sw-ui-theme">
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
