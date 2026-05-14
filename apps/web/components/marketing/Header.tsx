'use client'

import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@storywork/ui'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import * as React from 'react'

/**
 * Header — 마케팅 상단 네비게이션 (top-nav)
 *
 * DESIGN.md §top-nav:
 * - height: 56px
 * - bg: canvas(#fff), text: ink(#000)
 * - 좌: 로고 / 가운데: nav 링크 / 우: "로그인" + "지금 시작하기" pill
 * - 768px 이하: 햄버거 → Sheet (좌측 슬라이드)
 *
 * 스크롤 시 hairline 하단 테두리 표시 (shadow 없이 경계만)
 */

const NAV_LINKS = [
  { label: '서비스 소개', href: '/intro' },
  { label: '기능', href: '/features' },
  { label: '사례', href: '/showcase/derbyman' },
] as const

function Logo() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2 focus-visible:outline-none focus-visible:ring-2"
      style={{
        color: 'var(--mkt-ink)',
        textDecoration: 'none',
        borderRadius: 'var(--mkt-rounded-sm)',
      }}
      aria-label="StoryWork 홈"
    >
      {/* 로고 아이콘 — 간단한 SVG 마크 */}
      <svg
        width="28"
        height="28"
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
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '18px',
          fontWeight: '700',
          letterSpacing: '-0.3px',
          color: 'var(--mkt-ink)',
        }}
      >
        StoryWork
      </span>
    </Link>
  )
}

function NavLinks({ onSelect }: { onSelect?: () => void }) {
  const pathname = usePathname()

  return (
    <>
      {NAV_LINKS.map(({ label, href }) => {
        const isActive = pathname === href || pathname.startsWith(href + '/')
        return (
          <Link
            key={href}
            href={href}
            onClick={onSelect}
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'var(--mkt-body-sm-size)',
              fontWeight: isActive ? '540' : 'var(--mkt-body-sm-weight)',
              letterSpacing: 'var(--mkt-body-sm-ls)',
              color: 'var(--mkt-ink)',
              textDecoration: 'none',
              padding: '8px 12px',
              borderRadius: 'var(--mkt-rounded-sm)',
              transition: 'opacity 120ms ease',
              opacity: isActive ? 1 : 0.7,
            }}
            aria-current={isActive ? 'page' : undefined}
            className="hover:opacity-100 focus-visible:outline-none focus-visible:ring-2"
          >
            {label}
          </Link>
        )
      })}
    </>
  )
}

export function Header() {
  const [menuOpen, setMenuOpen] = React.useState(false)
  const [scrolled, setScrolled] = React.useState(false)

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 4)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 50,
        backgroundColor: 'var(--mkt-canvas)',
        height: 'var(--mkt-nav-height)',
        borderBottom: scrolled ? '1px solid var(--mkt-hairline)' : '1px solid transparent',
        transition: 'border-color 200ms ease',
      }}
    >
      <div
        style={{
          maxWidth: 'var(--mkt-max-width)',
          margin: '0 auto',
          padding: '0 var(--mkt-space-xl)',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--mkt-space-xl)',
        }}
      >
        {/* 좌: 로고 */}
        <Logo />

        {/* 가운데: 데스크톱 네비 */}
        <nav
          className="hidden md:flex"
          style={{ flex: 1, gap: 'var(--mkt-space-xs)' }}
          aria-label="주요 네비게이션"
        >
          <NavLinks />
        </nav>

        {/* 우: CTA */}
        <div
          className="hidden md:flex"
          style={{ gap: 'var(--mkt-space-sm)', alignItems: 'center' }}
        >
          <Link
            href="https://storywork-editor-admin.vercel.app/login"
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'var(--mkt-body-sm-size)',
              fontWeight: 'var(--mkt-body-sm-weight)',
              color: 'var(--mkt-ink)',
              textDecoration: 'none',
              padding: '8px 12px',
              opacity: 0.7,
            }}
            className="hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 rounded"
          >
            로그인
          </Link>
          <Link
            href="/editor"
            className="mkt-btn-primary"
            style={{ fontSize: '15px', padding: '8px 20px' }}
          >
            지금 시작하기
          </Link>
        </div>

        {/* 모바일: 햄버거 */}
        <div className="ml-auto flex md:hidden">
          <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label={menuOpen ? '메뉴 닫기' : '메뉴 열기'}
                aria-expanded={menuOpen}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '8px',
                  color: 'var(--mkt-ink)',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {menuOpen ? <X size={22} /> : <Menu size={22} />}
              </button>
            </SheetTrigger>
            <SheetContent side="left">
              <SheetHeader>
                <SheetTitle>
                  <Logo />
                </SheetTitle>
              </SheetHeader>
              <nav
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--mkt-space-xs)',
                  padding: 'var(--mkt-space-lg)',
                }}
                aria-label="모바일 네비게이션"
              >
                <NavLinks onSelect={() => setMenuOpen(false)} />
                <div
                  style={{
                    marginTop: 'var(--mkt-space-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--mkt-space-sm)',
                  }}
                >
                  <Link
                    href="https://storywork-editor-admin.vercel.app/login"
                    onClick={() => setMenuOpen(false)}
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: 'var(--mkt-body-size)',
                      color: 'var(--mkt-ink)',
                      textDecoration: 'none',
                      padding: '10px 0',
                      opacity: 0.7,
                    }}
                  >
                    로그인
                  </Link>
                  <Link
                    href="/editor"
                    className="mkt-btn-primary"
                    onClick={() => setMenuOpen(false)}
                    style={{ textAlign: 'center' }}
                  >
                    지금 시작하기
                  </Link>
                </div>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
