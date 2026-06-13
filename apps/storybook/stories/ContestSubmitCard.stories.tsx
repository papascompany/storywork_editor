import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { ContestSubmitCard } from '../../web/components/mypage/ContestSubmitCard'

/**
 * 공모전 출품 모드(마이페이지)에서 작품별로 노출되는 출품 카드 (BOARD-05).
 * `open`(시즌 개방) / `pageCount`(0이면 출품 불가) 에 따라 버튼 상태가 달라진다.
 */
const meta = {
  title: 'Mypage/ContestSubmitCard',
  component: ContestSubmitCard,
  parameters: {
    layout: 'centered',
    docs: {
      description: {
        component:
          '공모전 출품 카드. 진행 중(open)·마감(open=false)·페이지 없음(pageCount=0) 상태별 버튼이 달라지며, 클릭 시 POST /api/contest/[seasonId]/submit 호출.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ContestSubmitCard>

export default meta
type Story = StoryObj<typeof meta>

const SAMPLE_THUMB =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="240"><rect width="320" height="240" fill="#ffd9b0"/><circle cx="160" cy="120" r="56" fill="#e0633c"/></svg>`,
  )

/** 진행 중 + 썸네일 — 출품 가능 */
export const Open: Story = {
  args: {
    contestId: 'season-1',
    open: true,
    id: 'p1',
    title: '여름밤의 고양이',
    thumbnail: SAMPLE_THUMB,
    pageCount: 12,
  },
  decorators: [(S) => <div style={{ width: 220 }}>{S()}</div>],
}

/** 진행 중 + 썸네일 없음 — 제목 이니셜 placeholder */
export const OpenNoThumbnail: Story = {
  args: {
    contestId: 'season-1',
    open: true,
    id: 'p2',
    title: '바다 건너 우체부',
    thumbnail: null,
    pageCount: 8,
  },
  decorators: [(S) => <div style={{ width: 220 }}>{S()}</div>],
}

/** 마감(open=false) — 버튼 "출품 마감" 비활성 */
export const Closed: Story = {
  args: {
    contestId: 'season-1',
    open: false,
    id: 'p3',
    title: '마감된 시즌 작품',
    thumbnail: SAMPLE_THUMB,
    pageCount: 6,
  },
  decorators: [(S) => <div style={{ width: 220 }}>{S()}</div>],
}

/** 페이지 0개 — 버튼 "페이지 없음" 비활성 */
export const NoPages: Story = {
  args: {
    contestId: 'season-1',
    open: true,
    id: 'p4',
    title: '빈 작품',
    thumbnail: null,
    pageCount: 0,
  },
  decorators: [(S) => <div style={{ width: 220 }}>{S()}</div>],
}

/** 그리드 — 출품 모드 목록 레이아웃 확인 */
export const Grid: Story = {
  args: {
    contestId: 'season-1',
    open: true,
    id: 'p1',
    title: '여름밤의 고양이',
    thumbnail: SAMPLE_THUMB,
    pageCount: 12,
  },
  render: () => (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 200px)',
        gap: 16,
      }}
    >
      <ContestSubmitCard
        contestId="s1"
        open
        id="p1"
        title="여름밤의 고양이"
        thumbnail={SAMPLE_THUMB}
        pageCount={12}
      />
      <ContestSubmitCard
        contestId="s1"
        open
        id="p2"
        title="바다 건너 우체부"
        thumbnail={null}
        pageCount={8}
      />
      <ContestSubmitCard
        contestId="s1"
        open={false}
        id="p3"
        title="마감 시즌"
        thumbnail={SAMPLE_THUMB}
        pageCount={6}
      />
    </div>
  ),
}
