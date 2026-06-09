// deploy-retrigger 2026-06-08: 레포 PUBLIC 복귀 후 BLOCKED 커밋 반영을 위한
// turbo-ignore 강제 빌드 트리거 (핸드오프 §9). 기능 변경 없음.
import { ThemeProvider, ToastProvider } from '@storywork/ui'
import type { Metadata, Viewport } from 'next'
import localFont from 'next/font/local'

import './globals.css'

export const metadata: Metadata = {
  title: 'StoryWork Admin',
  description: 'StoryWork 관리자 콘솔 — 판형/템플릿/리소스 관리',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

/**
 * Pretendard Variable — 한/영 균형 가변 폰트.
 * apps/web 의 fonts.ts 와 동일한 패턴.
 * CSS 변수: --font-pretendard (globals.css 의 --nike-font-text 에서 참조)
 */
const pretendard = localFont({
  src: [
    {
      path: '../public/fonts/PretendardVariable.woff2',
      weight: '100 900',
      style: 'normal',
    },
  ],
  variable: '--font-pretendard',
  display: 'swap',
  preload: true,
  fallback: [
    'Pretendard',
    'Noto Sans KR',
    '-apple-system',
    'BlinkMacSystemFont',
    'system-ui',
    'sans-serif',
  ],
})

const themeInitScript = `(function(){try{var s=localStorage.getItem('sw-admin-theme');var d=s==='light'||s==='dark'?s:s==='system'||!s?(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):'light';if(d==='dark')document.documentElement.classList.add('dark');}catch(e){}})();`

export default function AdminLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className={`${pretendard.variable} ${pretendard.className}`}>
        <ThemeProvider defaultTheme="system" storageKey="sw-admin-theme">
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
