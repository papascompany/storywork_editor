/**
 * coords-unit.test.ts — 판형 단위계(mm/px) 좌표 변환 (MODE-04 / ADR-0017)
 *
 * 검증 항목:
 *  - coordDpi: mm 판형은 판형 dpi, px 판형은 25.4(항등 변환)
 *  - px 판형에서 mmToPx/pxToMm 가 1:1 — 웹툰 좌표는 이미 픽셀이다
 *  - formatPxSize: px 판형 690×1280 이 그대로 690×1280 캔버스
 *  - StoryCanvas 인스턴스 변환이 단위계를 따른다 (60여 호출처가 이 메서드를 쓴다)
 *  - mm 경로 무회귀 — unit 생략은 종전과 동일
 */
import { describe, expect, it } from 'vitest'

import { coordDpi, formatPxSize, mmToPx, pxToMm } from '../src/canvas/coords.js'
import { StoryCanvas } from '../src/canvas/StoryCanvas.js'
import type { Format } from '../src/types.js'

/** 웹툰 표준 690px — 시드 preset-webtoon-690 과 동일 (dpi 72 는 화면 표기용) */
const WEBTOON: Format = {
  id: 'preset-webtoon-690',
  unit: 'px',
  widthMm: 690,
  heightMm: 1280,
  dpi: 72,
}
const B5: Format = { id: 'preset-b5-novel', widthMm: 130, heightMm: 200, dpi: 300 }
const B5_EXPLICIT: Format = { ...B5, unit: 'mm' }

describe('coordDpi()', () => {
  it('mm 판형은 판형 dpi 를 그대로 쓴다', () => {
    expect(coordDpi(B5)).toBe(300)
    expect(coordDpi(B5_EXPLICIT)).toBe(300)
  })

  it('px 판형은 25.4 — mm↔px 변환을 항등으로 만든다', () => {
    expect(coordDpi(WEBTOON)).toBe(25.4)
  })

  it('unit 생략은 mm 취급 (하위호환)', () => {
    expect(coordDpi({ dpi: 150 })).toBe(150)
  })
})

describe('px 판형 좌표 변환 — 1:1', () => {
  const dpi = coordDpi(WEBTOON)

  it('mmToPx 가 값을 바꾸지 않는다', () => {
    for (const v of [0, 1, 345, 690, 1280]) {
      expect(mmToPx(v, dpi)).toBeCloseTo(v, 9)
    }
  })

  it('pxToMm 도 값을 바꾸지 않는다', () => {
    for (const v of [0, 12.5, 690, 1280]) {
      expect(pxToMm(v, dpi)).toBeCloseTo(v, 9)
    }
  })

  it('캔버스 크기가 판형 픽셀값 그대로다 (690mm 로 오해하면 1954px 이 된다)', () => {
    expect(formatPxSize(WEBTOON)).toEqual({ width: 690, height: 1280 })
  })
})

describe('mm 판형 무회귀', () => {
  it('B5 300dpi 는 종전 환산을 유지한다', () => {
    const { width, height } = formatPxSize(B5)
    expect(width).toBe(Math.round((130 * 300) / 25.4))
    expect(height).toBe(Math.round((200 * 300) / 25.4))
  })

  it('25.4mm = dpi 픽셀', () => {
    expect(mmToPx(25.4, coordDpi(B5))).toBeCloseTo(300, 6)
  })
})

describe('StoryCanvas — 단위계 인지 (헤드리스)', () => {
  it('px 판형 캔버스의 인스턴스 변환은 1:1', () => {
    const canvas = new StoryCanvas({ format: WEBTOON })
    expect(canvas.mmToPx(690)).toBeCloseTo(690, 9)
    expect(canvas.pxToMm(1280)).toBeCloseTo(1280, 9)
    canvas.dispose()
  })

  it('mm 판형 캔버스는 종전대로 dpi 환산', () => {
    const canvas = new StoryCanvas({ format: B5 })
    expect(canvas.mmToPx(25.4)).toBeCloseTo(300, 6)
    canvas.dispose()
  })

  it('setFormat 으로 mm → px 전환 시 변환 기준도 바뀐다', () => {
    const canvas = new StoryCanvas({ format: B5 })
    expect(canvas.mmToPx(100)).toBeGreaterThan(100)
    canvas.setFormat(WEBTOON)
    expect(canvas.mmToPx(100)).toBeCloseTo(100, 9)
    expect(canvas.format.unit).toBe('px')
    canvas.dispose()
  })
})
