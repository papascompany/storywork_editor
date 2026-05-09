/**
 * Admin / DataTable 스토리
 *
 * M3-02 DataTable 컴포넌트 데모.
 * 클라이언트 정렬/필터, 서버 페이지네이션 모킹, 선택+BulkActions 조합.
 */

import type { Meta, StoryObj } from '@storybook/react'
import type { ColumnDef, SortingState } from '@tanstack/react-table'
import * as React from 'react'

// 컴포넌트는 admin 앱에서 import — storybook vite 는 상대 경로 번들 가능
import { BulkActionBar } from '../../admin/src/components/bulk-action-bar/BulkActionBar'
import { DataTable } from '../../admin/src/components/data-table/DataTable'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

interface ResourceRow {
  id: string
  name: string
  kind: string
  status: 'draft' | 'published' | 'rejected'
  createdAt: string
}

function makeRows(n: number): ResourceRow[] {
  const kinds = ['pose', 'background', 'prop', 'speech-bubble']
  const statuses: ResourceRow['status'][] = ['draft', 'published', 'rejected']
  return Array.from({ length: n }, (_, i) => ({
    id: `res-${i}`,
    name: `리소스 ${i + 1}`,
    kind: (kinds[i % kinds.length] ?? 'pose') as ResourceRow['kind'],
    status: (statuses[i % statuses.length] ?? 'draft') as ResourceRow['status'],
    createdAt: new Date(Date.now() - i * 86400000).toLocaleDateString('ko-KR'),
  }))
}

const STATUS_BADGE: Record<ResourceRow['status'], string> = {
  draft: '초안',
  published: '게시됨',
  rejected: '거절됨',
}

const STATUS_COLOR: Record<ResourceRow['status'], string> = {
  draft: 'bg-[var(--color-warning-500)]',
  published: 'bg-[var(--color-success-500)]',
  rejected: 'bg-[var(--color-error-500)]',
}

const columns: ColumnDef<ResourceRow>[] = [
  {
    accessorKey: 'name',
    header: '이름',
    meta: { mobileLabel: '이름' },
  },
  {
    accessorKey: 'kind',
    header: '종류',
    meta: { mobileLabel: '종류' },
    enableSorting: false,
  },
  {
    accessorKey: 'status',
    header: '상태',
    meta: { mobileLabel: '상태' },
    enableSorting: false,
    cell: ({ row }) => (
      <span
        className={`inline-flex items-center px-2 py-0.5 text-xs font-medium text-white rounded-full ${STATUS_COLOR[row.original.status]}`}
      >
        {STATUS_BADGE[row.original.status]}
      </span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: '생성일',
    meta: { mobileLabel: '생성일' },
  },
]

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          '관리자 콘솔 공용 테이블. 정렬/필터/페이지네이션(클라+서버), 벌크 선택, 키보드 네비게이션(j/k/x/Enter) 지원.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof DataTable<ResourceRow>>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: 기본 클라이언트 정렬/필터 ────────────────────────────────────

export const Default: Story = {
  name: 'Default — 50행 클라이언트 정렬/필터',
  render: () => {
    const data = makeRows(50)
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">리소스 목록</h2>
        <DataTable
          data={data}
          columns={columns}
          rowKey={(r) => r.id}
          keyboardNavigation
          onRowClick={(r) => window.alert(`클릭: ${r.name}`)}
        />
      </div>
    )
  },
}

// ─── 스토리 2: 서버 페이지네이션 ────────────────────────────────────────────

export const ServerPaginated: Story = {
  name: 'Server-paginated — fetch 모킹',
  render: () => {
    const allData = makeRows(100)
    const [page, setPage] = React.useState(0)
    const [sorting, setSorting] = React.useState<SortingState>([])
    const pageSize = 10
    const pageData = allData.slice(page * pageSize, (page + 1) * pageSize)

    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">
          서버 페이지네이션 (100건)
        </h2>
        <DataTable
          data={pageData}
          columns={columns}
          rowKey={(r) => r.id}
          pagination={{
            pageIndex: page,
            pageSize,
            totalCount: 100,
            onChange: ({ pageIndex }) => setPage(pageIndex),
          }}
          sorting={{ state: sorting, onChange: setSorting }}
        />
      </div>
    )
  },
}

// ─── 스토리 3: 선택 + BulkActions ───────────────────────────────────────────

export const SelectableWithBulkActions: Story = {
  name: 'Selectable + BulkActions',
  render: () => {
    const data = makeRows(20)
    const [selectedIds, setSelectedIds] = React.useState<string[]>([])

    return (
      <div className="p-4 pb-24">
        <h2 className="text-lg font-semibold mb-4 text-[var(--color-text)]">
          선택 + 일괄 작업 데모
        </h2>
        <DataTable
          data={data}
          columns={columns}
          rowKey={(r) => r.id}
          selectable
          selectedRowIds={selectedIds}
          onSelectionChange={setSelectedIds}
          keyboardNavigation
        />
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          actions={[
            {
              id: 'approve',
              label: '일괄 승인',
              handler: async () => {
                await new Promise((r) => setTimeout(r, 500))
                setSelectedIds([])
                return { undoable: true, undo: async () => {} }
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

// ─── 스토리 4: 빈 상태 ──────────────────────────────────────────────────────

export const EmptyState: Story = {
  name: 'Empty state',
  render: () => (
    <div className="p-4">
      <DataTable
        data={[]}
        columns={columns}
        rowKey={(r) => r.id}
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="text-lg font-medium text-[var(--color-text)]">등록된 리소스가 없습니다</p>
            <p className="text-sm text-[var(--color-text-muted)]">새 리소스를 추가해 보세요.</p>
          </div>
        }
      />
    </div>
  ),
}

// ─── 스토리 5: 로딩 ─────────────────────────────────────────────────────────

export const Loading: Story = {
  name: 'Loading skeleton',
  render: () => (
    <div className="p-4">
      <DataTable data={[]} columns={columns} rowKey={(r) => r.id} isLoading />
    </div>
  ),
}
