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
    <div className="p-6 lg:p-10" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      {/* 헤더 */}
      <header
        className="mb-10 flex items-end justify-between gap-6 flex-wrap"
        style={{
          paddingBottom: 'var(--mkt-space-lg)',
          borderBottom: '1px solid var(--mkt-hairline)',
        }}
      >
        <div>
          <p
            className="mkt-eyebrow"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.4,
              marginBottom: 'var(--mkt-space-sm)',
              fontSize: '12px',
            }}
          >
            ADMIN / FORMATS / 01
          </p>
          <h1
            className="mkt-display-lg"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-sm)' }}
          >
            판형 관리
          </h1>
          <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
            인쇄 판형을 등록하고 관리합니다.
          </p>
        </div>
        <Link
          href="/formats/new"
          className="mkt-btn-primary"
          style={{ gap: '8px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Plus className="size-4" aria-hidden="true" />새 판형
        </Link>
      </header>

      {/* 빈 상태 — pastel block */}
      {data.length === 0 && (
        <section
          className="mkt-block mkt-block-lime flex flex-col items-center justify-center text-center"
          style={{ minHeight: '240px' }}
        >
          <p
            className="mkt-headline"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-xs)' }}
          >
            등록된 판형이 없습니다
          </p>
          <p
            className="mkt-body-sm"
            style={{ color: 'var(--mkt-ink)', opacity: 0.55, marginBottom: 'var(--mkt-space-xl)' }}
          >
            새 판형을 추가하거나 프리셋에서 시작해 보세요.
          </p>
          <Link
            href="/formats/new"
            className="mkt-btn-primary"
            style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
          >
            <Plus className="size-4" aria-hidden="true" />새 판형 추가
          </Link>
        </section>
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
              <p
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 540,
                  color: 'var(--mkt-ink)',
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
