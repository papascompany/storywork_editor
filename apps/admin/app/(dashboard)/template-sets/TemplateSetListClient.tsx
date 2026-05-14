'use client'

/**
 * TemplateSetListClient — 템플릿 세트 목록 클라이언트 컴포넌트
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
        <div
          className="relative h-10 w-10 overflow-hidden"
          style={{
            borderRadius: 'var(--mkt-rounded-sm)',
            border: '1px solid var(--mkt-hairline)',
          }}
        >
          <Image
            src={row.original.coverThumbnail}
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
    <div className="p-6 lg:p-10" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      {/* 헤더 */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <p
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.4,
              marginBottom: '6px',
            }}
          >
            Admin / 템플릿 세트
          </p>
          <h1
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'clamp(24px, 3.5vw, 32px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--mkt-ink)',
              marginBottom: '6px',
            }}
          >
            템플릿 세트 관리
          </h1>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.55,
            }}
          >
            여러 템플릿을 묶어 세트로 관리합니다.
          </p>
        </div>
        <Link
          href="/template-sets/new"
          className="mkt-btn-primary"
          style={{ gap: '8px', display: 'inline-flex', alignItems: 'center', flexShrink: 0 }}
        >
          <Plus className="size-4" aria-hidden="true" />새 세트
        </Link>
      </div>

      {/* 빈 상태 */}
      {data.length === 0 && (
        <div
          className="flex flex-col items-center justify-center py-16 text-center"
          style={{
            borderRadius: 'var(--mkt-rounded-lg)',
            border: '1.5px dashed var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-canvas)',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '17px',
              fontWeight: 540,
              letterSpacing: '-0.26px',
              color: 'var(--mkt-ink)',
              marginBottom: '6px',
            }}
          >
            등록된 세트가 없습니다
          </p>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.55,
              marginBottom: '20px',
            }}
          >
            템플릿을 묶어 세트를 만들어 보세요.
          </p>
          <Link
            href="/template-sets/new"
            className="mkt-btn-primary"
            style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
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
