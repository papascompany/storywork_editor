import { ThemeProvider } from '@storywork/ui'
import type { Metadata, Viewport } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'StoryWork',
  description: 'AI 스토리보드 편집기 — 대본에서 출판까지',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
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
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
