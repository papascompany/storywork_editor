import { describe, expect, it, vi } from 'vitest'

import { gradientEffects } from '../src/index.js'

vi.mock('fabric', () => ({
  Gradient: class MockGradient {
    type: string
    coords: unknown
    colorStops: { offset: number; color: string }[]
    constructor(opts: {
      type: string
      coords: unknown
      colorStops: { offset: number; color: string }[]
    }) {
      this.type = opts.type
      this.coords = opts.coords
      this.colorStops = opts.colorStops
    }
  },
}))

function makeMockTarget() {
  const state: Record<string, unknown> = {
    dirty: false,
    fill: '#000000',
    objectCaching: false,
    data: { appliedEffects: [] },
  }
  return {
    set(props: Record<string, unknown>) {
      Object.assign(state, props)
    },
    get state() {
      return state
    },
    get dirty() {
      return state.dirty as boolean
    },
    set dirty(v: boolean) {
      state.dirty = v
    },
  }
}

describe('gradientWarm', () => {
  it('apply: fill 이 Gradient 인스턴스가 된다', async () => {
    const t = makeMockTarget()
    await gradientEffects.gradientWarm.apply(t)
    expect(t.state.fill).toBeInstanceOf(Object)
    // MockGradient 인스턴스
    const fill = t.state.fill as { type: string; colorStops: { offset: number; color: string }[] }
    expect(fill.type).toBe('linear')
    expect(fill.colorStops.length).toBeGreaterThanOrEqual(2)
  })

  it('apply: objectCaching 이 true 다', async () => {
    const t = makeMockTarget()
    await gradientEffects.gradientWarm.apply(t)
    expect(t.state.objectCaching).toBe(true)
  })

  it('unapply: fill 이 문자열로 복원된다', async () => {
    const t = makeMockTarget()
    await gradientEffects.gradientWarm.apply(t)
    await gradientEffects.gradientWarm.unapply(t)
    expect(typeof t.state.fill).toBe('string')
  })
})

describe('gradientRainbow', () => {
  it('apply: 7개 이상의 colorStop 이 있다', async () => {
    const t = makeMockTarget()
    await gradientEffects.gradientRainbow.apply(t)
    const fill = t.state.fill as { colorStops: { offset: number; color: string }[] }
    expect(fill.colorStops.length).toBeGreaterThanOrEqual(7)
  })
})

describe('gradient 라운드트립', () => {
  it('apply → unapply 모든 gradient 효과', async () => {
    for (const effect of Object.values(gradientEffects)) {
      const t = makeMockTarget()
      await effect.apply(t)
      // Gradient 인스턴스 (객체)
      expect(typeof t.state.fill).toBe('object')
      await effect.unapply(t)
      expect(typeof t.state.fill).toBe('string')
    }
  })
})
