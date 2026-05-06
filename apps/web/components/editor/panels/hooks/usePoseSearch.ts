'use client'

// ─────────────────────────────────────────────
// usePoseSearch — 포즈 검색 훅
//
// 특징:
//   - query/filter 변경 시 debounce 300ms 후 API 호출
//   - AbortController 로 이전 요청 cancel (stale response 방지)
//   - 무한 스크롤: loadMore() 로 다음 페이지 append
//   - 에러 시 1회 자동 재시도, 이후 isError=true
//   - localStorage 에 최근 검색어 5개 캐시 (RECENT_KEY)
// ─────────────────────────────────────────────

import { showToast } from '@storywork/ui'
import { useCallback, useEffect, useRef, useState } from 'react'

import type { ResourceSummary } from '../../../../app/api/_lib/search-types'
import type { SearchPosesBody } from '../../../../app/api/search/poses/route'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type PoseSearchFilters = NonNullable<SearchPosesBody['filters']>

export type UsePoseSearchOpts = {
  query: string
  filters: PoseSearchFilters
  pageSize?: number
}

export type UsePoseSearchResult = {
  results: ResourceSummary[]
  total: number
  isLoading: boolean
  isError: boolean
  error: string | null
  hasMore: boolean
  loadMore: () => void
  refresh: () => void
  took_ms: number
  recentQueries: string[]
}

// ─── 상수 ────────────────────────────────────────────────────────────────────

const DEBOUNCE_MS = 300
const PAGE_SIZE_DEFAULT = 30
const RECENT_KEY = 'storywork:pose-recent-queries'
const RECENT_MAX = 5
const RETRY_MAX = 1

// ─── localStorage 헬퍼 ───────────────────────────────────────────────────────

function loadRecentQueries(): string[] {
  if (typeof localStorage === 'undefined') return []
  try {
    const raw = localStorage.getItem(RECENT_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((v): v is string => typeof v === 'string').slice(0, RECENT_MAX)
  } catch {
    return []
  }
}

function saveRecentQuery(q: string): void {
  if (typeof localStorage === 'undefined' || !q.trim()) return
  try {
    const prev = loadRecentQueries()
    const next = [q.trim(), ...prev.filter((r) => r !== q.trim())].slice(0, RECENT_MAX)
    localStorage.setItem(RECENT_KEY, JSON.stringify(next))
  } catch {
    // localStorage full — silent fail
  }
}

// ─── 훅 ─────────────────────────────────────────────────────────────────────

export function usePoseSearch({
  query,
  filters,
  pageSize = PAGE_SIZE_DEFAULT,
}: UsePoseSearchOpts): UsePoseSearchResult {
  const [results, setResults] = useState<ResourceSummary[]>([])
  const [total, setTotal] = useState(0)
  const [isLoading, setIsLoading] = useState(false)
  const [isError, setIsError] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [took_ms, setTookMs] = useState(0)
  const [offset, setOffset] = useState(0)
  const [recentQueries, setRecentQueries] = useState<string[]>(() => loadRecentQueries())

  // 현재 진행 중인 AbortController
  const abortRef = useRef<AbortController | null>(null)
  // debounce 타이머
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 재시도 카운터
  const retryRef = useRef(0)

  // 쿼리/필터 변경 감지를 위한 직렬화 키
  const filterKey = JSON.stringify(filters)

  // ─── 실제 fetch 함수 ─────────────────────────────────────────────────────

  const fetchPoses = useCallback(
    async (currentOffset: number, append: boolean, signal: AbortSignal) => {
      setIsLoading(true)
      if (!append) {
        setIsError(false)
        setError(null)
      }

      try {
        const body: SearchPosesBody = {
          query: query.trim() || undefined,
          filters: Object.keys(filters).length > 0 ? filters : undefined,
          limit: pageSize,
          offset: currentOffset,
        }

        const res = await fetch('/api/search/poses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal,
        })

        if (!res.ok) {
          throw new Error(`검색 API 오류 (${res.status})`)
        }

        const data = (await res.json()) as {
          results: ResourceSummary[]
          total: number
          took_ms: number
        }

        if (signal.aborted) return

        setResults((prev) => (append ? [...prev, ...data.results] : data.results))
        setTotal(data.total)
        setTookMs(data.took_ms)
        setIsError(false)
        setError(null)
        retryRef.current = 0

        // 검색어 있으면 최근 검색어 저장
        if (query.trim()) {
          saveRecentQuery(query.trim())
          setRecentQueries(loadRecentQueries())
        }
      } catch (err: unknown) {
        if (signal.aborted) return

        const errMsg = err instanceof Error ? err.message : '검색에 실패했습니다'

        // 1회 재시도
        if (retryRef.current < RETRY_MAX) {
          retryRef.current++
          void fetchPoses(currentOffset, append, signal)
          return
        }

        setIsError(true)
        setError(errMsg)
        showToast('포즈 검색에 실패했습니다. 다시 시도해주세요.', 'error')
      } finally {
        if (!signal.aborted) {
          setIsLoading(false)
        }
      }
    },
    // deps: query, filterKey, pageSize — filterKey 는 JSON.stringify(filters) 로 안정화됨
    // (showToast 는 @storywork/ui 내부에서 싱글톤으로 안정화)
    [query, filterKey, pageSize],
  )

  // ─── query/filter 변경 시 debounce 후 새 검색 ─────────────────────────────

  useEffect(() => {
    // 이전 debounce 취소
    if (debounceRef.current !== null) {
      clearTimeout(debounceRef.current)
    }

    debounceRef.current = setTimeout(() => {
      // 이전 요청 abort
      if (abortRef.current) {
        abortRef.current.abort()
      }
      const controller = new AbortController()
      abortRef.current = controller

      // 오프셋 초기화
      setOffset(0)
      retryRef.current = 0
      void fetchPoses(0, false, controller.signal)
    }, DEBOUNCE_MS)

    return () => {
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
    // fetchPoses 는 [query, filterKey, pageSize] 로 안정화됨
  }, [query, filterKey, fetchPoses])

  // ─── loadMore — 무한 스크롤에서 호출 ─────────────────────────────────────

  const loadMore = useCallback(() => {
    if (isLoading) return
    if (results.length >= total) return

    const nextOffset = offset + pageSize
    setOffset(nextOffset)

    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller

    void fetchPoses(nextOffset, true, controller.signal)
  }, [isLoading, results.length, total, offset, pageSize, fetchPoses])

  // ─── refresh — 에러 후 재시도 버튼에서 호출 ─────────────────────────────

  const refresh = useCallback(() => {
    if (abortRef.current) {
      abortRef.current.abort()
    }
    const controller = new AbortController()
    abortRef.current = controller
    retryRef.current = 0
    setOffset(0)
    void fetchPoses(0, false, controller.signal)
  }, [fetchPoses])

  // ─── unmount 시 진행 중인 요청 정리 ──────────────────────────────────────

  useEffect(() => {
    return () => {
      if (abortRef.current) {
        abortRef.current.abort()
      }
      if (debounceRef.current !== null) {
        clearTimeout(debounceRef.current)
      }
    }
  }, [])

  const hasMore = results.length < total

  return {
    results,
    total,
    isLoading,
    isError,
    error,
    hasMore,
    loadMore,
    refresh,
    took_ms,
    recentQueries,
  }
}
