/**
 * (dashboard)/layout.tsx — 관리자 콘솔 셸 레이아웃
 *
 * Server Component (성능 최적화 — usePathname 은 SidebarNavClient 에만 격리).
 * 100p Admin 레퍼런스 정확 모방:
 *   - 좌측 사이드바 240px, nike-canvas 배경, 우측 hairline-soft 테두리
 *   - 상단 로고: "StoryWork Admin" (nike-font-display 18px w500) + 사용자 이메일 (12px mute)
 *   - 메뉴: .nike-nav-link (활성 = ink outline + sale red 텍스트)
 *   - 로그아웃: 사이드바 하단 sticky
 */

import { LogOut } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../src/lib/auth'

import type { NavItemDef } from './SidebarNavClient'
import { MobileSidebarDrawer, SidebarNavClient } from './SidebarNavClient'

// ─── 메뉴 정의 ───────────────────────────────────────────────────────────────

const NAV_ITEMS: NavItemDef[] = [
  { href: '/', label: '대시보드', exact: true },
  { href: '/formats', label: '판형', exact: false },
  { href: '/resources', label: '리소스', exact: false },
  { href: '/templates', label: '템플릿', exact: false },
  { href: '/template-sets', label: '템플릿 세트', exact: false },
  { href: '/audit', label: '감사 로그', exact: false },
]

// ─── 로고 슬롯 (서버 렌더, Link 포함) ───────────────────────────────────────

function SidebarLogo({ email }: { email: string }) {
  return (
    <div style={{ borderBottom: '1px solid var(--nike-hairline-soft)', padding: '20px 16px 16px' }}>
      <Link
        href="/"
        prefetch={true}
        style={{ textDecoration: 'none', display: 'block' }}
        aria-label="StoryWork Admin 홈"
      >
        <div
          style={{
            fontFamily: 'var(--nike-font-display)',
            fontSize: '18px',
            fontWeight: 500,
            color: 'var(--nike-ink)',
            lineHeight: 1.3,
          }}
        >
          StoryWork Admin
        </div>
      </Link>
      {/* 사용자 이메일 — 100p Admin 참조 */}
      <p
        style={{
          marginTop: '4px',
          fontFamily: 'var(--nike-font-text)',
          fontSize: '12px',
          fontWeight: 400,
          color: 'var(--nike-mute)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {email}
      </p>
    </div>
  )
}

// ─── 로그아웃 슬롯 ───────────────────────────────────────────────────────────

function SidebarLogout() {
  return (
    <div style={{ borderTop: '1px solid var(--nike-hairline-soft)', padding: '12px 8px' }}>
      <form action="/api/auth/logout" method="post">
        <button
          type="submit"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '10px',
            width: '100%',
            padding: '10px 12px',
            borderRadius: '8px',
            border: 'none',
            background: 'none',
            cursor: 'pointer',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 400,
            color: 'var(--nike-mute)',
            textAlign: 'left',
            transition: 'background-color 100ms',
          }}
          onMouseEnter={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'var(--nike-soft-cloud)'
          }}
          onMouseLeave={(e) => {
            ;(e.currentTarget as HTMLButtonElement).style.backgroundColor = 'transparent'
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
  )
}

// ─── 레이아웃 ─────────────────────────────────────────────────────────────────

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // 서버에서 사용자 정보 조회 — 사이드바 헤더에 이메일 표시용
  const user = await requireRole()

  const logoSlot = <SidebarLogo email={user.email} />
  const logoutSlot = <SidebarLogout />

  return (
    <div
      className="flex min-h-dvh"
      style={{ backgroundColor: 'var(--nike-soft-cloud)', fontFamily: 'var(--nike-font-text)' }}
    >
      {/* ─── 데스크톱 사이드바 (240px, sticky) ─── */}
      <aside
        className="hidden md:flex md:flex-col shrink-0"
        aria-label="관리자 메뉴"
        style={{
          width: '240px',
          backgroundColor: 'var(--nike-canvas)',
          borderRight: '1px solid var(--nike-hairline-soft)',
          minHeight: '100dvh',
          position: 'sticky',
          top: 0,
          height: '100dvh',
          overflowY: 'auto',
        }}
      >
        {/* 로고 + 이메일 */}
        {logoSlot}

        {/* 메뉴 레이블 */}
        <div style={{ padding: '16px 16px 6px' }}>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '11px',
              fontWeight: 500,
              color: 'var(--nike-stone)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}
          >
            Navigation
          </p>
        </div>

        {/* 네비게이션 링크 (클라이언트 컴포넌트 — usePathname 격리) */}
        <nav className="flex-1 py-1" aria-label="주요 메뉴">
          <SidebarNavClient items={NAV_ITEMS} />
        </nav>

        {/* 로그아웃 */}
        {logoutSlot}
      </aside>

      {/* ─── 모바일 헤더 + 드로어 (클라이언트, 상태 격리) ─── */}
      <MobileSidebarDrawer
        items={NAV_ITEMS}
        logoSlot={logoSlot}
        logoutSlot={logoutSlot}
        userEmail={user.email}
      />

      {/* ─── 메인 콘텐츠 ─── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
