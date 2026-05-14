'use client'

/**
 * TemplateListClient — 템플릿 목록 클라이언트 컴포넌트
 *
 * DataTable + BulkActionBar 조합.
 * superadmin 만 선택 삭제 가능.
 */

import type { ColumnDef } from '@tanstack/react-table'
import { Plus } from 'lucide-react'
import Image from 'next/image'
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
        <div
          className="relative h-10 w-10 overflow-hidden"
          style={{
            borderRadius: 'var(--mkt-rounded-sm)',
            border: '1px solid var(--mkt-hairline)',
          }}
        >
          <Image
            src={row.original.thumbnail}
            alt={row.original.name}
            fill
            sizes="40px"
            className="object-cover"
          />
        </div>
      ) : (
        <div
          className="h-10 w-10 flex items-center justify-center"
          style={{
            borderRadius: 'var(--mkt-rounded-sm)',
            border: '1px solid var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-surface-soft)',
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '11px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
          }}
        >
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
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '2px 8px',
          borderRadius: 'var(--mkt-rounded-full)',
          backgroundColor: 'var(--mkt-block-lilac)',
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '11px',
          color: 'var(--mkt-ink)',
        }}
      >
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
            ADMIN / TEMPLATES / 03
          </p>
          <h1
            className="mkt-display-lg"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-sm)' }}
          >
            템플릿 관리
          </h1>
          <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
            페이지 레이아웃 템플릿과 슬롯을 등록하고 관리합니다.
          </p>
        </div>
        <Link
          href="/templates/new"
          className="mkt-btn-primary"
          style={{ gap: '8px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Plus className="size-4" aria-hidden="true" />새 템플릿
        </Link>
      </header>

      {/* 필터 */}
      <div className="mb-5 flex flex-wrap gap-3">
        <select
          value={filterFormatId}
          onChange={(e) => setFilterFormatId(e.target.value)}
          style={{
            borderRadius: 'var(--mkt-rounded-md)',
            border: '1px solid var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-canvas)',
            padding: '8px 12px',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            outline: 'none',
            cursor: 'pointer',
          }}
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

      {/* 빈 상태 — pastel block */}
      {data.length === 0 && (
        <section
          className="mkt-block mkt-block-mint flex flex-col items-center justify-center text-center"
          style={{ minHeight: '240px' }}
        >
          <p
            className="mkt-headline"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-xs)' }}
          >
            등록된 템플릿이 없습니다
          </p>
          <p
            className="mkt-body-sm"
            style={{ color: 'var(--mkt-ink)', opacity: 0.55, marginBottom: 'var(--mkt-space-xl)' }}
          >
            새 템플릿을 추가해 슬롯을 정의해 보세요.
          </p>
          <Link
            href="/templates/new"
            className="mkt-btn-primary"
            style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
          >
            <Plus className="size-4" aria-hidden="true" />새 템플릿 추가
          </Link>
        </section>
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
