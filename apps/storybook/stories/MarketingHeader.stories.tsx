/**
 * Marketing / Header 스토리
 *
 * DESIGN.md §top-nav:
 * - height 56px, 흰 배경, 좌 로고 / 가운데 nav / 우 CTA 쌍
 * - 768px 이하: 햄버거 → Sheet (좌측 슬라이드)
 *
 * usePathname / next/link 는 __mocks__ 로 aliased.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { Header } from '../../web/components/marketing/Header'

const meta = {
  title: 'Marketing/Header',
  component: Header,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'DESIGN.md `{components.top-nav}`. sticky 56px 바. 데스크톱 수평 링크, 768px 이하 햄버거 Sheet. `usePathname` mock 으로 active 링크 시뮬레이션.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof Header>

export default meta
type Story = StoryObj<typeof meta>

// ─── Desktop ──────────────────────────────────────────────────────────────

export const Desktop: Story = {
  name: 'Desktop — 데스크톱 네비',
  parameters: {
    viewport: { defaultViewport: 'desktop1280' },
  },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <div
          style={{
            height: '400px',
            backgroundColor: 'var(--mkt-canvas)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ fontFamily: 'var(--mkt-font-sans)', color: 'var(--mkt-ink)', opacity: 0.3 }}>
            (페이지 콘텐츠 영역)
          </p>
        </div>
      </div>
    ),
  ],
}

// ─── Mobile ───────────────────────────────────────────────────────────────

export const Mobile: Story = {
  name: 'Mobile — 390px 햄버거',
  parameters: {
    viewport: { defaultViewport: 'mobile390' },
  },
  decorators: [
    (Story) => (
      <div>
        <Story />
        <div
          style={{
            height: '300px',
            backgroundColor: 'var(--mkt-canvas)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <p style={{ fontFamily: 'var(--mkt-font-sans)', color: 'var(--mkt-ink)', opacity: 0.3 }}>
            (페이지 콘텐츠 영역)
          </p>
        </div>
      </div>
    ),
  ],
}

// ─── Scrolled (hairline border) ───────────────────────────────────────────

export const Scrolled: Story = {
  name: 'Scrolled — 스크롤 후 하단 hairline',
  decorators: [
    (Story) => (
      <div
        style={{
          height: '600px',
          overflow: 'auto',
          backgroundColor: 'var(--mkt-surface-soft)',
        }}
      >
        <Story />
        {/* 스크롤을 유발하는 더미 콘텐츠 */}
        <div style={{ height: '1200px', padding: '48px 32px' }}>
          <p style={{ fontFamily: 'var(--mkt-font-sans)', color: 'var(--mkt-ink)', opacity: 0.3 }}>
            아래로 스크롤하면 hairline 하단 테두리가 표시됩니다.
          </p>
        </div>
      </div>
    ),
  ],
}
