'use client'

/**
 * (dashboard)/layout.tsx
 *
 * 인증 통과 후 관리자 콘솔 셸 레이아웃.
 * 좌측 사이드바(데스크톱) + 상단 헤더(모바일 햄버거) 구성.
 * Server Component 가 아닌 Client Component — 사이드바 활성 상태 추적에 usePathname 필요.
 */

import { Button, cn } from '@storywork/ui'
import { FileText, Layers, LayoutDashboard, List, LogOut, Menu, ScrollText, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

// ─── 메뉴 정의 ───────────────────────────────────────────────────────────────

const NAV_ITEMS = [
  { href: '/', label: '대시보드', icon: LayoutDashboard, exact: true },
  { href: '/formats', label: '판형', icon: Layers, exact: false },
  { href: '/resources', label: '리소스', icon: FileText, exact: false },
  { href: '/templates', label: '템플릿', icon: List, exact: false },
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
        'flex items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        isActive
          ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]'
          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
      )}
      aria-current={isActive ? 'page' : undefined}
    >
      <Icon className="size-4 shrink-0" aria-hidden="true" />
      {label}
    </Link>
  )
}

// ─── Sidebar 본체 ─────────────────────────────────────────────────────────────

function Sidebar({ onClose }: { onClose?: () => void }) {
  return (
    <nav aria-label="관리자 메뉴" className="flex flex-col gap-1 p-4">
      {/* 로고 */}
      <div className="mb-4 flex items-center justify-between">
        <span className="text-base font-bold text-[var(--color-text)]">StoryWork Admin</span>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="메뉴 닫기"
            className="rounded-[var(--radius-sm)] p-1 text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          >
            <X className="size-5" />
          </button>
        )}
      </div>

      {NAV_ITEMS.map((item) => (
        <NavItem key={item.href} {...item} onClick={onClose} />
      ))}
    </nav>
  )
}

// ─── 레이아웃 ─────────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

  return (
    <div className="flex min-h-dvh bg-[var(--color-surface-muted)]">
      {/* ─── 데스크톱 사이드바 ─── */}
      <aside
        className="hidden w-56 shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] md:flex md:flex-col"
        aria-label="사이드바"
      >
        <Sidebar />

        {/* 로그아웃 버튼 */}
        <div className="mt-auto border-t border-[var(--color-border)] p-4">
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className={cn(
                'flex w-full items-center gap-3 rounded-[var(--radius-md)] px-3 py-2 text-sm font-medium',
                'text-[var(--color-text-muted)] transition-colors duration-[var(--duration-fast)]',
                'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              )}
            >
              <LogOut className="size-4 shrink-0" aria-hidden="true" />
              로그아웃
            </button>
          </form>
        </div>
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
            className="absolute inset-0 bg-black/40"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          {/* 드로어 */}
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-[var(--color-surface)] shadow-xl">
            <Sidebar onClose={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* ─── 메인 영역 ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 모바일 헤더 */}
        <header className="flex items-center gap-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 md:hidden">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMobileOpen(true)}
            aria-label="메뉴 열기"
            aria-expanded={mobileOpen}
          >
            <Menu className="size-5" aria-hidden="true" />
          </Button>
          <span className="text-sm font-bold text-[var(--color-text)]">StoryWork Admin</span>
        </header>

        {/* 페이지 콘텐츠 */}
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
