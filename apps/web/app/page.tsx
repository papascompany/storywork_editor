/**
 * / — 랜딩 페이지
 *
 * 색상 흐름:
 *   white hero → marquee → value-props(lilac) → cream → lime → navy
 *   → persona(mint) → coral → showcase → FAQ(cream) → social-proof → CTA
 * RSC (서버 컴포넌트) — MarqueeStrip 만 client
 */

import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'

import { ColorBlock } from '../components/marketing/ColorBlock'
import { Footer } from '../components/marketing/Footer'
import { Header } from '../components/marketing/Header'
import { MarqueeStrip } from '../components/marketing/MarqueeStrip'
import { PillButton } from '../components/marketing/PillButton'
import { ScrollReveal } from '../components/marketing/ScrollReveal'
import { FEATURED_FAQS } from '../lib/faq-data'
import { getDerbymanScenes, getPoseShowcase } from '../lib/marketing-assets'

const BASE_URL = 'https://storywork-editor-web.vercel.app'

export const metadata: Metadata = {
  title: '스토리워크 — 대본만 쓰세요. AI가 페이지를 그립니다.',
  description:
    '1,270+ 포즈 라이브러리와 AI 자동 배치로 콘티 작가급 스토리보드를 5분 만에. POD 출판까지 한 번에.',
  alternates: {
    canonical: BASE_URL,
  },
  openGraph: {
    title: '스토리워크 — 대본만 쓰세요. AI가 페이지를 그립니다.',
    description: '대본 → 자동 페이지 → POD 인쇄. 콘티 작가의 5분.',
    url: BASE_URL,
    images: [
      {
        url: `${BASE_URL}/api/og/landing`,
        width: 1200,
        height: 630,
        alt: '스토리워크 — 대본만 쓰세요. AI가 페이지를 그립니다.',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '스토리워크 — 대본만 쓰세요. AI가 페이지를 그립니다.',
    description: '대본 → 자동 페이지 → POD 인쇄. 콘티 작가의 5분.',
    images: [`${BASE_URL}/api/og/landing`],
  },
}

/* ── B.1 JSON-LD structured data ─────────────────────────────────────────── */
const jsonLdOrganization = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: '스토리워크',
  url: BASE_URL,
  logo: `${BASE_URL}/icon.png`,
  contactPoint: {
    '@type': 'ContactPoint',
    email: 'hello@storywork.kr',
    contactType: 'customer service',
    availableLanguage: 'Korean',
  },
}

const jsonLdSoftwareApp = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: '스토리워크',
  applicationCategory: 'DesignApplication',
  operatingSystem: 'Web',
  description:
    '1,270+ 포즈 라이브러리와 AI 자동 배치로 콘티 작가급 스토리보드를 5분 만에. POD 출판까지 한 번에.',
  url: BASE_URL,
  screenshot: `${BASE_URL}/api/og/landing`,
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'KRW',
    availability: 'https://schema.org/InStock',
  },
}

const jsonLdWebSite = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: '스토리워크',
  url: BASE_URL,
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: `${BASE_URL}/features?q={search_term_string}`,
    },
    'query-input': 'required name=search_term_string',
  },
}

/* ── A.1 핵심 가치 제안 3-up ─────────────────────────────────────────────── */
function ValuePropsSection() {
  const props = [
    {
      stat: '5분',
      label: '첫 페이지 완성',
      desc: '대본 붙여넣기부터 콘티 초안까지 5분. 신용카드 없이 무료.',
      bg: 'var(--mkt-block-mint)',
    },
    {
      stat: '1,270+',
      label: '포즈 자산',
      desc: '남·여·아이·동물 캐릭터, 다양한 감정과 동작. 직접 그리지 않아도 됩니다.',
      bg: 'var(--mkt-block-lilac)',
    },
    {
      stat: 'POD',
      label: '출판까지 한 번에',
      desc: 'B5/A5/정사각형 인쇄 사양 PDF를 그대로 인쇄소로. 파일 변환 없음.',
      bg: 'var(--mkt-block-coral)',
    },
  ]

  return (
    <div style={{ padding: 'var(--mkt-space-section) var(--mkt-space-xl)' }}>
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--mkt-space-md)',
          }}
          className="value-props-grid"
        >
          {props.map(({ stat, label, desc, bg }, i) => (
            <ScrollReveal key={stat} delay={i * 120}>
              <div
                className="mkt-sticker"
                style={
                  {
                    backgroundColor: bg,
                    borderRadius: '18px',
                    '--mkt-sticker-rotate': `${[-1.2, 0.8, -0.6][i]}deg`,
                    padding: 'var(--mkt-space-xxl) var(--mkt-space-xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--mkt-space-sm)',
                    height: '100%',
                  } as React.CSSProperties
                }
              >
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: 'clamp(36px, 4vw, 52px)',
                    fontWeight: 340,
                    lineHeight: 1,
                    letterSpacing: '-1px',
                    color: 'var(--mkt-ink)',
                  }}
                >
                  {stat}
                </p>
                <p
                  className="mkt-headline"
                  style={{ color: 'var(--mkt-ink)', marginBottom: '4px' }}
                >
                  {label}
                </p>
                <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}>
                  {desc}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .value-props-grid {
              grid-template-columns: 1fr !important;
            }
          }
          @media (min-width: 769px) and (max-width: 1024px) {
            .value-props-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ── A.2 사용자 페르소나 4-up ────────────────────────────────────────────── */
function PersonaSection() {
  const personas = [
    {
      icon: '✏',
      title: '아마추어 작가',
      role: '글을 쓰지만 그림은 부담',
      scenario: '대본을 쓰면 AI가 장면을 나누고 포즈·배경을 자동 배치. 처음 콘티도 완성 가능.',
      highlight: 'var(--mkt-block-cream)',
    },
    {
      icon: '🎨',
      title: '크리에이터',
      role: '인스타·유튜브 카드뉴스 제작',
      scenario: '내 리소스(캐릭터·배경)를 마이데이터로 등록하고 반복 작업을 자동화.',
      highlight: 'var(--mkt-block-lime)',
    },
    {
      icon: '📚',
      title: '만화 작가',
      role: '시리즈 콘티 대량 작업',
      scenario: 'B5 인쇄 사양 PDF 한 번에. POD 인쇄소로 그대로 전송.',
      highlight: 'var(--mkt-block-pink)',
    },
    {
      icon: '🏫',
      title: '교육 현장',
      role: '스토리보드 수업 도구',
      scenario: '학생들이 대본을 쓰면 시각화된 콘티로 즉시 확인. 결과물 PDF 저장.',
      highlight: 'var(--mkt-block-mint)',
    },
  ]

  return (
    <div
      style={{
        padding: '0 var(--mkt-space-xl) var(--mkt-space-section)',
      }}
    >
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        <ScrollReveal>
          <div style={{ marginBottom: 'var(--mkt-space-xxl)' }}>
            <p
              className="mkt-caption"
              style={{
                color: 'var(--mkt-accent)',
                opacity: 0.85,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              WHO
            </p>
            <h2 className="mkt-display-lg" style={{ color: 'var(--mkt-ink)' }}>
              이런 분들을 위해 만들었습니다
            </h2>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: 'var(--mkt-space-md)',
          }}
          className="persona-grid"
        >
          {personas.map(({ icon, title, role, scenario, highlight }, i) => (
            <ScrollReveal key={title} delay={(i % 2) * 120}>
              <div
                style={{
                  borderRadius: '16px',
                  padding: 'var(--mkt-space-xl)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--mkt-space-sm)',
                  backgroundColor: 'var(--mkt-canvas)',
                  height: '100%',
                }}
                className="persona-card mkt-sticker-sm"
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    backgroundColor: highlight,
                    borderRadius: 'var(--mkt-rounded-md)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '22px',
                    marginBottom: 'var(--mkt-space-xs)',
                  }}
                  aria-hidden="true"
                >
                  {icon}
                </div>
                <p className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                  {title}
                </p>
                <p
                  className="mkt-body-sm"
                  style={{ color: 'var(--mkt-ink)', opacity: 0.5, fontWeight: 480 }}
                >
                  {role}
                </p>
                <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
                  {scenario}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .persona-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ── A.3 FAQ ─────────────────────────────────────────────────────────────── */
function FaqSection() {
  // 단일 소스(lib/faq-data.ts)의 대표 질문만 랜딩에 노출. 전체는 /faq.
  const faqs = FEATURED_FAQS

  return (
    <div
      style={{
        padding: '0 var(--mkt-space-xl) var(--mkt-space-section)',
      }}
    >
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        <ColorBlock variant="cream">
          <div style={{ maxWidth: '680px' }}>
            <p
              className="mkt-caption"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.45,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              FAQ
            </p>
            <h2
              className="mkt-display-lg"
              style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-xxl)' }}
            >
              자주 묻는 질문
            </h2>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '0',
              }}
            >
              {faqs.map(({ q, a }, i) => (
                <details
                  key={i}
                  style={{
                    borderTop: '1px solid var(--mkt-hairline)',
                    paddingTop: 'var(--mkt-space-md)',
                    paddingBottom: 'var(--mkt-space-md)',
                  }}
                  className="faq-item"
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
                    <span>{q}</span>
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
                    {a}
                  </p>
                </details>
              ))}
              <div style={{ borderTop: '1px solid var(--mkt-hairline)' }} aria-hidden="true" />
            </div>

            <Link
              href="/faq"
              className="mkt-body-sm"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                marginTop: 'var(--mkt-space-xl)',
                color: 'var(--mkt-ink)',
                fontWeight: 500,
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              전체 자주 묻는 질문 보기 →
            </Link>
          </div>

          <style>{`
            .faq-item summary::-webkit-details-marker { display: none; }
            .faq-item[open] .faq-icon { opacity: 0.65; }
            .faq-item summary:focus-visible {
              outline: 2px solid var(--mkt-ink);
              border-radius: 2px;
              outline-offset: 2px;
            }
          `}</style>
        </ColorBlock>
      </div>
    </div>
  )
}

/* ── A.4 사회적 증거 placeholder ─────────────────────────────────────────── */
function SocialProofSection() {
  const stats = [
    { value: '베타', label: '출시 단계', sub: '정식 런칭 준비 중' },
    { value: '1,270+', label: '포즈 자산', sub: '지속 업데이트' },
    { value: '5분', label: '첫 콘티 완성', sub: '평균 소요 시간' },
    { value: '무료', label: '베타 기간', sub: '가격 정책 추후 공지' },
  ]

  return (
    <div
      style={{
        padding: '0 var(--mkt-space-xl) var(--mkt-space-section)',
      }}
    >
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: 'var(--mkt-space-md)',
            textAlign: 'center',
          }}
          className="social-proof-grid"
        >
          {stats.map(({ value, label, sub }, i) => (
            <ScrollReveal key={value} delay={i * 90}>
              <div
                className="mkt-sticker-sm"
                style={{
                  padding: 'var(--mkt-space-xl) var(--mkt-space-md)',
                  borderRadius: '14px',
                  backgroundColor: 'var(--mkt-canvas)',
                  height: '100%',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: 'clamp(28px, 3vw, 42px)',
                    fontWeight: 340,
                    lineHeight: 1,
                    letterSpacing: '-0.5px',
                    color: 'var(--mkt-ink)',
                    marginBottom: '8px',
                  }}
                >
                  {value}
                </p>
                <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', fontWeight: 540 }}>
                  {label}
                </p>
                <p
                  className="mkt-caption"
                  style={{ color: 'var(--mkt-ink)', opacity: 0.4, marginTop: '4px' }}
                >
                  {sub}
                </p>
              </div>
            </ScrollReveal>
          ))}
        </div>

        <style>{`
          @media (max-width: 768px) {
            .social-proof-grid {
              grid-template-columns: 1fr 1fr !important;
            }
          }
          @media (max-width: 480px) {
            .social-proof-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ── A.5 사용 사례 3종 ───────────────────────────────────────────────────── */
function UseCasesSection() {
  const cases = [
    {
      tag: '베타 사용자 사례',
      title: '더미맨의 월요일',
      desc: '평범한 회사원이 주말마다 그리던 4컷 만화. 대본 한 페이지가 완성된 콘티가 되기까지.',
      href: '/showcase/derbyman',
      cta: '사례 보기',
      bg: 'var(--mkt-block-navy)',
      textColor: 'var(--mkt-inverse-ink)',
      available: true,
    },
    {
      tag: '곧 출시',
      title: '인스타그램 카드뉴스',
      desc: '정사각형 판형으로 SNS 카드뉴스를 만드는 법. AI 대본 분석으로 6장 구성 자동 제안.',
      href: '#',
      cta: '알림 받기',
      bg: 'var(--mkt-block-coral)',
      textColor: 'var(--mkt-ink)',
      available: false,
    },
    {
      tag: '곧 출시',
      title: '교육용 스토리보드',
      desc: '수업 자료로 쓸 스토리보드를 학생들과 함께 만드는 법. A5 인쇄본 배포까지.',
      href: '#',
      cta: '알림 받기',
      bg: 'var(--mkt-block-lilac)',
      textColor: 'var(--mkt-ink)',
      available: false,
    },
  ]

  return (
    <div
      style={{
        padding: '0 var(--mkt-space-xl) var(--mkt-space-section)',
      }}
    >
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        <ScrollReveal>
          <div style={{ marginBottom: 'var(--mkt-space-xxl)' }}>
            <p
              className="mkt-caption"
              style={{
                color: 'var(--mkt-accent)',
                opacity: 0.85,
                marginBottom: 'var(--mkt-space-md)',
              }}
            >
              USE CASES
            </p>
            <h2 className="mkt-display-lg" style={{ color: 'var(--mkt-ink)' }}>
              이렇게 활용합니다
            </h2>
          </div>
        </ScrollReveal>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: 'var(--mkt-space-md)',
          }}
          className="use-cases-grid"
        >
          {cases.map(({ tag, title, desc, href, cta, bg, textColor, available }, i) => (
            <ScrollReveal key={title} delay={i * 120}>
              <div
                className="mkt-sticker"
                style={
                  {
                    backgroundColor: bg,
                    borderRadius: '18px',
                    '--mkt-sticker-rotate': `${[0.8, -1, 0.6][i]}deg`,
                    padding: 'var(--mkt-space-xxl) var(--mkt-space-xl)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--mkt-space-md)',
                    minHeight: '280px',
                    height: '100%',
                  } as React.CSSProperties
                }
              >
                <span
                  className="mkt-caption"
                  style={{
                    color: textColor,
                    opacity: available ? 0.6 : 0.5,
                    display: 'inline-block',
                    backgroundColor: available ? 'transparent' : 'rgba(0,0,0,0.08)',
                    borderRadius: '4px',
                    padding: available ? '0' : '3px 8px',
                    alignSelf: 'flex-start',
                  }}
                >
                  {tag}
                </span>
                <div style={{ flex: 1 }}>
                  <p
                    className="mkt-headline"
                    style={{ color: textColor, marginBottom: 'var(--mkt-space-sm)' }}
                  >
                    {title}
                  </p>
                  <p className="mkt-body-sm" style={{ color: textColor, opacity: 0.75 }}>
                    {desc}
                  </p>
                </div>
                {available ? (
                  <Link
                    href={href}
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: 'var(--mkt-body-sm-size)',
                      fontWeight: 560,
                      color: textColor,
                      textDecoration: 'none',
                      alignSelf: 'flex-start',
                    }}
                    className="use-case-link"
                  >
                    {cta} →
                  </Link>
                ) : (
                  <span
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: 'var(--mkt-body-sm-size)',
                      fontWeight: 480,
                      color: textColor,
                      opacity: 0.45,
                      alignSelf: 'flex-start',
                    }}
                  >
                    준비 중
                  </span>
                )}
              </div>
            </ScrollReveal>
          ))}
        </div>

        <style>{`
          .use-case-link:hover { text-decoration: underline; }
          .use-case-link:focus-visible {
            outline: 2px solid currentColor;
            border-radius: 2px;
            outline-offset: 2px;
          }
          @media (max-width: 768px) {
            .use-cases-grid {
              grid-template-columns: 1fr !important;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

/* ── 4컷 미니 콘티 — 더미맨 실 포즈 자산 ──────────────────────────────────── */
function MiniStoryboard() {
  const scenes = getDerbymanScenes()

  const cuts = [
    {
      bg: 'var(--mkt-block-cream)',
      bubble: '월요일이다…',
      scene: scenes[0],
    },
    {
      bg: 'var(--mkt-block-mint)',
      bubble: '오늘 쉬고 싶다',
      scene: scenes[1],
    },
    {
      bg: 'var(--mkt-block-lilac)',
      bubble: '콘티 그려야지!',
      scene: scenes[2],
    },
    {
      bg: 'var(--mkt-block-pink)',
      bubble: '완성!',
      scene: scenes[3],
    },
  ]

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mkt-space-md)',
        width: '100%',
        maxWidth: '440px',
      }}
    >
      {/* 4컷 그리드 */}
      <Link
        href="/showcase/derbyman"
        style={{ display: 'block', textDecoration: 'none' }}
        aria-label="더미맨의 월요일 — 사례 자세히 보기"
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--mkt-space-sm)',
          }}
          aria-label="더미맨의 월요일 4컷 미리보기"
        >
          {cuts.map((cut, i) => (
            <div
              key={i}
              className="hero-cut-card"
              style={
                {
                  backgroundColor: cut.bg,
                  borderRadius: '12px',
                  border: '2px solid var(--mkt-ink)',
                  boxShadow: '4px 4px 0 var(--mkt-shadow-ink)',
                  '--cut-rotate': `${[-1.6, 1.2, 1, -0.8][i]}deg`,
                  aspectRatio: '3/4',
                  padding: '10px',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  position: 'relative',
                  overflow: 'hidden',
                  transition:
                    'transform 180ms var(--mkt-ease-spring), box-shadow 180ms var(--mkt-ease-out)',
                } as React.CSSProperties
              }
            >
              {/* 컷 번호 */}
              <span
                style={{
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '10px',
                  color: 'var(--mkt-ink)',
                  opacity: 0.5,
                  lineHeight: 1,
                  zIndex: 2,
                  position: 'relative',
                }}
                aria-hidden="true"
              >
                0{i + 1}
              </span>

              {/* 포즈 이미지 */}
              {cut.scene && (
                <div
                  style={{
                    position: 'absolute',
                    inset: '24px 4px 32px',
                  }}
                  aria-hidden="true"
                >
                  <Image
                    src={cut.scene.thumbUrl}
                    alt={cut.scene.alt}
                    fill
                    sizes="(max-width: 640px) 40vw, 180px"
                    style={{ objectFit: 'contain' }}
                    priority={i < 2}
                  />
                </div>
              )}

              {/* 말풍선 — 잉크 아웃라인 코믹 스타일 */}
              <div
                style={{
                  position: 'relative',
                  zIndex: 2,
                  alignSelf: 'flex-end',
                  backgroundColor: 'var(--mkt-canvas)',
                  border: '1.5px solid var(--mkt-ink)',
                  borderRadius: '10px 10px 2px 10px',
                  padding: '4px 8px',
                  boxShadow: '2px 2px 0 var(--mkt-shadow-ink)',
                  maxWidth: '90%',
                }}
                aria-hidden="true"
              >
                <span
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '11px',
                    fontWeight: 540,
                    color: 'var(--mkt-ink)',
                    lineHeight: 1.3,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cut.bubble}
                </span>
              </div>
            </div>
          ))}
        </div>
      </Link>

      {/* 보조 CTA 영역 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 4px 0',
          borderTop: '1px solid var(--mkt-hairline)',
        }}
      >
        <span
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '12px',
            color: 'var(--mkt-ink)',
            opacity: 0.55,
          }}
          aria-hidden="true"
        >
          더미맨의 월요일 — 5분 완성
        </span>
        <Link
          href="/showcase/derbyman"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '12px',
            fontWeight: 560,
            color: 'var(--mkt-ink)',
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '2px',
          }}
          className="hero-case-link"
          aria-label="사례 자세히 보기 — 더미맨의 월요일"
        >
          사례 자세히 보기 →
        </Link>
      </div>

      {/* hover + 스프링 팝인 스태거 (디즈니 다이나믹) */}
      <style>{`
        .hero-cut-card {
          transform: rotate(var(--cut-rotate, 0deg));
        }
        .hero-cut-card:hover {
          transform: rotate(var(--cut-rotate, 0deg)) translate(-2px, -2px);
          box-shadow: 6px 6px 0 var(--mkt-shadow-ink);
        }
        .hero-case-link:hover {
          text-decoration: underline;
        }
        .hero-case-link:focus-visible {
          outline: 2px solid var(--mkt-ink);
          border-radius: 2px;
          outline-offset: 2px;
        }
        @keyframes heroCardPop {
          0%   { opacity: 0; transform: rotate(var(--cut-rotate, 0deg)) scale(0.7) translateY(12px); }
          70%  { transform: rotate(var(--cut-rotate, 0deg)) scale(1.05) translateY(0); }
          100% { opacity: 1; transform: rotate(var(--cut-rotate, 0deg)) scale(1) translateY(0); }
        }
        .hero-cut-card:nth-child(1) { animation: heroCardPop 500ms var(--mkt-ease-spring) both 80ms; }
        .hero-cut-card:nth-child(2) { animation: heroCardPop 500ms var(--mkt-ease-spring) both 200ms; }
        .hero-cut-card:nth-child(3) { animation: heroCardPop 500ms var(--mkt-ease-spring) both 320ms; }
        .hero-cut-card:nth-child(4) { animation: heroCardPop 500ms var(--mkt-ease-spring) both 440ms; }
        @media (prefers-reduced-motion: reduce) {
          .hero-cut-card { animation: none !important; }
          .hero-cut-card:hover { transform: rotate(var(--cut-rotate, 0deg)); box-shadow: 4px 4px 0 var(--mkt-shadow-ink); }
        }
      `}</style>
    </div>
  )
}

/* ── AI 배치 흐름 mockup ─────────────────────────────────────────────────── */
function AiLayoutMock() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mkt-space-md)',
        flexWrap: 'wrap',
      }}
      aria-label="AI 자동 배치 흐름"
    >
      {/* 대본 입력 박스 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          border: '1px solid var(--mkt-hairline)',
          borderRadius: 'var(--mkt-rounded-md)',
          padding: 'var(--mkt-space-md)',
          width: '200px',
          fontSize: '13px',
          fontFamily: 'var(--mkt-font-mono)',
          color: 'var(--mkt-ink)',
          opacity: 0.7,
          lineHeight: '1.6',
        }}
      >
        <span style={{ opacity: 0.4 }}># 장면 1</span>
        <br />
        사무실. 아침.
        <br />
        더미맨이 책상에서
        <br />
        졸고 있다.
        <br />
        <br />
        <span style={{ opacity: 0.4 }}># 장면 2</span>
        <br />
        점심시간.
        <br />
        노트북 열고 그리기.
      </div>

      {/* 화살표 */}
      <div
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '24px',
          color: 'var(--mkt-ink)',
          opacity: 0.4,
        }}
        aria-hidden="true"
      >
        →
      </div>

      {/* 결과: 2x2 썸네일 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '6px',
          width: '160px',
        }}
      >
        {[
          'var(--mkt-block-cream)',
          'var(--mkt-block-mint)',
          'var(--mkt-block-lilac)',
          'var(--mkt-block-pink)',
        ].map((bg, i) => (
          <div
            key={i}
            style={{
              backgroundColor: bg,
              borderRadius: '4px',
              aspectRatio: '3/4',
            }}
            aria-hidden="true"
          />
        ))}
      </div>
    </div>
  )
}

/* ── PDF mockup ──────────────────────────────────────────────────────────── */
function PdfMock() {
  return (
    <div
      style={{
        width: '160px',
        aspectRatio: '0.7',
        backgroundColor: 'var(--mkt-canvas)',
        border: '2px solid var(--mkt-ink)',
        borderRadius: 'var(--mkt-rounded-sm)',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        boxShadow: '6px 6px 0 var(--mkt-ink)',
      }}
      aria-label="PDF 표지 미리보기"
    >
      <div
        style={{
          height: '80px',
          backgroundColor: 'var(--mkt-block-navy)',
          borderRadius: '4px',
        }}
        aria-hidden="true"
      />
      <div
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '14px',
          fontWeight: '700',
          color: 'var(--mkt-ink)',
        }}
      >
        더미맨의 월요일
      </div>
      <div
        style={{
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '10px',
          color: 'var(--mkt-ink)',
          opacity: 0.4,
        }}
      >
        B5 · 16P
      </div>
    </div>
  )
}

/* ── 마케팅 섹션 래퍼 ────────────────────────────────────────────────────── */
function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section
      style={{
        padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
        maxWidth: 'var(--mkt-max-width)',
        margin: '0 auto',
        ...style,
      }}
    >
      {children}
    </section>
  )
}

/* ── 메인 ────────────────────────────────────────────────────────────────── */
export default function LandingPage() {
  const poseShowcase = getPoseShowcase()
  const marqueeItems = [
    '1,270+ 포즈 ✦',
    'AI 자동 배치 ✦',
    'POD 인쇄 ✦',
    '모바일 편집 ✦',
    '콘티 전용 ✦',
    'B5 / A5 / 정사각형 ✦',
    '한국어 최적화 ✦',
  ]

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)' }}>
      {/* B.1 JSON-LD */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdOrganization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdSoftwareApp) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLdWebSite) }}
      />

      <Header />

      {/* ── HERO ──────────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
        }}
      >
        <div
          style={{
            maxWidth: 'var(--mkt-max-width)',
            margin: '0 auto',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--mkt-space-xxl)',
            alignItems: 'center',
          }}
          className="landing-hero-grid"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
            <span className="mkt-eyebrow" style={{ color: 'var(--mkt-ink)', opacity: 0.5 }}>
              STORYWORK
            </span>

            <h1 className="mkt-display-xl" style={{ color: 'var(--mkt-ink)' }}>
              대본만 쓰세요.
              <br />
              페이지는 <span className="mkt-marker">AI가</span>
              <br />
              그립니다.
            </h1>

            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: 'var(--mkt-body-lg-size)',
                fontWeight: 'var(--mkt-body-lg-weight)',
                lineHeight: 'var(--mkt-body-lg-lh)',
                letterSpacing: 'var(--mkt-body-lg-ls)',
                color: 'var(--mkt-ink)',
                opacity: 0.65,
                maxWidth: '500px',
              }}
            >
              1,270+ 포즈 라이브러리 + AI 자동 배치 + POD 인쇄까지.
              <br />
              콘티 전용 온라인 편집기.
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--mkt-space-sm)' }}>
              <PillButton href="/editor" variant="primary">
                무료로 시작하기
              </PillButton>
              <PillButton href="/features" variant="secondary">
                데모 보기
              </PillButton>
            </div>
          </div>

          {/* 4컷 미리보기 */}
          <div
            style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}
            className="landing-hero-visual"
          >
            <MiniStoryboard />
          </div>
        </div>

        {/* 모바일 반응형 */}
        <style>{`
          @media (max-width: 768px) {
            .landing-hero-grid {
              grid-template-columns: 1fr !important;
            }
            .landing-hero-visual {
              display: none !important;
            }
          }
        `}</style>
      </section>

      {/* ── MARQUEE STRIP ────────────────────────────────────────────────── */}
      <MarqueeStrip items={marqueeItems} />

      {/* ── A.1 핵심 가치 제안 3-up ──────────────────────────────────────── */}
      <ValuePropsSection />

      {/* ── FEATURE 1: 캔바도 어렵다면 (cream) ──────────────────────────── */}
      <div style={{ padding: 'var(--mkt-space-section) var(--mkt-space-xl)' }}>
        <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
          <ColorBlock variant="cream">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 'var(--mkt-space-xxl)',
                alignItems: 'center',
              }}
              className="feature-grid"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-lg)' }}>
                <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                  캔바도 어렵다면,
                  <br />더 단순하게
                </h2>
                <p
                  className="mkt-body"
                  style={{ color: 'var(--mkt-ink)', opacity: 0.75, maxWidth: '380px' }}
                >
                  다른 도구는 모든 작업을 다 하려다 보니 콘티에 필요 없는 메뉴가 가득합니다.
                  StoryWork는 콘티 한 가지만 잘 합니다.
                </p>
              </div>

              {/* 비교 영역 */}
              <div
                style={{ display: 'flex', gap: 'var(--mkt-space-md)', alignItems: 'stretch' }}
                className="comparison-grid"
              >
                {/* 다른 도구 */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--mkt-canvas)',
                    border: '1px solid var(--mkt-hairline)',
                    borderRadius: 'var(--mkt-rounded-md)',
                    padding: 'var(--mkt-space-md)',
                  }}
                >
                  <span
                    className="mkt-caption"
                    style={{
                      color: 'var(--mkt-ink)',
                      opacity: 0.4,
                      display: 'block',
                      marginBottom: '8px',
                    }}
                  >
                    다른 도구
                  </span>
                  {['슬라이드', '영상', '소셜', '인포그래픽', '프레젠테이션', '명함', '…'].map(
                    (item) => (
                      <div
                        key={item}
                        style={{
                          height: '28px',
                          backgroundColor: 'var(--mkt-hairline-soft)',
                          borderRadius: '4px',
                          marginBottom: '4px',
                          padding: '0 8px',
                          display: 'flex',
                          alignItems: 'center',
                          fontSize: '12px',
                          fontFamily: 'var(--mkt-font-sans)',
                          color: 'var(--mkt-ink)',
                          opacity: 0.5,
                        }}
                      >
                        {item}
                      </div>
                    ),
                  )}
                </div>

                {/* StoryWork */}
                <div
                  style={{
                    flex: 1,
                    backgroundColor: 'var(--mkt-canvas)',
                    border: '2px solid var(--mkt-ink)',
                    borderRadius: 'var(--mkt-rounded-md)',
                    padding: 'var(--mkt-space-md)',
                  }}
                >
                  <span
                    className="mkt-caption"
                    style={{ color: 'var(--mkt-ink)', display: 'block', marginBottom: '8px' }}
                  >
                    StoryWork
                  </span>
                  {['콘티'].map((item) => (
                    <div
                      key={item}
                      style={{
                        height: '28px',
                        backgroundColor: 'var(--mkt-block-lime)',
                        borderRadius: '4px',
                        marginBottom: '4px',
                        padding: '0 8px',
                        display: 'flex',
                        alignItems: 'center',
                        fontSize: '13px',
                        fontFamily: 'var(--mkt-font-sans)',
                        fontWeight: '600',
                        color: 'var(--mkt-ink)',
                      }}
                    >
                      {item} ✓
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </ColorBlock>
        </div>
      </div>

      {/* ── FEATURE 2: 대본 → 페이지 30초 (lime) ────────────────────────── */}
      <div style={{ padding: '0 var(--mkt-space-xl) var(--mkt-space-section)' }}>
        <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
          <ColorBlock variant="lime" id="ai-layout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-md)' }}>
                <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                  대본 → 페이지, 30초
                </h2>
                <p
                  className="mkt-body"
                  style={{ color: 'var(--mkt-ink)', opacity: 0.75, maxWidth: '480px' }}
                >
                  대본을 붙여넣으면 AI가 장면을 나누고, 등장인물 포즈와 배경을 자동으로 배치합니다.
                  마음에 안 드는 컷은 한 클릭으로 교체.
                </p>
              </div>

              <AiLayoutMock />

              <div>
                <Link
                  href="/features#ai-layout"
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: 'var(--mkt-body-size)',
                    fontWeight: '480',
                    color: 'var(--mkt-ink)',
                    textDecoration: 'none',
                  }}
                  className="hover:underline focus-visible:outline-none focus-visible:ring-2 rounded"
                >
                  AI 자동 배치 자세히 →
                </Link>
              </div>
            </div>
          </ColorBlock>
        </div>
      </div>

      {/* ── FEATURE 3: 포즈 라이브러리 (navy) ───────────────────────────── */}
      <div style={{ padding: '0 var(--mkt-space-xl) var(--mkt-space-section)' }}>
        <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
          <ColorBlock variant="navy">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-md)' }}>
                <h2 className="mkt-headline" style={{ color: 'var(--mkt-inverse-ink)' }}>
                  1,270+ 포즈, 누구나 자유롭게
                </h2>
                <p
                  className="mkt-body"
                  style={{ color: 'var(--mkt-inverse-ink)', opacity: 0.7, maxWidth: '480px' }}
                >
                  남/여/아이/동물 캐릭터 + 다양한 자세 + 감정 표현. 인물을 따로 그리지 않아도
                  됩니다.
                </p>
              </div>

              {/* 포즈 그리드 — 실 자산 12개 (Supabase Storage thumb.png) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(6, 1fr)',
                  gap: 'var(--mkt-space-sm)',
                }}
                className="pose-grid"
              >
                {poseShowcase.map((pose) => (
                  <div
                    key={pose.slug}
                    style={{
                      backgroundColor: 'rgba(255,255,255,0.08)',
                      borderRadius: 'var(--mkt-rounded-sm)',
                      aspectRatio: '3/4',
                      overflow: 'hidden',
                      position: 'relative',
                      transition: 'transform 150ms ease',
                    }}
                    className="pose-card-hover"
                  >
                    <Image
                      src={pose.thumbUrl}
                      alt={pose.alt}
                      fill
                      sizes="(max-width: 640px) 25vw, (max-width: 1024px) 16vw, 120px"
                      style={{ objectFit: 'contain', padding: '4px' }}
                    />
                  </div>
                ))}
              </div>

              <style>{`
                .pose-card-hover:hover {
                  transform: translateY(-2px);
                }
                @media (max-width: 640px) {
                  .pose-grid {
                    grid-template-columns: repeat(4, 1fr) !important;
                  }
                }
              `}</style>
            </div>
          </ColorBlock>
        </div>
      </div>

      {/* ── FEATURE 4: POD 출판 (coral) ──────────────────────────────────── */}
      <div style={{ padding: '0 var(--mkt-space-xl) var(--mkt-space-section)' }}>
        <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
          <ColorBlock variant="coral">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 'var(--mkt-space-xxl)',
                alignItems: 'center',
              }}
              className="feature-grid"
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-lg)' }}>
                <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                  책으로 출판까지, 한 번에
                </h2>
                <p
                  className="mkt-body"
                  style={{ color: 'var(--mkt-ink)', opacity: 0.75, maxWidth: '420px' }}
                >
                  완성된 작품을 B5/A5/정사각형/세로형 인쇄 사양에 맞춰 PDF로 변환합니다. POD
                  인쇄소에 그대로 보내세요.
                </p>
                <ul
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: '8px',
                    listStyle: 'none',
                  }}
                >
                  {['B5', 'A5', '정사각형', '세로형'].map((fmt) => (
                    <li
                      key={fmt}
                      style={{
                        backgroundColor: 'var(--mkt-canvas)',
                        border: '1px solid var(--mkt-ink)',
                        borderRadius: 'var(--mkt-rounded-sm)',
                        padding: '4px 10px',
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '12px',
                        color: 'var(--mkt-ink)',
                      }}
                    >
                      {fmt}
                    </li>
                  ))}
                </ul>
              </div>

              <PdfMock />
            </div>
          </ColorBlock>
        </div>
      </div>

      {/* ── A.2 사용자 페르소나 ─────────────────────────────────────────── */}
      <PersonaSection />

      {/* ── SHOWCASE TEASER ───────────────────────────────────────────────── */}
      <Section>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: 'var(--mkt-space-xxl)',
            alignItems: 'center',
          }}
          className="feature-grid"
        >
          <div>
            <span
              className="mkt-caption"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.45,
                display: 'block',
                marginBottom: '16px',
              }}
            >
              CREATOR STORY
            </span>
            <h2
              className="mkt-display-lg"
              style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-lg)' }}
            >
              더미맨의 짧은 콘티,
              <br />
              5분 만에 완성
            </h2>
            <p
              className="mkt-body"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.65,
                marginBottom: 'var(--mkt-space-xl)',
              }}
            >
              평범한 회사원이 주말마다 몰래 그리던 만화. 대본 한 페이지가 4컷 콘티가 되기까지.
            </p>
            <PillButton href="/showcase/derbyman" variant="primary">
              사례 보기
            </PillButton>
          </div>

          {/* 쇼케이스 카드 */}
          <Link
            href="/showcase/derbyman"
            style={{
              display: 'block',
              backgroundColor: 'var(--mkt-block-navy)',
              borderRadius: 'var(--mkt-rounded-lg)',
              padding: 'var(--mkt-space-xxl)',
              textDecoration: 'none',
              transition: 'opacity 150ms ease',
            }}
            className="hover:opacity-90 focus-visible:outline-none focus-visible:ring-2"
            aria-label="더미맨 사례 보기"
          >
            <div
              style={{
                width: '64px',
                height: '64px',
                backgroundColor: 'rgba(255,255,255,0.15)',
                borderRadius: 'var(--mkt-rounded-full)',
                marginBottom: 'var(--mkt-space-lg)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <span
                style={{ fontFamily: 'var(--mkt-font-sans)', fontSize: '28px', color: '#fff' }}
                aria-hidden="true"
              >
                ✦
              </span>
            </div>
            <p
              className="mkt-headline"
              style={{ color: 'var(--mkt-inverse-ink)', marginBottom: 'var(--mkt-space-sm)' }}
            >
              더미맨
            </p>
            <p className="mkt-body-sm" style={{ color: 'var(--mkt-inverse-ink)', opacity: 0.6 }}>
              회사원 / 콘티 작가 / StoryWork 사용자
            </p>
          </Link>
        </div>

        {/* 반응형 */}
        <style>{`
          @media (max-width: 768px) {
            .feature-grid {
              grid-template-columns: 1fr !important;
            }
            .comparison-grid {
              flex-direction: column !important;
            }
          }
        `}</style>
      </Section>

      {/* ── A.5 사용 사례 3종 ────────────────────────────────────────────── */}
      <UseCasesSection />

      {/* ── A.3 FAQ ──────────────────────────────────────────────────────── */}
      <FaqSection />

      {/* ── A.4 사회적 증거 placeholder ─────────────────────────────────── */}
      <SocialProofSection />

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
          textAlign: 'center',
          borderTop: '1px solid var(--mkt-hairline)',
        }}
      >
        <ScrollReveal>
          <div
            style={{
              maxWidth: '600px',
              margin: '0 auto',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--mkt-space-xl)',
            }}
          >
            <h2 className="mkt-display-lg" style={{ color: 'var(--mkt-ink)', textAlign: 'center' }}>
              먼저 <span className="mkt-marker">만들어</span> 보세요.
            </h2>
            <p
              className="mkt-body-lg"
              style={{ color: 'var(--mkt-ink)', opacity: 0.6, textAlign: 'center' }}
            >
              신용카드 없이 무료. 10분 안에 첫 페이지 완성.
            </p>
            <PillButton href="/editor" variant="primary">
              지금 시작하기
            </PillButton>
          </div>
        </ScrollReveal>
      </section>

      <Footer />
    </div>
  )
}
