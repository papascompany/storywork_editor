/**
 * Marketing / Hero 스토리
 *
 * DESIGN.md §display-xl — 히어로 섹션 단독 데모.
 * 흰 캔버스 위 headline + subhead + CTA pair + 선택적 illustration slot.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { Hero } from '../../web/components/marketing/Hero'

const meta = {
  title: 'Marketing/Hero',
  component: Hero,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          '마케팅 히어로 섹션. `display-xl` 헤드라인 + subhead + pill CTA 쌍. 우측에 illustration slot 선택적으로 제공.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    eyebrow: { control: 'text' },
    headline: { control: 'text' },
    subhead: { control: 'text' },
  },
} satisfies Meta<typeof Hero>

export default meta
type Story = StoryObj<typeof meta>

// ─── Default ─────────────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 기본 헤드라인',
  args: {
    headline: '대본 한 장으로\n스토리보드 완성',
    ctas: [
      { label: '지금 시작하기', href: '#', variant: 'primary' },
      { label: '더 알아보기', href: '#', variant: 'secondary' },
    ],
  },
}

// ─── With Eyebrow + Subhead ────────────────────────────────────────────────

export const WithSubhead: Story = {
  name: 'WithSubhead — 아이브로우 + 서브헤드',
  args: {
    eyebrow: 'AI 스토리보드 편집기',
    headline: '대본 한 장으로\n스토리보드 완성',
    subhead:
      '1,000개 이상의 포즈 라이브러리와 AI 자동 배치로, 누구나 전문가 수준의 콘티를 만들 수 있습니다.',
    ctas: [
      { label: '지금 시작하기', href: '#', variant: 'primary' },
      { label: '더 알아보기', href: '#', variant: 'secondary' },
    ],
  },
}

// ─── Long Copy ────────────────────────────────────────────────────────────

export const Long: Story = {
  name: 'Long — 긴 카피 (여러 줄 헤드라인)',
  args: {
    eyebrow: '포즈 라이브러리 1,000+ 자산',
    headline: '장면을 상상하면\n캔버스가 채워집니다',
    subhead:
      'StoryWork는 대본을 분석해 등장인물의 포즈와 배경을 자동으로 배치합니다. 출판 품질의 POD PDF 출력까지 원스톱으로 완성하세요. 이제 콘티는 당신의 이야기 그 자체입니다.',
    ctas: [
      { label: '무료로 시작하기', href: '#', variant: 'primary' },
      { label: '서비스 소개 보기', href: '#', variant: 'secondary' },
    ],
  },
}

// ─── With Illustration ────────────────────────────────────────────────────

export const WithIllustration: Story = {
  name: 'WithIllustration — 우측 illustration slot',
  args: {
    eyebrow: 'AI 스토리보드 편집기',
    headline: '대본 한 장으로\n스토리보드 완성',
    subhead: '포즈 1,000+, AI 자동 배치, POD 출판까지 원스톱 워크플로.',
    ctas: [{ label: '지금 시작하기', href: '#', variant: 'primary' }],
    illustration: (
      <div
        style={{
          width: '100%',
          aspectRatio: '4 / 3',
          backgroundColor: 'var(--mkt-block-cream)',
          borderRadius: 'var(--mkt-rounded-lg)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        role="img"
        aria-label="편집기 미리보기"
      >
        <span
          style={{
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '12px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
            textTransform: 'uppercase',
          }}
        >
          편집기 미리보기
        </span>
      </div>
    ),
  },
}

// ─── Mobile ───────────────────────────────────────────────────────────────

export const Mobile: Story = {
  name: 'Mobile — 375px 뷰포트',
  args: {
    eyebrow: 'AI 스토리보드 편집기',
    headline: '대본 한 장으로\n스토리보드 완성',
    subhead: '포즈 1,000+, AI 자동 배치, POD 출판까지.',
    ctas: [
      { label: '지금 시작하기', href: '#', variant: 'primary' },
      { label: '더 알아보기', href: '#', variant: 'secondary' },
    ],
  },
  parameters: {
    viewport: { defaultViewport: 'mobile390' },
  },
}
