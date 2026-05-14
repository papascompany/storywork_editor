/**
 * apps/web/app/(auth)/layout.tsx
 *
 * 인증 페이지 전용 레이아웃.
 * 마케팅 Header/Footer 없이 로고+카드만 표시.
 * 마케팅 디자인 토큰(--mkt-*) 기반.
 */
import Link from 'next/link'
import type { ReactNode } from 'react'

export default function AuthLayout({ children }: { children: ReactNode }) {
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
      {/* 간소 헤더 — 로고만 */}
      <header
        style={{
          padding: '20px var(--mkt-space-xl)',
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <Link
          href="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            textDecoration: 'none',
            color: 'var(--mkt-ink)',
          }}
          aria-label="StoryWork 홈"
        >
          {/* 로고 아이콘 */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 28 28"
            fill="none"
            aria-hidden="true"
            focusable="false"
          >
            <rect width="28" height="28" rx="6" fill="#000" />
            <rect x="6" y="8" width="10" height="2" rx="1" fill="#fff" />
            <rect x="6" y="13" width="16" height="2" rx="1" fill="#fff" />
            <rect x="6" y="18" width="12" height="2" rx="1" fill="#fff" />
          </svg>
          <span
            style={{
              fontSize: '16px',
              fontWeight: 700,
              letterSpacing: '-0.26px',
              color: 'var(--mkt-ink)',
            }}
          >
            StoryWork
          </span>
        </Link>
      </header>

      {/* 본문 */}
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px var(--mkt-space-xl)',
        }}
      >
        {children}
      </main>

      {/* 간소 푸터 */}
      <footer
        style={{
          padding: 'var(--mkt-space-lg) var(--mkt-space-xl)',
          textAlign: 'center',
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: 'var(--mkt-caption-size)',
          fontWeight: 'var(--mkt-caption-weight)',
          letterSpacing: 'var(--mkt-caption-ls)',
          textTransform: 'uppercase',
          color: 'var(--mkt-ink)',
          opacity: 0.3,
        }}
      >
        StoryWork — AI 스토리보드 편집기
      </footer>
    </div>
  )
}
