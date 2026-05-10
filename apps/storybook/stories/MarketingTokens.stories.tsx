/**
 * Marketing / Design Tokens — 시각 참조
 *
 * DESIGN.md 핵심 토큰을 color swatch · 타이포그래피 스케일 · 간격으로 시각화.
 * 디자인 협업자(디자이너/카피라이터)가 Storybook 만 보고
 * 마케팅 컴포넌트 사용법을 파악할 수 있도록 한다.
 *
 * 주의: 이 토큰들은 apps/web/app/globals.css 의 mkt-* CSS 변수이며
 * editor-* 패키지 / admin 에는 영향을 주지 않는다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

// ─── 컬러 스와치 컴포넌트 ─────────────────────────────────────────────────

interface SwatchProps {
  token: string
  hex: string
  label?: string
  textClass?: 'dark' | 'light'
}

function Swatch({ token, hex, label, textClass = 'dark' }: SwatchProps) {
  const textColor = textClass === 'dark' ? '#000' : '#fff'
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', minWidth: '120px' }}>
      <div
        style={{
          width: '100%',
          height: '80px',
          backgroundColor: hex,
          borderRadius: '8px',
          border: '1px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'flex-end',
          padding: '8px',
        }}
      >
        <span style={{ fontFamily: 'monospace', fontSize: '10px', color: textColor, opacity: 0.7 }}>
          {hex}
        </span>
      </div>
      <div>
        <p style={{ fontFamily: 'monospace', fontSize: '11px', color: '#000', fontWeight: 600 }}>
          {token}
        </p>
        {label && (
          <p style={{ fontFamily: 'monospace', fontSize: '10px', color: '#666' }}>{label}</p>
        )}
      </div>
    </div>
  )
}

// ─── 타이포그래피 스케일 행 ───────────────────────────────────────────────

interface TypeRowProps {
  token: string
  size: string
  weight: string
  className: string
  sample: string
}

function TypeRow({ token, size, weight, className, sample }: TypeRowProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '180px 60px 60px 1fr',
        gap: '16px',
        alignItems: 'baseline',
        padding: '12px 0',
        borderBottom: '1px solid #f1f1f1',
      }}
    >
      <code style={{ fontSize: '11px', color: '#666' }}>{token}</code>
      <code style={{ fontSize: '11px', color: '#888' }}>{size}</code>
      <code style={{ fontSize: '11px', color: '#888' }}>{weight}</code>
      <span className={className} style={{ color: '#000' }}>
        {sample}
      </span>
    </div>
  )
}

// ─── 간격 토큰 행 ─────────────────────────────────────────────────────────

interface SpaceRowProps {
  token: string
  value: string
  cssVar: string
}

function SpaceRow({ token, value, cssVar }: SpaceRowProps) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '16px',
        padding: '8px 0',
        borderBottom: '1px solid #f1f1f1',
      }}
    >
      <code style={{ width: '160px', fontSize: '11px', color: '#666', flexShrink: 0 }}>
        {token}
      </code>
      <code style={{ width: '50px', fontSize: '11px', color: '#888', flexShrink: 0 }}>{value}</code>
      <div
        style={{
          height: '8px',
          backgroundColor: 'var(--mkt-block-lilac)',
          borderRadius: '4px',
          width: cssVar,
          flexShrink: 0,
        }}
      />
      <code style={{ fontSize: '10px', color: '#aaa' }}>var({cssVar})</code>
    </div>
  )
}

// ─── 메인 토큰 문서 컴포넌트 ─────────────────────────────────────────────

function MarketingTokensDoc() {
  return (
    <div
      style={{
        padding: '48px',
        backgroundColor: '#fff',
        fontFamily: 'system-ui, sans-serif',
        maxWidth: '960px',
      }}
    >
      {/* 헤더 */}
      <div style={{ marginBottom: '48px', borderBottom: '2px solid #000', paddingBottom: '24px' }}>
        <p
          style={{
            fontFamily: 'monospace',
            fontSize: '11px',
            letterSpacing: '0.6px',
            textTransform: 'uppercase',
            color: '#666',
            marginBottom: '8px',
          }}
        >
          DESIGN.md — 마케팅 전용 토큰
        </p>
        <h1 style={{ fontSize: '36px', fontWeight: 700, color: '#000', lineHeight: 1.1 }}>
          Marketing Design Tokens
        </h1>
        <p style={{ fontSize: '15px', color: '#444', marginTop: '12px', maxWidth: '600px' }}>
          이 토큰들은 <code>apps/web/app/globals.css</code>의 <code>mkt-*</code> CSS 변수입니다.
          <strong> editor-* 패키지 / admin 에는 영향을 주지 않습니다.</strong>
          <br />
          직접 hex 값이나 px 숫자를 사용하지 말고 반드시 CSS 변수 또는 유틸리티 클래스를 사용하세요.
        </p>
      </div>

      {/* ── 컬러 ───────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '56px' }}>
        <h2
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#000',
            marginBottom: '24px',
          }}
        >
          Colors
        </h2>

        <h3
          style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace', marginBottom: '12px' }}
        >
          BRAND (모노크롬 코어)
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', marginBottom: '32px' }}>
          <Swatch
            token="--mkt-ink / --mkt-primary"
            hex="#000000"
            label="Primary CTA, 모든 본문"
            textClass="light"
          />
          <Swatch
            token="--mkt-canvas / --mkt-on-primary"
            hex="#ffffff"
            label="페이지 배경, 버튼 텍스트"
          />
          <Swatch token="--mkt-surface-soft" hex="#f7f7f5" label="아이콘 버튼, 카드 배경" />
          <Swatch token="--mkt-hairline" hex="#e6e6e6" label="1px 경계선" />
          <Swatch
            token="--mkt-accent-magenta"
            hex="#ff3d8b"
            label="프로모 CTA (한 페이지 1회)"
            textClass="light"
          />
        </div>

        <h3
          style={{ fontSize: '12px', color: '#888', fontFamily: 'monospace', marginBottom: '12px' }}
        >
          COLOR BLOCKS (파스텔 섹션 7종)
        </h3>
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <Swatch token="--mkt-block-lime" hex="#dceeb1" label="시스템 / FAQ / 폼" />
          <Swatch token="--mkt-block-lilac" hex="#c5b0f4" label="디자인 히어로" />
          <Swatch token="--mkt-block-cream" hex="#f4ecd6" label="소프트 웜 배경" />
          <Swatch token="--mkt-block-mint" hex="#c8e6cd" label="파스텔 민트" />
          <Swatch token="--mkt-block-pink" hex="#efd4d4" label="파스텔 핑크" />
          <Swatch token="--mkt-block-coral" hex="#f3c9b6" label="Ship Products" />
          <Swatch
            token="--mkt-block-navy"
            hex="#1f1d3d"
            label="다크 인버스 블록"
            textClass="light"
          />
        </div>
      </section>

      {/* ── 타이포그래피 ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '56px' }}>
        <h2
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#000',
            marginBottom: '24px',
          }}
        >
          Typography Scale
        </h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '180px 60px 60px 1fr',
            gap: '16px',
            padding: '8px 0',
            borderBottom: '2px solid #000',
            marginBottom: '4px',
          }}
        >
          <code style={{ fontSize: '10px', color: '#aaa' }}>TOKEN</code>
          <code style={{ fontSize: '10px', color: '#aaa' }}>SIZE</code>
          <code style={{ fontSize: '10px', color: '#aaa' }}>WEIGHT</code>
          <code style={{ fontSize: '10px', color: '#aaa' }}>SAMPLE</code>
        </div>
        <TypeRow
          token="display-xl"
          size="86px"
          weight="340"
          className="mkt-display-xl"
          sample="StoryWork"
        />
        <TypeRow
          token="display-lg"
          size="64px"
          weight="340"
          className="mkt-display-lg"
          sample="대본 한 장으로"
        />
        <TypeRow
          token="headline"
          size="26px"
          weight="540"
          className="mkt-headline"
          sample="장면 자동 분할"
        />
        <TypeRow
          token="subhead"
          size="26px"
          weight="340"
          className="mkt-subhead"
          sample="스토리보드 완성"
        />
        <TypeRow
          token="body-lg"
          size="20px"
          weight="330"
          className="mkt-body-lg"
          sample="포즈 라이브러리 1,000+"
        />
        <TypeRow
          token="body"
          size="18px"
          weight="320"
          className="mkt-body"
          sample="기본 본문 텍스트입니다."
        />
        <TypeRow
          token="body-sm"
          size="16px"
          weight="330"
          className="mkt-body-sm"
          sample="카드 내용, 푸터 링크"
        />
        <TypeRow
          token="eyebrow"
          size="18px"
          weight="400"
          className="mkt-eyebrow"
          sample="AI STORYBOARD"
        />
        <TypeRow
          token="caption"
          size="12px"
          weight="400"
          className="mkt-caption"
          sample="SECTION LABEL"
        />
      </section>

      {/* ── 간격 ────────────────────────────────────────────────────────── */}
      <section style={{ marginBottom: '56px' }}>
        <h2
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#000',
            marginBottom: '24px',
          }}
        >
          Spacing
        </h2>
        <SpaceRow token="--mkt-space-xxs" value="4px" cssVar="--mkt-space-xxs" />
        <SpaceRow token="--mkt-space-xs" value="8px" cssVar="--mkt-space-xs" />
        <SpaceRow token="--mkt-space-sm" value="12px" cssVar="--mkt-space-sm" />
        <SpaceRow token="--mkt-space-md" value="16px" cssVar="--mkt-space-md" />
        <SpaceRow token="--mkt-space-lg" value="24px" cssVar="--mkt-space-lg" />
        <SpaceRow token="--mkt-space-xl" value="32px" cssVar="--mkt-space-xl" />
        <SpaceRow token="--mkt-space-xxl" value="48px" cssVar="--mkt-space-xxl" />
        <SpaceRow token="--mkt-space-section" value="96px" cssVar="--mkt-space-section" />
      </section>

      {/* ── 둥근 모서리 ─────────────────────────────────────────────────── */}
      <section>
        <h2
          style={{
            fontFamily: 'monospace',
            fontSize: '13px',
            fontWeight: 700,
            textTransform: 'uppercase',
            letterSpacing: '0.6px',
            color: '#000',
            marginBottom: '24px',
          }}
        >
          Border Radius
        </h2>
        <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap', alignItems: 'flex-end' }}>
          {(
            [
              ['xs', '2px', '2px'],
              ['sm', '6px', '6px'],
              ['md', '8px', '8px'],
              ['lg', '24px', '24px'],
              ['xl', '32px', '32px'],
              ['pill', '50px', '50px'],
              ['full', '9999px', '9999px'],
            ] as const
          ).map(([name, value]) => (
            <div
              key={name}
              style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}
            >
              <div
                style={{
                  width: '64px',
                  height: '64px',
                  backgroundColor: 'var(--mkt-block-lilac)',
                  borderRadius: `var(--mkt-rounded-${name})`,
                  border: '1px solid rgba(0,0,0,0.1)',
                }}
              />
              <code style={{ fontSize: '10px', color: '#666' }}>{name}</code>
              <code style={{ fontSize: '10px', color: '#aaa' }}>{value}</code>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────

const meta = {
  title: 'Marketing/DesignTokens',
  component: MarketingTokensDoc,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'DESIGN.md 마케팅 디자인 토큰 시각 참조. 이 토큰들은 `mkt-*` CSS 변수로 `apps/web`에만 적용됩니다.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof MarketingTokensDoc>

export default meta
type Story = StoryObj<typeof meta>

export const AllTokens: Story = {
  name: 'AllTokens — 컬러 · 타이포 · 간격 · radius',
}
