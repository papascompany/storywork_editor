/**
 * Admin / Resources / ReviewQueue 스토리
 *
 * M3-04 리소스 검수 큐 — ReviewQueue 컴포넌트 + 포즈 카드 조합
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { ReviewQueue } from '../../admin/src/components/review-queue/ReviewQueue'
import type { ReviewQueueProps } from '../../admin/src/components/review-queue/ReviewQueue'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

interface MockReviewItem {
  id: string
  slug: string
  kind: string
  thumbUrl: string
  meta: { action?: string; bodyType?: string }
  lowDpi: boolean
  status: string
  createdAt: string
}

const MOCK_ITEMS: MockReviewItem[] = [
  {
    id: 'r1',
    slug: 'pose-walk-female-001',
    kind: 'pose',
    thumbUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=걷기+여자',
    meta: { action: '걷기', bodyType: 'F' },
    lowDpi: true,
    status: 'draft',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
  {
    id: 'r2',
    slug: 'pose-run-male-002',
    kind: 'pose',
    thumbUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=달리기+남자',
    meta: { action: '달리기', bodyType: 'M' },
    lowDpi: false,
    status: 'review',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
  },
  {
    id: 'r3',
    slug: 'pose-sit-child-003',
    kind: 'pose',
    thumbUrl: 'https://placehold.co/256x256/f0f0ff/6366f1?text=앉기+어린이',
    meta: { action: '앉기', bodyType: 'child' },
    lowDpi: true,
    status: 'draft',
    createdAt: new Date(Date.now() - 10800000).toISOString(),
  },
  {
    id: 'r4',
    slug: 'background-city-001',
    kind: 'background',
    thumbUrl: 'https://placehold.co/256x256/f0f0f0/999999?text=도시+배경',
    meta: {},
    lowDpi: false,
    status: 'draft',
    createdAt: new Date(Date.now() - 14400000).toISOString(),
  },
  {
    id: 'r5',
    slug: 'pose-fight-male-004',
    kind: 'pose',
    thumbUrl: 'https://placehold.co/256x256/fff0f0/ff6363?text=싸움+남자',
    meta: { action: '싸움', bodyType: 'M' },
    lowDpi: true,
    status: 'review',
    createdAt: new Date(Date.now() - 18000000).toISOString(),
  },
]

const KIND_LABELS: Record<string, string> = {
  pose: '포즈',
  background: '배경',
  prop: '소품',
  'speech-bubble': '말풍선',
  decoration: '꾸미기',
}

function ReviewCard({ item, isFocused }: { item: MockReviewItem; isFocused: boolean }) {
  return (
    <div
      className={`p-3 flex flex-col gap-2 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-80'}`}
    >
      <img
        src={item.thumbUrl}
        alt={item.slug}
        className="w-full aspect-square object-contain rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]"
      />
      <p className="text-sm font-medium text-[var(--color-text)] truncate">{item.slug}</p>
      <div className="flex flex-wrap gap-1">
        <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
          {KIND_LABELS[item.kind] ?? item.kind}
        </span>
        {item.meta.action && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
            {item.meta.action}
          </span>
        )}
        {item.lowDpi && (
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
            저해상도
          </span>
        )}
      </div>
    </div>
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Resources/ReviewQueue',
  component: ReviewQueue,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'M3-04 리소스 검수 큐. j/k 이동, a 승인, r 거절, e 키포인트 편집.',
      },
    },
  },
  tags: ['autodocs'],
  // render() 전용 스토리 — args 는 story 레벨에서 직접 공급. 기본값으로 타입 충족
  args: {} as ReviewQueueProps<MockReviewItem>,
} satisfies Meta<typeof ReviewQueue<MockReviewItem>>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: 5건 데모 ───────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 5건 검수 대기 + 키보드 단축키',
  render: () => {
    const [items, setItems] = React.useState<MockReviewItem[]>(MOCK_ITEMS)
    const [log, setLog] = React.useState<string[]>([])
    const addLog = (msg: string) => setLog((prev) => [msg, ...prev].slice(0, 10))

    return (
      <div className="p-4">
        <div className="mb-4 p-3 bg-[var(--color-surface-muted)] rounded text-xs text-[var(--color-text-muted)]">
          <strong>단축키:</strong> j/k 이동 · a 승인 · r 거절 · e 키포인트 편집
        </div>
        <ReviewQueue
          items={items}
          rowKey={(item) => item.id}
          renderCard={(item, opts) => <ReviewCard item={item} isFocused={opts.isFocused} />}
          totalCount={10}
          onApprove={async (item) => {
            await new Promise((r) => setTimeout(r, 300))
            setItems((prev) => prev.filter((p) => p.id !== item.id))
            addLog(`승인: ${item.slug}`)
          }}
          onReject={async (item, reason) => {
            await new Promise((r) => setTimeout(r, 300))
            setItems((prev) => prev.filter((p) => p.id !== item.id))
            addLog(`거절: ${item.slug} — ${reason}`)
          }}
          extraActions={[
            {
              id: 'edit-kp',
              label: '키포인트 편집',
              key: 'e',
              handler: async (item) => {
                addLog(`키포인트 편집: ${item.slug}`)
              },
            },
          ]}
        />
        {log.length > 0 && (
          <div className="mt-6">
            <p className="text-sm font-medium mb-2 text-[var(--color-text)]">처리 로그</p>
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

// ─── 스토리 2: 빈 상태 ───────────────────────────────────────────────────────

export const Empty: Story = {
  name: 'Empty — 검수 대기 없음',
  render: () => (
    <div className="p-4">
      <ReviewQueue
        items={[] as MockReviewItem[]}
        rowKey={(item) => item.id}
        renderCard={(item, opts) => <ReviewCard item={item} isFocused={opts.isFocused} />}
        onApprove={async () => {}}
        onReject={async () => {}}
        emptyState={
          <div className="flex flex-col items-center gap-3">
            <p className="text-lg font-medium text-[var(--color-text)]">
              검수 대기 항목이 없습니다
            </p>
            <p className="text-sm text-[var(--color-text-muted)]">모든 리소스가 처리되었습니다.</p>
            <a href="#" className="text-sm text-[var(--color-brand-500)] underline">
              신규 업로드 →
            </a>
          </div>
        }
      />
    </div>
  ),
}
