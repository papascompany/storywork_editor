/**
 * components/mypage/EmptyState.tsx
 *
 * 작품이 없을 때 표시하는 빈 상태 컴포넌트.
 * "지금 시작하기" CTA → /editor
 */
import { PenLine } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

export function EmptyState() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '64px 24px',
        textAlign: 'center',
        gap: 'var(--mkt-space-lg)',
      }}
    >
      {/* 아이콘 원 */}
      <div
        aria-hidden="true"
        style={{
          width: '72px',
          height: '72px',
          borderRadius: 'var(--mkt-rounded-full)',
          backgroundColor: 'var(--mkt-hairline-soft)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <PenLine
          style={{ width: '28px', height: '28px', color: 'var(--mkt-ink)', opacity: 0.35 }}
        />
      </div>

      {/* 텍스트 */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xs)' }}>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '18px',
            fontWeight: 540,
            letterSpacing: '-0.26px',
            color: 'var(--mkt-ink)',
            margin: 0,
          }}
        >
          아직 만든 작품이 없어요
        </p>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            margin: 0,
            lineHeight: 1.55,
          }}
        >
          대본만 넣으면 AI가 스토리보드를 완성해 드려요.
          <br />첫 작품을 지금 시작해 보세요.
        </p>
      </div>

      {/* CTA 버튼 */}
      <Link
        href="/editor"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '44px',
          padding: '0 24px',
          borderRadius: 'var(--mkt-rounded-pill)',
          backgroundColor: 'var(--mkt-ink)',
          color: 'var(--mkt-canvas)',
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '15px',
          fontWeight: 480,
          letterSpacing: '-0.10px',
          textDecoration: 'none',
          transition: 'opacity 150ms ease',
        }}
        onMouseEnter={(e) => {
          ;(e.currentTarget as HTMLAnchorElement).style.opacity = '0.82'
        }}
        onMouseLeave={(e) => {
          ;(e.currentTarget as HTMLAnchorElement).style.opacity = '1'
        }}
      >
        지금 시작하기
      </Link>
    </div>
  )
}
