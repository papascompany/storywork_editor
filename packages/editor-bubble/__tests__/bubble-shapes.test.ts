import { describe, expect, it } from 'vitest'

import {
  BUBBLE_SHAPE_LABELS,
  BUBBLE_SHAPES,
  buildBubbleBodyPath,
  shapeHasTail,
} from '../src/bubble-shapes.js'
import type { BubbleShape } from '../src/bubble-shapes.js'

describe('BUBBLE_SHAPES', () => {
  it('5종 모양이 모두 포함된다', () => {
    expect(BUBBLE_SHAPES).toContain('rounded-rect')
    expect(BUBBLE_SHAPES).toContain('cloud')
    expect(BUBBLE_SHAPES).toContain('spike')
    expect(BUBBLE_SHAPES).toContain('oval')
    expect(BUBBLE_SHAPES).toContain('caption')
    expect(BUBBLE_SHAPES.length).toBe(5)
  })
})

describe('BUBBLE_SHAPE_LABELS', () => {
  it('모든 모양의 한국어 레이블이 있다', () => {
    for (const shape of BUBBLE_SHAPES) {
      expect(BUBBLE_SHAPE_LABELS[shape]).toBeTruthy()
    }
  })
})

describe('buildBubbleBodyPath', () => {
  const W = 200
  const H = 100

  it('rounded-rect: M 으로 시작하고 Z 로 끝난다', () => {
    const path = buildBubbleBodyPath('rounded-rect', W, H)
    expect(path).toMatch(/^M /)
    expect(path.endsWith('Z')).toBe(true)
  })

  it('cloud: M 으로 시작하고 Z 로 끝난다', () => {
    const path = buildBubbleBodyPath('cloud', W, H)
    expect(path).toMatch(/^M /)
    expect(path.endsWith('Z')).toBe(true)
  })

  it('spike: M 으로 시작하고 Z 로 끝난다', () => {
    const path = buildBubbleBodyPath('spike', W, H)
    expect(path).toMatch(/^M /)
    expect(path.endsWith('Z')).toBe(true)
  })

  it('oval: M 으로 시작하고 Z 로 끝난다', () => {
    const path = buildBubbleBodyPath('oval', W, H)
    expect(path).toMatch(/^M /)
    expect(path.endsWith('Z')).toBe(true)
  })

  it('caption: M 0 0 으로 시작하는 직사각형이다', () => {
    const path = buildBubbleBodyPath('caption', W, H)
    expect(path).toMatch(/^M 0 0/)
    expect(path.endsWith('Z')).toBe(true)
  })

  it('5종 모두 빈 문자열이 아니다', () => {
    for (const shape of BUBBLE_SHAPES) {
      const path = buildBubbleBodyPath(shape, W, H)
      expect(path.length).toBeGreaterThan(0)
    }
  })

  it('너비/높이가 0일 때 crash 없음', () => {
    for (const shape of BUBBLE_SHAPES) {
      expect(() => buildBubbleBodyPath(shape, 0, 0)).not.toThrow()
    }
  })
})

describe('shapeHasTail', () => {
  it('caption 은 꼬리가 없다', () => {
    expect(shapeHasTail('caption')).toBe(false)
  })

  it('나머지 4종은 꼬리가 있다', () => {
    const tailShapes: BubbleShape[] = ['rounded-rect', 'cloud', 'spike', 'oval']
    for (const shape of tailShapes) {
      expect(shapeHasTail(shape)).toBe(true)
    }
  })
})
