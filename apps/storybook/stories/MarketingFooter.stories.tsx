/**
 * Marketing / Footer 스토리
 *
 * DESIGN.md §footer:
 * - 흰 캔버스, ink 텍스트
 * - figmaMono caption 컬럼 헤더
 * - 4컬럼 그리드 (auto-fill minmax 160px)
 * - 하단: 로고 + 카피라이트 + 소셜 아이콘
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { Footer } from '../../web/components/marketing/Footer'

const meta = {
  title: 'Marketing/Footer',
  component: Footer,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'DESIGN.md `{components.footer}`. 흰 캔버스, `caption` 컬럼 헤더(figmaMono 대문자), 4컬럼 링크 그리드, 소셜 40px 원형 아이콘 버튼.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Footer>

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 풀 푸터',
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: 'var(--mkt-canvas)' }}>
        <Story />
      </div>
    ),
  ],
}

// ─── Mobile ───────────────────────────────────────────────────────────────

export const Mobile: Story = {
  name: 'Mobile — 390px 2열 접힘',
  parameters: {
    viewport: { defaultViewport: 'mobile390' },
  },
  decorators: [
    (Story) => (
      <div style={{ backgroundColor: 'var(--mkt-canvas)' }}>
        <Story />
      </div>
    ),
  ],
}

// ─── In Page Context ──────────────────────────────────────────────────────

export const InPageContext: Story = {
  name: 'InPageContext — 페이지 하단 컨텍스트',
  parameters: { layout: 'fullscreen' },
  render: () => (
    <div>
      {/* 마지막 콘텐츠 섹션 모킹 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-block-lime)',
          borderRadius: 'var(--mkt-rounded-lg)',
          margin: '48px 32px',
          padding: 'var(--mkt-space-xxl)',
        }}
      >
        <h2 className="mkt-headline" style={{ color: 'var(--mkt-ink)' }}>
          무료로 시작해보세요
        </h2>
        <p
          className="mkt-body"
          style={{ color: 'var(--mkt-ink)', opacity: 0.75, marginTop: '16px' }}
        >
          신용카드 없이 즉시 사용 가능.
        </p>
      </div>
      <Footer />
    </div>
  ),
}
