import Link from 'next/link'
import * as React from 'react'

import { getPublishedCompanyInfo } from '../../lib/company-info'
import type { PublicCompanyInfo } from '../../lib/company-info'

/**
 * Footer — 마케팅 푸터
 *
 * DESIGN.md §footer:
 * - bg: canvas(#fff), text: ink(#000)
 * - padding: 64px 32px
 * - figmaMono caption 으로 컬럼 헤더
 * - 4컬럼 그리드 (모바일 2열 → 1열)
 *
 * CompanyInfo.isPublished=true 이면 사업자정보 블록 표시.
 * false 이면 placeholder 유지 (LEGAL-OPS-01).
 */

const FOOTER_LINKS = {
  제품: [
    { label: '편집기', href: '/editor' },
    { label: '포즈 라이브러리', href: '/features#pose-library' },
    { label: 'AI 자동 배치', href: '/features#ai-layout' },
    { label: 'PDF 출판', href: '/features#pdf' },
  ],
  회사: [
    { label: '서비스 소개', href: '/intro' },
    { label: '사례', href: '/showcase/derbyman' },
    { label: '공지사항', href: '/notices' },
    { label: '공모전', href: '/contest' },
    { label: '자주 묻는 질문', href: '/faq' },
    { label: 'Q&A 문의', href: '/contact' },
  ],
  리소스: [
    { label: '시작 가이드', href: '#' },
    { label: '포즈 라이브러리 목록', href: '#' },
    { label: '판형 프리셋', href: '#' },
    { label: 'API 문서', href: '#' },
  ],
  '법적 고지': [
    { label: '서비스 이용약관', href: '/legal/terms' },
    { label: '개인정보처리방침', href: '/legal/privacy' },
    { label: '환불 정책', href: '/legal/refund' },
    { label: '저작권 정책', href: '#' },
  ],
} as const

/**
 * 사업자정보 블록 — isPublished=true 일 때만 렌더
 */
function BusinessInfoBlock({ info }: { info: PublicCompanyInfo }) {
  return (
    <div
      style={{
        paddingTop: 'var(--mkt-space-xl)',
        borderTop: '1px solid var(--mkt-hairline-soft)',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px',
      }}
    >
      <p
        className="mkt-caption"
        style={{ color: 'var(--mkt-ink)', opacity: 0.35, marginBottom: '8px' }}
      >
        사업자 정보
      </p>
      {(info.companyName || info.ceoName) && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
          {info.companyName}
          {info.ceoName ? ` · 대표: ${info.ceoName}` : ''}
        </p>
      )}
      {info.businessRegistrationNo && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
          사업자등록번호: {info.businessRegistrationNo}
        </p>
      )}
      {info.mailOrderBusinessNo && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
          통신판매업신고: {info.mailOrderBusinessNo}
        </p>
      )}
      {info.address && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
          주소: {info.address}
        </p>
      )}
      {(info.phone || info.email) && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
          {info.phone ? `전화: ${info.phone}` : ''}
          {info.phone && info.email ? ' / ' : ''}
          {info.email ? `이메일: ${info.email}` : ''}
        </p>
      )}
      {info.faxNo && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
          팩스: {info.faxNo}
        </p>
      )}
      {info.hostingProvider && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.35 }}>
          호스팅: {info.hostingProvider}
        </p>
      )}
      {info.customerServiceHours && (
        <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.35 }}>
          고객센터: {info.customerServiceHours}
        </p>
      )}
    </div>
  )
}

export async function Footer() {
  // getPublishedCompanyInfo 는 내부적으로 DB 오류 시 null 을 반환한다 (graceful fallback).
  const companyInfo = await getPublishedCompanyInfo()

  return (
    <footer
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        color: 'var(--mkt-ink)',
        borderTop: '1px solid var(--mkt-hairline)',
        padding: '64px 32px 40px',
      }}
    >
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        {/* 4컬럼 링크 그리드 */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
            gap: 'var(--mkt-space-xl)',
            marginBottom: 'var(--mkt-space-xxl)',
          }}
        >
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category}>
              <h3
                className="mkt-caption"
                style={{
                  color: 'var(--mkt-ink)',
                  marginBottom: 'var(--mkt-space-md)',
                }}
              >
                {category}
              </h3>
              <ul
                style={{
                  listStyle: 'none',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--mkt-space-sm)',
                }}
              >
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      style={{
                        fontFamily: 'var(--mkt-font-sans)',
                        fontSize: 'var(--mkt-body-sm-size)',
                        fontWeight: 'var(--mkt-body-sm-weight)',
                        color: 'var(--mkt-ink)',
                        textDecoration: 'none',
                        opacity: 0.65,
                        transition: 'opacity 120ms ease',
                      }}
                      className="hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 rounded"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* 하단 바: 로고 + 카피라이트 + 소셜 */}
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 'var(--mkt-space-md)',
            paddingTop: 'var(--mkt-space-xl)',
            borderTop: '1px solid var(--mkt-hairline-soft)',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--mkt-ink)',
              letterSpacing: '-0.3px',
            }}
          >
            StoryWork
          </span>

          <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
            &copy; {new Date().getFullYear()} StoryWork. All rights reserved.
          </p>

          {/* 소셜 링크 */}
          <div style={{ display: 'flex', gap: 'var(--mkt-space-sm)' }}>
            {[
              { label: 'Instagram', href: '#', icon: 'IG' },
              { label: 'X (Twitter)', href: '#', icon: 'X' },
              { label: 'GitHub', href: '#', icon: 'GH' },
            ].map(({ label, href, icon }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                style={{
                  width: '40px',
                  height: '40px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'var(--mkt-surface-soft)',
                  borderRadius: 'var(--mkt-rounded-full)',
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '11px',
                  color: 'var(--mkt-ink)',
                  textDecoration: 'none',
                  opacity: 0.6,
                  transition: 'opacity 120ms ease',
                }}
                className="hover:opacity-100 focus-visible:outline-none focus-visible:ring-2"
              >
                {icon}
              </a>
            ))}
          </div>
        </div>

        {/* 사업자정보 블록 — isPublished=true 일 때만 표시 */}
        {companyInfo && <BusinessInfoBlock info={companyInfo} />}
      </div>
    </footer>
  )
}
