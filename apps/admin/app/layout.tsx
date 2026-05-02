import type { Metadata } from 'next'

import './globals.css'

export const metadata: Metadata = {
  title: 'StoryWork Admin',
  description: 'StoryWork 관리자 콘솔',
}

export default function AdminLayout({
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
