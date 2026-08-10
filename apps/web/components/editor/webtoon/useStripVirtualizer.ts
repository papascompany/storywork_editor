'use client'

/**
 * useStripVirtualizer — 웹툰 스트립 가상화 (MODE-04b / ADR-0017)
 *
 * ## 무엇을 푸는가
 * 웹툰 1화는 세그먼트 30~60개다. 전부 fabric 캔버스로 띄우면 메모리·렌더가 감당이 안 되고,
 * 스트립 전체를 캔버스 하나로 만드는 대안은 더 나쁘다(오프스크린 컬링 무효화 · Safari
 * 16384px 상한 · iOS 크래시 방어 계약 위반 — `editor-core/src/strip/geometry.ts` 주석 참조).
 *
 * 그래서 **화면 근처 K개만 살아 있는 캔버스**로 두고 나머지는 썸네일 이미지로 둔다.
 *
 * ## 히스테리시스가 필요한 이유
 * 진입/이탈 임계를 같은 값으로 두면 경계에서 스크롤을 조금만 흔들어도 캔버스가
 * 생성·파괴를 반복한다(플리커 + GC 압박). 진입은 좁게(보이는 범위), 이탈은 넓게
 * (여유 1칸 더) 잡아 경계에서 붙었다 떨어지는 것을 막는다.
 *
 * ## 활성 세그먼트는 항상 살린다
 * 사용자가 편집 중인 세그먼트가 스크롤 밖으로 나갔다고 캔버스를 내리면 선택·히스토리가
 * 날아간다. 라이브 집합에 활성 인덱스를 **고정(pin)** 한다.
 */

import { isCoarsePointer, stripLayout, visibleRange } from '@storywork/editor-core'
import type { StripLayout, StripSegment } from '@storywork/editor-core'
import { useEffect, useMemo, useRef, useState } from 'react'

/** 동시에 살려 둘 캔버스 수 — 모바일은 메모리가 빠듯해 더 좁게 */
export function liveWindowSize(): number {
  return isCoarsePointer() ? 2 : 3
}

/** 이탈 판정에 쓰는 추가 여유(세그먼트 수) — 진입보다 넓어야 경계 플리커가 없다 */
const RELEASE_SLACK = 1

export interface StripVirtualizerInput {
  segments: readonly StripSegment[]
  zoom: number
  /** 편집 중인 세그먼트 — 스크롤 밖으로 나가도 캔버스를 유지한다 */
  activeIndex: number
  /**
   * 스크롤 컨테이너 엘리먼트 (없으면 측정 불가 → 활성 세그먼트만 라이브).
   *
   * **ref 객체가 아니라 엘리먼트를 받는다.** ref 를 받으면 effect 의존성이 ref 객체(불변)라
   * 마운트 시 `current` 가 아직 null 이었을 때 영영 재시도하지 않는다 — 실제로 그렇게 만들었더니
   * 컨테이너 높이가 623px 인데도 훅은 0 으로 알고 스크롤을 따라가지 못했다(실측).
   * 소비 측은 callback ref + state 로 넘긴다.
   */
  scrollEl: HTMLElement | null
}

export interface StripVirtualizerResult {
  layout: StripLayout
  /** 실제 캔버스를 붙일 세그먼트 인덱스 (오름차순) */
  liveIndices: number[]
  /** 현재 스크롤 위치의 세그먼트 — 활성 전환 후보 */
  scrolledIndex: number
}

/**
 * 스크롤 위치를 관찰해 "살아 있어야 할 세그먼트" 집합을 계산한다.
 * 캔버스 생성/파괴는 이 훅이 하지 않는다 — 인덱스만 돌려주고 소비 측이 결정한다.
 */
export function useStripVirtualizer({
  segments,
  zoom,
  activeIndex,
  scrollEl,
}: StripVirtualizerInput): StripVirtualizerResult {
  const layout = useMemo(() => stripLayout(segments, zoom), [segments, zoom])

  const [scrollTop, setScrollTop] = useState(0)
  const [viewportHeight, setViewportHeight] = useState(0)
  /** 직전 라이브 집합 — 히스테리시스 판정의 기준 */
  const prevLiveRef = useRef<Set<number>>(new Set())

  // 스크롤·리사이즈 관찰 (rAF 로 프레임당 1회만 반영 — 스크롤 이벤트는 초당 수십 번 온다)
  useEffect(() => {
    const el = scrollEl
    if (!el) return

    let frame = 0
    const sync = () => {
      frame = 0
      setScrollTop(el.scrollTop)
      setViewportHeight(el.clientHeight)
    }
    const onScroll = () => {
      if (frame !== 0) return
      frame = requestAnimationFrame(sync)
    }

    sync()
    el.addEventListener('scroll', onScroll, { passive: true })

    const ro = new ResizeObserver(sync)
    ro.observe(el)

    return () => {
      if (frame !== 0) cancelAnimationFrame(frame)
      el.removeEventListener('scroll', onScroll)
      ro.disconnect()
    }
  }, [scrollEl])

  const liveIndices = useMemo(() => {
    const windowSize = liveWindowSize()
    const prev = prevLiveRef.current

    // 컨테이너를 아직 못 재면(초기 마운트) 활성 세그먼트만 띄운다
    if (viewportHeight === 0) {
      const only = [activeIndex].filter((i) => i >= 0 && i < segments.length)
      prevLiveRef.current = new Set(only)
      return only
    }

    const enter = visibleRange(layout, scrollTop, viewportHeight, 0)
    const release = visibleRange(layout, scrollTop, viewportHeight, RELEASE_SLACK)
    if (!enter || !release) {
      prevLiveRef.current = new Set()
      return []
    }

    const next = new Set<number>()
    // 활성 세그먼트는 무조건 유지 — 편집 중 선택/히스토리 보호
    if (activeIndex >= 0 && activeIndex < segments.length) next.add(activeIndex)

    // 진입: 화면에 실제로 걸친 것
    for (let i = enter.start; i <= enter.end; i++) next.add(i)

    // 유지: 직전에 살아 있었고 아직 이탈 범위 안이면 그대로 둔다(히스테리시스)
    for (const i of prev) {
      if (i >= release.start && i <= release.end) next.add(i)
    }

    // 상한 — 화면에서 먼 것부터 버린다
    const center = (enter.start + enter.end) / 2
    const sorted = [...next].sort((a, b) => Math.abs(a - center) - Math.abs(b - center) || a - b)
    const kept = new Set(sorted.slice(0, Math.max(windowSize, 1)))
    // 상한을 적용해도 활성은 남긴다
    if (activeIndex >= 0 && activeIndex < segments.length) kept.add(activeIndex)

    const result = [...kept].sort((a, b) => a - b)
    prevLiveRef.current = new Set(result)
    return result
  }, [layout, scrollTop, viewportHeight, activeIndex, segments.length])

  const scrolledIndex = useMemo(() => {
    if (layout.slots.length === 0) return 0
    const probe = scrollTop + viewportHeight / 2
    let candidate = 0
    for (const slot of layout.slots) {
      if (probe < slot.top) break
      candidate = slot.index
    }
    return candidate
  }, [layout, scrollTop, viewportHeight])

  return { layout, liveIndices, scrolledIndex }
}
