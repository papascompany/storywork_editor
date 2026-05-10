/**
 * / — 랜딩 페이지
 *
 * 색상 흐름: white hero → marquee → cream → lime → navy → coral → white CTA
 * RSC (서버 컴포넌트) — MarqueeStrip 만 client
 */

import Link from 'next/link'
import * as React from 'react'

import { ColorBlock } from '../components/marketing/ColorBlock'
import { Footer } from '../components/marketing/Footer'
import { Header } from '../components/marketing/Header'
import { MarqueeStrip } from '../components/marketing/MarqueeStrip'
import { PillButton } from '../components/marketing/PillButton'

/* ── 4컷 콘티 미리보기 ────────────────────────────────────────────────────── */
function MiniStoryboard() {
  const cuts = [
    { label: '장면 1', bg: 'var(--mkt-block-cream)' },
    { label: '장면 2', bg: 'var(--mkt-block-mint)' },
    { label: '장면 3', bg: 'var(--mkt-block-lilac)' },
    { label: '장면 4', bg: 'var(--mkt-block-pink)' },
  ]

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--mkt-space-sm)',
        width: '100%',
        maxWidth: '420px',
      }}
      aria-label="4컷 콘티 미리보기"
    >
      {cuts.map((cut) => (
        <div
          key={cut.label}
          style={{
            backgroundColor: cut.bg,
            borderRadius: 'var(--mkt-rounded-sm)',
            aspectRatio: '3/4',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-end',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '10px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
            }}
          >
            {cut.label}
          </span>
        </div>
      ))}
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
        더비맨이 책상에서
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
        더비맨의 월요일
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
              페이지는 AI가
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

              {/* 포즈 그리드 (8개 placeholder) */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(8, 1fr)',
                  gap: 'var(--mkt-space-sm)',
                }}
                className="pose-grid"
              >
                {[
                  { label: '서있는 여성', opacity: 0.2 },
                  { label: '앉은 남성', opacity: 0.25 },
                  { label: '달리는 여성', opacity: 0.2 },
                  { label: '놀란 남성', opacity: 0.25 },
                  { label: '슬픈 여성', opacity: 0.2 },
                  { label: '싸우는 남성', opacity: 0.25 },
                  { label: '웃는 어린이', opacity: 0.2 },
                  { label: '점프하는 여성', opacity: 0.25 },
                ].map((pose) => (
                  <div
                    key={pose.label}
                    style={{
                      backgroundColor: `rgba(255,255,255,${pose.opacity})`,
                      borderRadius: 'var(--mkt-rounded-sm)',
                      aspectRatio: '3/4',
                      display: 'flex',
                      alignItems: 'flex-end',
                      padding: '6px',
                    }}
                    aria-label={pose.label}
                  >
                    <span
                      style={{
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '9px',
                        color: 'rgba(255,255,255,0.5)',
                        lineHeight: '1.2',
                      }}
                    >
                      {pose.label}
                    </span>
                  </div>
                ))}
              </div>

              <style>{`
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
              더비맨의 짧은 콘티,
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
            aria-label="더비맨 사례 보기"
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
              더비맨
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

      {/* ── FINAL CTA ────────────────────────────────────────────────────── */}
      <section
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
          textAlign: 'center',
          borderTop: '1px solid var(--mkt-hairline)',
        }}
      >
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
            먼저 만들어 보세요.
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
      </section>

      <Footer />
    </div>
  )
}
