'use client'

/**
 * TemplateListClient — 템플릿 목록 클라이언트 컴포넌트
 *
 * DataTable + BulkActionBar 조합.
 * superadmin 만 선택 삭제 가능.
 */

import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { BulkActionBar } from '../../../src/components/bulk-action-bar/BulkActionBar'
import { DataTable } from '../../../src/components/data-table/DataTable'
import type { AdminRole } from '../../../src/lib/auth'

export interface TemplateRow {
  id: string
  name: string
  formatId: string
  formatName: string
  slotCount: number
  thumbnail: string | null
  createdAt: string
}

interface TemplateListClientProps {
  initialData: TemplateRow[]
  formats: { id: string; name: string }[]
  userRole: AdminRole
}

const columns: ColumnDef<TemplateRow>[] = [
  {
    id: 'thumbnail',
    header: '미리보기',
    enableSorting: false,
    meta: { mobileLabel: '미리보기' },
    cell: ({ row }) =>
      row.original.thumbnail ? (
        <img
          src={row.original.thumbnail}
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
    header: '템플릿 이름',
    enableSorting: true,
    meta: { mobileLabel: '이름' },
  },
  {
    accessorKey: 'formatName',
    header: '판형',
    enableSorting: false,
    meta: { mobileLabel: '판형' },
    cell: ({ row }) => (
      <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-[var(--color-brand-50)] text-[var(--color-brand-700)] border border-[var(--color-brand-200)]">
        {row.original.formatName}
      </span>
    ),
  },
  {
    accessorKey: 'slotCount',
    header: '슬롯',
    enableSorting: true,
    meta: { mobileLabel: '슬롯 수' },
    cell: ({ row }) => (
      <span className="tabular-nums text-right block">{row.original.slotCount}개</span>
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

export function TemplateListClient({ initialData, formats, userRole }: TemplateListClientProps) {
  const router = useRouter()
  const [data, setData] = React.useState<TemplateRow[]>(initialData)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [filterFormatId, setFilterFormatId] = React.useState('')
  const isSuperadmin = userRole === 'superadmin'

  const filteredData = React.useMemo(() => {
    return data.filter((row) => {
      if (filterFormatId && row.formatId !== filterFormatId) return false
      return true
    })
  }, [data, filterFormatId])

  const handleDelete = React.useCallback(async () => {
    await Promise.all(
      selectedIds.map(async (id) => {
        const res = await fetch(`/api/templates/${id}`, { method: 'DELETE' })
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
          <h1 className="text-2xl font-bold text-[var(--color-text)]">템플릿 관리</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            페이지 레이아웃 템플릿과 슬롯을 등록하고 관리합니다.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />새 템플릿
        </Link>
      </div>

      {/* 필터 */}
      <div className="mb-4 flex flex-wrap gap-3">
        <select
          value={filterFormatId}
          onChange={(e) => setFilterFormatId(e.target.value)}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          aria-label="판형 필터"
        >
          <option value="">모든 판형</option>
          {formats.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      </div>

      {/* 빈 상태 */}
      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-[var(--color-text)]">등록된 템플릿이 없습니다</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            새 템플릿을 추가해 슬롯을 정의해 보세요.
          </p>
          <Link
            href="/templates/new"
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)]"
          >
            <Plus className="size-4" aria-hidden="true" />새 템플릿 추가
          </Link>
        </div>
      )}

      {/* 테이블 */}
      {data.length > 0 && (
        <DataTable
          data={filteredData}
          columns={columns}
          rowKey={(r) => r.id}
          selectable={isSuperadmin}
          selectedRowIds={selectedIds}
          onSelectionChange={isSuperadmin ? setSelectedIds : undefined}
          onRowClick={(r) => router.push(`/templates/${r.id}`)}
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
