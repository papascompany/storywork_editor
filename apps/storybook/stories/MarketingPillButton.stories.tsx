/**
 * Marketing / PillButton 스토리
 *
 * DESIGN.md §button-primary / button-secondary — 마케팅 전용 pill CTA.
 * WCAG 2.1 AA: 최소 44px 터치 타겟 보장.
 */

import type { Meta, StoryObj } from '@storybook/react'
import { ArrowRight, Sparkles, Star } from 'lucide-react'
import * as React from 'react'

import { PillButton } from '../../web/components/marketing/PillButton'

const meta = {
  title: 'Marketing/PillButton',
  component: PillButton,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '마케팅 전용 pill CTA. `href` 있으면 `<a>`, 없으면 `<button>` 렌더. `rounded-pill(50px)` 고정. WCAG AA 최소 44px 터치 타겟.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'inverse'],
    },
    children: { control: 'text' },
    href: { control: 'text' },
    external: { control: 'boolean' },
  },
} satisfies Meta<typeof PillButton>

export default meta
type Story = StoryObj<typeof meta>

// ─── Primary ──────────────────────────────────────────────────────────────

export const Primary: Story = {
  name: 'Primary — 검정 배경 흰 텍스트',
  args: {
    variant: 'primary',
    children: '지금 시작하기',
    href: '#',
  },
}

// ─── Secondary ────────────────────────────────────────────────────────────

export const Secondary: Story = {
  name: 'Secondary — 흰 배경 검정 테두리',
  args: {
    variant: 'secondary',
    children: '더 알아보기',
    href: '#',
  },
}

// ─── Ghost / Inverse ──────────────────────────────────────────────────────

export const Ghost: Story = {
  name: 'Inverse — navy 섹션용 투명 흰 테두리',
  args: {
    variant: 'inverse',
    children: '살펴보기',
    href: '#',
  },
  decorators: [
    (Story) => (
      <div
        style={{
          backgroundColor: 'var(--mkt-block-navy)',
          padding: '40px 48px',
          borderRadius: 'var(--mkt-rounded-lg)',
        }}
      >
        <Story />
      </div>
    ),
  ],
}

// ─── With Icon ────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  name: 'WithIcon — lucide-react 아이콘 포함',
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <PillButton variant="primary" href="#">
        <Sparkles size={18} aria-hidden="true" style={{ marginRight: '6px' }} />
        AI 자동 배치
      </PillButton>
      <PillButton variant="secondary" href="#">
        <Star size={18} aria-hidden="true" style={{ marginRight: '6px' }} />
        즐겨찾기
      </PillButton>
      <PillButton variant="primary" href="#">
        지금 시작하기
        <ArrowRight size={18} aria-hidden="true" style={{ marginLeft: '6px' }} />
      </PillButton>
    </div>
  ),
}

// ─── Button (no href) ─────────────────────────────────────────────────────

export const AsButton: Story = {
  name: 'AsButton — href 없이 <button> 렌더',
  args: {
    variant: 'primary',
    children: '클릭 이벤트',
    onClick: () => alert('clicked!'),
  },
}

// ─── Disabled ─────────────────────────────────────────────────────────────

export const Disabled: Story = {
  name: 'Disabled — 비활성 상태 (CSS opacity)',
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <span style={{ opacity: 0.35, cursor: 'not-allowed', display: 'inline-flex' }}>
        <PillButton variant="primary" aria-disabled="true">
          비활성 Primary
        </PillButton>
      </span>
      <span style={{ opacity: 0.35, cursor: 'not-allowed', display: 'inline-flex' }}>
        <PillButton variant="secondary" aria-disabled="true">
          비활성 Secondary
        </PillButton>
      </span>
    </div>
  ),
}

// ─── Pair (CTA 쌍) ───────────────────────────────────────────────────────

export const CtaPair: Story = {
  name: 'CtaPair — 브랜드 시그니처 Primary + Secondary 쌍',
  render: () => (
    <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
      <PillButton variant="primary" href="#">
        지금 시작하기
      </PillButton>
      <PillButton variant="secondary" href="#">
        영업팀 문의
      </PillButton>
    </div>
  ),
}
