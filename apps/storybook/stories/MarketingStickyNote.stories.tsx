/**
 * Marketing / StickyNote 스토리
 *
 * DESIGN.md §Sticky-note style component thumbnails:
 * - 파스텔 배경 순환 (cream → mint → lilac → pink)
 * - rounded-sm(6px), 살짝 기울어진 collage 느낌
 * - mkt-caption 장면 번호, mkt-body-sm 장면 제목
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { StickyNote } from '../../web/components/marketing/StickyNote'

const meta = {
  title: 'Marketing/StickyNote',
  component: StickyNote,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '4컷 콘티 카드 컴포넌트. 파스텔 배경이 `number % 4` 로 자동 순환. `rotation` prop 으로 collage 기울기 적용. `imageUrl` 있으면 next/image(mock), 없으면 placeholder 박스.',
      },
    },
  },
  tags: ['autodocs'],
  argTypes: {
    number: { control: { type: 'number', min: 1, max: 10 } },
    rotation: { control: { type: 'range', min: -5, max: 5, step: 0.5 } },
    scene: { control: 'text' },
    caption: { control: 'text' },
    imageUrl: { control: 'text' },
  },
} satisfies Meta<typeof StickyNote>

export default meta
type Story = StoryObj<typeof meta>

// ─── Default (placeholder) ───────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — placeholder 박스',
  args: {
    number: 1,
    scene: '주인공 등장',
    caption: '주인공이 골목을 걷고 있다.',
    placeholderColor: 'rgba(0,0,0,0.06)',
    placeholderLabel: 'POSE',
    rotation: -1.5,
  },
}

// ─── With Image ───────────────────────────────────────────────────────────

export const WithImage: Story = {
  name: 'WithImage — 포즈 자산 이미지',
  args: {
    number: 2,
    scene: '대립 장면',
    caption: '두 인물이 마주보며 대화한다.',
    imageUrl: 'https://placehold.co/400x400/c8e6cd/000000?text=POSE',
    rotation: 1,
  },
}

// ─── Color cycle ─────────────────────────────────────────────────────────

export const ColorCycle: Story = {
  name: 'ColorCycle — 4가지 배경 순환 (number 1→4)',
  render: () => (
    <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', alignItems: 'flex-start' }}>
      {[1, 2, 3, 4].map((n) => (
        <StickyNote
          key={n}
          number={n}
          scene={`컷 ${n} 장면`}
          caption={`장면 ${n} 설명 캡션`}
          placeholderColor="rgba(0,0,0,0.06)"
          placeholderLabel={`CUT ${n}`}
          rotation={(n % 2 === 0 ? 1 : -1) * 1.2}
          style={{ width: '160px' }}
        />
      ))}
    </div>
  ),
}

// ─── 4-up grid ────────────────────────────────────────────────────────────

export const FourUp: Story = {
  name: '4-up — 4컷 그리드 (콘티 프리뷰)',
  parameters: { layout: 'fullscreen' },
  render: () => {
    const cuts = [
      { number: 1, scene: '인물 등장', caption: '주인공이 문을 열고 들어온다.', rotation: -1.5 },
      { number: 2, scene: '대화 시작', caption: '"왜 이렇게 늦었어?"', rotation: 0.8 },
      { number: 3, scene: '긴장 고조', caption: '침묵. 눈빛이 마주친다.', rotation: -0.5 },
      { number: 4, scene: '결말 암시', caption: '창밖으로 번개가 친다.', rotation: 1.2 },
    ]
    return (
      <div
        style={{
          backgroundColor: 'var(--mkt-block-cream)',
          borderRadius: 'var(--mkt-rounded-lg)',
          padding: 'var(--mkt-space-xxl)',
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: 'var(--mkt-space-xl)',
          maxWidth: '640px',
          margin: '48px auto',
        }}
      >
        {cuts.map((c) => (
          <StickyNote
            key={c.number}
            number={c.number}
            scene={c.scene}
            caption={c.caption}
            placeholderColor="rgba(0,0,0,0.06)"
            placeholderLabel={`CUT ${c.number}`}
            rotation={c.rotation}
          />
        ))}
      </div>
    )
  },
}

// ─── Mobile ───────────────────────────────────────────────────────────────

export const Mobile: Story = {
  name: 'Mobile — 375px 단일 카드',
  args: {
    number: 1,
    scene: '오프닝 신',
    caption: '카메라가 서서히 줌인한다.',
    placeholderColor: 'rgba(0,0,0,0.06)',
    placeholderLabel: 'POSE',
    rotation: -1,
  },
  parameters: {
    viewport: { defaultViewport: 'mobile390' },
  },
  decorators: [
    (Story) => (
      <div style={{ padding: '24px' }}>
        <Story />
      </div>
    ),
  ],
}
