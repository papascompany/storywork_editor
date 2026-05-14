/**
 * apps/web/app/mypage/layout.tsx
 *
 * 마이페이지 셸 레이아웃.
 * 전체 높이를 채우며 상단 탭(모바일) / 사이드 탭(데스크톱) 구조를 감쌈.
 * 마케팅 디자인 토큰(--mkt-*) + Pretendard 폰트 적용.
 */
import type { Metadata } from 'next'
import * as React from 'react'

export const metadata: Metadata = {
  title: '마이페이지',
  description: '내 작품, 프로필, 구독 관리',
}

export default function MyPageLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--mkt-surface-soft)',
        fontFamily: 'var(--mkt-font-sans)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {children}
    </div>
  )
}
