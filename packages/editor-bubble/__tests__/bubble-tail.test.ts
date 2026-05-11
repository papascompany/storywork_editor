import { describe, expect, it } from 'vitest'

import { computeTailPoints, tailPointsToLocal } from '../src/bubble-tail.js'
import type { BubbleBBox, Point } from '../src/bubble-tail.js'

// bubble: 100×50, 위치 (100, 200)
const BUBBLE: BubbleBBox = { left: 100, top: 200, width: 100, height: 50 }

describe('computeTailPoints', () => {
  it('아래 target → 꼬리 tip 이 bubble 아래에 있다', () => {
    const target: Point = { x: 150, y: 350 } // bubble 아래
    const tail = computeTailPoints(BUBBLE, target)
    // tip.y 는 bubble bottom (250) 보다 아래
    expect(tail.tip.y).toBeGreaterThan(250)
  })

  it('위 target → 꼬리 tip 이 bubble 위에 있다', () => {
    const target: Point = { x: 150, y: 100 } // bubble 위
    const tail = computeTailPoints(BUBBLE, target)
    expect(tail.tip.y).toBeLessThan(200)
  })

  it('좌 target → 꼬리 tip 이 bubble 좌측에 있다', () => {
    const target: Point = { x: 20, y: 225 } // bubble 좌
    const tail = computeTailPoints(BUBBLE, target)
    expect(tail.tip.x).toBeLessThan(100)
  })

  it('우 target → 꼬리 tip 이 bubble 우측에 있다', () => {
    const target: Point = { x: 280, y: 225 } // bubble 우
    const tail = computeTailPoints(BUBBLE, target)
    expect(tail.tip.x).toBeGreaterThan(200)
  })

  it('base1, base2 는 bubble 변 위에 있다 (허용 오차 내)', () => {
    const target: Point = { x: 150, y: 350 }
    const tail = computeTailPoints(BUBBLE, target)
    // bottom 변에서 나오므로 base1.y, base2.y ≈ 250
    expect(Math.abs(tail.base1.y - 250)).toBeLessThan(5)
    expect(Math.abs(tail.base2.y - 250)).toBeLessThan(5)
  })

  it('base1, base2 는 서로 다른 위치에 있다', () => {
    const target: Point = { x: 150, y: 350 }
    const tail = computeTailPoints(BUBBLE, target)
    expect(tail.base1.x).not.toBe(tail.base2.x)
  })

  it('tailLength 옵션 적용 시 더 긴 꼬리', () => {
    const target: Point = { x: 150, y: 400 }
    const short = computeTailPoints(BUBBLE, target, { tailLength: 20 })
    const long = computeTailPoints(BUBBLE, target, { tailLength: 60 })
    expect(long.tip.y).toBeGreaterThan(short.tip.y)
  })

  it('target 이 bbox 안에 있어도 crash 없음', () => {
    const insideTarget: Point = { x: 150, y: 225 }
    expect(() => computeTailPoints(BUBBLE, insideTarget)).not.toThrow()
  })
})

describe('tailPointsToLocal', () => {
  it('절대 좌표에서 group local 좌표로 변환', () => {
    const target: Point = { x: 150, y: 350 }
    const absTail = computeTailPoints(BUBBLE, target)
    const local = tailPointsToLocal(absTail, 100, 200)

    // local 좌표 = 절대 좌표 - (100, 200)
    expect(local.base1.x).toBeCloseTo(absTail.base1.x - 100, 2)
    expect(local.base1.y).toBeCloseTo(absTail.base1.y - 200, 2)
    expect(local.tip.x).toBeCloseTo(absTail.tip.x - 100, 2)
    expect(local.tip.y).toBeCloseTo(absTail.tip.y - 200, 2)
  })
})
