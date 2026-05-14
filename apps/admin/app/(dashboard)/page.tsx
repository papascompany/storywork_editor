/**
 * (dashboard)/page.tsx — 대시보드 홈
 *
 * 인증 + admin role + 2FA 검증 후 접근 가능.
 * 마케팅 디자인 시스템 토큰 적용: 모노크롬 + 파스텔 카드.
 */
import { FileText, Layers, Layers2, List, ScrollText } from 'lucide-react'
import Link from 'next/link'

import { requireRole } from '../../src/lib/auth'

// ─── 메뉴 카드 정의 ──────────────────────────────────────────────────────────

interface MenuCard {
  href: string
  label: string
  description: string
  icon: React.ElementType
  blockColor: string
  available: boolean
}

const MENU_CARDS: MenuCard[] = [
  {
    href: '/formats',
    label: '판형 관리',
    description: '인쇄 판형(B5, A4 등) 등록 및 편집',
    icon: Layers,
    blockColor: 'var(--mkt-block-lime)',
    available: true,
  },
  {
    href: '/resources',
    label: '리소스 관리',
    description: '포즈·배경·소품 등 리소스 검수 및 관리',
    icon: FileText,
    blockColor: 'var(--mkt-block-lilac)',
    available: true,
  },
  {
    href: '/templates',
    label: '템플릿 관리',
    description: '페이지 레이아웃 템플릿 등록 및 슬롯 편집',
    icon: List,
    blockColor: 'var(--mkt-block-mint)',
    available: true,
  },
  {
    href: '/template-sets',
    label: '템플릿 세트',
    description: '여러 템플릿을 묶은 세트 관리',
    icon: Layers2,
    blockColor: 'var(--mkt-block-cream)',
    available: true,
  },
  {
    href: '/audit',
    label: '감사 로그',
    description: '누가·언제·무엇을 변경했는지 이력 조회',
    icon: ScrollText,
    blockColor: 'var(--mkt-block-coral)',
    available: true,
  },
]

export default async function DashboardPage() {
  const user = await requireRole()

  return (
    <div className="p-6 lg:p-10" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      {/* 페이지 헤더 */}
      <div className="mb-10">
        {/* eyebrow */}
        <p
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '12px',
            fontWeight: 400,
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
            marginBottom: '8px',
          }}
        >
          Admin Console
        </p>

        <h1
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: 'clamp(28px, 4vw, 40px)',
            fontWeight: 340,
            lineHeight: 1.1,
            letterSpacing: '-0.96px',
            color: 'var(--mkt-ink)',
            marginBottom: '8px',
            wordBreak: 'keep-all',
          }}
        >
          대시보드
        </h1>

        <div className="flex items-center gap-2">
          <span
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.5,
            }}
          >
            {user.email}
          </span>
          <span
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.4px',
              textTransform: 'uppercase',
              backgroundColor: 'var(--mkt-block-lime)',
              color: 'var(--mkt-ink)',
              borderRadius: 'var(--mkt-rounded-full)',
              padding: '2px 8px',
            }}
          >
            {user.role}
          </span>
        </div>
      </div>

      {/* 메뉴 카드 그리드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MENU_CARDS.filter((c) => c.available).map((card) => {
          const Icon = card.icon
          return (
            <Link
              key={card.href}
              href={card.href}
              className="group block transition-transform duration-150 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
              style={{
                borderRadius: 'var(--mkt-rounded-lg)',
                border: '1px solid var(--mkt-hairline)',
                backgroundColor: 'var(--mkt-canvas)',
                textDecoration: 'none',
                overflow: 'hidden',
              }}
            >
              {/* 컬러 상단 스트라이프 */}
              <div
                style={{
                  height: '6px',
                  backgroundColor: card.blockColor,
                }}
              />

              <div className="p-5 flex flex-col gap-3">
                {/* 아이콘 */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '40px',
                    height: '40px',
                    borderRadius: 'var(--mkt-rounded-md)',
                    backgroundColor: card.blockColor,
                  }}
                >
                  <Icon className="size-5" aria-hidden="true" style={{ color: 'var(--mkt-ink)' }} />
                </div>

                {/* 텍스트 */}
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '17px',
                      fontWeight: 540,
                      letterSpacing: '-0.26px',
                      color: 'var(--mkt-ink)',
                      marginBottom: '4px',
                    }}
                  >
                    {card.label}
                  </p>
                  <p
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '14px',
                      fontWeight: 330,
                      lineHeight: 1.45,
                      color: 'var(--mkt-ink)',
                      opacity: 0.55,
                    }}
                  >
                    {card.description}
                  </p>
                </div>

                {/* 화살표 */}
                <div
                  className="self-end"
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '13px',
                    fontWeight: 480,
                    color: 'var(--mkt-ink)',
                    opacity: 0.35,
                  }}
                >
                  →
                </div>
              </div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
