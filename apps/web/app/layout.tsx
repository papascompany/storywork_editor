import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'StoryWork',
  description: 'AI 스토리보드 편집기 — 대본에서 출판까지',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  )
}
