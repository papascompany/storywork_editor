import { describe, expect, it } from 'vitest'

import { mmToPx, pxToMm, formatToPxSize } from '../src/canvas/coords.js'

describe('좌표 변환 (mm ↔ px)', () => {
  describe('mmToPx', () => {
    it('150dpi 에서 25.4mm = 150px', () => {
      expect(mmToPx(25.4, 150)).toBeCloseTo(150, 5)
    })

    it('300dpi 에서 25.4mm = 300px', () => {
      expect(mmToPx(25.4, 300)).toBeCloseTo(300, 5)
    })

    it('72dpi 에서 25.4mm = 72px', () => {
      expect(mmToPx(25.4, 72)).toBeCloseTo(72, 5)
    })

    it('0mm 는 0px', () => {
      expect(mmToPx(0, 300)).toBe(0)
    })
  })

  describe('pxToMm', () => {
    it('150px / 150dpi = 25.4mm', () => {
      expect(pxToMm(150, 150)).toBeCloseTo(25.4, 5)
    })

    it('300px / 300dpi = 25.4mm', () => {
      expect(pxToMm(300, 300)).toBeCloseTo(25.4, 5)
    })

    it('0px 는 0mm', () => {
      expect(pxToMm(0, 150)).toBe(0)
    })
  })

  describe('라운드트립 (mm → px → mm)', () => {
    const dpiList = [72, 96, 150, 300]
    const mmValues = [0, 1, 10, 25.4, 100, 182, 257, 297]

    for (const dpi of dpiList) {
      for (const mm of mmValues) {
        it(`${mm}mm at ${dpi}dpi`, () => {
          const px = mmToPx(mm, dpi)
          const restored = pxToMm(px, dpi)
          expect(restored).toBeCloseTo(mm, 10)
        })
      }
    }
  })

  describe('formatToPxSize', () => {
    it('B5 150dpi 크기 계산', () => {
      const { width, height } = formatToPxSize(182, 257, 150)
      // 182 * 150 / 25.4 ≈ 1075px, 257 * 150 / 25.4 ≈ 1517px
      expect(width).toBeGreaterThan(1070)
      expect(width).toBeLessThan(1085)
      expect(height).toBeGreaterThan(1510)
      expect(height).toBeLessThan(1525)
    })

    it('A4 300dpi 크기 계산', () => {
      const { width, height } = formatToPxSize(210, 297, 300)
      // 210 * 300 / 25.4 ≈ 2480px, 297 * 300 / 25.4 ≈ 3508px
      expect(width).toBeGreaterThan(2475)
      expect(width).toBeLessThan(2485)
      expect(height).toBeGreaterThan(3503)
      expect(height).toBeLessThan(3513)
    })
  })
})
