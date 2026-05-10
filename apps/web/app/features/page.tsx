/**
 * /features — 편집기 기능 소개 페이지
 *
 * 색상 흐름:
 * white hero → cream (편집기 한눈에) → lime (AI 자동 배치) →
 * mint (포즈 라이브러리) → coral (PDF 출판) → navy (모바일) → white CTA
 * RSC
 */

import * as React from 'react'

import { ColorBlock } from '../../components/marketing/ColorBlock'
import { Footer } from '../../components/marketing/Footer'
import { Header } from '../../components/marketing/Header'
import { PillButton } from '../../components/marketing/PillButton'

/** 공통 기능 섹션 래퍼 */
function FeatureSection({
  children,
  style,
}: {
  children: React.ReactNode
  style?: React.CSSProperties
}) {
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

/** 기능 블록: 좌측 텍스트 + 우측 mockup */
function FeatureBlock({
  eyebrow,
  headline,
  body,
  details,
  mockup,
  reverse = false,
  textColor = 'var(--mkt-ink)',
}: {
  eyebrow: string
  headline: string
  body: string
  details?: string[]
  mockup: React.ReactNode
  reverse?: boolean
  textColor?: string
}) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 'var(--mkt-space-xxl)',
        alignItems: 'center',
        direction: reverse ? 'rtl' : 'ltr',
      }}
      className="feature-block-grid"
    >
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mkt-space-lg)',
          direction: 'ltr',
        }}
      >
        <span className="mkt-caption" style={{ color: textColor, opacity: 0.45 }}>
          {eyebrow}
        </span>
        <h2 className="mkt-headline" style={{ color: textColor }}>
          {headline}
        </h2>
        <p className="mkt-body" style={{ color: textColor, opacity: 0.75, maxWidth: '400px' }}>
          {body}
        </p>
        {details && (
          <ul
            style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              listStyle: 'none',
            }}
          >
            {details.map((d) => (
              <li
                key={d}
                style={{
                  backgroundColor:
                    textColor === 'var(--mkt-inverse-ink)'
                      ? 'rgba(255,255,255,0.15)'
                      : 'var(--mkt-canvas)',
                  borderRadius: 'var(--mkt-rounded-sm)',
                  padding: '4px 10px',
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '12px',
                  color: textColor,
                  border:
                    textColor === 'var(--mkt-inverse-ink)'
                      ? '1px solid rgba(255,255,255,0.2)'
                      : '1px solid var(--mkt-hairline)',
                }}
              >
                {d}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ direction: 'ltr' }}>{mockup}</div>
    </div>
  )
}

/** 편집기 UI mockup (cream 섹션) */
function EditorMock() {
  return (
    <div
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        border: '1px solid var(--mkt-hairline)',
        borderRadius: 'var(--mkt-rounded-md)',
        overflow: 'hidden',
        aspectRatio: '16/10',
      }}
      aria-label="편집기 UI 미리보기"
    >
      {/* 상단 툴바 */}
      <div
        style={{
          height: '36px',
          backgroundColor: 'var(--mkt-surface-soft)',
          borderBottom: '1px solid var(--mkt-hairline)',
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '0 12px',
        }}
        aria-hidden="true"
      >
        {[...Array(11)].map((_, i) => (
          <div
            key={i}
            style={{
              width: '20px',
              height: '20px',
              backgroundColor: 'var(--mkt-hairline)',
              borderRadius: '4px',
            }}
          />
        ))}
        <span
          style={{
            marginLeft: 'auto',
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '10px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
          }}
        >
          ⌘K
        </span>
      </div>

      {/* 바디: 좌측 레이어 + 캔버스 + 우측 인스펙터 */}
      <div style={{ display: 'flex', height: 'calc(100% - 36px)' }}>
        {/* 레이어 패널 */}
        <div
          style={{
            width: '140px',
            borderRight: '1px solid var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-surface-soft)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '4px',
          }}
          aria-hidden="true"
        >
          {['배경', '포즈 — 더비맨', '말풍선', '워드효과'].map((layer, i) => (
            <div
              key={layer}
              style={{
                height: '24px',
                backgroundColor: i === 1 ? 'var(--mkt-block-lime)' : 'transparent',
                borderRadius: '4px',
                padding: '0 6px',
                display: 'flex',
                alignItems: 'center',
                fontSize: '10px',
                fontFamily: 'var(--mkt-font-sans)',
                color: 'var(--mkt-ink)',
                opacity: i === 1 ? 1 : 0.5,
              }}
            >
              {layer}
            </div>
          ))}
        </div>

        {/* 캔버스 영역 */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#e8e8e8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
          aria-hidden="true"
        >
          <div
            style={{
              width: '70%',
              aspectRatio: '3/4',
              backgroundColor: 'var(--mkt-canvas)',
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
          />
        </div>

        {/* 인스펙터 */}
        <div
          style={{
            width: '140px',
            borderLeft: '1px solid var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-surface-soft)',
            padding: '8px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
          aria-hidden="true"
        >
          {['위치', '크기', '불투명도', '회전'].map((prop) => (
            <div key={prop}>
              <div
                style={{
                  fontSize: '9px',
                  fontFamily: 'var(--mkt-font-mono)',
                  color: 'var(--mkt-ink)',
                  opacity: 0.4,
                  marginBottom: '2px',
                }}
              >
                {prop}
              </div>
              <div
                style={{
                  height: '20px',
                  backgroundColor: 'var(--mkt-canvas)',
                  borderRadius: '4px',
                  border: '1px solid var(--mkt-hairline)',
                }}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/** AI 자동 배치 mockup */
function AiMock() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mkt-space-sm)',
      }}
      aria-label="AI 자동 배치 결과 미리보기"
    >
      {/* 대본 입력 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          border: '1px solid var(--mkt-hairline)',
          borderRadius: 'var(--mkt-rounded-md)',
          padding: '12px',
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '12px',
          color: 'var(--mkt-ink)',
          opacity: 0.8,
          lineHeight: '1.6',
        }}
        aria-hidden="true"
      >
        <span style={{ opacity: 0.4 }}># 장면 1: 사무실, 아침</span>
        <br />
        더비맨이 책상에 엎드려 졸고 있다.
        <br />
        갑자기 핸드폰이 울린다.
      </div>

      {/* 화살표 + "30초" */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          justifyContent: 'center',
          padding: '4px 0',
        }}
        aria-hidden="true"
      >
        <span style={{ fontSize: '20px', opacity: 0.4 }}>↓</span>
        <span
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '11px',
            backgroundColor: 'var(--mkt-block-lime)',
            padding: '2px 8px',
            borderRadius: '4px',
            color: 'var(--mkt-ink)',
          }}
        >
          AI 배치 완료 · 30초
        </span>
      </div>

      {/* 후보 카드 */}
      <div style={{ display: 'flex', gap: '8px' }} aria-hidden="true">
        {['추천 1', '추천 2', '추천 3'].map((label, i) => (
          <div
            key={label}
            style={{
              flex: 1,
              aspectRatio: '3/4',
              backgroundColor:
                i === 0
                  ? 'var(--mkt-block-cream)'
                  : i === 1
                    ? 'var(--mkt-block-mint)'
                    : 'var(--mkt-block-lilac)',
              borderRadius: '6px',
              border: i === 0 ? '2px solid var(--mkt-ink)' : '1px solid transparent',
              display: 'flex',
              alignItems: 'flex-end',
              padding: '6px',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '9px',
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              {label}
              {i === 0 ? ' ✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** 포즈 라이브러리 mockup */
function PoseMock() {
  return (
    <div
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        border: '1px solid var(--mkt-hairline)',
        borderRadius: 'var(--mkt-rounded-md)',
        overflow: 'hidden',
      }}
      aria-label="포즈 라이브러리 미리보기"
    >
      {/* 검색바 */}
      <div
        style={{
          padding: '10px 12px',
          borderBottom: '1px solid var(--mkt-hairline)',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            flex: 1,
            height: '32px',
            backgroundColor: 'var(--mkt-surface-soft)',
            borderRadius: '6px',
            border: '1px solid var(--mkt-hairline)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 10px',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '12px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
          }}
        >
          놀란 여자 측면...
        </div>
      </div>

      {/* 필터 태그 */}
      <div
        style={{
          display: 'flex',
          gap: '6px',
          padding: '8px 12px',
          borderBottom: '1px solid var(--mkt-hairline-soft)',
          flexWrap: 'wrap',
        }}
        aria-hidden="true"
      >
        {['여성', '측면', '놀람'].map((tag, i) => (
          <span
            key={tag}
            style={{
              backgroundColor: i < 2 ? 'var(--mkt-block-lime)' : 'var(--mkt-surface-soft)',
              borderRadius: '4px',
              padding: '2px 8px',
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '10px',
              color: 'var(--mkt-ink)',
            }}
          >
            {tag}
          </span>
        ))}
      </div>

      {/* 포즈 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '6px',
          padding: '10px',
        }}
        aria-hidden="true"
      >
        {Array.from({ length: 8 }).map((_, i) => (
          <div
            key={i}
            style={{
              aspectRatio: '3/4',
              backgroundColor: i % 3 === 0 ? 'var(--mkt-block-cream)' : 'var(--mkt-surface-soft)',
              borderRadius: '4px',
              border: i === 0 ? '2px solid var(--mkt-ink)' : 'none',
            }}
          />
        ))}
      </div>
    </div>
  )
}

/** PDF 출판 mockup */
function PdfMockup() {
  return (
    <div
      style={{
        display: 'flex',
        gap: 'var(--mkt-space-md)',
        alignItems: 'flex-end',
        flexWrap: 'wrap',
      }}
      aria-label="PDF 판형 미리보기"
    >
      {[
        { label: 'B5', w: 120, h: 170, bg: 'var(--mkt-block-navy)' },
        { label: 'A5', w: 100, h: 140, bg: 'var(--mkt-block-coral)' },
        { label: '정사각', w: 110, h: 110, bg: 'var(--mkt-block-lime)' },
        { label: '세로형', w: 80, h: 160, bg: 'var(--mkt-block-mint)' },
      ].map((fmt) => (
        <div
          key={fmt.label}
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '6px',
          }}
        >
          <div
            style={{
              width: `${fmt.w}px`,
              height: `${fmt.h}px`,
              backgroundColor: fmt.bg,
              borderRadius: '4px',
              border: '1px solid rgba(0,0,0,0.1)',
            }}
            aria-hidden="true"
          />
          <span
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '10px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
            }}
          >
            {fmt.label}
          </span>
        </div>
      ))}
    </div>
  )
}

/** 모바일 편집기 mockup */
function MobileMock() {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
      }}
      aria-label="모바일 편집기 미리보기"
    >
      {/* 폰 외형 */}
      <div
        style={{
          width: '200px',
          aspectRatio: '9/19',
          backgroundColor: 'var(--mkt-block-navy)',
          borderRadius: '24px',
          border: '3px solid rgba(255,255,255,0.2)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        aria-hidden="true"
      >
        {/* 캔버스 영역 */}
        <div
          style={{
            flex: 1,
            backgroundColor: '#2a2850',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <div
            style={{
              width: '60%',
              aspectRatio: '3/4',
              backgroundColor: 'rgba(255,255,255,0.1)',
              borderRadius: '4px',
            }}
          />
        </div>

        {/* 하단 BottomSheet */}
        <div
          style={{
            height: '90px',
            backgroundColor: 'rgba(255,255,255,0.05)',
            borderTop: '1px solid rgba(255,255,255,0.1)',
            padding: '8px',
          }}
        >
          {/* 드래그 핸들 */}
          <div
            style={{
              width: '32px',
              height: '3px',
              backgroundColor: 'rgba(255,255,255,0.3)',
              borderRadius: '2px',
              margin: '0 auto 8px',
            }}
          />
          {/* 탭 아이콘들 */}
          <div style={{ display: 'flex', justifyContent: 'space-around' }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: '28px',
                  height: '28px',
                  backgroundColor: i === 2 ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)',
                  borderRadius: '6px',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FeaturesPage() {
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
            FEATURES
          </span>
          <h1 className="mkt-display-xl" style={{ color: 'var(--mkt-ink)' }}>
            콘티에 필요한 것만,
            <br />
            전부.
          </h1>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'var(--mkt-body-lg-size)',
              fontWeight: 'var(--mkt-body-lg-weight)',
              lineHeight: 'var(--mkt-body-lg-lh)',
              color: 'var(--mkt-ink)',
              opacity: 0.65,
              maxWidth: '520px',
            }}
          >
            Canva도, Storyboard.io도, Procreate도 만들 수 없는 한 가지 — 콘티 전용 편집기.
          </p>
        </div>
      </section>

      {/* ── 1: 편집기 한눈에 (cream) ─────────────────────────────────────── */}
      <FeatureSection>
        <ColorBlock variant="cream">
          <FeatureBlock
            eyebrow="EDITOR OVERVIEW"
            headline={'편집기 한눈에'}
            body="좌측 도구 11종, 가운데 캔버스, 우측 인스펙터. 포즈·배경·말풍선·워드효과 도구가 모두 한 화면에. 단축키 ⌘K로 모든 기능 검색."
            details={['포즈 레이어', '배경 레이어', '말풍선', '워드효과', '인스펙터']}
            mockup={<EditorMock />}
          />
        </ColorBlock>
      </FeatureSection>

      {/* ── 2: AI 자동 배치 (lime) ────────────────────────────────────────── */}
      <FeatureSection style={{ paddingTop: 0 }}>
        <ColorBlock variant="lime" id="ai-layout">
          <FeatureBlock
            eyebrow="AI AUTO-LAYOUT"
            headline={'대본 → 30초 → 페이지'}
            body="대본을 붙여넣으면 AI가 장면을 나누고 포즈·배경을 추천합니다. Confidence 표시와 함께 후보 K개 중 한 클릭으로 교체."
            details={['장면 자동 분할', '포즈 추천', '배경 추천', '한 클릭 교체']}
            mockup={<AiMock />}
            reverse
          />
        </ColorBlock>
      </FeatureSection>

      {/* ── 3: 포즈 라이브러리 (mint) ────────────────────────────────────── */}
      <FeatureSection style={{ paddingTop: 0 }}>
        <ColorBlock variant="mint" id="pose-library">
          <FeatureBlock
            eyebrow="POSE LIBRARY"
            headline={'1,270+ 포즈 검색 · 필터 · 드래그'}
            body="몸 타입, 시선, 액션 태그로 필터. 찾은 포즈를 캔버스에 드래그해 바로 배치. 사이드카 키포인트로 정확한 위치 자동 정렬."
            details={['남/여/아이/동물', '감정 태그', '시선 방향', '드래그 배치']}
            mockup={<PoseMock />}
          />
        </ColorBlock>
      </FeatureSection>

      {/* ── 4: PDF 출판 (coral) ──────────────────────────────────────────── */}
      <FeatureSection style={{ paddingTop: 0 }}>
        <ColorBlock variant="coral" id="pdf">
          <FeatureBlock
            eyebrow="PDF EXPORT"
            headline={'인쇄소 사양 PDF, 원클릭'}
            body="B5/A5/정사각형/세로형 판형 프리셋. 재단선 3mm·안전 영역 자동 표시. POD 인쇄소 프리플라이트 통과 검증."
            details={['B5 · A5', '정사각형', '세로형', '재단선 3mm', '안전 영역']}
            mockup={<PdfMockup />}
            reverse
          />
        </ColorBlock>
      </FeatureSection>

      {/* ── 5: 모바일 (navy) ─────────────────────────────────────────────── */}
      <FeatureSection style={{ paddingTop: 0 }}>
        <ColorBlock variant="navy">
          <FeatureBlock
            eyebrow="MOBILE FIRST"
            headline={'모바일에서도 1급 편집기'}
            body="11탭 BottomSheet 패널, 터치 핀치 줌, 두 손가락 회전. 자동저장으로 언제든 이어서 편집. 데스크톱과 동일한 기능."
            details={['BottomSheet 패널', '핀치 줌', '두 손가락 회전', '자동저장']}
            mockup={<MobileMock />}
            textColor="var(--mkt-inverse-ink)"
          />
        </ColorBlock>
      </FeatureSection>

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
            편집기 직접 써보기
          </h2>
          <p className="mkt-body-lg" style={{ color: 'var(--mkt-ink)', opacity: 0.6 }}>
            설명보다 직접 경험이 빠릅니다.
          </p>
          <PillButton href="/editor" variant="primary">
            편집기 열기
          </PillButton>
        </div>
      </section>

      {/* 반응형 */}
      <style>{`
        @media (max-width: 768px) {
          .feature-block-grid {
            grid-template-columns: 1fr !important;
            direction: ltr !important;
          }
        }
      `}</style>

      <Footer />
    </div>
  )
}
