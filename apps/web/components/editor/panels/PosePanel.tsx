'use client'

// ─────────────────────────────────────────────
// PosePanel — 포즈 라이브러리 패널 (M2-05 활성화)
//
// 레이아웃 (FeatureSidebar 290px 내부):
//   [검색창]
//   [필터 (접기/펼치기)]
//   [2열 그리드 + 무한 스크롤]
//   [빈 상태 / 에러 / 로딩]
//
// 캔버스 추가: onAddToCanvas prop → EditorShell.addPoseFromResource
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { cn, LoadingOverlay } from '@storywork/ui'
import { RefreshCw, Search } from 'lucide-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'

import type { ResourceSummary } from '../../../app/api/_lib/search-types'
import type { HistoryRef as History } from '../types'

import { usePoseSearch } from './hooks/usePoseSearch'
import { INITIAL_FILTERS, PoseFilters, toApiFilters } from './PoseFilters'
import type { PoseFiltersValue } from './PoseFilters'
import { PoseGridItem } from './PoseGridItem'

// ─── Props ───────────────────────────────────────────────────────────────────

export type PosePanelProps = {
  canvas: StoryCanvas | null
  history: History | null
  onAddToCanvas: (pose: ResourceSummary) => void
}

// ─── 추천 검색어 ─────────────────────────────────────────────────────────────

const SUGGESTED_QUERIES = ['서있는', '앉은', '걷는', 'love', 'Fight']

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export function PosePanel({ onAddToCanvas }: PosePanelProps): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [filters, setFilters] = useState<PoseFiltersValue>(INITIAL_FILTERS)

  // IntersectionObserver 용 sentinel 요소
  const sentinelRef = useRef<HTMLDivElement>(null)

  const apiFilters = toApiFilters(filters)

  const { results, total, isLoading, isError, error, hasMore, loadMore, refresh, recentQueries } =
    usePoseSearch({
      query,
      filters: apiFilters,
    })

  // ─── 무한 스크롤 (IntersectionObserver) ────────────────────────────────────

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first?.isIntersecting && hasMore && !isLoading) {
          loadMore()
        }
      },
      { threshold: 0.1, rootMargin: '80px' },
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, isLoading, loadMore])

  // ─── 핸들러 ──────────────────────────────────────────────────────────────

  const handleQueryChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value)
  }, [])

  const handleSuggestedQuery = useCallback((q: string) => {
    setQuery(q)
  }, [])

  const handleFiltersChange = useCallback((next: PoseFiltersValue) => {
    setFilters(next)
  }, [])

  // ─── 렌더 ────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-full flex-col">
      {/* 검색창 */}
      <div className={cn('shrink-0 border-b border-[var(--editor-border)]', 'px-3 py-4')}>
        <div className="relative">
          <Search
            className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--editor-text-muted)] pointer-events-none"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={handleQueryChange}
            aria-label="포즈 검색"
            placeholder="포즈 검색 (한국어/영어)..."
            className={cn(
              'w-full rounded-[var(--radius-md)]',
              'border border-[var(--editor-border)]',
              'bg-[var(--color-surface-muted)]',
              'pl-8 pr-3 py-1.5',
              'text-[13px] text-[var(--editor-text)]',
              'placeholder:text-[var(--editor-text-muted)]',
              'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent',
              'transition-colors duration-[var(--duration-fast)]',
            )}
          />
        </div>

        {/* 최근 검색어 — 검색창 비어있을 때만 */}
        {!query && recentQueries.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1" aria-label="최근 검색어">
            <span className="text-[11px] text-[var(--editor-text-muted)] self-center">최근:</span>
            {recentQueries.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => handleSuggestedQuery(q)}
                className={cn(
                  'text-[11px] px-1.5 py-0.5 rounded-[var(--radius-sm)]',
                  'bg-[var(--color-surface-muted)] text-[var(--editor-text-muted)]',
                  'border border-[var(--editor-border)]',
                  'hover:bg-[var(--editor-hover)] hover:text-[var(--editor-text)]',
                  'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand-500)]',
                  'transition-colors duration-[var(--duration-fast)]',
                )}
              >
                {q}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 필터 */}
      <div className="shrink-0">
        <PoseFilters value={filters} onChange={handleFiltersChange} />
      </div>

      {/* 검색 결과 수 (aria-live) */}
      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="shrink-0 px-3 py-2 text-[11px] text-[var(--editor-text-muted)]"
      >
        {!isLoading && !isError && total > 0 && `${total.toLocaleString()}개 결과`}
        {!isLoading && !isError && total === 0 && query && '결과 없음'}
      </div>

      {/* 그리드 영역 — relative 로 LoadingOverlay panel 위치 기준 */}
      <div className="relative flex-1 overflow-y-auto overscroll-contain">
        {/* 초기 로딩 오버레이 (results 없을 때만) */}
        <LoadingOverlay
          show={isLoading && results.length === 0}
          variant="panel"
          message="포즈 불러오는 중..."
          spinnerSize="sm"
        />

        {/* 에러 상태 */}
        {isError && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-[13px] text-[var(--editor-text-muted)]">
              {error ?? '검색에 실패했어요'}
            </p>
            <button
              type="button"
              onClick={refresh}
              aria-label="검색 재시도"
              className={cn(
                'flex items-center gap-1.5 text-[12px] font-medium',
                'text-[var(--color-brand-500)] hover:text-[var(--color-brand-600)]',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand-500)]',
              )}
            >
              <RefreshCw className="size-3.5" aria-hidden="true" />
              다시 시도
            </button>
          </div>
        )}

        {/* 빈 상태 */}
        {!isLoading && !isError && total === 0 && (
          <div className="flex flex-col items-center gap-3 px-4 py-10 text-center">
            <p className="text-[13px] text-[var(--editor-text-muted)]">
              결과가 없습니다. 다른 검색어를 시도해보세요.
            </p>
            <div className="flex flex-wrap justify-center gap-1.5" aria-label="추천 검색어">
              {SUGGESTED_QUERIES.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => handleSuggestedQuery(q)}
                  className={cn(
                    'text-[12px] px-2 py-1 rounded-[var(--radius-sm)]',
                    'border border-[var(--color-brand-400)] text-[var(--color-brand-500)]',
                    'bg-[var(--color-brand-500)]/5',
                    'hover:bg-[var(--color-brand-500)]/15',
                    'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[var(--color-brand-500)]',
                    'transition-colors duration-[var(--duration-fast)]',
                  )}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 그리드 */}
        {results.length > 0 && (
          <div
            className="grid grid-cols-2 gap-[36px] px-[10px] py-5"
            role="list"
            aria-label={`포즈 ${results.length}개`}
          >
            {results.map((pose) => (
              <div key={pose.id} role="listitem">
                <PoseGridItem pose={pose} onAddToCanvas={onAddToCanvas} />
              </div>
            ))}
          </div>
        )}

        {/* 추가 로딩 인디케이터 (loadMore 중) */}
        {isLoading && results.length > 0 && (
          <div role="status" aria-live="polite" className="flex justify-center py-4">
            <span className="text-[12px] text-[var(--editor-text-muted)]">불러오는 중...</span>
          </div>
        )}

        {/* IntersectionObserver sentinel */}
        <div ref={sentinelRef} aria-hidden="true" className="h-4 w-full shrink-0" />
      </div>
    </div>
  )
}
