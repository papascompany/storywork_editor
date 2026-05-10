/**
 * Marketing / FeatureCard 스토리
 *
 * DESIGN.md §feature-illustration-tile / template-card:
 * - surface-soft 배경, rounded-md(8px), padding-lg(24px)
 * - 아이콘 + card-title(24px w700) + body-sm 본문
 */

import type { Meta, StoryObj } from '@storybook/react'
import { FileText, Layers, Sparkles, Zap } from 'lucide-react'
import * as React from 'react'

import { FeatureCard } from '../../web/components/marketing/FeatureCard'

const meta = {
  title: 'Marketing/FeatureCard',
  component: FeatureCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          'DESIGN.md `{components.template-card}` / `{components.feature-illustration-tile}`. surface-soft 배경, rounded-md, padding-lg. 아이콘 → card-title → body-sm 레이아웃.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    title: { control: 'text' },
    body: { control: 'text' },
  },
} satisfies Meta<typeof FeatureCard>

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 텍스트만',
  args: {
    title: '자동 장면 분할',
    body: '대본을 붙여넣으면 AI가 장면과 대사를 자동으로 분리해 콘티 페이지를 만들어줍니다.',
  },
}

// ─── With Icon ────────────────────────────────────────────────────────────

export const WithIcon: Story = {
  name: 'WithIcon — lucide-react 아이콘',
  args: {
    icon: <Sparkles size={32} />,
    title: 'AI 자동 배치',
    body: '1,000개 이상의 포즈에서 장면 분위기에 맞는 포즈와 배경을 자동으로 선택합니다.',
  },
}

// ─── With Image Placeholder ───────────────────────────────────────────────

export const WithImage: Story = {
  name: 'WithImage — 포즈 자산 placeholder',
  args: {
    icon: (
      <div
        style={{
          width: '100%',
          aspectRatio: '16 / 9',
          backgroundColor: 'var(--mkt-block-cream)',
          borderRadius: 'var(--mkt-rounded-md)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '4px',
        }}
        role="img"
        aria-label="포즈 자산 미리보기"
      >
        <span
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '11px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
            textTransform: 'uppercase',
          }}
        >
          포즈 이미지
        </span>
      </div>
    ),
    title: '포즈 라이브러리',
    body: '750×750 투명 PNG 마스터로 제공되는 1,000여 개의 캐릭터 포즈.',
  },
}

// ─── Grid — 4 cards ───────────────────────────────────────────────────────

export const Grid: Story = {
  name: 'Grid — 4컬럼 그리드 (데스크톱)',
  parameters: { layout: 'fullscreen' },
  render: () => {
    const features = [
      {
        icon: <Sparkles size={28} />,
        title: 'AI 자동 배치',
        body: '장면 분위기에 맞는 포즈와 배경을 자동 선택.',
      },
      {
        icon: <Layers size={28} />,
        title: '레이어 편집기',
        body: 'fabric.js 기반 캔바급 레이어 편집. 200 객체 60fps.',
      },
      {
        icon: <FileText size={28} />,
        title: 'POD PDF 출판',
        body: '인쇄 사양(재단선·여백) PDF 16페이지 6초 생성.',
      },
      {
        icon: <Zap size={28} />,
        title: '말풍선 & 워드효과',
        body: '화자 자동 추적 말풍선, 워드효과 50종, 한글 금칙어 처리.',
      },
    ]
    return (
      <div
        style={{
          padding: 'var(--mkt-space-xxl)',
          backgroundColor: 'var(--mkt-canvas)',
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: 'var(--mkt-space-lg)',
            maxWidth: '1280px',
            margin: '0 auto',
          }}
        >
          {features.map((f) => (
            <FeatureCard key={f.title} icon={f.icon} title={f.title} body={f.body} />
          ))}
        </div>
      </div>
    )
  },
}
