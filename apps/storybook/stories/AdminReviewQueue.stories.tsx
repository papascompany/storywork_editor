/**
 * Admin / ReviewQueue 스토리
 *
 * M3-02 ReviewQueue — 검수 대기 포즈 카드 + 키보드 데모.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { ReviewQueue } from '../../admin/src/components/review-queue/ReviewQueue'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

interface PoseItem {
  id: string
  name: string
  thumbnailUrl: string
  action: string
  bodyType: string
}

const MOCK_POSES: PoseItem[] = [
  {
    id: 'p1',
    name: '놀란 여자 정면',
    thumbnailUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=포즈1',
    action: '놀람',
    bodyType: 'F',
  },
  {
    id: 'p2',
    name: '걷는 남자 측면',
    thumbnailUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=포즈2',
    action: '걷기',
    bodyType: 'M',
  },
  {
    id: 'p3',
    name: '뛰는 아이 정면',
    thumbnailUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=포즈3',
    action: '뛰기',
    bodyType: 'child',
  },
  {
    id: 'p4',
    name: '싸우는 남자 옆',
    thumbnailUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=포즈4',
    action: '싸움',
    bodyType: 'M',
  },
  {
    id: 'p5',
    name: '앉아 우는 여자',
    thumbnailUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=포즈5',
    action: '울음',
    bodyType: 'F',
  },
]

function PoseCard({ item, isFocused }: { item: PoseItem; isFocused: boolean }) {
  return (
    <div
      className={`p-3 flex flex-col gap-2 transition-all ${isFocused ? 'opacity-100' : 'opacity-80'}`}
    >
      <img
        src={item.thumbnailUrl}
        alt={item.name}
        className="w-full aspect-square object-cover rounded-[var(--radius-md)]"
      />
      <div className="flex flex-col gap-0.5">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{item.name}</p>
        <div className="flex gap-1 flex-wrap">
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
            {item.action}
          </span>
          <span className="text-xs px-1.5 py-0.5 rounded bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
            {item.bodyType}
          </span>
        </div>
      </div>
    </div>
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/ReviewQueue',
  component: ReviewQueue,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '검수 대기 항목 카드 그리드. j/k 이동, a 승인, r 거절, Esc 포커스 해제. 승인/거절 후 다음 항목 자동 포커스.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof ReviewQueue<PoseItem>>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: 포즈 검수 — 키보드 데모 ──────────────────────────────────────

export const PoseApproval: Story = {
  name: 'Pose Approval — 5개 mock 포즈 + 키보드 데모',
  render: () => {
    const [items, setItems] = React.useState<PoseItem[]>(MOCK_POSES)
    const [log, setLog] = React.useState<string[]>([])

    const addLog = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 10))

    return (
      <div className="p-4">
        <div className="mb-4 p-3 bg-[var(--color-surface-muted)] rounded-[var(--radius-md)] text-sm text-[var(--color-text-muted)]">
          <strong>키보드 단축키:</strong> j/k 이동 · a 승인 · r 거절 · Esc 해제
        </div>

        <ReviewQueue
          items={items}
          rowKey={(item) => item.id}
          renderCard={(item, opts) => <PoseCard item={item} isFocused={opts.isFocused} />}
          totalCount={10}
          onApprove={async (item) => {
            await new Promise((r) => setTimeout(r, 300))
            setItems((prev) => prev.filter((p) => p.id !== item.id))
            addLog(`✅ 승인: ${item.name}`)
          }}
          onReject={async (item, reason) => {
            await new Promise((r) => setTimeout(r, 300))
            setItems((prev) => prev.filter((p) => p.id !== item.id))
            addLog(`❌ 거절: ${item.name} — ${reason}`)
          }}
          extraActions={[
            {
              id: 'edit-approve',
              label: '수정 후 승인',
              key: 'e',
              handler: async (item) => {
                addLog(`✏️ 수정 후 승인: ${item.name}`)
              },
            },
          ]}
        />

        {log.length > 0 && (
          <div className="mt-6">
            <h3 className="text-sm font-medium mb-2 text-[var(--color-text)]">처리 로그</h3>
            <ul className="space-y-1">
              {log.map((entry, i) => (
                <li key={i} className="text-xs text-[var(--color-text-muted)]">
                  {entry}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    )
  },
}

// ─── 스토리 2: 빈 상태 ──────────────────────────────────────────────────────

export const EmptyQueue: Story = {
  name: 'Empty Queue — 모두 처리됨',
  render: () => (
    <div className="p-4">
      <ReviewQueue
        items={[]}
        rowKey={(item) => item.id}
        renderCard={(item, opts) => <PoseCard item={item} isFocused={opts.isFocused} />}
        onApprove={async () => {}}
        onReject={async () => {}}
      />
    </div>
  ),
}

// ─── 스토리 3: 로딩 ─────────────────────────────────────────────────────────

export const Loading: Story = {
  name: 'Loading — skeleton 카드',
  render: () => (
    <div className="p-4">
      <ReviewQueue
        items={[]}
        rowKey={(item) => item.id}
        renderCard={(item, opts) => <PoseCard item={item} isFocused={opts.isFocused} />}
        onApprove={async () => {}}
        onReject={async () => {}}
        isLoading
      />
    </div>
  ),
}
