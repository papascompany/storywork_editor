/**
 * /faq — 자주 묻는 질문 (BOARD-06)
 *
 * 카테고리별 그룹 + 앵커 네비게이션. 단일 소스: lib/faq-data.ts
 * 랜딩 FAQ 섹션은 featured 일부만, 본 페이지는 전체를 카테고리로 보여준다.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import * as React from 'react'

import { Footer } from '../../components/marketing/Footer'
import { Header } from '../../components/marketing/Header'
import { FAQ_CATEGORIES } from '../../lib/faq-data'

const BASE_URL = process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'

export const metadata: Metadata = {
  title: '자주 묻는 질문 — StoryWork',
  description:
    'StoryWork 편집기·AI 자동 배치·포즈 라이브러리·POD 출판·계정에 대한 자주 묻는 질문을 카테고리별로 정리했습니다.',
  alternates: { canonical: `${BASE_URL}/faq` },
  openGraph: {
    title: '자주 묻는 질문 — StoryWork',
    description: 'StoryWork 사용에 대한 자주 묻는 질문 모음',
    url: `${BASE_URL}/faq`,
  },
}

const TONE_BG: Record<string, string> = {
  lime: 'var(--mkt-block-lime)',
  lilac: 'var(--mkt-block-lilac)',
  cream: 'var(--mkt-block-cream)',
  mint: 'var(--mkt-block-mint)',
  coral: 'var(--mkt-block-coral)',
}

export default function FaqPage() {
  // FAQPage 구조화 데이터 (SEO)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQ_CATEGORIES.flatMap((c) =>
      c.items.map((item) => ({
        '@type': 'Question',
        name: item.q,
        acceptedAnswer: { '@type': 'Answer', text: item.a },
      })),
    ),
  }

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main
        style={{
          maxWidth: 'var(--mkt-max-width)',
          margin: '0 auto',
          padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
        }}
      >
        {/* 헤더 */}
        <p
          className="mkt-caption"
          style={{ color: 'var(--mkt-ink)', opacity: 0.45, marginBottom: 'var(--mkt-space-md)' }}
        >
          FAQ
        </p>
        <h1
          className="mkt-display-xl"
          style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-md)' }}
        >
          자주 묻는 질문
        </h1>
        <p
          className="mkt-body-lg"
          style={{
            color: 'var(--mkt-ink)',
            opacity: 0.6,
            maxWidth: '640px',
            marginBottom: 'var(--mkt-space-xxl)',
          }}
        >
          궁금한 점을 카테고리별로 정리했어요. 찾는 답이 없다면{' '}
          <Link href="/contact" style={{ color: 'var(--mkt-ink)', textDecoration: 'underline' }}>
            문의하기
          </Link>
          로 알려주세요.
        </p>

        {/* 카테고리 앵커 네비 */}
        <nav
          aria-label="FAQ 카테고리"
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '8px',
            marginBottom: 'var(--mkt-space-xxl)',
          }}
        >
          {FAQ_CATEGORIES.map((c) => (
            <a
              key={c.id}
              href={`#${c.id}`}
              className="faq-cat-chip"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '8px 16px',
                borderRadius: '999px',
                backgroundColor: TONE_BG[c.tone],
                color: 'var(--mkt-ink)',
                fontSize: '14px',
                fontWeight: 500,
                fontFamily: 'var(--mkt-font-sans)',
                textDecoration: 'none',
                border: '1.5px solid var(--mkt-ink)',
              }}
            >
              {c.label}
            </a>
          ))}
        </nav>

        {/* 카테고리별 섹션 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-section)' }}>
          {FAQ_CATEGORIES.map((c) => (
            <section key={c.id} id={c.id} style={{ scrollMarginTop: '80px' }}>
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '6px 14px',
                  borderRadius: '999px',
                  backgroundColor: TONE_BG[c.tone],
                  marginBottom: 'var(--mkt-space-lg)',
                }}
              >
                <h2
                  className="mkt-headline"
                  style={{ color: 'var(--mkt-ink)', fontSize: '20px', margin: 0 }}
                >
                  {c.label}
                </h2>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {c.items.map((item, i) => (
                  <details
                    key={i}
                    className="faq-item"
                    style={{
                      borderTop: '1px solid var(--mkt-hairline)',
                      paddingTop: 'var(--mkt-space-md)',
                      paddingBottom: 'var(--mkt-space-md)',
                    }}
                  >
                    <summary
                      className="mkt-body"
                      style={{
                        color: 'var(--mkt-ink)',
                        fontWeight: 480,
                        cursor: 'pointer',
                        listStyle: 'none',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start',
                        gap: 'var(--mkt-space-md)',
                      }}
                    >
                      <span>{item.q}</span>
                      <span
                        className="faq-icon"
                        style={{
                          fontFamily: 'var(--mkt-font-mono)',
                          fontSize: '18px',
                          flexShrink: 0,
                          lineHeight: 1.5,
                          color: 'var(--mkt-ink)',
                          opacity: 0.45,
                          userSelect: 'none',
                        }}
                        aria-hidden="true"
                      >
                        +
                      </span>
                    </summary>
                    <p
                      className="mkt-body-sm"
                      style={{
                        color: 'var(--mkt-ink)',
                        opacity: 0.7,
                        marginTop: 'var(--mkt-space-sm)',
                        lineHeight: 1.6,
                      }}
                    >
                      {item.a}
                    </p>
                  </details>
                ))}
                <div style={{ borderTop: '1px solid var(--mkt-hairline)' }} aria-hidden="true" />
              </div>
            </section>
          ))}
        </div>

        <style>{`
          .faq-item summary::-webkit-details-marker { display: none; }
          .faq-item[open] .faq-icon { transform: rotate(45deg); opacity: 0.65; }
          .faq-icon { transition: transform 180ms cubic-bezier(0.34,1.56,0.64,1); display: inline-block; }
          .faq-item summary:focus-visible { outline: 2px solid var(--mkt-ink); outline-offset: 4px; border-radius: 4px; }
          .faq-cat-chip { transition: transform 160ms cubic-bezier(0.34,1.56,0.64,1); }
          .faq-cat-chip:hover { transform: translateY(-2px); }
          @media (prefers-reduced-motion: reduce) {
            .faq-icon, .faq-cat-chip { transition: none; }
            .faq-item[open] .faq-icon { transform: none; }
          }
        `}</style>
      </main>

      <Footer />

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  )
}
