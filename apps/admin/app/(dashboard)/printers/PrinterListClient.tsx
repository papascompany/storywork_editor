'use client'

/**
 * PrinterListClient — 인쇄소 프로필 목록 클라이언트 컴포넌트
 *
 * DataTable + BulkActionBar 조합.
 * superadmin 만 선택 삭제 가능. isSystem=true 는 삭제 불가.
 */

import type { ColumnDef } from '@tanstack/react-table'
import { Printer, Plus } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { BulkActionBar } from '../../../src/components/bulk-action-bar/BulkActionBar'
import { DataTable } from '../../../src/components/data-table/DataTable'
import type { AdminRole } from '../../../src/lib/auth'

export interface PrinterProfileRow {
  id: string
  slug: string
  name: string
  formats: string[]
  maxPages: number | null
  isSystem: boolean
  isActive: boolean
  colorSpaces: string[]
  updatedAt: string
}

interface PrinterListClientProps {
  initialData: PrinterProfileRow[]
  userRole: AdminRole
}

const columns: ColumnDef<PrinterProfileRow>[] = [
  {
    accessorKey: 'name',
    header: '인쇄소 이름',
    enableSorting: true,
    meta: { mobileLabel: '이름' },
    cell: ({ row }) => (
      <span className="flex items-center gap-1.5">
        {row.original.name}
        {row.original.isSystem && (
          <span
            style={{
              display: 'inline-block',
              padding: '1px 6px',
              borderRadius: '4px',
              fontSize: '10px',
              fontWeight: 540,
              backgroundColor: 'var(--nike-canvas)',
              border: '1px solid var(--nike-hairline)',
              color: 'var(--nike-mute)',
            }}
          >
            시스템
          </span>
        )}
      </span>
    ),
  },
  {
    accessorKey: 'slug',
    header: '슬러그',
    enableSorting: false,
    meta: { mobileLabel: '슬러그' },
    cell: ({ row }) => (
      <span
        style={{
          fontFamily: 'var(--nike-font-mono)',
          fontSize: '12px',
          color: 'var(--nike-mute)',
        }}
      >
        {row.original.slug}
      </span>
    ),
  },
  {
    id: 'formats',
    header: '판형',
    enableSorting: false,
    meta: { mobileLabel: '판형' },
    cell: ({ row }) =>
      row.original.formats.length === 0
        ? '모두'
        : row.original.formats.slice(0, 3).join(', ') +
          (row.original.formats.length > 3 ? ` +${row.original.formats.length - 3}` : ''),
  },
  {
    accessorKey: 'maxPages',
    header: '최대 페이지',
    enableSorting: false,
    meta: { mobileLabel: '최대 p' },
    cell: ({ row }) =>
      row.original.maxPages == null ? '제한 없음' : String(row.original.maxPages),
  },
  {
    id: 'colorSpaces',
    header: '색공간',
    enableSorting: false,
    meta: { mobileLabel: '색공간' },
    cell: ({ row }) => row.original.colorSpaces.join(' / ').toUpperCase(),
  },
  {
    accessorKey: 'isActive',
    header: '활성',
    enableSorting: false,
    meta: { mobileLabel: '활성' },
    cell: ({ row }) => (
      <span
        style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: row.original.isActive ? 'var(--nike-lime)' : 'var(--nike-hairline)',
        }}
        title={row.original.isActive ? '활성' : '비활성'}
        aria-label={row.original.isActive ? '활성' : '비활성'}
      />
    ),
  },
  {
    accessorKey: 'updatedAt',
    header: '수정일',
    enableSorting: true,
    meta: { mobileLabel: '수정일' },
    cell: ({ row }) => new Date(row.original.updatedAt).toLocaleDateString('ko-KR'),
  },
]

export function PrinterListClient({ initialData, userRole }: PrinterListClientProps) {
  const router = useRouter()
  const [data, setData] = React.useState<PrinterProfileRow[]>(initialData)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const isSuperadmin = userRole === 'superadmin'

  const handleDelete = React.useCallback(async () => {
    // isSystem=true 항목 필터
    const systemItems = selectedIds.filter((id) => data.find((r) => r.id === id)?.isSystem)
    if (systemItems.length > 0) {
      const names = systemItems.map((id) => data.find((r) => r.id === id)?.name ?? id).join(', ')
      const deletable = selectedIds.filter((id) => !systemItems.includes(id))

      if (deletable.length === 0) {
        throw new Error(`선택한 프로필은 모두 시스템 프리셋입니다 (${names}). 삭제할 수 없습니다.`)
      }

      await Promise.all(
        deletable.map(async (id) => {
          const res = await fetch(`/api/admin/printers/${id}`, { method: 'DELETE' })
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

    await Promise.all(
      selectedIds.map(async (id) => {
        const res = await fetch(`/api/admin/printers/${id}`, { method: 'DELETE' })
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
    <div className="nike-page">
      {/* ── Nike 헤더 ── */}
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="nike-heading-xl">인쇄소 프로필</h1>
          <p className="nike-caption-md mt-1">인쇄소 사양 프리셋을 등록하고 관리합니다.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/printers/new" className="nike-btn-primary">
            <Plus className="size-4" aria-hidden="true" />새 인쇄소
          </Link>
        </div>
      </header>

      {/* 빈 상태 */}
      {data.length === 0 && (
        <div
          style={{
            backgroundColor: 'var(--nike-canvas)',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '12px',
            minHeight: '240px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            padding: '48px 24px',
          }}
        >
          <Printer
            style={{ width: '40px', height: '40px', color: 'var(--nike-mute)', opacity: 0.4 }}
            aria-hidden="true"
          />
          <p
            style={{
              fontFamily: 'var(--nike-font-display)',
              fontSize: '20px',
              fontWeight: 500,
              color: 'var(--nike-ink)',
            }}
          >
            등록된 인쇄소 프로필이 없습니다
          </p>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              color: 'var(--nike-mute)',
            }}
          >
            새 인쇄소 프로필을 추가해 보세요.
          </p>
          <Link href="/printers/new" className="nike-btn-primary" style={{ marginTop: '8px' }}>
            <Plus className="size-4" aria-hidden="true" />새 인쇄소 추가
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
          onRowClick={(r) => router.push(`/printers/${r.id}`)}
          keyboardNavigation
          emptyState={
            <div className="flex flex-col items-center gap-2 py-8">
              <p
                style={{
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '14px',
                  fontWeight: 540,
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                }}
              >
                검색 결과가 없습니다
              </p>
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
