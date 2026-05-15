'use client'

/**
 * DataTable — 관리자 콘솔 공용 테이블 컴포넌트
 *
 * @tanstack/react-table v8 headless 엔진 기반.
 * 정렬/필터/페이지네이션 controlled + uncontrolled 모두 지원.
 * 키보드 네비게이션: j/k(행 이동), x(선택 토글), Space(선택), Enter(디테일)
 * 반응형: ≥768px 테이블 / <768px 카드 리스트 자동 전환
 *
 * Nike 디자인 시스템 토큰(--nike-*) 직접 사용.
 * 테이블 헤더: nike-eyebrow 스타일 (mono uppercase tracking-wide opacity 0.5)
 * 페이지네이션: nike-btn-secondary (pill)
 */

import { Checkbox, cn } from '@storywork/ui'
import {
  type ColumnDef,
  type ColumnFiltersState,
  type Row,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { ChevronDown, ChevronUp, ChevronsUpDown } from 'lucide-react'
import * as React from 'react'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface DataTablePagination {
  pageIndex: number
  pageSize: number
  totalCount: number
  onChange: (next: { pageIndex: number; pageSize: number }) => void
}

export interface DataTableProps<T> {
  data: T[]
  columns: ColumnDef<T>[]
  rowKey: (row: T) => string
  /** 서버 페이지네이션 모드 — 미지정 시 클라이언트 모드 */
  pagination?: DataTablePagination
  /** 정렬 — 미지정 시 클라이언트 정렬 */
  sorting?: { state: SortingState; onChange: (next: SortingState) => void }
  /** 멀티 필터 */
  filters?: { state: ColumnFiltersState; onChange: (next: ColumnFiltersState) => void }
  /** 벌크 선택 (true 면 첫 컬럼에 체크박스 자동 삽입) */
  selectable?: boolean
  selectedRowIds?: string[]
  onSelectionChange?: (ids: string[]) => void
  /** 행 클릭 = 디테일 진입 (없으면 비활성) */
  onRowClick?: (row: T) => void
  isLoading?: boolean
  emptyState?: React.ReactNode
  /** 키보드 네비 활성화 */
  keyboardNavigation?: boolean
  className?: string
}

// column meta 확장
declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    mobileLabel?: string
  }
}

// ─── 스켈레톤 행 ─────────────────────────────────────────────────────────────

function SkeletonRow({ columnCount }: { columnCount: number }) {
  return (
    <tr aria-hidden="true">
      {Array.from({ length: columnCount }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div
            className="h-4 w-full animate-pulse"
            style={{
              borderRadius: 'var(--nike-admin-rounded-xs)',
              backgroundColor: 'var(--nike-hairline-soft)',
            }}
          />
        </td>
      ))}
    </tr>
  )
}

// ─── 정렬 아이콘 ─────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: 'asc' | 'desc' | false }) {
  const style: React.CSSProperties = {
    color: 'var(--nike-ink)',
    opacity: 0.4,
    width: '14px',
    height: '14px',
    flexShrink: 0,
  }
  if (direction === 'asc') return <ChevronUp style={style} aria-hidden="true" />
  if (direction === 'desc') return <ChevronDown style={style} aria-hidden="true" />
  return <ChevronsUpDown style={style} aria-hidden="true" />
}

// ─── 모바일 카드 뷰 ──────────────────────────────────────────────────────────

function MobileCard<T>({
  row,
  isSelected,
  onSelect,
  onRowClick,
  isFocused,
  rowRef,
}: {
  row: Row<T>
  isSelected: boolean
  onSelect?: () => void
  onRowClick?: (row: T) => void
  isFocused: boolean
  rowRef: React.Ref<HTMLDivElement>
}) {
  return (
    <div
      ref={rowRef}
      tabIndex={isFocused ? 0 : -1}
      role="row"
      aria-selected={isSelected}
      className={cn(
        'flex flex-col gap-2',
        'focus-visible:outline-none focus-visible:ring-2',
        onRowClick && 'cursor-pointer',
      )}
      style={{
        borderRadius: 'var(--nike-admin-rounded-md)',
        border: `1px solid ${isSelected ? 'var(--nike-ink)' : 'var(--nike-hairline)'}`,
        backgroundColor: isSelected ? 'var(--nike-hairline-soft)' : 'var(--nike-canvas)',
        padding: 'var(--nike-admin-space-md)',
        transition: 'background-color 100ms ease, border-color 100ms ease',
      }}
      onClick={() => onRowClick?.(row.original)}
    >
      {onSelect && (
        <div
          className="flex items-center gap-2 mb-1"
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Checkbox checked={isSelected} onCheckedChange={onSelect} aria-label="행 선택" />
        </div>
      )}
      {row.getVisibleCells().map((cell) => {
        const label = cell.column.columnDef.meta?.mobileLabel ?? cell.column.id
        // 체크박스 컬럼 스킵
        if (cell.column.id === '__select__') return null
        return (
          <div key={cell.id} className="flex items-start gap-2">
            <span
              style={{
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '10px',
                fontWeight: 400,
                letterSpacing: '0.4px',
                textTransform: 'uppercase',
                color: 'var(--nike-ink)',
                opacity: 0.45,
                minWidth: '5rem',
                flexShrink: 0,
                paddingTop: '2px',
              }}
            >
              {label}
            </span>
            <span
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '14px',
                fontWeight: 330,
                color: 'var(--nike-ink)',
                wordBreak: 'break-all',
              }}
            >
              {flexRender(cell.column.columnDef.cell, cell.getContext())}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── DataTable 본체 ───────────────────────────────────────────────────────────

export function DataTable<T>({
  data,
  columns: columnsProp,
  rowKey,
  pagination,
  sorting: sortingProp,
  filters: filtersProp,
  selectable = false,
  selectedRowIds = [],
  onSelectionChange,
  onRowClick,
  isLoading = false,
  emptyState,
  keyboardNavigation = false,
  className,
}: DataTableProps<T>) {
  // ── 내부 상태 (uncontrolled 모드) ──
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([])
  const [internalFilters, setInternalFilters] = React.useState<ColumnFiltersState>([])
  const [internalPage, setInternalPage] = React.useState({ pageIndex: 0, pageSize: 20 })
  const [focusedRowIndex, setFocusedRowIndex] = React.useState<number>(-1)

  const sorting = sortingProp?.state ?? internalSorting
  const onSortingChange = sortingProp?.onChange ?? setInternalSorting
  const columnFilters = filtersProp?.state ?? internalFilters
  const onColumnFiltersChange = filtersProp?.onChange ?? setInternalFilters

  // ── 체크박스 컬럼 자동 삽입 ──
  const selectColumn: ColumnDef<T> = {
    id: '__select__',
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected()
            ? true
            : table.getIsSomePageRowsSelected()
              ? 'indeterminate'
              : false
        }
        onCheckedChange={(checked) => {
          if (checked === true) {
            const allIds = table.getRowModel().rows.map((r) => rowKey(r.original))
            onSelectionChange?.(allIds)
          } else {
            onSelectionChange?.([])
          }
        }}
        aria-label="전체 선택"
      />
    ),
    cell: ({ row }) => {
      const id = rowKey(row.original)
      const isSelected = selectedRowIds.includes(id)
      return (
        <div
          role="presentation"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => {
              if (isSelected) {
                onSelectionChange?.(selectedRowIds.filter((rid) => rid !== id))
              } else {
                onSelectionChange?.([...selectedRowIds, id])
              }
            }}
            aria-label="행 선택"
          />
        </div>
      )
    },
    size: 48,
    enableSorting: false,
  }

  const columns = selectable ? [selectColumn, ...columnsProp] : columnsProp

  // ── react-table 인스턴스 ──
  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnFilters,
      pagination: pagination
        ? { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }
        : internalPage,
    },
    manualPagination: Boolean(pagination),
    manualSorting: Boolean(sortingProp),
    manualFiltering: Boolean(filtersProp),
    rowCount: pagination?.totalCount,
    onSortingChange: (updater) => {
      const next = typeof updater === 'function' ? updater(sorting) : updater
      onSortingChange(next)
    },
    onColumnFiltersChange: (updater) => {
      const next = typeof updater === 'function' ? updater(columnFilters) : updater
      onColumnFiltersChange(next)
    },
    onPaginationChange: (updater) => {
      const next =
        typeof updater === 'function'
          ? updater(
              pagination
                ? { pageIndex: pagination.pageIndex, pageSize: pagination.pageSize }
                : internalPage,
            )
          : updater
      if (pagination) {
        pagination.onChange(next)
      } else {
        setInternalPage(next)
      }
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: pagination ? undefined : getPaginationRowModel(),
  })

  const rows = table.getRowModel().rows
  const totalPages = pagination
    ? Math.ceil(pagination.totalCount / pagination.pageSize)
    : table.getPageCount()
  const currentPage = pagination ? pagination.pageIndex : internalPage.pageIndex
  // pageSize 는 페이지네이션 UI 에서 직접 사용 (현재 표시 행 수 제어)
  const _pageSize = pagination ? pagination.pageSize : internalPage.pageSize
  void _pageSize // suppress unused var — 향후 pageSize 선택기 UI 에서 사용

  // ── 키보드 네비게이션 ──
  const rowRefs = React.useRef<Map<number, HTMLElement>>(new Map())

  React.useEffect(() => {
    if (!keyboardNavigation) return

    const handler = (e: KeyboardEvent) => {
      // 입력 요소에 포커스가 있으면 무시
      const target = e.target as HTMLElement
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return

      if (e.key === 'j' || e.key === 'ArrowDown') {
        e.preventDefault()
        setFocusedRowIndex((prev) => Math.min(prev + 1, rows.length - 1))
      } else if (e.key === 'k' || e.key === 'ArrowUp') {
        e.preventDefault()
        setFocusedRowIndex((prev) => Math.max(prev - 1, 0))
      } else if ((e.key === 'x' || e.key === ' ') && focusedRowIndex >= 0) {
        e.preventDefault()
        const row = rows[focusedRowIndex]
        if (row && selectable) {
          const id = rowKey(row.original)
          if (selectedRowIds.includes(id)) {
            onSelectionChange?.(selectedRowIds.filter((rid) => rid !== id))
          } else {
            onSelectionChange?.([...selectedRowIds, id])
          }
        }
      } else if (e.key === 'Enter' && focusedRowIndex >= 0) {
        e.preventDefault()
        const row = rows[focusedRowIndex]
        if (row) onRowClick?.(row.original)
      }
    }

    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [
    keyboardNavigation,
    focusedRowIndex,
    rows,
    selectable,
    selectedRowIds,
    onSelectionChange,
    onRowClick,
    rowKey,
  ])

  // 포커스 인덱스 변경 시 스크롤
  React.useEffect(() => {
    if (focusedRowIndex < 0) return
    const el = rowRefs.current.get(focusedRowIndex)
    el?.scrollIntoView({ block: 'nearest' })
    el?.focus()
  }, [focusedRowIndex])

  const columnCount = columns.length

  return (
    <div className={cn('flex flex-col gap-4', className)}>
      {/* ─── 데스크톱 테이블 ─── */}
      <div
        className="hidden md:block overflow-x-auto"
        style={{
          borderRadius: 'var(--nike-admin-rounded-md)',
          border: '1px solid var(--nike-hairline)',
          backgroundColor: 'var(--nike-canvas)',
        }}
      >
        <table
          role="grid"
          aria-rowcount={pagination?.totalCount ?? data.length}
          aria-colcount={columnCount}
          className="w-full text-sm border-collapse"
        >
          {/* 테이블 헤더: nike-eyebrow 스타일 — mono uppercase tracking-wide */}
          <thead
            style={{
              backgroundColor: 'var(--nike-hairline-soft)',
              borderBottom: '1px solid var(--nike-hairline)',
            }}
          >
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id} role="row">
                {headerGroup.headers.map((header) => {
                  const canSort = header.column.getCanSort()
                  const sortDir = header.column.getIsSorted()
                  return (
                    <th
                      key={header.id}
                      role="columnheader"
                      aria-sort={
                        sortDir === 'asc'
                          ? 'ascending'
                          : sortDir === 'desc'
                            ? 'descending'
                            : canSort
                              ? 'none'
                              : undefined
                      }
                      className={cn(
                        'px-4 py-3 text-left whitespace-nowrap',
                        canSort && 'cursor-pointer select-none',
                      )}
                      style={{
                        // nike-eyebrow 스타일 (mono uppercase tracking)
                        fontFamily: 'var(--nike-font-mono)',
                        fontSize: '10px',
                        fontWeight: 400,
                        letterSpacing: '0.5px',
                        textTransform: 'uppercase',
                        color: 'var(--nike-ink)',
                        opacity: 0.5,
                        width: header.getSize() !== 150 ? header.getSize() : undefined,
                      }}
                      onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                      onKeyDown={(e) => {
                        if (canSort && (e.key === 'Enter' || e.key === ' ')) {
                          e.preventDefault()
                          header.column.getToggleSortingHandler()?.(e)
                        }
                      }}
                      tabIndex={canSort ? 0 : undefined}
                    >
                      <div className="flex items-center gap-1">
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                        {canSort && <SortIcon direction={sortDir} />}
                      </div>
                    </th>
                  )
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <SkeletonRow key={i} columnCount={columnCount} />
              ))
            ) : rows.length === 0 ? (
              <tr role="row">
                <td
                  colSpan={columnCount}
                  className="px-4 py-16 text-center"
                  style={{ color: 'var(--nike-ink)', opacity: 0.45 }}
                >
                  {emptyState ?? (
                    <div className="flex flex-col items-center gap-2">
                      <p
                        style={{
                          fontFamily: 'var(--nike-font-text)',
                          fontSize: '16px',
                          fontWeight: 540,
                          color: 'var(--nike-ink)',
                        }}
                      >
                        데이터가 없습니다
                      </p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              rows.map((row, idx) => {
                const id = rowKey(row.original)
                const isSelected = selectedRowIds.includes(id)
                const isFocused = idx === focusedRowIndex
                return (
                  <tr
                    key={row.id}
                    role="row"
                    aria-selected={selectable ? isSelected : undefined}
                    tabIndex={keyboardNavigation ? (isFocused ? 0 : -1) : undefined}
                    ref={(el) => {
                      if (el) rowRefs.current.set(idx, el)
                      else rowRefs.current.delete(idx)
                    }}
                    style={{
                      borderBottom: '1px solid var(--nike-hairline)',
                      backgroundColor: isSelected ? 'var(--nike-hairline-soft)' : 'transparent',
                      transition: 'background-color 100ms ease',
                      cursor: onRowClick ? 'pointer' : undefined,
                      outline: isFocused ? `2px solid var(--nike-ink)` : undefined,
                      outlineOffset: isFocused ? '-2px' : undefined,
                    }}
                    className={cn(
                      'hover:bg-[var(--nike-hairline-soft)]',
                      'focus-visible:outline-none',
                    )}
                    onClick={() => onRowClick?.(row.original)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        onRowClick?.(row.original)
                      }
                    }}
                    onFocus={() => setFocusedRowIndex(idx)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} role="gridcell" className="px-4 py-3">
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {/* ─── 모바일 카드 뷰 ─── */}
      <div className="flex flex-col gap-3 md:hidden" role="grid" aria-label="데이터 목록">
        {isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              aria-hidden="true"
              style={{
                borderRadius: 'var(--nike-admin-rounded-md)',
                border: '1px solid var(--nike-hairline)',
                backgroundColor: 'var(--nike-canvas)',
                padding: 'var(--nike-admin-space-md)',
              }}
            >
              <div className="flex flex-col gap-3">
                {Array.from({ length: 3 }).map((_, j) => (
                  <div
                    key={j}
                    className="h-4 w-full animate-pulse"
                    style={{
                      borderRadius: 'var(--nike-admin-rounded-xs)',
                      backgroundColor: 'var(--nike-hairline-soft)',
                    }}
                  />
                ))}
              </div>
            </div>
          ))
        ) : rows.length === 0 ? (
          <div className="py-16 text-center" style={{ color: 'var(--nike-ink)', opacity: 0.45 }}>
            {emptyState ?? (
              <div className="flex flex-col items-center gap-2">
                <p
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '16px',
                    fontWeight: 540,
                    color: 'var(--nike-ink)',
                  }}
                >
                  데이터가 없습니다
                </p>
              </div>
            )}
          </div>
        ) : (
          rows.map((row, idx) => {
            const id = rowKey(row.original)
            const isSelected = selectedRowIds.includes(id)
            const isFocused = idx === focusedRowIndex
            return (
              <MobileCard
                key={row.id}
                row={row}
                isSelected={isSelected}
                onSelect={
                  selectable
                    ? () => {
                        if (isSelected) {
                          onSelectionChange?.(selectedRowIds.filter((rid) => rid !== id))
                        } else {
                          onSelectionChange?.([...selectedRowIds, id])
                        }
                      }
                    : undefined
                }
                onRowClick={onRowClick}
                isFocused={isFocused}
                rowRef={(el) => {
                  if (el) rowRefs.current.set(idx, el)
                  else rowRefs.current.delete(idx)
                }}
              />
            )
          })
        )}
      </div>

      {/* ─── 페이지네이션 — nike-btn-secondary pill ─── */}
      {totalPages > 1 && (
        <nav
          aria-label="페이지 네비게이션"
          className="flex items-center justify-between gap-4 flex-wrap"
        >
          <span
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--nike-ink)',
              opacity: 0.55,
            }}
          >
            {pagination
              ? `총 ${pagination.totalCount.toLocaleString()}건`
              : `총 ${data.length.toLocaleString()}건`}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="nike-btn-secondary"
              style={{ minHeight: '36px', padding: '6px 18px', fontSize: '14px' }}
              disabled={currentPage === 0}
              onClick={() => {
                if (pagination) {
                  pagination.onChange({ pageIndex: currentPage - 1, pageSize: pagination.pageSize })
                } else {
                  table.previousPage()
                }
              }}
              aria-label="이전 페이지"
            >
              이전
            </button>
            <span
              style={{
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '13px',
                color: 'var(--nike-ink)',
                opacity: 0.55,
              }}
            >
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="nike-btn-secondary"
              style={{ minHeight: '36px', padding: '6px 18px', fontSize: '14px' }}
              disabled={currentPage >= totalPages - 1}
              onClick={() => {
                if (pagination) {
                  pagination.onChange({ pageIndex: currentPage + 1, pageSize: pagination.pageSize })
                } else {
                  table.nextPage()
                }
              }}
              aria-label="다음 페이지"
            >
              다음
            </button>
          </div>
        </nav>
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'

export type { ColumnDef, SortingState, ColumnFiltersState }
