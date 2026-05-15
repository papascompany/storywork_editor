'use client'

/**
 * SidebarNavClient.tsx
 *
 * 사이드바 메뉴 링크 — usePathname() 때문에 클라이언트 컴포넌트로 분리.
 * 나머지 레이아웃(DashboardLayout)은 서버 컴포넌트로 유지해 성능 확보.
 *
 * 100p Admin 패턴:
 *   - 활성 메뉴: 검정 1px outline border + --nike-sale (#d30005) 텍스트
 *   - 비활성: 투명 border + --nike-ink 텍스트 (opacity 0.6)
 *   - hover: --nike-soft-cloud 배경
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

export interface NavItemDef {
  href: string
  label: string
  exact: boolean
}

interface SidebarNavClientProps {
  items: NavItemDef[]
  onItemClick?: () => void
}

export function SidebarNavClient({ items, onItemClick }: SidebarNavClientProps) {
  const pathname = usePathname()

  return (
    <div className="flex flex-col gap-0.5 px-2">
      {items.map((item) => {
        const isActive = item.exact ? pathname === item.href : pathname.startsWith(item.href)
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={true}
            onClick={onItemClick}
            className="nike-nav-link"
            aria-current={isActive ? 'page' : undefined}
            style={isActive ? undefined : { color: 'var(--nike-ink)', opacity: 0.65 }}
          >
            {item.label}
          </Link>
        )
      })}
    </div>
  )
}

/**
 * MobileMenuButton — 모바일 햄버거 버튼 (클라이언트)
 */
interface MobileMenuButtonProps {
  isOpen: boolean
  onToggle: () => void
}

export function MobileMenuToggle({ isOpen, onToggle }: MobileMenuButtonProps) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-label={isOpen ? '메뉴 닫기' : '메뉴 열기'}
      aria-expanded={isOpen}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '36px',
        height: '36px',
        borderRadius: '8px',
        border: 'none',
        background: 'none',
        cursor: 'pointer',
        color: 'var(--nike-ink)',
      }}
    >
      {/* 햄버거 / X 아이콘 */}
      {isOpen ? (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M5 5l10 10M15 5L5 15"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      ) : (
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M3 6h14M3 10h14M3 14h14"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
          />
        </svg>
      )}
    </button>
  )
}

/**
 * MobileSidebarDrawer — 모바일 드로어 전체 (클라이언트, useState 포함)
 */
interface MobileSidebarDrawerProps {
  items: NavItemDef[]
  logoSlot: React.ReactNode
  logoutSlot: React.ReactNode
  userEmail: string
}

export function MobileSidebarDrawer({
  items,
  logoSlot,
  logoutSlot,
  userEmail,
}: MobileSidebarDrawerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <>
      {/* 모바일 상단 헤더 바 */}
      <header
        className="flex items-center gap-3 px-4 md:hidden"
        style={{
          height: '56px',
          backgroundColor: 'var(--nike-canvas)',
          borderBottom: '1px solid var(--nike-hairline-soft)',
        }}
      >
        <MobileMenuToggle isOpen={open} onToggle={() => setOpen((v) => !v)} />
        <div
          style={{
            fontFamily: 'var(--nike-font-display)',
            fontSize: '16px',
            fontWeight: 500,
            color: 'var(--nike-ink)',
          }}
        >
          StoryWork Admin
        </div>
      </header>

      {/* 모바일 드로어 */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="모바일 메뉴"
          className="fixed inset-0 z-50 md:hidden"
        >
          {/* 백드롭 */}
          <div
            className="absolute inset-0"
            style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          {/* 드로어 패널 */}
          <div
            className="absolute left-0 top-0 bottom-0 w-60 flex flex-col"
            style={{ backgroundColor: 'var(--nike-canvas)' }}
          >
            {logoSlot}
            <div className="px-4 py-2">
              <p
                style={{
                  fontSize: '11px',
                  fontWeight: 500,
                  color: 'var(--nike-mute)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                }}
              >
                {userEmail}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto py-2">
              <SidebarNavClient items={items} onItemClick={() => setOpen(false)} />
            </div>
            {logoutSlot}
          </div>
        </div>
      )}
    </>
  )
}
