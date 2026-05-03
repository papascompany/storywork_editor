import { ThemeProvider } from '@storywork/ui'
import type { Metadata, Viewport } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'StoryWork Admin',
  description: 'StoryWork 관리자 콘솔 — 판형/템플릿/리소스 관리',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

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
      <body>
        <ThemeProvider defaultTheme="system" storageKey="sw-admin-theme">
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}
