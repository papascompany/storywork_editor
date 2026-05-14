'use client'

/**
 * ResourceListClient — 리소스 목록 클라이언트 컴포넌트
 *
 * DataTable + BulkActionBar 조합.
 * 서버 페이지네이션, 필터, 검색, 일괄 액션.
 */

import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { Filter, Plus, Search } from 'lucide-react'
import Image from 'next/image'
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

const STATUS_STYLE: Record<string, { label: string; blockColor: string; textOpacity: number }> = {
  draft: { label: '초안', blockColor: 'var(--mkt-hairline-soft)', textOpacity: 0.6 },
  review: { label: '검수중', blockColor: 'var(--mkt-block-cream)', textOpacity: 1 },
  published: { label: '게시됨', blockColor: 'var(--mkt-block-mint)', textOpacity: 1 },
  rejected: { label: '거절됨', blockColor: 'var(--mkt-block-pink)', textOpacity: 1 },
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

const KIND_BLOCK_COLORS: Record<string, string> = {
  pose: 'var(--mkt-block-lilac)',
  background: 'var(--mkt-block-mint)',
  'mise-en-scene': 'var(--mkt-block-lime)',
  prop: 'var(--mkt-block-cream)',
  'speech-bubble': 'var(--mkt-block-coral)',
  'word-fx': 'var(--mkt-block-pink)',
  decoration: 'var(--mkt-block-lilac)',
}

function StatusBadge({ status }: { status: string }) {
  const style = STATUS_STYLE[status] ?? {
    label: status,
    blockColor: 'var(--mkt-hairline-soft)',
    textOpacity: 0.6,
  }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--mkt-rounded-full)',
        backgroundColor: style.blockColor,
        fontFamily: 'var(--mkt-font-sans)',
        fontSize: '12px',
        fontWeight: 480,
        color: 'var(--mkt-ink)',
        opacity: style.textOpacity,
        whiteSpace: 'nowrap',
      }}
    >
      {style.label}
    </span>
  )
}

function KindBadge({ kind }: { kind: string }) {
  const label = KIND_LABELS[kind] ?? kind
  const blockColor = KIND_BLOCK_COLORS[kind] ?? 'var(--mkt-surface-soft)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--mkt-rounded-full)',
        backgroundColor: blockColor,
        fontFamily: 'var(--mkt-font-mono)',
        fontSize: '11px',
        fontWeight: 400,
        letterSpacing: '0.3px',
        color: 'var(--mkt-ink)',
      }}
    >
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
        <div
          className="relative size-16 overflow-hidden"
          style={{
            borderRadius: 'var(--mkt-rounded-md)',
            backgroundColor: 'var(--mkt-surface-soft)',
          }}
        >
          <Image
            src={thumbUrl}
            alt={row.original.slug}
            fill
            sizes="64px"
            className="object-contain"
          />
        </div>
      ) : (
        <div
          className="size-16 flex items-center justify-center"
          style={{
            borderRadius: 'var(--mkt-rounded-md)',
            backgroundColor: 'var(--mkt-surface-soft)',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '12px',
            color: 'var(--mkt-ink)',
            opacity: 0.35,
          }}
        >
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
      <span
        style={{
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '12px',
          color: 'var(--mkt-ink)',
          display: 'block',
          maxWidth: '180px',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
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
        <span
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: 'var(--mkt-ink)',
          }}
        >
          {action}
        </span>
      ) : (
        <span
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: 'var(--mkt-ink)',
            opacity: 0.3,
          }}
        >
          -
        </span>
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
        <span
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            padding: '2px 8px',
            borderRadius: 'var(--mkt-rounded-full)',
            backgroundColor: 'var(--mkt-block-coral)',
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '11px',
            fontWeight: 400,
            color: 'var(--mkt-ink)',
            whiteSpace: 'nowrap',
          }}
        >
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
      <span
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '13px',
          color: 'var(--mkt-ink)',
          opacity: 0.55,
          whiteSpace: 'nowrap',
        }}
      >
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

  // ── 필터 칩 공통 스타일 ──
  const chipBase: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '6px',
    padding: '4px 12px',
    borderRadius: 'var(--mkt-rounded-full)',
    border: '1px solid var(--mkt-hairline)',
    backgroundColor: 'var(--mkt-canvas)',
    fontFamily: 'var(--mkt-font-sans)',
    fontSize: '12px',
    fontWeight: 330,
    color: 'var(--mkt-ink)',
    cursor: 'pointer',
    transition: 'all 100ms ease',
  }

  const chipActive: React.CSSProperties = {
    ...chipBase,
    backgroundColor: 'var(--mkt-ink)',
    color: 'var(--mkt-canvas)',
    borderColor: 'var(--mkt-ink)',
    fontWeight: 480,
  }

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
            Admin / 리소스
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
            리소스 관리
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
            포즈/배경/소품 등 관리자 등록 리소스를 검수하고 관리합니다.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/resources/review"
            className="mkt-btn-secondary"
            style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
          >
            검수 큐
            {(facets.byStatus['draft'] ?? 0) + (facets.byStatus['review'] ?? 0) > 0 && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '20px',
                  height: '20px',
                  borderRadius: 'var(--mkt-rounded-full)',
                  backgroundColor: 'var(--mkt-block-coral)',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '11px',
                  fontWeight: 540,
                  color: 'var(--mkt-ink)',
                }}
              >
                {(facets.byStatus['draft'] ?? 0) + (facets.byStatus['review'] ?? 0)}
              </span>
            )}
          </Link>
          {canEdit && (
            <Link
              href="/resources/upload"
              className="mkt-btn-primary"
              style={{ gap: '8px', display: 'inline-flex', alignItems: 'center' }}
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
            className="absolute left-3 top-1/2 -translate-y-1/2 size-4"
            aria-hidden="true"
            style={{ color: 'var(--mkt-ink)', opacity: 0.4 }}
          />
          <input
            type="search"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Slug, 태그, 액션 검색..."
            aria-label="리소스 검색"
            style={{
              width: '100%',
              paddingLeft: '36px',
              paddingRight: '16px',
              paddingTop: '10px',
              paddingBottom: '10px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-canvas)',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 320,
              color: 'var(--mkt-ink)',
              outline: 'none',
            }}
          />
        </div>

        {/* 필터 칩 */}
        <div className="flex flex-wrap gap-2 items-center">
          <Filter
            className="size-4 shrink-0"
            aria-hidden="true"
            style={{ color: 'var(--mkt-ink)', opacity: 0.4 }}
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
                style={isActive ? chipActive : chipBase}
                className="focus-visible:outline-none focus-visible:ring-2"
                aria-pressed={isActive}
              >
                {STATUS_STYLE[s]?.label ?? s}
                <span style={{ opacity: 0.6 }}>({count})</span>
              </button>
            )
          })}

          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: 'var(--mkt-hairline)',
              alignSelf: 'center',
            }}
            role="separator"
          />

          {/* 종류 */}
          {ALL_KINDS.filter((k) => (facets.byKind[k] ?? 0) > 0).map((k) => {
            const count = facets.byKind[k] ?? 0
            const isActive = filterKinds.includes(k)
            return (
              <button
                key={k}
                type="button"
                onClick={() => toggleKind(k)}
                style={isActive ? chipActive : chipBase}
                className="focus-visible:outline-none focus-visible:ring-2"
                aria-pressed={isActive}
              >
                {KIND_LABELS[k] ?? k}
                <span style={{ opacity: 0.6 }}>({count.toLocaleString()})</span>
              </button>
            )
          })}

          <div
            style={{
              width: '1px',
              height: '20px',
              backgroundColor: 'var(--mkt-hairline)',
              alignSelf: 'center',
            }}
            role="separator"
          />

          {/* 저해상도 */}
          <button
            type="button"
            onClick={() => {
              const next = filterLowDpi === true ? null : true
              setFilterLowDpi(next)
              setPageIndex(0)
              void fetchData({ lowDpi: next, page: 0 })
            }}
            style={
              filterLowDpi === true
                ? {
                    ...chipActive,
                    backgroundColor: 'var(--mkt-block-coral)',
                    color: 'var(--mkt-ink)',
                    borderColor: 'transparent',
                  }
                : chipBase
            }
            className="focus-visible:outline-none focus-visible:ring-2"
            aria-pressed={filterLowDpi === true}
          >
            저해상도만
          </button>
        </div>
      </div>

      {/* 총 건수 */}
      <p
        style={{
          marginBottom: '12px',
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '14px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.55,
        }}
      >
        총{' '}
        <strong style={{ fontWeight: 540, opacity: 1, color: 'var(--mkt-ink)' }}>
          {totalCount.toLocaleString()}
        </strong>
        건
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
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '17px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
                marginBottom: '4px',
              }}
            >
              리소스가 없습니다
            </p>
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.55,
              }}
            >
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
