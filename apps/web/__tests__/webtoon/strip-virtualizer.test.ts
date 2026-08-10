/**
 * strip-virtualizer.test.ts — 웹툰 스트립 가상화 (MODE-04b)
 *
 * 검증 항목:
 *  - 활성 세그먼트는 스크롤 밖이어도 살아 있다 (편집 중 선택·히스토리 보호)
 *  - 라이브 캔버스 수가 창 크기 상한을 지킨다 (메모리 예산)
 *  - 컨테이너 측정 전에는 활성만 — 초기 마운트에 캔버스를 쏟아내지 않는다
 *  - 스크롤에 따라 라이브 집합이 따라 이동한다
 */
import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  liveWindowSize,
  useStripVirtualizer,
} from '../../components/editor/webtoon/useStripVirtualizer'

/** jsdom 은 ResizeObserver 가 없다 — 관찰 자체는 이 테스트의 대상이 아니다 */
class ResizeObserverStub {
  observe(): void {}
  disconnect(): void {}
}
vi.stubGlobal('ResizeObserver', ResizeObserverStub)

const SEGMENTS = Array.from({ length: 20 }, () => ({ heightPx: 1280 }))

/** scrollTop/clientHeight 를 가진 가짜 스크롤 컨테이너 (훅은 ref 가 아니라 엘리먼트를 받는다) */
function makeScrollEl(scrollTop: number, clientHeight: number): HTMLElement {
  return {
    scrollTop,
    clientHeight,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  } as unknown as HTMLElement
}

describe('useStripVirtualizer — 라이브 창', () => {
  it('컨테이너를 재기 전에는 활성 세그먼트만 띄운다', () => {
    // clientHeight=0 → 초기 마운트. 캔버스를 20개 만들면 즉시 메모리가 터진다
    const { result } = renderHook(() =>
      useStripVirtualizer({
        segments: SEGMENTS,
        zoom: 1,
        activeIndex: 7,
        scrollEl: makeScrollEl(0, 0),
      }),
    )
    expect(result.current.liveIndices).toEqual([7])
  })

  it('라이브 캔버스 수가 창 상한을 넘지 않는다 (활성 pin 은 예외)', () => {
    const { result } = renderHook(() =>
      useStripVirtualizer({
        segments: SEGMENTS,
        zoom: 1,
        activeIndex: 0,
        scrollEl: makeScrollEl(0, 900),
      }),
    )
    // 활성이 화면 안이면 정확히 상한, 밖이면 상한+1(pin)
    expect(result.current.liveIndices.length).toBeLessThanOrEqual(liveWindowSize() + 1)
  })

  it('활성 세그먼트는 화면 밖이어도 유지된다', () => {
    // 스크롤은 맨 위인데 활성은 15번 — 편집 중 스크롤을 내렸다 올린 상황
    const { result } = renderHook(() =>
      useStripVirtualizer({
        segments: SEGMENTS,
        zoom: 1,
        activeIndex: 15,
        scrollEl: makeScrollEl(0, 900),
      }),
    )
    expect(result.current.liveIndices).toContain(15)
  })

  it('스크롤 위치의 세그먼트를 활성 후보로 알려준다', () => {
    const perSegment = 1280 + 24 // 세그먼트 + 간격
    const { result } = renderHook(() =>
      useStripVirtualizer({
        segments: SEGMENTS,
        zoom: 1,
        activeIndex: 0,
        scrollEl: makeScrollEl(perSegment * 3, 900),
      }),
    )
    expect(result.current.scrolledIndex).toBe(3)
  })

  it('레이아웃 총 높이가 세그먼트 수를 반영한다', () => {
    const { result } = renderHook(() =>
      useStripVirtualizer({
        segments: SEGMENTS,
        zoom: 1,
        activeIndex: 0,
        scrollEl: makeScrollEl(0, 900),
      }),
    )
    expect(result.current.layout.slots).toHaveLength(20)
    expect(result.current.layout.totalHeight).toBeGreaterThan(1280 * 20)
  })

  it('빈 스트립도 죽지 않는다', () => {
    const { result } = renderHook(() =>
      useStripVirtualizer({
        segments: [],
        zoom: 1,
        activeIndex: 0,
        scrollEl: makeScrollEl(0, 900),
      }),
    )
    expect(result.current.liveIndices).toEqual([])
    expect(result.current.layout.totalHeight).toBe(0)
  })
})
