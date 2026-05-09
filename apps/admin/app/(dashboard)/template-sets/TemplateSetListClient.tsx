'use client'

/**
 * TemplateSetListClient — 템플릿 세트 목록 클라이언트 컴포넌트
 */

import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { BulkActionBar } from '../../../src/components/bulk-action-bar/BulkActionBar'
import { DataTable } from '../../../src/components/data-table/DataTable'
import type { AdminRole } from '../../../src/lib/auth'

export interface TemplateSetRow {
  id: string
  name: string
  templateCount: number
  coverIdx: number
  coverThumbnail: string | null
  createdAt: string
}

interface TemplateSetListClientProps {
  initialData: TemplateSetRow[]
  userRole: AdminRole
}

const columns: ColumnDef<TemplateSetRow>[] = [
  {
    id: 'thumbnail',
    header: '커버',
    enableSorting: false,
    meta: { mobileLabel: '커버' },
    cell: ({ row }) =>
      row.original.coverThumbnail ? (
        <img
          src={row.original.coverThumbnail}
          alt={row.original.name}
          className="h-10 w-10 rounded-[var(--radius-sm)] object-cover border border-[var(--color-border)]"
        />
      ) : (
        <div className="h-10 w-10 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-disabled)]">
          없음
        </div>
      ),
  },
  {
    accessorKey: 'name',
    header: '세트 이름',
    enableSorting: true,
    meta: { mobileLabel: '이름' },
  },
  {
    accessorKey: 'templateCount',
    header: '템플릿',
    enableSorting: true,
    meta: { mobileLabel: '템플릿 수' },
    cell: ({ row }) => (
      <span className="tabular-nums text-right block">{row.original.templateCount}개</span>
    ),
  },
  {
    accessorKey: 'createdAt',
    header: '등록일',
    enableSorting: true,
    meta: { mobileLabel: '등록일' },
    cell: ({ row }) => new Date(row.original.createdAt).toLocaleDateString('ko-KR'),
  },
]

export function TemplateSetListClient({ initialData, userRole }: TemplateSetListClientProps) {
  const router = useRouter()
  const [data, setData] = React.useState<TemplateSetRow[]>(initialData)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const isSuperadmin = userRole === 'superadmin'

  const handleDelete = React.useCallback(async () => {
    await Promise.all(
      selectedIds.map(async (id) => {
        const res = await fetch(`/api/template-sets/${id}`, { method: 'DELETE' })
        if (!res.ok && res.status !== 204) {
          const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
          throw new Error(json.error?.message ?? '삭제 실패')
        }
      }),
    )
    setData((prev) => prev.filter((r) => !selectedIds.includes(r.id)))
    setSelectedIds([])
    router.refresh()
  }, [selectedIds, router])

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">템플릿 세트 관리</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            여러 템플릿을 묶어 세트로 관리합니다.
          </p>
        </div>
        <Link
          href="/template-sets/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />새 세트
        </Link>
      </div>

      {/* 빈 상태 */}
      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-[var(--color-text)]">등록된 세트가 없습니다</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            템플릿을 묶어 세트를 만들어 보세요.
          </p>
          <Link
            href="/template-sets/new"
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)]"
          >
            <Plus className="size-4" aria-hidden="true" />새 세트 추가
          </Link>
        </div>
      )}

      {/* 테이블 */}
      {data.length > 0 && (
        <DataTable
          data={data}
          columns={columns}
          rowKey={(r) => r.id}
          selectable={isSuperadmin}
          selectedRowIds={selectedIds}
          onSelectionChange={isSuperadmin ? setSelectedIds : undefined}
          onRowClick={(r) => router.push(`/template-sets/${r.id}`)}
          keyboardNavigation
          emptyState={
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="font-medium text-[var(--color-text)]">검색 결과가 없습니다</p>
            </div>
          }
        />
      )}

      {/* 벌크 액션 바 */}
      {isSuperadmin && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          actions={[
            {
              id: 'delete',
              label: '선택 삭제',
              variant: 'destructive',
              handler: handleDelete,
            },
          ]}
        />
      )}
    </div>
  )
}
