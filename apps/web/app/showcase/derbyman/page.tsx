/**
 * /showcase/derbyman — 더비맨 사례 페이지
 *
 * 색상 흐름:
 * white hero → cream (4컷 콘티) →
 * lime/mint/coral/lilac (제작 과정 단계별) → white CTA
 * RSC
 */

import type { Metadata } from 'next'
import Image from 'next/image'
import * as React from 'react'

const BASE_URL = 'https://storywork-editor-web.vercel.app'

export const metadata: Metadata = {
  title: '더비맨 — 회사원에서 콘티 작가가 되다',
  description:
    '주말 취미로 시작한 짧은 만화. 대본 한 페이지가 4컷 콘티가 되기까지 5분. 스토리워크 크리에이터 사례.',
  alternates: {
    canonical: `${BASE_URL}/showcase/derbyman`,
  },
  openGraph: {
    title: '더비맨 — 회사원에서 콘티 작가가 되다',
    description:
      '주말 취미로 시작한 짧은 만화. 스토리워크로 대본 한 페이지를 4컷 콘티로, 5분 만에.',
    url: `${BASE_URL}/showcase/derbyman`,
    images: [
      {
        url: `${BASE_URL}/api/og/derbyman`,
        width: 1200,
        height: 630,
        alt: '더비맨 — 회사원에서 콘티 작가가 되다',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '더비맨 — 회사원에서 콘티 작가가 되다',
    description: '주말 취미 → 4컷 콘티 → POD 인쇄. 스토리워크 크리에이터 사례.',
    images: [`${BASE_URL}/api/og/derbyman`],
  },
}

import { ColorBlock } from '../../../components/marketing/ColorBlock'
import { Footer } from '../../../components/marketing/Footer'
import { Header } from '../../../components/marketing/Header'
import { PillButton } from '../../../components/marketing/PillButton'
import { StickyNote } from '../../../components/marketing/StickyNote'
import { getDerbymanScenes } from '../../../lib/marketing-assets'

/** 제작 과정 단계 컴포넌트 */
function StepBlock({
  step,
  variant,
  title,
  description,
  mockup,
}: {
  step: number
  variant: 'lime' | 'mint' | 'coral' | 'lilac'
  title: string
  description: string
  mockup?: React.ReactNode
}) {
  return (
    <div style={{ padding: '0 var(--mkt-space-xl) var(--mkt-space-section)' }}>
      <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
        <ColorBlock variant={variant}>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: mockup ? '1fr 1fr' : '1fr',
              gap: 'var(--mkt-space-xxl)',
              alignItems: 'center',
            }}
            className="step-grid"
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-lg)' }}>
              <span className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
                STEP {step}
              </span>
              <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                {title}
              </h2>
              <p
                className="mkt-body"
                style={{ color: 'var(--mkt-ink)', opacity: 0.75, maxWidth: '380px' }}
              >
                {description}
              </p>
            </div>

            {mockup && <div>{mockup}</div>}
          </div>
        </ColorBlock>
      </div>
    </div>
  )
}

/** 대본 입력 mockup */
function ScriptMock() {
  return (
    <div
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        border: '1px solid var(--mkt-hairline)',
        borderRadius: 'var(--mkt-rounded-md)',
        padding: 'var(--mkt-space-lg)',
      }}
      aria-label="대본 입력 예시"
    >
      <div
        style={{
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '13px',
          lineHeight: '1.8',
          color: 'var(--mkt-ink)',
          whiteSpace: 'pre-line',
        }}
        aria-hidden="true"
      >
        <span style={{ opacity: 0.4 }}># 더비맨의 월요일</span>
        {'\n\n'}
        <span style={{ opacity: 0.4 }}>[장면 1] 사무실 책상</span>
        {'\n'}
        더비맨이 엎드려 졸고 있다.
        {'\n'}
        핸드폰이 울린다.
        {'\n\n'}
        <span style={{ opacity: 0.4 }}>[장면 2] 점심시간</span>
        {'\n'}
        혼자 노트북을 펼친다.
        {'\n'}
        <span style={{ color: 'var(--mkt-block-navy)', fontWeight: '600' }}>더비맨:</span> "오늘은
        5페이지..."
        {'\n\n'}
        <span style={{ fontFamily: 'var(--mkt-font-mono)', fontSize: '11px', opacity: 0.35 }}>
          200자 · 2장면 · 예상 2컷
        </span>
      </div>
    </div>
  )
}

/** AI 장면 분리 결과 mockup */
function SceneSplitMock() {
  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-sm)' }}
      aria-label="AI 장면 분리 결과"
    >
      {[
        { label: '장면 1', desc: '사무실 책상 / 더비맨 졸고 있음', confidence: 92 },
        { label: '장면 2', desc: '점심시간 / 노트북 + 말풍선', confidence: 87 },
        { label: '장면 3', desc: '카페 / 대본 작업', confidence: 81 },
        { label: '장면 4', desc: '주말 / 책 수령', confidence: 76 },
      ].map((scene) => (
        <div
          key={scene.label}
          style={{
            backgroundColor: 'var(--mkt-canvas)',
            border: '1px solid var(--mkt-hairline)',
            borderRadius: 'var(--mkt-rounded-sm)',
            padding: '10px 14px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
          aria-hidden="true"
        >
          <div>
            <div
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '10px',
                color: 'var(--mkt-ink)',
                opacity: 0.4,
                marginBottom: '2px',
              }}
            >
              {scene.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                color: 'var(--mkt-ink)',
              }}
            >
              {scene.desc}
            </div>
          </div>
          <div
            style={{
              backgroundColor: 'var(--mkt-block-lime)',
              borderRadius: 'var(--mkt-rounded-sm)',
              padding: '2px 8px',
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              color: 'var(--mkt-ink)',
            }}
          >
            {scene.confidence}%
          </div>
        </div>
      ))}
    </div>
  )
}

/** 포즈 자동 배치 mockup — 실 자산 3개 */
function PoseAutoMock() {
  // 더비맨 시나리오 장면1 포즈 후보 3개: 엎드리기, 책상작업, 서서 놀람
  const candidates = [
    {
      slug: '10-eohdeurin-1',
      label: '엎드리기 (92%)',
      selected: true,
    },
    {
      slug: '04-chaegsajehanjjogparg-1',
      label: '책상 작업 (78%)',
      selected: false,
    },
    {
      slug: '13-seogi-ggabjjag-1',
      label: '놀라기 (61%)',
      selected: false,
    },
  ]

  return (
    <div
      style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-sm)' }}
      aria-label="포즈 자동 배치 후보"
    >
      <span
        className="mkt-caption"
        style={{ color: 'var(--mkt-ink)', opacity: 0.45, marginBottom: '4px' }}
        aria-hidden="true"
      >
        SCENE 1 — 포즈 후보 K=3
      </span>
      <div style={{ display: 'flex', gap: '10px' }} aria-hidden="true">
        {candidates.map((pose) => (
          <div
            key={pose.slug}
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              gap: '4px',
              alignItems: 'center',
            }}
          >
            <div
              style={{
                width: '100%',
                aspectRatio: '3/4',
                borderRadius: '6px',
                border: pose.selected
                  ? '2px solid var(--mkt-ink)'
                  : '1px solid var(--mkt-hairline)',
                overflow: 'hidden',
                position: 'relative',
                backgroundColor: 'var(--mkt-surface-soft)',
              }}
            >
              <Image
                src={`https://wjpyeqckuxyfeytuzgon.supabase.co/storage/v1/object/public/poses/${pose.slug}/thumb.png`}
                alt={pose.label}
                fill
                sizes="80px"
                style={{ objectFit: 'contain', padding: '4px' }}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '9px',
                color: 'var(--mkt-ink)',
                opacity: 0.55,
                textAlign: 'center',
              }}
            >
              {pose.label}
              {pose.selected ? ' ✓' : ''}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

/** PDF + 책 mockup */
function BookMock() {
  return (
    <div
      style={{ display: 'flex', gap: 'var(--mkt-space-lg)', alignItems: 'flex-end' }}
      aria-label="PDF 출판 및 책 수령 미리보기"
    >
      {/* PDF 아이콘 */}
      <div
        style={{
          width: '100px',
          height: '140px',
          backgroundColor: 'var(--mkt-canvas)',
          border: '2px solid var(--mkt-ink)',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          boxShadow: '4px 4px 0 var(--mkt-ink)',
        }}
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '10px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
          }}
        >
          PDF
        </span>
        <span style={{ fontSize: '28px' }}>📄</span>
        <span
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '9px',
            color: 'var(--mkt-ink)',
            opacity: 0.35,
          }}
        >
          B5 · 16P
        </span>
      </div>

      <span style={{ fontSize: '24px', opacity: 0.4, marginBottom: '40px' }} aria-hidden="true">
        →
      </span>

      {/* 인쇄된 책 */}
      <div
        style={{
          width: '90px',
          height: '130px',
          backgroundColor: 'var(--mkt-block-navy)',
          borderRadius: '3px 8px 8px 3px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'flex-end',
          padding: '10px',
          boxShadow: '-4px 0 0 rgba(0,0,0,0.3)',
        }}
        aria-hidden="true"
      >
        <span
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '11px',
            fontWeight: '600',
            color: 'rgba(255,255,255,0.9)',
            textAlign: 'center',
            lineHeight: '1.3',
          }}
        >
          더비맨의
          <br />
          월요일
        </span>
      </div>
    </div>
  )
}

export default function DerbymanShowcasePage() {
  const derbyScenes = getDerbymanScenes()

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
          className="derby-hero-grid"
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mkt-space-sm)' }}>
              <span className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.45 }}>
                CREATOR STORY
              </span>
            </div>

            <h1 className="mkt-display-xl" style={{ color: 'var(--mkt-ink)' }}>
              더비맨,
              <br />
              회사원에서
              <br />
              콘티 작가가
              <br />
              되다
            </h1>

            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: 'var(--mkt-body-lg-size)',
                fontWeight: 'var(--mkt-body-lg-weight)',
                lineHeight: 'var(--mkt-body-lg-lh)',
                color: 'var(--mkt-ink)',
                opacity: 0.65,
                maxWidth: '420px',
              }}
            >
              주말 취미로 시작한 짧은 만화. 대본 한 페이지가 4컷 콘티가 되기까지 5분.
            </p>
          </div>

          {/* 히어로 비주얼 — 실 포즈 자산 (자신감 있게 서 있는 모습) */}
          <div
            style={{
              backgroundColor: 'var(--mkt-surface-soft)',
              borderRadius: 'var(--mkt-rounded-lg)',
              aspectRatio: '3/4',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            <Image
              src="https://wjpyeqckuxyfeytuzgon.supabase.co/storage/v1/object/public/poses/01-seogi-01-1/thumb.png"
              alt="더비맨 캐릭터 — 자신감 있게 서 있는 모습"
              fill
              sizes="(max-width: 768px) 80vw, 400px"
              style={{ objectFit: 'contain', padding: '24px' }}
              priority
            />
            <p
              className="mkt-caption"
              style={{
                position: 'absolute',
                bottom: '16px',
                left: 0,
                right: 0,
                textAlign: 'center',
                color: 'var(--mkt-ink)',
                opacity: 0.4,
              }}
            >
              더비맨 — 평범한 회사원,
              <br />
              비밀스런 만화 작가
            </p>
          </div>
        </div>
      </section>

      {/* ── 4컷 콘티 (cream) ──────────────────────────────────────────────── */}
      <div style={{ padding: '0 var(--mkt-space-xl) var(--mkt-space-section)' }}>
        <div style={{ maxWidth: 'var(--mkt-max-width)', margin: '0 auto' }}>
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
                  THE COMIC — 더비맨의 월요일
                </span>
                <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
                  4컷 콘티
                </h2>
              </div>

              {/* 4컷 그리드 — 실 포즈 자산 */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(2, 1fr)',
                  gap: 'var(--mkt-space-lg)',
                }}
                className="comic-grid"
                aria-label="더비맨의 월요일 4컷 콘티"
              >
                <StickyNote
                  number={1}
                  scene={derbyScenes[0]?.hint ?? '월요일 아침'}
                  caption={derbyScenes[0]?.alt ?? '사무실 책상에서 졸고 있는 더비맨'}
                  imageUrl={derbyScenes[0]?.thumbUrl}
                  rotation={-1}
                />
                <StickyNote
                  number={2}
                  scene={derbyScenes[1]?.hint ?? '점심시간'}
                  caption={derbyScenes[1]?.alt ?? '노트북 열고 몰래 콘티 작업'}
                  imageUrl={derbyScenes[1]?.thumbUrl}
                  rotation={0.5}
                />
                <StickyNote
                  number={3}
                  scene={derbyScenes[2]?.hint ?? '퇴근 후 카페'}
                  caption={derbyScenes[2]?.alt ?? '완성된 콘티에 환호'}
                  imageUrl={derbyScenes[2]?.thumbUrl}
                  rotation={1}
                />
                <StickyNote
                  number={4}
                  scene={derbyScenes[3]?.hint ?? '주말, 책 도착'}
                  caption={derbyScenes[3]?.alt ?? '인쇄된 책을 받아들고 환호'}
                  imageUrl={derbyScenes[3]?.thumbUrl}
                  rotation={-0.5}
                />
              </div>
            </div>
          </ColorBlock>
        </div>
      </div>

      {/* ── 제작 과정 ─────────────────────────────────────────────────────── */}

      {/* Step 1: 대본 작성 (lime) */}
      <StepBlock
        step={1}
        variant="lime"
        title="대본 작성"
        description="200자만 써도 4컷이 가능합니다. 장면 설명 + 대사 몇 줄이면 충분합니다. 문학적 완성도가 아닌, 그리고 싶은 장면을 메모하듯이."
        mockup={<ScriptMock />}
      />

      {/* Step 2: AI 장면 분리 (mint) */}
      <StepBlock
        step={2}
        variant="mint"
        title="AI가 장면을 나눕니다"
        description="대본을 붙여넣으면 AI가 장면 단위로 분리하고 각 장면의 등장인물, 배경, 감정을 분석합니다. Confidence(신뢰도)와 함께 결과를 확인할 수 있습니다."
        mockup={<SceneSplitMock />}
      />

      {/* Step 3: 포즈 자동 배치 (coral) — 실 자산 */}
      <StepBlock
        step={3}
        variant="coral"
        title="포즈가 자동으로 배치됩니다"
        description="각 장면에 어울리는 포즈 후보 K개를 추천합니다. 마음에 드는 걸 한 클릭으로 선택. 더 보고 싶으면 다음 후보로 교체."
        mockup={<PoseAutoMock />}
      />

      {/* Step 4: PDF 출판 (lilac) */}
      <StepBlock
        step={4}
        variant="lilac"
        title="PDF로 출판, 인쇄소로"
        description="편집이 끝나면 B5 인쇄 사양 PDF로 변환. 재단선과 안전 영역이 자동으로 포함됩니다. POD 인쇄소에 그대로 보내면 책이 됩니다."
        mockup={<BookMock />}
      />

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
            maxWidth: '560px',
            margin: '0 auto',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 'var(--mkt-space-xl)',
          }}
        >
          <h2 className="mkt-display-lg" style={{ color: 'var(--mkt-ink)' }}>
            당신의 이야기는
            <br />
            무엇인가요?
          </h2>
          <p className="mkt-body-lg" style={{ color: 'var(--mkt-ink)', opacity: 0.6 }}>
            더비맨처럼, 당신의 이야기도 4컷이 될 수 있습니다.
          </p>
          <div
            style={{
              display: 'flex',
              gap: 'var(--mkt-space-sm)',
              flexWrap: 'wrap',
              justifyContent: 'center',
            }}
          >
            <PillButton href="/editor" variant="primary">
              내 콘티 시작하기
            </PillButton>
            <PillButton href="/" variant="secondary">
              더 알아보기
            </PillButton>
          </div>
        </div>
      </section>

      {/* 반응형 */}
      <style>{`
        @media (max-width: 768px) {
          .derby-hero-grid {
            grid-template-columns: 1fr !important;
          }
          .comic-grid {
            grid-template-columns: 1fr !important;
          }
          .step-grid {
            grid-template-columns: 1fr !important;
          }
        }
        @media (max-width: 480px) {
          .comic-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>

      <Footer />
    </div>
  )
}
