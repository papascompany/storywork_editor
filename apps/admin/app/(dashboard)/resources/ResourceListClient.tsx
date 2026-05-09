'use client'

/**
 * ResourceListClient — 리소스 목록 클라이언트 컴포넌트
 *
 * DataTable + BulkActionBar 조합.
 * 서버 페이지네이션, 필터, 검색, 일괄 액션.
 */

import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Filter, Plus, Search } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { BulkActionBar } from '../../../src/components/bulk-action-bar/BulkActionBar'
import { DataTable } from '../../../src/components/data-table/DataTable'
import type { AdminRole } from '../../../src/lib/auth'
import type {
  ResourceListFacets,
  ResourceListResponse,
  ResourceRow,
} from '../../../src/lib/schemas/resource'

// ─── 상태 배지 ───────────────────────────────────────────────────────────────

const STATUS_STYLE: Record<string, { label: string; className: string }> = {
  draft: {
    label: '초안',
    className:
      'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
  },
  review: { label: '검수중', className: 'bg-amber-100 text-amber-700' },
  published: { label: '게시됨', className: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨', className: 'bg-red-100 text-red-700' },
}

export const KIND_LABELS: Record<string, string> = {
  pose: '포즈',
  background: '배경',
  'mise-en-scene': '미장센',
  prop: '소품',
  'speech-bubble': '말풍선',
  'word-fx': '워드효과',
  decoration: '꾸미기',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? { label: status, className: 'bg-gray-100 text-gray-700' }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${style.className}`}
    >
      {style.label}
    </span>
  )
}

function KindBadge({ kind }: { kind: string }) {
  const label = KIND_LABELS[kind] ?? kind
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
      {label}
    </span>
  )
}

// ─── 테이블 컬럼 ─────────────────────────────────────────────────────────────

const columns: ColumnDef<ResourceRow>[] = [
  {
    id: 'thumbnail',
    header: '썸네일',
    enableSorting: false,
    size: 80,
    cell: ({ row }) => {
      const thumbUrl =
        row.original.thumbUrl ?? (row.original.variants as Record<string, string> | null)?.['thumb']
      return thumbUrl ? (
        <img
          src={thumbUrl}
          alt={row.original.slug}
          className="size-16 object-contain rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)]"
          loading="lazy"
        />
      ) : (
        <div className="size-16 flex items-center justify-center rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] text-xs text-[var(--color-text-muted)]">
          없음
        </div>
      )
    },
    meta: { mobileLabel: '썸네일' },
  },
  {
    accessorKey: 'slug',
    header: 'Slug',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="font-mono text-xs text-[var(--color-text)] max-w-[180px] truncate block">
        {row.original.slug}
      </span>
    ),
    meta: { mobileLabel: 'Slug' },
  },
  {
    accessorKey: 'kind',
    header: '종류',
    enableSorting: true,
    cell: ({ row }) => <KindBadge kind={row.original.kind} />,
    meta: { mobileLabel: '종류' },
  },
  {
    accessorKey: 'status',
    header: '상태',
    enableSorting: true,
    cell: ({ row }) => <StatusBadge status={row.original.status} />,
    meta: { mobileLabel: '상태' },
  },
  {
    id: 'action',
    header: '액션',
    enableSorting: false,
    cell: ({ row }) => {
      const action = (row.original.meta as Record<string, unknown>)?.['action'] as
        | string
        | undefined
      return action ? (
        <span className="text-xs text-[var(--color-text)]">{action}</span>
      ) : (
        <span className="text-xs text-[var(--color-text-disabled)]">-</span>
      )
    },
    meta: { mobileLabel: '액션' },
  },
  {
    id: 'lowDpi',
    header: 'DPI',
    enableSorting: false,
    size: 60,
    cell: ({ row }) =>
      row.original.lowDpi ? (
        <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 whitespace-nowrap">
          저해상도
        </span>
      ) : null,
    meta: { mobileLabel: 'DPI 경고' },
  },
  {
    accessorKey: 'createdAt',
    header: '등록일',
    enableSorting: true,
    cell: ({ row }) => (
      <span className="text-xs text-[var(--color-text-muted)] whitespace-nowrap">
        {new Date(row.original.createdAt).toLocaleDateString('ko-KR')}
      </span>
    ),
    meta: { mobileLabel: '등록일' },
  },
]

// ─── Props ───────────────────────────────────────────────────────────────────

interface ResourceListClientProps {
  initialData: ResourceRow[]
  initialTotalCount: number
  initialFacets: ResourceListFacets
  userRole: AdminRole
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function ResourceListClient({
  initialData,
  initialTotalCount,
  initialFacets,
  userRole,
}: ResourceListClientProps) {
  const router = useRouter()

  // ── 상태 ──
  const [data, setData] = React.useState<ResourceRow[]>(initialData)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [facets, setFacets] = React.useState<ResourceListFacets>(initialFacets)
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [isLoading, setIsLoading] = React.useState(false)

  // 필터 상태
  const [search, setSearch] = React.useState('')
  const [filterKinds, setFilterKinds] = React.useState<string[]>([])
  const [filterStatus, setFilterStatus] = React.useState<string[]>([])
  const [filterLowDpi, setFilterLowDpi] = React.useState<boolean | null>(null)
  const [filterOwnerType, _setFilterOwnerType] = React.useState<string>('')

  // 페이지네이션
  const [pageIndex, setPageIndex] = React.useState(0)
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }])
  const PAGE_SIZE = 20

  const isSuperadmin = userRole === 'superadmin'
  const canEdit = userRole === 'superadmin' || userRole === 'curator'

  // ── 데이터 패치 ──
  const fetchData = React.useCallback(
    async (opts: {
      page?: number
      sort?: SortingState
      search?: string
      kinds?: string[]
      statuses?: string[]
      lowDpi?: boolean | null
      ownerType?: string
    }) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(opts.page ?? pageIndex))
        params.set('pageSize', String(PAGE_SIZE))

        const sortState = opts.sort ?? sorting
        const firstSort = sortState[0]
        if (firstSort) {
          params.set('sort', `${firstSort.id}:${firstSort.desc ? 'desc' : 'asc'}`)
        }

        const q = opts.search ?? search
        if (q) params.set('search', q)

        const kinds = opts.kinds ?? filterKinds
        kinds.forEach((k) => params.append('kind', k))

        const statuses = opts.statuses ?? filterStatus
        statuses.forEach((s) => params.append('status', s))

        const ld = opts.lowDpi !== undefined ? opts.lowDpi : filterLowDpi
        if (ld === true) params.set('lowDpi', 'true')
        else if (ld === false) params.set('lowDpi', 'false')

        const ot = opts.ownerType !== undefined ? opts.ownerType : filterOwnerType
        if (ot) params.set('ownerType', ot)

        const res = await fetch(`/api/resources?${params.toString()}`)
        if (!res.ok) throw new Error('목록 조회 실패')
        const json = (await res.json()) as ResourceListResponse
        setData(json.data)
        setTotalCount(json.totalCount)
        setFacets(json.facets)
      } catch (err) {
        console.error('[ResourceList] 데이터 로드 실패:', err)
      } finally {
        setIsLoading(false)
      }
    },
    [pageIndex, sorting, search, filterKinds, filterStatus, filterLowDpi, filterOwnerType],
  )

  // 검색 debounce
  const searchTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (val: string) => {
    setSearch(val)
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current)
    searchTimerRef.current = setTimeout(() => {
      setPageIndex(0)
      void fetchData({ search: val, page: 0 })
    }, 300)
  }

  // ── 일괄 액션 ──

  const handleBulkPublish = React.useCallback(async () => {
    const res = await fetch('/api/resources/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, action: 'publish' }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? '게시 실패')
    }
    setSelectedIds([])
    void fetchData({})
  }, [selectedIds, fetchData])

  const handleBulkReject = React.useCallback(async () => {
    const reason = window.prompt('거절 사유를 입력하세요 (5자 이상):')
    if (!reason || reason.trim().length < 5) throw new Error('거절 사유가 너무 짧습니다.')
    const res = await fetch('/api/resources/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, action: 'reject', reason }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? '거절 실패')
    }
    setSelectedIds([])
    void fetchData({})
  }, [selectedIds, fetchData])

  const handleBulkDelete = React.useCallback(async () => {
    const res = await fetch('/api/resources/bulk', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids: selectedIds, action: 'delete' }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? '삭제 실패')
    }
    setSelectedIds([])
    void fetchData({})
  }, [selectedIds, fetchData])

  // ── 필터 토글 ──

  const toggleKind = (kind: string) => {
    const next = filterKinds.includes(kind)
      ? filterKinds.filter((k) => k !== kind)
      : [...filterKinds, kind]
    setFilterKinds(next)
    setPageIndex(0)
    void fetchData({ kinds: next, page: 0 })
  }

  const toggleStatus = (status: string) => {
    const next = filterStatus.includes(status)
      ? filterStatus.filter((s) => s !== status)
      : [...filterStatus, status]
    setFilterStatus(next)
    setPageIndex(0)
    void fetchData({ statuses: next, page: 0 })
  }

  const ALL_STATUSES = ['draft', 'review', 'published', 'rejected']
  const ALL_KINDS = Object.keys(KIND_LABELS)

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">리소스 관리</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            포즈/배경/소품 등 관리자 등록 리소스를 검수하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/resources/review"
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 text-sm font-medium text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          >
            검수 큐
            {(facets.byStatus['draft'] ?? 0) + (facets.byStatus['review'] ?? 0) > 0 && (
              <span className="ml-1 inline-flex items-center justify-center size-5 text-xs rounded-full bg-amber-100 text-amber-700 font-semibold">
                {(facets.byStatus['draft'] ?? 0) + (facets.byStatus['review'] ?? 0)}
              </span>
            )}
          </Link>
          {canEdit && (
            <Link
              href="/resources/upload"
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2"
            >
              <Plus className="size-4" aria-hidden="true" />
              신규 업로드
            </Link>
          )}
        </div>
      </div>

      {/* 검색 + 필터 */}
      <div className="mb-6 flex flex-col gap-4">
        {/* 검색 */}
        <div className="relative max-w-md">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Slug, 태그, 액션 검색..."
            aria-label="리소스 검색"
            className="w-full pl-9 pr-4 py-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* 필터 칩 */}
        <div className="flex flex-wrap gap-2">
          <Filter
            className="size-4 text-[var(--color-text-muted)] shrink-0 mt-0.5"
            aria-hidden="true"
          />

          {/* 상태 */}
          {ALL_STATUSES.map((s) => {
            const count = facets.byStatus[s] ?? 0
            const isActive = filterStatus.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => toggleStatus(s)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                  isActive
                    ? 'bg-[var(--color-brand-500)] text-white border-transparent'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]'
                }`}
                aria-pressed={isActive}
              >
                {STATUS_STYLE[s]?.label ?? s}
                <span className="opacity-70">({count})</span>
              </button>
            )
          })}

          <div className="w-px h-5 bg-[var(--color-border)] self-center" role="separator" />

          {/* 종류 */}
          {ALL_KINDS.filter((k) => (facets.byKind[k] ?? 0) > 0).map((k) => {
            const count = facets.byKind[k] ?? 0
            const isActive = filterKinds.includes(k)
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                  isActive
                    ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] border-[var(--color-brand-300)]'
                    : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]'
                }`}
                aria-pressed={isActive}
              >
                {KIND_LABELS[k] ?? k}
                <span className="opacity-70">({count.toLocaleString()})</span>
              </button>
            )
          })}

          <div className="w-px h-5 bg-[var(--color-border)] self-center" role="separator" />

          {/* 저해상도 */}
          <button
            type="button"
            onClick={() => {
              const next = filterLowDpi === true ? null : true
              setFilterLowDpi(next)
              setPageIndex(0)
              void fetchData({ lowDpi: next, page: 0 })
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium border transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
              filterLowDpi === true
                ? 'bg-amber-100 text-amber-700 border-amber-300'
                : 'bg-[var(--color-surface)] text-[var(--color-text-muted)] border-[var(--color-border)] hover:bg-[var(--color-surface-muted)]'
            }`}
            aria-pressed={filterLowDpi === true}
          >
            저해상도만
          </button>
        </div>
      </div>

      {/* 총 건수 */}
      <p className="mb-3 text-sm text-[var(--color-text-muted)]">
        총 <strong className="text-[var(--color-text)]">{totalCount.toLocaleString()}</strong>건
      </p>

      {/* 테이블 */}
      <DataTable
        data={data}
        columns={columns}
        rowKey={(r) => r.id}
        pagination={{
          pageIndex,
          pageSize: PAGE_SIZE,
          totalCount,
          onChange: ({ pageIndex: pi }) => {
            setPageIndex(pi)
            void fetchData({ page: pi })
          },
        }}
        sorting={{
          state: sorting,
          onChange: (next) => {
            setSorting(next)
            setPageIndex(0)
            void fetchData({ sort: next, page: 0 })
          },
        }}
        selectable={canEdit}
        selectedRowIds={selectedIds}
        onSelectionChange={canEdit ? setSelectedIds : undefined}
        onRowClick={(r) => router.push(`/resources/${r.id}`)}
        isLoading={isLoading}
        keyboardNavigation
        emptyState={
          <div className="flex flex-col items-center gap-2 py-8">
            <p className="font-medium text-[var(--color-text)]">리소스가 없습니다</p>
            <p className="text-sm text-[var(--color-text-muted)]">
              필터를 초기화하거나 새 리소스를 업로드하세요.
            </p>
          </div>
        }
      />

      {/* 일괄 액션 바 */}
      {canEdit && (
        <BulkActionBar
          selectedCount={selectedIds.length}
          onClear={() => setSelectedIds([])}
          actions={[
            {
              id: 'publish',
              label: '일괄 게시',
              handler: handleBulkPublish,
            },
            {
              id: 'reject',
              label: '일괄 거절',
              handler: handleBulkReject,
            },
            ...(isSuperadmin
              ? [
                  {
                    id: 'delete' as const,
                    label: '일괄 삭제',
                    variant: 'destructive' as const,
                    handler: handleBulkDelete,
                  },
                ]
              : []),
          ]}
        />
      )}
    </div>
  )
}
