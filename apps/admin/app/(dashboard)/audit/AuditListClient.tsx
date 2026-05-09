'use client'

/**
 * AuditListClient — 감사 로그 목록 클라이언트 컴포넌트
 *
 * DataTable + 필터 사이드바 + JSON diff 펼침 row.
 * audit 는 read-only — 수정/삭제 액션 없음.
 */

import type { ColumnDef, SortingState } from '@tanstack/react-table'
import { ChevronDown, ChevronRight, Search, X } from 'lucide-react'
import * as React from 'react'

import { AuditDiffViewer } from '../../../src/components/audit-diff-viewer/AuditDiffViewer'
import { DataTable } from '../../../src/components/data-table/DataTable'
import type { AuditListResponse, AuditLogRow } from '../../api/audit/route'

// ─── 배지 스타일 ──────────────────────────────────────────────────────────────

const ACTION_STYLE: Record<string, { label: string; className: string }> = {
  create: { label: '생성', className: 'bg-green-100 text-green-700' },
  update: { label: '수정', className: 'bg-blue-100 text-blue-700' },
  delete: { label: '삭제', className: 'bg-red-100 text-red-700' },
  publish: { label: '게시', className: 'bg-green-100 text-green-700' },
  reject: { label: '거절', className: 'bg-orange-100 text-orange-700' },
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  format: 'Format',
  resource: 'Resource',
  template: 'Template',
  templateset: 'TemplateSet',
  user: 'User',
}

function ActionBadge({ action }: { action: string }) {
  const style = ACTION_STYLE[action] ?? { label: action, className: 'bg-gray-100 text-gray-700' }
  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 text-xs font-medium rounded-full ${style.className}`}
    >
      {style.label}
    </span>
  )
}

// ─── 상대 시간 ────────────────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return `${sec}초 전`
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}분 전`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}시간 전`
  const day = Math.floor(hr / 24)
  if (day < 30) return `${day}일 전`
  return new Date(iso).toLocaleDateString('ko-KR')
}

// ─── 요약 텍스트 ─────────────────────────────────────────────────────────────

function makeSummary(row: AuditLogRow): string {
  const payload = row.payload
  const meta = (payload.meta ?? {}) as Record<string, unknown>
  const diff = payload.diff as Record<string, { before: unknown; after: unknown }> | undefined

  // 이름/slug/title 이 있으면 우선 표시
  const label = (meta['name'] ?? meta['slug'] ?? meta['title'] ?? row.entityId) as string

  if (diff) {
    const fields = Object.keys(diff).join(', ')
    return `${label} (${fields} 변경)`
  }
  if (meta['name']) return `"${meta['name']}" ${ACTION_STYLE[row.action]?.label ?? row.action}`
  return label
}

// ─── 필터 상태 타입 ───────────────────────────────────────────────────────────

interface FilterState {
  entityTypes: string[]
  actions: string[]
  preset: 'all' | '24h' | '7d' | '30d'
  search: string
}

const INITIAL_FILTER: FilterState = {
  entityTypes: [],
  actions: [],
  preset: 'all',
  search: '',
}

const PRESET_LABELS: Record<FilterState['preset'], string> = {
  all: '전체',
  '24h': '최근 24시간',
  '7d': '최근 7일',
  '30d': '최근 30일',
}

function presetToDates(preset: FilterState['preset']): { from?: string; to?: string } {
  if (preset === 'all') return {}
  const now = new Date()
  const msMap = { '24h': 86400000, '7d': 604800000, '30d': 2592000000 }
  return { from: new Date(now.getTime() - msMap[preset]).toISOString() }
}

// ─── 컴포넌트 Props ───────────────────────────────────────────────────────────

export interface AuditListClientProps {
  initialData: AuditLogRow[]
  initialTotalCount: number
}

// ─── 메인 컴포넌트 ────────────────────────────────────────────────────────────

export function AuditListClient({ initialData, initialTotalCount }: AuditListClientProps) {
  const [data, setData] = React.useState<AuditLogRow[]>(initialData)
  const [totalCount, setTotalCount] = React.useState(initialTotalCount)
  const [isLoading, setIsLoading] = React.useState(false)
  const [pageIndex, setPageIndex] = React.useState(0)
  const pageSize = 50
  const [sorting, setSorting] = React.useState<SortingState>([{ id: 'createdAt', desc: true }])
  const [filter, setFilter] = React.useState<FilterState>(INITIAL_FILTER)
  const [expandedId, setExpandedId] = React.useState<string | null>(null)

  // ── 필터 토글 헬퍼 ──
  function toggleItem<T>(arr: T[], item: T): T[] {
    return arr.includes(item) ? arr.filter((x) => x !== item) : [...arr, item]
  }

  // ── API fetch ──
  const fetchLogs = React.useCallback(
    async (pg: number, f: FilterState, s: SortingState) => {
      setIsLoading(true)
      try {
        const params = new URLSearchParams()
        params.set('page', String(pg))
        params.set('pageSize', String(pageSize))
        if (f.entityTypes.length > 0) params.set('entityType', f.entityTypes.join(','))
        if (f.actions.length > 0) params.set('action', f.actions.join(','))
        if (f.search) params.set('search', f.search)
        const { from, to } = presetToDates(f.preset)
        if (from) params.set('from', from)
        if (to) params.set('to', to)
        const sortS = s[0]
        if (sortS) {
          params.set('sort', `${sortS.id}:${sortS.desc ? 'desc' : 'asc'}`)
        }

        const res = await fetch(`/api/audit?${params.toString()}`)
        if (!res.ok) throw new Error('fetch 실패')
        const json = (await res.json()) as AuditListResponse
        setData(json.data)
        setTotalCount(json.totalCount)
      } catch (err) {
        console.error('[AuditListClient] fetch 실패', err)
      } finally {
        setIsLoading(false)
      }
    },
    [pageSize],
  )

  // ── 필터/정렬/페이지 변경 시 fetch ──
  const isFirstMount = React.useRef(true)
  React.useEffect(() => {
    if (isFirstMount.current) {
      isFirstMount.current = false
      return
    }
    void fetchLogs(pageIndex, filter, sorting)
  }, [pageIndex, filter, sorting, fetchLogs])

  // ── 검색 debounce ──
  const searchRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)
  const handleSearchChange = (v: string) => {
    if (searchRef.current) clearTimeout(searchRef.current)
    searchRef.current = setTimeout(() => {
      setPageIndex(0)
      setFilter((prev) => ({ ...prev, search: v }))
    }, 300)
  }

  // ── 컬럼 정의 ──
  const columns: ColumnDef<AuditLogRow>[] = [
    {
      id: 'expand',
      header: '',
      size: 40,
      enableSorting: false,
      cell: ({ row }) => {
        const isExpanded = expandedId === row.original.id
        return (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              setExpandedId(isExpanded ? null : row.original.id)
            }}
            className="p-1 rounded-[var(--radius-sm)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
            aria-label={isExpanded ? '접기' : '펼치기'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <ChevronDown className="size-4" aria-hidden="true" />
            ) : (
              <ChevronRight className="size-4" aria-hidden="true" />
            )}
          </button>
        )
      },
    },
    {
      id: 'createdAt',
      accessorKey: 'createdAt',
      header: '시각',
      enableSorting: true,
      meta: { mobileLabel: '시각' },
      cell: ({ row }) => (
        <span
          className="text-[var(--color-text-muted)] text-xs whitespace-nowrap"
          title={new Date(row.original.createdAt).toLocaleString('ko-KR')}
        >
          {relativeTime(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: 'actor',
      header: '액터',
      enableSorting: false,
      meta: { mobileLabel: '액터' },
      cell: ({ row }) => {
        const label =
          row.original.actorId === 'system'
            ? 'system'
            : (row.original.actorEmail ?? row.original.actorId)
        return (
          <span className="text-sm font-mono text-[var(--color-text)] truncate max-w-[10rem] block">
            {label}
          </span>
        )
      },
    },
    {
      id: 'action',
      header: '액션',
      enableSorting: false,
      meta: { mobileLabel: '액션' },
      cell: ({ row }) => <ActionBadge action={row.original.action} />,
    },
    {
      id: 'entity',
      header: '대상',
      enableSorting: false,
      meta: { mobileLabel: '대상' },
      cell: ({ row }) => {
        const et = ENTITY_TYPE_LABELS[row.original.entityType] ?? row.original.entityType
        const shortId =
          row.original.entityId.length > 12
            ? `${row.original.entityId.slice(0, 8)}…`
            : row.original.entityId
        return (
          <span
            className="text-sm text-[var(--color-text)]"
            title={`${et}:${row.original.entityId}`}
          >
            <span className="font-medium">{et}</span>
            <span className="text-[var(--color-text-muted)]"> {shortId}</span>
          </span>
        )
      },
    },
    {
      id: 'summary',
      header: '요약',
      enableSorting: false,
      meta: { mobileLabel: '요약' },
      cell: ({ row }) => (
        <span className="text-sm text-[var(--color-text-muted)] truncate max-w-[14rem] block">
          {makeSummary(row.original)}
        </span>
      ),
    },
  ]

  // ── 활성 필터 개수 ──
  const activeFilterCount =
    filter.entityTypes.length +
    filter.actions.length +
    (filter.preset !== 'all' ? 1 : 0) +
    (filter.search ? 1 : 0)

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">감사 로그</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          관리자 액션 이력을 조회합니다. 수정·삭제 불가.
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── 필터 사이드바 ── */}
        <aside className="w-full lg:w-56 shrink-0" aria-label="감사 로그 필터">
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-4">
            {/* 검색 */}
            <div>
              <label
                htmlFor="audit-search"
                className="block text-xs font-semibold text-[var(--color-text-muted)] mb-1 uppercase tracking-wide"
              >
                검색
              </label>
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[var(--color-text-muted)]"
                  aria-hidden="true"
                />
                <input
                  id="audit-search"
                  type="search"
                  placeholder="entityId / 내용..."
                  defaultValue={filter.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] pl-8 pr-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                />
              </div>
            </div>

            {/* 날짜 프리셋 */}
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                기간
              </div>
              <div className="flex flex-col gap-1">
                {(Object.keys(PRESET_LABELS) as FilterState['preset'][]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPageIndex(0)
                      setFilter((prev) => ({ ...prev, preset }))
                    }}
                    className={`text-left text-sm px-2 py-1 rounded-[var(--radius-sm)] transition-colors ${
                      filter.preset === preset
                        ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] font-medium'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'
                    }`}
                    aria-pressed={filter.preset === preset}
                  >
                    {PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>
            </div>

            {/* entityType */}
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                대상 유형
              </div>
              <div className="flex flex-col gap-1">
                {['format', 'resource', 'template', 'templateset', 'user'].map((et) => {
                  const isActive = filter.entityTypes.includes(et)
                  return (
                    <button
                      key={et}
                      type="button"
                      onClick={() => {
                        setPageIndex(0)
                        setFilter((prev) => ({
                          ...prev,
                          entityTypes: toggleItem(prev.entityTypes, et),
                        }))
                      }}
                      className={`text-left text-sm px-2 py-1 rounded-[var(--radius-sm)] transition-colors ${
                        isActive
                          ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] font-medium'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'
                      }`}
                      aria-pressed={isActive}
                    >
                      {ENTITY_TYPE_LABELS[et] ?? et}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* action */}
            <div>
              <div className="text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wide">
                액션
              </div>
              <div className="flex flex-col gap-1">
                {['create', 'update', 'delete', 'publish', 'reject'].map((action) => {
                  const isActive = filter.actions.includes(action)
                  const style = ACTION_STYLE[action]
                  return (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        setPageIndex(0)
                        setFilter((prev) => ({
                          ...prev,
                          actions: toggleItem(prev.actions, action),
                        }))
                      }}
                      className={`text-left text-sm px-2 py-1 rounded-[var(--radius-sm)] transition-colors flex items-center gap-2 ${
                        isActive
                          ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] font-medium'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-muted)]'
                      }`}
                      aria-pressed={isActive}
                    >
                      <span
                        className={`inline-flex px-1.5 py-0.5 text-xs rounded-full ${style?.className ?? 'bg-gray-100 text-gray-700'}`}
                      >
                        {style?.label ?? action}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* 필터 초기화 */}
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setPageIndex(0)
                  setFilter(INITIAL_FILTER)
                }}
                className="flex items-center gap-1.5 text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors"
                aria-label="필터 초기화"
              >
                <X className="size-3.5" aria-hidden="true" />
                필터 초기화 ({activeFilterCount})
              </button>
            )}
          </div>
        </aside>

        {/* ── 본문 ── */}
        <div className="flex-1 min-w-0">
          {/* 총 건수 */}
          <div className="mb-3 text-sm text-[var(--color-text-muted)]">
            총{' '}
            <span className="font-medium text-[var(--color-text)]">
              {totalCount.toLocaleString()}
            </span>
            건
          </div>

          <DataTable
            data={data}
            columns={columns}
            rowKey={(r) => r.id}
            pagination={{
              pageIndex,
              pageSize,
              totalCount,
              onChange: ({ pageIndex: pi }) => setPageIndex(pi),
            }}
            sorting={{
              state: sorting,
              onChange: (next) => {
                setPageIndex(0)
                setSorting(next)
              },
            }}
            isLoading={isLoading}
            keyboardNavigation
            emptyState={
              <div className="flex flex-col items-center gap-2 py-8">
                <p className="font-medium text-[var(--color-text)]">감사 로그가 없습니다</p>
                <p className="text-sm text-[var(--color-text-muted)]">
                  필터 조건을 변경하거나 초기화해 보세요.
                </p>
              </div>
            }
          />

          {/* ── 펼침 diff 뷰어 ── */}
          {expandedId !== null &&
            (() => {
              const row = data.find((r) => r.id === expandedId)
              if (!row) return null
              const diff = row.payload.diff as
                | Record<string, { before: unknown; after: unknown }>
                | undefined
              const meta = row.payload.meta as Record<string, unknown> | undefined
              return (
                <div
                  key={expandedId}
                  className="mt-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  role="region"
                  aria-label={`${row.entityType}:${row.entityId} 변경 상세`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="text-sm font-semibold text-[var(--color-text)]">
                      변경 상세 —{' '}
                      <span className="font-mono text-xs text-[var(--color-text-muted)]">
                        {row.target}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded-[var(--radius-sm)] p-1"
                      aria-label="닫기"
                    >
                      <X className="size-4" aria-hidden="true" />
                    </button>
                  </div>
                  <AuditDiffViewer diff={diff} meta={meta} />
                </div>
              )
            })()}
        </div>
      </div>
    </div>
  )
}
