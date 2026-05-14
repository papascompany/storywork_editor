/**
 * (dashboard)/page.tsx — 대시보드 홈
 *
 * 인증 + admin role 검증 후 접근 가능.
 * 마케팅 디자인 시스템: oversized display 헤더 + pastel block 카드 그리드.
 */
import { FileText, Layers, Layers2, List, ScrollText } from 'lucide-react'
import Link from 'next/link'

import { requireRole } from '../../src/lib/auth'

// ─── 메뉴 카드 정의 ──────────────────────────────────────────────────────────

interface MenuCard {
  href: string
  label: string
  description: string
  eyebrow: string
  icon: React.ElementType
  blockClass: string
  available: boolean
}

const MENU_CARDS: MenuCard[] = [
  {
    href: '/formats',
    label: '판형 관리',
    description: '인쇄 판형(B5, A4 등) 등록 및 편집. bleed·safe·DPI 설정.',
    eyebrow: 'FORMATS / 01',
    icon: Layers,
    blockClass: 'mkt-block-lime',
    available: true,
  },
  {
    href: '/resources',
    label: '리소스 관리',
    description: '포즈·배경·소품 등 리소스 검수 및 관리. 일괄 업로드 지원.',
    eyebrow: 'RESOURCES / 02',
    icon: FileText,
    blockClass: 'mkt-block-lilac',
    available: true,
  },
  {
    href: '/templates',
    label: '템플릿 관리',
    description: '페이지 레이아웃 템플릿 등록 및 슬롯 편집.',
    eyebrow: 'TEMPLATES / 03',
    icon: List,
    blockClass: 'mkt-block-mint',
    available: true,
  },
  {
    href: '/template-sets',
    label: '템플릿 세트',
    description: '여러 템플릿을 묶은 세트 관리. 커버 인덱스 지정.',
    eyebrow: 'SETS / 04',
    icon: Layers2,
    blockClass: 'mkt-block-cream',
    available: true,
  },
  {
    href: '/audit',
    label: '감사 로그',
    description: '누가·언제·무엇을 변경했는지 이력 조회. 수정·삭제 불가.',
    eyebrow: 'AUDIT / 05',
    icon: ScrollText,
    blockClass: 'mkt-block-coral',
    available: true,
  },
]

export default async function DashboardPage() {
  const user = await requireRole()

  return (
    <div
      className="p-6 lg:p-10"
      style={{
        maxWidth: 'var(--mkt-max-width)',
        fontFamily: 'var(--mkt-font-sans)',
      }}
    >
      {/* ─── 페이지 헤더 ─── */}
      <header style={{ marginBottom: 'var(--mkt-space-xxl)' }}>
        <p
          className="mkt-eyebrow"
          style={{ color: 'var(--mkt-ink)', opacity: 0.45, marginBottom: 'var(--mkt-space-sm)' }}
        >
          ADMIN CONSOLE
        </p>
        <h1
          className="mkt-display-lg"
          style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-md)' }}
        >
          대시보드
        </h1>
        <div className="flex items-center gap-3 flex-wrap">
          <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
            {user.email}
          </p>
          <span
            className="mkt-caption"
            style={{
              backgroundColor: 'var(--mkt-block-lime)',
              color: 'var(--mkt-ink)',
              borderRadius: 'var(--mkt-rounded-full)',
              padding: '2px 10px',
            }}
          >
            {user.role}
          </span>
        </div>
      </header>

      {/* ─── 메뉴 카드 그리드 — oversized pastel block ─── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_CARDS.filter((c) => c.available).map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className={`mkt-block ${card.blockClass} group block transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2`}
              style={{
                textDecoration: 'none',
                display: 'block',
              }}
              aria-label={card.label}
            >
              {/* eyebrow */}
              <p
                className="mkt-eyebrow"
                style={{
                  color: 'var(--mkt-ink)',
                  opacity: 0.45,
                  marginBottom: 'var(--mkt-space-lg)',
                  fontSize: '12px',
                }}
              >
                {card.eyebrow}
              </p>

              {/* 아이콘 */}
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--mkt-rounded-md)',
                  backgroundColor: 'rgba(0,0,0,0.07)',
                  marginBottom: 'var(--mkt-space-lg)',
                }}
              >
                <Icon className="size-6" aria-hidden="true" style={{ color: 'var(--mkt-ink)' }} />
              </div>

              {/* 제목 */}
              <h2
                className="mkt-headline"
                style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-xs)' }}
              >
                {card.label}
              </h2>

              {/* 설명 */}
              <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.65 }}>
                {card.description}
              </p>

              {/* 화살표 */}
              <div
                style={{
                  marginTop: 'var(--mkt-space-lg)',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '20px',
                  fontWeight: 340,
                  color: 'var(--mkt-ink)',
                  opacity: 0.4,
                }}
                aria-hidden="true"
              >
                →
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
