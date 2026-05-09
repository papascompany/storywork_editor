/**
 * Admin / Resources / List 스토리
 *
 * M3-04 ResourceListClient — DataTable + 필터 + BulkActionBar 데모
 */

import type { Meta, StoryObj } from '@storybook/react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import * as React from 'react'

import { BulkActionBar } from '../../admin/src/components/bulk-action-bar/BulkActionBar'
import { DataTable } from '../../admin/src/components/data-table/DataTable'
import type { ResourceRow } from '../../admin/src/lib/schemas/resource'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

const KINDS = ['pose', 'background', 'prop', 'speech-bubble', 'decoration']
const STATUSES = ['draft', 'review', 'published', 'rejected']

function makeResource(i: number): ResourceRow {
  return {
    id: `res-${i}`,
    slug: `resource-${String(i).padStart(4, '0')}`,
    originalFilename: `resource_${i}.png`,
    kind: KINDS[i % KINDS.length] ?? 'pose',
    format: 'png',
    ownerType: 'system',
    ownerId: null,
    fileUrl: `https://placehold.co/750x750/f0f0ff/6366f1?text=${i}`,
    thumbUrl: `https://placehold.co/256x256/f0f0ff/6366f1?text=${i}`,
    variants: null,
    width: 750,
    height: 750,
    masterDpi: 90,
    lowDpi: i % 3 !== 0,
    meta: { action: i % 5 === 0 ? '놀람' : i % 3 === 0 ? '걷기' : '앉기' },
    tags: ['태그1', '태그2'],
    status: STATUSES[i % STATUSES.length] ?? 'draft',
    createdAt: new Date(Date.now() - i * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  }
}

const MOCK_DATA = Array.from({ length: 50 }, (_, i) => makeResource(i))

// ─── 컬럼 ─────────────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, string> = {
  draft: 'bg-gray-100 text-gray-700',
  review: 'bg-amber-100 text-amber-700',
  published: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
}

const STATUS_LABEL: Record<string, string> = {
  draft: '초안',
  review: '검수중',
  published: '게시됨',
  rejected: '거절됨',
}

const KIND_LABEL: Record<string, string> = {
  pose: '포즈',
  background: '배경',
  prop: '소품',
  'speech-bubble': '말풍선',
  decoration: '꾸미기',
}

const columns: ColumnDef<ResourceRow>[] = [
  {
    id: 'thumbnail',
    header: '썸네일',
    enableSorting: false,
    size: 80,
    cell: ({ row }) => (
      <img
        src={row.original.thumbUrl ?? ''}
        alt={row.original.slug}
        className="size-12 object-cover rounded"
      />
    ),
    meta: { mobileLabel: '썸네일' },
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    enableSorting: true,
    cell: ({ row }) => <span className="font-mono text-xs">{row.original.slug}</span>,
    meta: { mobileLabel: 'Slug' },
  },
  {
    accessorKey: 'kind',
    header: '종류',
    enableSorting: false,
    cell: ({ row }) => (
      <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-700">
        {KIND_LABEL[row.original.kind] ?? row.original.kind}
      </span>
    ),
    meta: { mobileLabel: '종류' },
  },
  {
    accessorKey: 'status',
    header: '상태',
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className={`px-2 py-0.5 text-xs rounded-full ${STATUS_STYLE[row.original.status] ?? ''}`}
      >
        {STATUS_LABEL[row.original.status] ?? row.original.status}
      </span>
    ),
    meta: { mobileLabel: '상태' },
  },
  {
    id: 'lowDpi',
    header: 'DPI',
    enableSorting: false,
    cell: ({ row }) =>
      row.original.lowDpi ? (
        <span className="px-2 py-0.5 text-xs rounded bg-amber-100 text-amber-700">저해상도</span>
      ) : null,
    meta: { mobileLabel: 'DPI' },
  },
  {
    accessorKey: 'createdAt',
    header: '등록일',
    enableSorting: true,
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('ko-KR'),
    meta: { mobileLabel: '등록일' },
  },
]

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Resources/List',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'M3-04 리소스 목록 — DataTable + 필터 칩 + BulkActionBar 조합.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable<ResourceRow>>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: 50건 mock ──────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 50건 mock 데이터',
  render: () => {
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])
    const [sorting, setSorting] = React.useState<SortingState>([])

    return (
      <div className="p-4 pb-24">
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">리소스 목록 (50건)</h2>
        <DataTable
          data={MOCK_DATA}
          columns={columns}
          rowKey={(r) => r.id}
          selectable
          selectedRowIds={selectedIds}
          onSelectionChange={setSelectedIds}
          sorting={{ state: sorting, onChange: setSorting }}
          onRowClick={(r) => window.alert(`클릭: ${r.slug}`)}
          keyboardNavigation
        />
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          actions={[
            {
              id: 'publish',
              label: '일괄 게시',
              handler: async () => {
                await new Promise((r) => setTimeout(r, 500))
                setSelectedIds([])
              },
            },
            {
              id: 'delete',
              label: '일괄 삭제',
              variant: 'destructive',
              handler: async () => {
                await new Promise((r) => setTimeout(r, 500))
                setSelectedIds([])
              },
            },
          ]}
        />
      </div>
    )
  },
}

// ─── 스토리 2: 빈 상태 ───────────────────────────────────────────────────────

export const Empty: Story = {
  name: 'Empty — 리소스 없음',
  render: () => (
    <div className="p-4">
      <DataTable
        data={[]}
        columns={columns}
        rowKey={(r) => r.id}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-base font-medium text-[var(--color-text)]">리소스가 없습니다</p>
            <p className="text-sm text-[var(--color-text-muted)]">새 리소스를 업로드하세요.</p>
          </div>
        }
      />
    </div>
  ),
}

// ─── 스토리 3: 로딩 ──────────────────────────────────────────────────────────

export const Loading: Story = {
  name: 'Loading skeleton',
  render: () => (
    <div className="p-4">
      <DataTable data={[]} columns={columns} rowKey={(r) => r.id} isLoading />
    </div>
  ),
}
