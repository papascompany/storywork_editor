'use client'

/**
 * FormatListClient — 판형 목록 클라이언트 컴포넌트
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

export interface FormatRow {
  id: string
  name: string
  widthMm: number
  heightMm: number
  dpi: number
  bleedMm: number
  safeMm: number
  templateCount: number
  createdAt: string
}

interface FormatListClientProps {
  initialData: FormatRow[]
  userRole: AdminRole
}

const columns: ColumnDef<FormatRow>[] = [
  {
    accessorKey: 'name',
    header: '판형 이름',
    enableSorting: true,
    meta: { mobileLabel: '이름' },
  },
  {
    id: 'dimensions',
    header: '크기',
    enableSorting: false,
    meta: { mobileLabel: '크기 (mm)' },
    cell: ({ row }) => `${row.original.widthMm} × ${row.original.heightMm} mm`,
  },
  {
    accessorKey: 'dpi',
    header: 'DPI',
    enableSorting: true,
    meta: { mobileLabel: 'DPI' },
  },
  {
    accessorKey: 'bleedMm',
    header: 'Bleed (mm)',
    enableSorting: false,
    meta: { mobileLabel: 'Bleed' },
    // 모바일에서는 숨김 처리 — mobileLabel 없으면 표시
  },
  {
    accessorKey: 'safeMm',
    header: 'Safe (mm)',
    enableSorting: false,
    meta: { mobileLabel: 'Safe' },
  },
  {
    accessorKey: 'templateCount',
    header: '템플릿',
    enableSorting: true,
    meta: { mobileLabel: '템플릿 수' },
    cell: ({ row }) => (
      <span className="tabular-nums text-right block">{row.original.templateCount}</span>
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

export function FormatListClient({ initialData, userRole }: FormatListClientProps) {
  const router = useRouter()
  const [data, setData] = React.useState<FormatRow[]>(initialData)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const isSuperadmin = userRole === 'superadmin'

  const handleDelete = React.useCallback(async () => {
    // 사용 중인 판형 확인 (templateCount > 0)
    const inUse = selectedIds.filter((id) => {
      const row = data.find((r) => r.id === id)
      return (row?.templateCount ?? 0) > 0
    })

    if (inUse.length > 0) {
      const inUseNames = inUse.map((id) => data.find((r) => r.id === id)?.name ?? id).join(', ')
      // BulkActionBar의 ConfirmDialog 이후 실행되므로 window.confirm은 추가 사용 안 함
      // 대신 toast 메시지로 안내 후 deletable 것만 진행
      const deletable = selectedIds.filter((id) => !inUse.includes(id))

      if (deletable.length === 0) {
        throw new Error(`선택한 판형 모두 사용 중입니다 (${inUseNames}). 삭제할 수 없습니다.`)
      }

      // deletable 것만 삭제
      await Promise.all(
        deletable.map(async (id) => {
          const res = await fetch(`/api/formats/${id}`, { method: 'DELETE' })
          if (!res.ok && res.status !== 204) {
            const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
            throw new Error(json.error?.message ?? '삭제 실패')
          }
        }),
      )

      setData((prev) => prev.filter((r) => !deletable.includes(r.id)))
      setSelectedIds([])
      router.refresh()
      return
    }

    // 전체 삭제
    await Promise.all(
      selectedIds.map(async (id) => {
        const res = await fetch(`/api/formats/${id}`, { method: 'DELETE' })
        if (!res.ok && res.status !== 204) {
          const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
          throw new Error(json.error?.message ?? '삭제 실패')
        }
      }),
    )

    setData((prev) => prev.filter((r) => !selectedIds.includes(r.id)))
    setSelectedIds([])
    router.refresh()
  }, [selectedIds, data, router])

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">판형 관리</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            인쇄 판형을 등록하고 관리합니다.
          </p>
        </div>
        <Link
          href="/formats/new"
          className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden="true" />새 판형
        </Link>
      </div>

      {/* 빈 상태 */}
      {data.length === 0 && (
        <div className="flex flex-col items-center justify-center rounded-[var(--radius-lg)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] py-16 text-center">
          <p className="text-base font-medium text-[var(--color-text)]">등록된 판형이 없습니다</p>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            새 판형을 추가하거나 프리셋에서 시작해 보세요.
          </p>
          <Link
            href="/formats/new"
            className="mt-4 inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)]"
          >
            <Plus className="size-4" aria-hidden="true" />새 판형 추가
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
          onRowClick={(r) => router.push(`/formats/${r.id}`)}
          keyboardNavigation
          emptyState={
            <div className="flex flex-col items-center gap-2 py-8">
              <p className="font-medium text-[var(--color-text)]">검색 결과가 없습니다</p>
            </div>
          }
        />
      )}

      {/* 벌크 액션 바 — superadmin 만 */}
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
