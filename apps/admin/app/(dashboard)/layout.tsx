'use client'

/**
 * (dashboard)/layout.tsx
 *
 * 인증 통과 후 관리자 콘솔 셸 레이아웃.
 * 마케팅 디자인 시스템: 좌측 사이드바(데스크톱) + 상단 헤더(모바일).
 * 시각 언어: 마케팅 Header 와 동일 — Sparkles 아이콘 + mkt-font-sans/mono.
 */

import { cn } from '@storywork/ui'
import {
  FileText,
  Layers,
  Layers2,
  LayoutDashboard,
  List,
  LogOut,
  Menu,
  ScrollText,
  Sparkles,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

// ─── 메뉴 정의 ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/formats', label: '판형', icon: Layers, exact: false },
  { href: '/resources', label: '리소스', icon: FileText, exact: false },
  { href: '/templates', label: '템플릿', icon: List, exact: false },
  { href: '/template-sets', label: '템플릿 세트', icon: Layers2, exact: false },
  { href: '/audit', label: '감사 로그', icon: ScrollText, exact: false },
]

// ─── NavItem ─────────────────────────────────────────────────────────────────

function NavItem({
  href,
  label,
  icon: Icon,
  exact,
  onClick,
}: {
  href: string
  label: string
  icon: React.ElementType
  exact: boolean
  onClick?: () => void
}) {
  const pathname = usePathname()
  const isActive = exact ? pathname === href : pathname.startsWith(href)

  return (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 px-4 py-2.5 transition-colors duration-100',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-1',
      )}
      style={{
        borderRadius: 'var(--mkt-rounded-md)',
        fontFamily: 'var(--mkt-font-sans)',
        fontSize: '15px',
        fontWeight: isActive ? 540 : 330,
        letterSpacing: '-0.10px',
        color: 'var(--mkt-ink)',
        opacity: isActive ? 1 : 0.55,
        // 활성 메뉴: mkt-block-cream 파스텔 배경
        backgroundColor: isActive ? 'var(--mkt-block-cream)' : 'transparent',
        textDecoration: 'none',
      }}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon
        style={{ width: '16px', height: '16px', flexShrink: 0, opacity: isActive ? 1 : 0.65 }}
        aria-hidden="true"
        strokeWidth={isActive ? 2 : 1.5}
      />
      {label}
    </Link>
  )
}

// ─── Sidebar 본체 ─────────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <nav aria-label="관리자 메뉴" className="flex flex-col h-full">
      {/* 로고 영역 */}
      <div
        className="flex items-center justify-between px-4 py-5"
        style={{ borderBottom: '1px solid var(--mkt-hairline)' }}
      >
        <Link
          href="/"
          className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2 rounded"
          style={{ textDecoration: 'none' }}
        >
          <Sparkles
            style={{ width: '20px', height: '20px', color: 'var(--mkt-ink)' }}
            aria-hidden="true"
            strokeWidth={1.5}
          />
          <div>
            <span
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '16px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
              }}
            >
              StoryWork
            </span>{' '}
            <span className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.4 }}>
              Admin
            </span>
          </div>
        </Link>

        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="rounded-md p-1 focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.45,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <X style={{ width: '20px', height: '20px' }} aria-hidden="true" />
          </button>
        )}
      </div>

      {/* 섹션 헤더 */}
      <div className="px-4 pt-5 pb-2">
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.35 }}>
          Navigation
        </p>
      </div>

      {/* 메뉴 링크 */}
      <div className="flex flex-col gap-0.5 px-2 flex-1">
        {NAV_ITEMS.map((item) => (
          <NavItem key={item.href} {...item} onClick={onClose} />
        ))}
      </div>

      {/* 로그아웃 */}
      <div className="px-2 py-4" style={{ borderTop: '1px solid var(--mkt-hairline)' }}>
        <form action="/api/auth/logout" method="post">
          <button
            type="submit"
            className="flex w-full items-center gap-3 px-4 py-2.5 transition-opacity hover:opacity-70 focus-visible:outline-none focus-visible:ring-2"
            style={{
              borderRadius: 'var(--mkt-rounded-md)',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 330,
              letterSpacing: '-0.10px',
              color: 'var(--mkt-ink)',
              opacity: 0.45,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textAlign: 'left',
            }}
          >
            <LogOut
              style={{ width: '16px', height: '16px', flexShrink: 0 }}
              aria-hidden="true"
              strokeWidth={1.5}
            />
            로그아웃
          </button>
        </form>
      </div>
    </nav>
  )
}

// ─── 레이아웃 ─────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div
      className="flex min-h-dvh"
      style={{ backgroundColor: 'var(--mkt-surface-soft)', fontFamily: 'var(--mkt-font-sans)' }}
    >
      {/* ─── 데스크톱 사이드바 ─── */}
      <aside
        className="hidden w-64 shrink-0 md:flex md:flex-col"
        aria-label="사이드바"
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          borderRight: '1px solid var(--mkt-hairline)',
          minHeight: '100dvh',
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflowY: 'auto',
        }}
      >
        <Sidebar />
      </aside>

      {/* ─── 모바일 오버레이 ─── */}
      {mobileOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
          className="fixed inset-0 z-50 md:hidden"
        >
          {/* 백드롭 */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* 드로어 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-72 shadow-xl"
            style={{ backgroundColor: 'var(--mkt-canvas)' }}
          >
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ─── 메인 영역 ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <header
          className="flex items-center gap-3 px-4 py-3 md:hidden"
          style={{
            backgroundColor: 'var(--mkt-canvas)',
            borderBottom: '1px solid var(--mkt-hairline)',
          }}
        >
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
            className="flex items-center justify-center rounded-md p-1.5 focus-visible:outline-none focus-visible:ring-2"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.6,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
            }}
          >
            <Menu style={{ width: '20px', height: '20px' }} aria-hidden="true" strokeWidth={1.5} />
          </button>
          <div className="flex items-center gap-2">
            <Sparkles
              style={{ width: '16px', height: '16px', color: 'var(--mkt-ink)' }}
              aria-hidden="true"
              strokeWidth={1.5}
            />
            <span
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '15px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
              }}
            >
              StoryWork{' '}
              <span className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.4 }}>
                Admin
              </span>
            </span>
          </div>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
