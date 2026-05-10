/**
 * Marketing / MarqueeStrip 스토리
 *
 * DESIGN.md §marquee-strip:
 * - 검정 배경(inverse-canvas), 흰 텍스트(inverse-ink), height 36px
 * - prefers-reduced-motion 존중: 애니 중단
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { MarqueeStrip } from '../../web/components/marketing/MarqueeStrip'

const DEFAULT_ITEMS = [
  '포즈 라이브러리 1,000+',
  'AI 자동 배치',
  'POD PDF 출판',
  '말풍선 & 워드효과',
  '템플릿셋',
  'SNS 공유',
  '공모전',
  'B5 · A4 · 사각 판형',
]

const meta = {
  title: 'Marketing/MarqueeStrip',
  component: MarqueeStrip,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'DESIGN.md `{components.marquee-strip}`. 검정 배경, 36px 높이, `prefers-reduced-motion` 시 애니 중단. `aria-hidden="true"` 로 스크린 리더 건너뜀.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    items: { control: 'object' },
  },
} satisfies Meta<typeof MarqueeStrip>

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 기본 카피',
  args: {
    items: DEFAULT_ITEMS,
  },
}

// ─── Custom ───────────────────────────────────────────────────────────────

export const Custom: Story = {
  name: 'Custom — 사용자 지정 카피',
  args: {
    items: [
      '스토리보드를 더 빠르게',
      '당신의 이야기를 출판하세요',
      '전문 POD 인쇄소 연동',
      '1인 크리에이터도 OK',
      '한/영 지원',
    ],
  },
}

// ─── Slow (animation speed 데모) ─────────────────────────────────────────
// MarqueeStrip 자체에 speed prop 은 없으므로 CSS 오버라이드로 데모

export const Slow: Story = {
  name: 'Slow — 애니메이션 속도 느리게 (CSS 오버라이드)',
  args: {
    items: DEFAULT_ITEMS,
  },
  decorators: [
    (Story) => (
      <>
        <style>{`.mkt-marquee-track { animation-duration: 80s !important; }`}</style>
        <Story />
      </>
    ),
  ],
}

// ─── In Context ───────────────────────────────────────────────────────────

export const InContext: Story = {
  name: 'InContext — 네비 아래 배치 컨텍스트',
  args: {
    items: DEFAULT_ITEMS,
  },
  decorators: [
    (Story) => (
      <div>
        {/* 간단한 네비 모킹 */}
        <div
          style={{
            height: '56px',
            backgroundColor: 'var(--mkt-canvas)',
            borderBottom: '1px solid var(--mkt-hairline)',
            display: 'flex',
            alignItems: 'center',
            padding: '0 32px',
          }}
        >
          <span
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '18px',
              fontWeight: '700',
              color: 'var(--mkt-ink)',
            }}
          >
            StoryWork
          </span>
        </div>
        <Story />
        <div
          style={{
            padding: '48px 32px',
            backgroundColor: 'var(--mkt-canvas)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '18px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
            }}
          >
            (히어로 섹션 자리)
          </p>
        </div>
      </div>
    ),
  ],
}
