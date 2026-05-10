/**
 * /intro — 서비스 소개 페이지
 *
 * 색상 흐름: white hero → lilac (왜 만들었나) → mint (누구를 위한가) → cream (무엇이 다른가) → white CTA
 * RSC
 */

import * as React from 'react'

import { ColorBlock } from '../../components/marketing/ColorBlock'
import { FeatureCard } from '../../components/marketing/FeatureCard'
import { Footer } from '../../components/marketing/Footer'
import { Header } from '../../components/marketing/Header'
import { PillButton } from '../../components/marketing/PillButton'

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      style={{
        padding: 'var(--mkt-space-section) var(--mkt-space-xl)',
        ...style,
      }}
    >
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>{children}</div>
    </div>
  )
}

export default function IntroPage() {
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
            maxWidth: '720px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--mkt-space-xl)',
          }}
        >
          <span className="mkt-eyebrow" style={{ color: 'var(--mkt-ink)', opacity: 0.5 }}>
            STORYWORK INTRO
          </span>

          <h1 className="mkt-display-xl" style={{ color: 'var(--mkt-ink)' }}>
            스토리는 머릿속에 있어요.
            <br />
            화면에 옮기는 게
            <br />
            어려울 뿐.
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
            }}
          >
            StoryWork는 그 어려움을 없애려고 만들었습니다.
          </p>
        </div>
      </section>

      {/* ── SECTION 1: 왜 만들었나 (lilac) ──────────────────────────────── */}
      <Section>
        <ColorBlock variant="lilac">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--mkt-space-xxl)',
              alignItems: 'start',
            }}
            className="intro-grid"
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
                WHY WE BUILT THIS
              </span>
              <h2
                className="mkt-headline"
                style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-lg)' }}
              >
                그림을 못 그려도
                <br />내 이야기가 있다면
              </h2>
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mkt-space-lg)',
              }}
            >
              <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.8 }}>
                만화나 콘티 작가가 아닌 평범한 사람도 "내 이야기를 그림으로" 만들고 싶어합니다.
              </p>
              <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.8 }}>
                그러나 그림 실력이 없으면 첫 컷도 못 그립니다. AI 생성 그림은 일관성이 없습니다.
                Canva는 콘티에 필요하지 않은 기능이 너무 많습니다.
              </p>
              <div
                style={{
                  backgroundColor: 'var(--mkt-canvas)',
                  borderRadius: 'var(--mkt-rounded-md)',
                  padding: 'var(--mkt-space-lg)',
                  borderLeft: '3px solid var(--mkt-ink)',
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: 'var(--mkt-headline-size)',
                    fontWeight: '340',
                    lineHeight: '1.35',
                    color: 'var(--mkt-ink)',
                  }}
                >
                  1,270+ 포즈 라이브러리 + AI가 자동으로 배치
                  <br />= 누구나 콘티 작가
                </p>
              </div>
            </div>
          </div>
        </ColorBlock>
      </Section>

      {/* ── SECTION 2: 누구를 위한가 (mint) ─────────────────────────────── */}
      <Section style={{ paddingTop: 0 }}>
        <ColorBlock variant="mint">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
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
                WHO IT'S FOR
              </span>
              <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                누구를 위한가요?
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 'var(--mkt-space-lg)',
              }}
              className="intro-3-grid"
            >
              {[
                {
                  title: '일반 사용자',
                  description:
                    '자전적 만화, 가족 앨범 콘티, 결혼 청첩장용 짧은 스토리. 그림 실력 없어도 됩니다. 대본만 쓰세요.',
                  examples: ['자전적 만화', '가족 앨범', '결혼 청첩장'],
                },
                {
                  title: '크리에이터',
                  description:
                    '자신만의 캐릭터와 배경을 등록하고 구독 구조로 팬에게 판매하세요. 마이데이터 기반의 개인 브랜드.',
                  examples: ['캐릭터 등록', '리소스 판매', '팬 공유'],
                },
                {
                  title: '출판 워크플로',
                  description:
                    '기획→편집→출판을 한 번에. B5/A5 인쇄 사양 PDF를 POD 인쇄소에 그대로 보내세요.',
                  examples: ['POD 인쇄', 'PDF 출판', '판형 프리셋'],
                },
              ].map((card) => (
                <div
                  key={card.title}
                  style={{
                    backgroundColor: 'var(--mkt-canvas)',
                    borderRadius: 'var(--mkt-rounded-md)',
                    padding: 'var(--mkt-space-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--mkt-space-md)',
                  }}
                >
                  <h3
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '20px',
                      fontWeight: '700',
                      color: 'var(--mkt-ink)',
                    }}
                  >
                    {card.title}
                  </h3>
                  <p
                    className="mkt-body-sm"
                    style={{ color: 'var(--mkt-ink)', opacity: 0.7, flex: 1 }}
                  >
                    {card.description}
                  </p>
                  <ul style={{ listStyle: 'none', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {card.examples.map((ex) => (
                      <li
                        key={ex}
                        style={{
                          backgroundColor: 'var(--mkt-surface-soft)',
                          borderRadius: 'var(--mkt-rounded-sm)',
                          padding: '3px 8px',
                          fontFamily: 'var(--mkt-font-mono)',
                          fontSize: '11px',
                          color: 'var(--mkt-ink)',
                          opacity: 0.7,
                        }}
                      >
                        {ex}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </ColorBlock>
      </Section>

      {/* ── SECTION 3: 무엇이 다른가 (cream) ────────────────────────────── */}
      <Section style={{ paddingTop: 0 }}>
        <ColorBlock variant="cream">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
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
                WHAT'S DIFFERENT
              </span>
              <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                무엇이 다른가요?
              </h2>
            </div>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: 'var(--mkt-space-lg)',
              }}
              className="intro-2-grid"
            >
              <FeatureCard
                title="콘티 전용"
                body="불필요한 기능 없이 콘티에 필요한 것만. 배경, 포즈, 말풍선, 워드효과 — 그것으로 충분합니다."
              />
              <FeatureCard
                title="AI 자동 배치"
                body="포즈와 배경을 수동으로 찾지 않아도 됩니다. AI가 대본을 읽고 최적의 후보를 추천합니다."
              />
              <FeatureCard
                title="1,270+ 포즈"
                body="남/여/아이/동물 + 다양한 감정과 자세. 일관된 캐릭터로 여러 컷을 그릴 수 있습니다."
              />
              <FeatureCard
                title="POD 인쇄"
                body="편집 완료 후 인쇄 사양 PDF로 바로 변환. B5/A5/정사각/세로형 판형을 지원합니다."
              />
            </div>
          </div>
        </ColorBlock>
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
            maxWidth: '520px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--mkt-space-xl)',
          }}
        >
          <h2 className="mkt-display-lg" style={{ color: 'var(--mkt-ink)' }}>
            3분 만에
            <br />첫 페이지 만들기
          </h2>
          <p className="mkt-body-lg" style={{ color: 'var(--mkt-ink)', opacity: 0.6 }}>
            신용카드 없이 무료. 대본 몇 줄이면 충분합니다.
          </p>
          <PillButton href="/editor" variant="primary">
            지금 시작하기
          </PillButton>
        </div>
      </section>

      {/* 반응형 */}
      <style>{`
        @media (max-width: 768px) {
          .intro-grid, .intro-3-grid, .intro-2-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Footer />
    </div>
  )
}
