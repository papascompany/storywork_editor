/**
 * strip-geometry.test.ts — 웹툰 세로 스트립 기하 (MODE-04b)
 *
 * 검증 항목:
 *  - stripLayout: 세그먼트 간격 누적, 마지막 간격은 콘텐츠 높이에서 제외, 줌 반영
 *  - visibleRange: 화면에 걸치는 범위 + overscan, 간격에만 걸친 경우 폴백
 *  - segmentAtScroll / scrollToSegment: 활성 전환 좌표
 *  - fitStripWidth: 폭 맞춤(확대 없음)
 *  - 결정론 — 스트립 좌표는 순수 산술이다
 */
import { describe, expect, it } from 'vitest'

import {
  fitStripWidth,
  scrollToSegment,
  segmentAtScroll,
  stripLayout,
  visibleRange,
  STRIP_GAP_PX,
} from '../src/strip/geometry.js'
import type { StripSegment } from '../src/strip/geometry.js'

/** 웹툰 표준 세그먼트 1280px × 5 */
const SEGMENTS: StripSegment[] = Array.from({ length: 5 }, () => ({ heightPx: 1280 }))

describe('stripLayout()', () => {
  it('세그먼트를 간격만큼 띄워 세로로 쌓는다', () => {
    const { slots } = stripLayout(SEGMENTS, 1)
    expect(slots[0]).toEqual({ index: 0, top: 0, height: 1280 })
    expect(slots[1]?.top).toBe(1280 + STRIP_GAP_PX)
    expect(slots[2]?.top).toBe((1280 + STRIP_GAP_PX) * 2)
  })

  it('콘텐츠 높이에 마지막 간격은 포함하지 않는다', () => {
    const { totalHeight } = stripLayout(SEGMENTS, 1)
    expect(totalHeight).toBe(1280 * 5 + STRIP_GAP_PX * 4)
  })

  it('줌은 높이에만 곱해진다 (간격은 화면 고정)', () => {
    const { slots } = stripLayout(SEGMENTS, 0.5)
    expect(slots[0]?.height).toBe(640)
    expect(slots[1]?.top).toBe(640 + STRIP_GAP_PX)
  })

  it('빈 스트립은 높이 0', () => {
    expect(stripLayout([], 1)).toEqual({ slots: [], totalHeight: 0 })
  })

  it('세그먼트 높이가 달라도 누적된다', () => {
    const { slots } = stripLayout([{ heightPx: 100 }, { heightPx: 300 }], 1)
    expect(slots[1]?.top).toBe(100 + STRIP_GAP_PX)
    expect(slots[1]?.height).toBe(300)
  })
})

describe('visibleRange()', () => {
  const layout = stripLayout(SEGMENTS, 1)

  it('화면에 걸친 세그먼트 + overscan 을 돌려준다', () => {
    // 스크롤 0, 뷰포트 800 → 0번만 걸침 → overscan 1 → [0,1]
    expect(visibleRange(layout, 0, 800)).toEqual({ start: 0, end: 1 })
  })

  it('두 세그먼트에 걸치면 둘 다 포함한다', () => {
    // 1000~2800: 0번(0~1280)과 1번(1304~2584)에 걸침
    const r = visibleRange(layout, 1000, 1800)
    expect(r?.start).toBe(0) // 0 - overscan → 0 으로 클램프
    expect(r?.end).toBeGreaterThanOrEqual(2)
  })

  it('overscan 0 이면 걸친 것만', () => {
    expect(visibleRange(layout, 0, 800, 0)).toEqual({ start: 0, end: 0 })
  })

  it('범위는 항상 유효 인덱스 안으로 클램프된다', () => {
    const r = visibleRange(layout, layout.totalHeight - 100, 800)
    expect(r?.end).toBeLessThanOrEqual(SEGMENTS.length - 1)
    expect(r?.start).toBeGreaterThanOrEqual(0)
  })

  it('세그먼트 사이 간격에만 걸쳐도 빈 결과를 내지 않는다', () => {
    // 1280~1304 는 0번과 1번 사이 간격
    const r = visibleRange(layout, 1282, 10, 0)
    expect(r).not.toBeNull()
  })

  it('빈 스트립은 null', () => {
    expect(visibleRange(stripLayout([], 1), 0, 800)).toBeNull()
  })
})

describe('segmentAtScroll()', () => {
  const layout = stripLayout(SEGMENTS, 1)

  it('세그먼트 영역 안이면 그 인덱스', () => {
    expect(segmentAtScroll(layout, 0)).toBe(0)
    expect(segmentAtScroll(layout, 1279)).toBe(0)
    expect(segmentAtScroll(layout, 1400)).toBe(1)
  })

  it('간격 위면 직전 세그먼트 (스크롤을 내리는 중)', () => {
    expect(segmentAtScroll(layout, 1290)).toBe(0)
  })

  it('빈 스트립은 null', () => {
    expect(segmentAtScroll(stripLayout([], 1), 0)).toBeNull()
  })
})

describe('scrollToSegment()', () => {
  const layout = stripLayout(SEGMENTS, 1)

  it('이미 전부 보이면 스크롤을 건드리지 않는다 (불필요한 점프 방지)', () => {
    expect(scrollToSegment(layout, 0, 0, 1400)).toBe(0)
  })

  it('화면 밖 세그먼트는 상단에 맞춘다', () => {
    const top = scrollToSegment(layout, 2, 0, 800)
    expect(top).toBeCloseTo((1280 + STRIP_GAP_PX) * 2 - STRIP_GAP_PX / 2, 6)
  })

  it('음수 스크롤은 만들지 않는다', () => {
    expect(scrollToSegment(layout, 0, 5000, 800)).toBeGreaterThanOrEqual(0)
  })

  it('없는 인덱스는 현재 스크롤 유지', () => {
    expect(scrollToSegment(layout, 99, 123, 800)).toBe(123)
  })
})

describe('fitStripWidth()', () => {
  it('컨테이너에 맞춰 줄인다', () => {
    expect(fitStripWidth(690, 400, 32)).toBeCloseTo((400 - 64) / 690, 9)
  })

  it('확대는 하지 않는다 (1.0 상한)', () => {
    expect(fitStripWidth(690, 2000)).toBe(1)
  })

  it('컨테이너가 패딩보다 작아도 0 이하를 내지 않는다', () => {
    expect(fitStripWidth(690, 10)).toBeGreaterThan(0)
  })
})

describe('결정론', () => {
  it('같은 입력 → 같은 레이아웃', () => {
    expect(stripLayout(SEGMENTS, 0.75)).toEqual(stripLayout(SEGMENTS, 0.75))
  })
})
