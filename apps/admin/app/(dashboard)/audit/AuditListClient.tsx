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

const ACTION_BADGE_COLORS: Record<string, { bg: string; label: string }> = {
  create: { label: '생성', bg: 'var(--nike-card-mint)' },
  update: { label: '수정', bg: 'var(--nike-card-cream)' },
  delete: { label: '삭제', bg: 'var(--nike-card-pink)' },
  publish: { label: '게시', bg: 'var(--nike-card-lime)' },
  reject: { label: '거절', bg: 'var(--nike-card-coral)' },
}

const ENTITY_TYPE_LABELS: Record<string, string> = {
  format: 'Format',
  resource: 'Resource',
  template: 'Template',
  templateset: 'TemplateSet',
  user: 'User',
}

function ActionBadge({ action }: { action: string }) {
  const badge = ACTION_BADGE_COLORS[action] ?? { label: action, bg: 'var(--nike-soft-cloud)' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--nike-rounded-full)',
        backgroundColor: badge.bg,
        fontFamily: 'var(--nike-font-mono)',
        fontSize: '11px',
        color: 'var(--nike-ink)',
      }}
    >
      {badge.label}
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
  const actionLabel = ACTION_BADGE_COLORS[row.action]?.label ?? row.action
  if (meta['name']) return `"${meta['name']}" ${actionLabel}`
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
            className="p-1 rounded focus-visible:outline-none focus-visible:ring-2"
            style={{ color: 'var(--nike-ink)', opacity: 0.5 }}
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
          style={{
            fontFamily: 'var(--nike-font-mono)',
            fontSize: '11px',
            color: 'var(--nike-ink)',
            opacity: 0.55,
            whiteSpace: 'nowrap',
          }}
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
          <span
            className="truncate max-w-[10rem] block"
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '12px',
              color: 'var(--nike-ink)',
            }}
          >
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
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              color: 'var(--nike-ink)',
            }}
            title={`${et}:${row.original.entityId}`}
          >
            <span style={{ fontWeight: 540 }}>{et}</span>
            <span style={{ opacity: 0.5, fontFamily: 'var(--nike-font-mono)', fontSize: '11px' }}>
              {' '}
              {shortId}
            </span>
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
        <span
          className="truncate max-w-[14rem] block"
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-ink)',
            opacity: 0.55,
          }}
        >
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

  // ── 사이드바 버튼 스타일 헬퍼 ──
  const sidebarBtnStyle = (isActive: boolean): React.CSSProperties => ({
    display: 'block',
    width: '100%',
    textAlign: 'left',
    padding: '5px 8px',
    borderRadius: 'var(--nike-admin-rounded-sm)',
    fontFamily: 'var(--nike-font-text)',
    fontSize: '13px',
    fontWeight: isActive ? 540 : 330,
    color: 'var(--nike-ink)',
    backgroundColor: isActive ? 'var(--nike-card-lime)' : 'transparent',
    border: 'none',
    cursor: 'pointer',
    transition: 'background-color 100ms ease',
    opacity: isActive ? 1 : 0.7,
  })

  return (
    <div className="nike-page">
      {/* ── Nike 헤더 (100p Admin 패턴) ── */}
      <header className="mb-8 flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="nike-heading-xl">감사 로그</h1>
          <p className="nike-caption-md mt-1">관리자 액션 이력을 조회합니다. 수정·삭제 불가.</p>
        </div>
      </header>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* ── 필터 사이드바 ── */}
        <aside className="w-full lg:w-56 shrink-0" aria-label="감사 로그 필터">
          <div
            className="flex flex-col gap-4 p-4"
            style={{
              borderRadius: 'var(--nike-admin-rounded-lg)',
              border: '1px solid var(--nike-hairline)',
              backgroundColor: 'var(--nike-canvas)',
            }}
          >
            {/* 검색 */}
            <div>
              <label
                htmlFor="audit-search"
                style={{
                  display: 'block',
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.4,
                  marginBottom: '6px',
                }}
              >
                검색
              </label>
              <div className="relative">
                <Search
                  className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5"
                  style={{ color: 'var(--nike-ink)', opacity: 0.35 }}
                  aria-hidden="true"
                />
                <input
                  id="audit-search"
                  type="search"
                  placeholder="entityId / 내용..."
                  defaultValue={filter.search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  style={{
                    width: '100%',
                    height: '36px',
                    borderRadius: 'var(--nike-admin-rounded-md)',
                    border: '1px solid var(--nike-hairline)',
                    backgroundColor: 'var(--nike-soft-cloud)',
                    paddingLeft: '32px',
                    paddingRight: '12px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-ink)',
                    outline: 'none',
                  }}
                />
              </div>
            </div>

            {/* 날짜 프리셋 */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.4,
                  marginBottom: '6px',
                }}
              >
                기간
              </div>
              <div className="flex flex-col gap-0.5">
                {(Object.keys(PRESET_LABELS) as FilterState['preset'][]).map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => {
                      setPageIndex(0)
                      setFilter((prev) => ({ ...prev, preset }))
                    }}
                    style={sidebarBtnStyle(filter.preset === preset)}
                    aria-pressed={filter.preset === preset}
                  >
                    {PRESET_LABELS[preset]}
                  </button>
                ))}
              </div>
            </div>

            {/* entityType */}
            <div>
              <div
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.4,
                  marginBottom: '6px',
                }}
              >
                대상 유형
              </div>
              <div className="flex flex-col gap-0.5">
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
                      style={sidebarBtnStyle(isActive)}
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
              <div
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.4,
                  marginBottom: '6px',
                }}
              >
                액션
              </div>
              <div className="flex flex-col gap-0.5">
                {['create', 'update', 'delete', 'publish', 'reject'].map((action) => {
                  const isActive = filter.actions.includes(action)
                  const badge = ACTION_BADGE_COLORS[action]
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
                      className="flex items-center gap-2"
                      style={sidebarBtnStyle(isActive)}
                      aria-pressed={isActive}
                    >
                      <span
                        style={{
                          display: 'inline-flex',
                          padding: '1px 6px',
                          borderRadius: 'var(--nike-rounded-full)',
                          backgroundColor: badge?.bg ?? 'var(--nike-soft-cloud)',
                          fontFamily: 'var(--nike-font-mono)',
                          fontSize: '10px',
                          color: 'var(--nike-ink)',
                        }}
                      >
                        {badge?.label ?? action}
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
                className="flex items-center gap-1.5"
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '11px',
                  color: 'var(--nike-ink)',
                  opacity: 0.5,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
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
          <div
            className="mb-3"
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              color: 'var(--nike-ink)',
              opacity: 0.55,
            }}
          >
            총 <span style={{ fontWeight: 540, opacity: 1 }}>{totalCount.toLocaleString()}</span>건
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
                <p
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '14px',
                    fontWeight: 540,
                    color: 'var(--nike-ink)',
                    opacity: 0.55,
                  }}
                >
                  감사 로그가 없습니다
                </p>
                <p
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    fontWeight: 330,
                    color: 'var(--nike-ink)',
                    opacity: 0.4,
                  }}
                >
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
                  className="mt-3 p-4"
                  style={{
                    borderRadius: 'var(--nike-admin-rounded-lg)',
                    border: '1px solid var(--nike-hairline)',
                    backgroundColor: 'var(--nike-canvas)',
                  }}
                  role="region"
                  aria-label={`${row.entityType}:${row.entityId} 변경 상세`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '13px',
                        fontWeight: 540,
                        color: 'var(--nike-ink)',
                      }}
                    >
                      변경 상세 —{' '}
                      <span
                        style={{
                          fontFamily: 'var(--nike-font-mono)',
                          fontSize: '11px',
                          opacity: 0.55,
                        }}
                      >
                        {row.target}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => setExpandedId(null)}
                      className="rounded focus-visible:outline-none focus-visible:ring-2 p-1"
                      style={{
                        color: 'var(--nike-ink)',
                        opacity: 0.4,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
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
