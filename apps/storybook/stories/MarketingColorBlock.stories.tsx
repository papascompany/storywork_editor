/**
 * Marketing / ColorBlock 스토리
 *
 * DESIGN.md §color-block-section 7가지 variant 단독 노출.
 * 각 파스텔 컬러블록을 격리해 보여주며 토큰–색상 매핑을 직접 확인한다.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { ColorBlock } from '../../web/components/marketing/ColorBlock'

const DEMO_BODY =
  '이 컬러블록은 페이지의 스토리텔링 구간을 정의합니다. 흰 캔버스 사이에 한 번씩만 사용하세요.'

const meta = {
  title: 'Marketing/ColorBlock',
  component: ColorBlock,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'DESIGN.md `{components.color-block-section}` 계열. `rounded-lg(24px)` 모서리, `spacing.xxl(48px)` 패딩. 768px 이하에서 full-bleed (모서리 제거).',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['lime', 'lilac', 'cream', 'pink', 'mint', 'coral', 'navy'],
    },
  },
} satisfies Meta<typeof ColorBlock>

export default meta
type Story = StoryObj<typeof meta>

// ─── 공통 inner content ───────────────────────────────────────────────────

function BlockContent({ title, tokenName }: { title: string; tokenName: string }) {
  return (
    <div
      style={{
        maxWidth: '640px',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mkt-space-lg)',
      }}
    >
      <span className="mkt-caption" style={{ color: 'inherit', opacity: 0.55 }}>
        {tokenName}
      </span>
      <h2 className="mkt-headline" style={{ color: 'inherit' }}>
        {title}
      </h2>
      <p className="mkt-body" style={{ color: 'inherit', opacity: 0.8 }}>
        {DEMO_BODY}
      </p>
    </div>
  )
}

// ─── 7 variants ──────────────────────────────────────────────────────────

export const Lime: Story = {
  name: 'Lime — #dceeb1',
  args: {
    variant: 'lime',
    children: <BlockContent title="시스템 / FAQ / 폼 구간" tokenName="block-lime • #dceeb1" />,
  },
}

export const Lilac: Story = {
  name: 'Lilac — #c5b0f4',
  args: {
    variant: 'lilac',
    children: (
      <BlockContent title="디자인 히어로 / 하이라이트 구간" tokenName="block-lilac • #c5b0f4" />
    ),
  },
}

export const Cream: Story = {
  name: 'Cream — #f4ecd6',
  args: {
    variant: 'cream',
    children: <BlockContent title="소프트 웜톤 배경 구간" tokenName="block-cream • #f4ecd6" />,
  },
}

export const Mint: Story = {
  name: 'Mint — #c8e6cd',
  args: {
    variant: 'mint',
    children: <BlockContent title="파스텔 민트 구간" tokenName="block-mint • #c8e6cd" />,
  },
}

export const Pink: Story = {
  name: 'Pink — #efd4d4',
  args: {
    variant: 'pink',
    children: <BlockContent title="파스텔 핑크 구간" tokenName="block-pink • #efd4d4" />,
  },
}

export const Coral: Story = {
  name: 'Coral — #f3c9b6',
  args: {
    variant: 'coral',
    children: <BlockContent title="Ship Products / 출시 구간" tokenName="block-coral • #f3c9b6" />,
  },
}

export const Navy: Story = {
  name: 'Navy — #1f1d3d (inverse)',
  args: {
    variant: 'navy',
    children: (
      <BlockContent
        title="어두운 인버스 구간 — 유일한 다크 블록"
        tokenName="block-navy • #1f1d3d"
      />
    ),
  },
}

// ─── All 7 in a row ───────────────────────────────────────────────────────

export const AllVariants: Story = {
  name: 'AllVariants — 7종 전체 비교',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mkt-space-xxl)',
        padding: 'var(--mkt-space-xxl)',
      }}
    >
      {(
        [
          ['lime', 'Lime', 'block-lime'],
          ['lilac', 'Lilac', 'block-lilac'],
          ['cream', 'Cream', 'block-cream'],
          ['mint', 'Mint', 'block-mint'],
          ['pink', 'Pink', 'block-pink'],
          ['coral', 'Coral', 'block-coral'],
          ['navy', 'Navy (inverse)', 'block-navy'],
        ] as const
      ).map(([variant, label, token]) => (
        <ColorBlock key={variant} variant={variant}>
          <BlockContent title={label} tokenName={`${token} — var(--mkt-${token})`} />
        </ColorBlock>
      ))}
    </div>
  ),
}
