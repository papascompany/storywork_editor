/**
 * format-conversion.test.ts — formatToPx + computeFitZoom 단위 테스트
 *
 * FOLLOWUP-42: mm → px 변환 헬퍼 검증
 */

import { describe, it, expect } from 'vitest'

import { formatToPx, computeFitZoom, mmToPx } from '../../components/editor/lib/format-conversion'

// ─── 프리셋 상수 ───────────────────────────────────────────────────────────────

const B5 = { widthMm: 130, heightMm: 200, dpi: 300, bleedMm: 3, safeMm: 5 }
const A5 = { widthMm: 148, heightMm: 210, dpi: 300, bleedMm: 3, safeMm: 5 }
const SQUARE = { widthMm: 150, heightMm: 150, dpi: 300, bleedMm: 3, safeMm: 5 }
const MOBILE = { widthMm: 90, heightMm: 150, dpi: 300, bleedMm: 3, safeMm: 5 }

// ─── mmToPx ────────────────────────────────────────────────────────────────────

describe('mmToPx', () => {
  it('1 inch(25.4mm) → dpi px (정수 round)', () => {
    expect(mmToPx(25.4, 300)).toBe(300)
    expect(mmToPx(25.4, 72)).toBe(72)
  })

  it('0mm → 0px', () => {
    expect(mmToPx(0, 300)).toBe(0)
  })

  it('소수 mm 도 올바르게 변환된다', () => {
    // 1mm @300dpi = 300/25.4 ≈ 11.811... → round → 12
    expect(mmToPx(1, 300)).toBe(12)
  })
})

// ─── formatToPx ────────────────────────────────────────────────────────────────

describe('formatToPx', () => {
  describe('B5 단행본 (130×200mm @300dpi)', () => {
    const result = formatToPx(B5)

    it('widthPx 정수값', () => {
      // 130 * 300 / 25.4 ≈ 1535.43... → round → 1535
      expect(result.widthPx).toBe(1535)
    })

    it('heightPx 정수값', () => {
      // 200 * 300 / 25.4 ≈ 2362.20... → round → 2362
      expect(result.heightPx).toBe(2362)
    })

    it('dpi 보존', () => {
      expect(result.dpi).toBe(300)
    })

    it('bleedPx 계산', () => {
      // 3 * 300 / 25.4 ≈ 35.43... → round → 35
      expect(result.bleedPx).toBe(35)
    })

    it('safePx 계산', () => {
      // 5 * 300 / 25.4 ≈ 59.05... → round → 59
      expect(result.safePx).toBe(59)
    })
  })

  describe('A5 작품집 (148×210mm @300dpi)', () => {
    const result = formatToPx(A5)

    it('widthPx', () => {
      // 148 * 300 / 25.4 ≈ 1748.03... → round → 1748
      expect(result.widthPx).toBe(1748)
    })

    it('heightPx', () => {
      // 210 * 300 / 25.4 ≈ 2480.31... → round → 2480
      expect(result.heightPx).toBe(2480)
    })
  })

  describe('정사각 1:1 (150×150mm @300dpi)', () => {
    const result = formatToPx(SQUARE)

    it('widthPx === heightPx (정사각형)', () => {
      expect(result.widthPx).toBe(result.heightPx)
    })

    it('widthPx', () => {
      // 150 * 300 / 25.4 ≈ 1771.65... → round → 1772
      expect(result.widthPx).toBe(1772)
    })
  })

  describe('세로형 모바일 (90×150mm @300dpi)', () => {
    const result = formatToPx(MOBILE)

    it('widthPx < heightPx (세로형)', () => {
      expect(result.widthPx).toBeLessThan(result.heightPx)
    })

    it('widthPx', () => {
      // 90 * 300 / 25.4 ≈ 1062.99... → round → 1063
      expect(result.widthPx).toBe(1063)
    })
  })
})

// ─── computeFitZoom ────────────────────────────────────────────────────────────

describe('computeFitZoom', () => {
  it('정사각 페이지, 가로가 작은 컨테이너 → scaleX 기준 줌', () => {
    const canvasSize = formatToPx(SQUARE)
    // 컨테이너 800×1000 — 가로가 제약
    const zoom = computeFitZoom(canvasSize, { width: 800, height: 1000 }, 32)
    // availW = 800-64 = 736, availH = 1000-64 = 936
    // scaleX = 736/1772 ≈ 0.415, scaleY = 936/1772 ≈ 0.528
    // min(0.415, 0.528, 1) = 0.415
    expect(zoom).toBeCloseTo(736 / 1772, 2)
  })

  it('정사각 페이지, 세로가 작은 컨테이너 → scaleY 기준 줌', () => {
    const canvasSize = formatToPx(SQUARE)
    // 컨테이너 1000×600 — 세로가 제약
    const zoom = computeFitZoom(canvasSize, { width: 1000, height: 600 }, 32)
    // availW = 936, availH = 536
    // scaleX = 936/1772 ≈ 0.528, scaleY = 536/1772 ≈ 0.302
    expect(zoom).toBeCloseTo(536 / 1772, 2)
  })

  it('컨테이너가 페이지보다 훨씬 크면 1.0 을 초과하지 않는다', () => {
    const canvasSize = formatToPx(SQUARE)
    const zoom = computeFitZoom(canvasSize, { width: 10000, height: 10000 }, 32)
    expect(zoom).toBeLessThanOrEqual(1)
  })

  it('B5 세로형 — 가로 컨테이너에서 세로 비율이 제약', () => {
    const canvasSize = formatToPx(B5)
    // 1200×900 컨테이너, padding=32
    const zoom = computeFitZoom(canvasSize, { width: 1200, height: 900 }, 32)
    const availW = 1200 - 64
    const availH = 900 - 64
    const expected = Math.min(availW / canvasSize.widthPx, availH / canvasSize.heightPx, 1)
    expect(zoom).toBeCloseTo(expected, 5)
  })

  it('padding 기본값(32) 과 커스텀 값(0) 의 차이', () => {
    const canvasSize = formatToPx(SQUARE)
    const container = { width: 800, height: 800 }
    const zoomDefault = computeFitZoom(canvasSize, container)
    const zoomNoPad = computeFitZoom(canvasSize, container, 0)
    // 패딩 없으면 여백이 없으므로 더 크게 줌
    expect(zoomNoPad).toBeGreaterThanOrEqual(zoomDefault)
  })
})
