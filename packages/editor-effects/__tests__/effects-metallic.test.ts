import { describe, expect, it, vi } from 'vitest'

import { metallicEffects } from '../src/index.js'

vi.mock('fabric', () => ({
  Shadow: class MockShadow {
    color: string
    blur: number
    offsetX: number
    offsetY: number
    constructor(opts: { color: string; blur: number; offsetX: number; offsetY: number }) {
      this.color = opts.color
      this.blur = opts.blur
      this.offsetX = opts.offsetX
      this.offsetY = opts.offsetY
    }
  },
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
    shadow: null,
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

describe('metalGold', () => {
  it('apply: fill 이 Gradient 인스턴스다', async () => {
    const t = makeMockTarget()
    await metallicEffects.metalGold.apply(t)
    expect(typeof t.state.fill).toBe('object')
  })

  it('apply: shadow 도 설정된다', async () => {
    const t = makeMockTarget()
    await metallicEffects.metalGold.apply(t)
    expect(t.state.shadow).not.toBeNull()
  })

  it('unapply: fill 이 문자열로 복원된다', async () => {
    const t = makeMockTarget()
    await metallicEffects.metalGold.apply(t)
    await metallicEffects.metalGold.unapply(t)
    expect(typeof t.state.fill).toBe('string')
    expect(t.state.shadow).toBeNull()
  })
})

describe('metalChrome', () => {
  it('apply: 6개 이상의 colorStop (복잡한 크롬 효과)', async () => {
    const t = makeMockTarget()
    await metallicEffects.metalChrome.apply(t)
    const fill = t.state.fill as { colorStops: { offset: number; color: string }[] }
    expect(fill.colorStops.length).toBeGreaterThanOrEqual(6)
  })
})

describe('metallic 라운드트립', () => {
  it('apply → unapply 모든 metallic 효과', async () => {
    for (const effect of Object.values(metallicEffects)) {
      const t = makeMockTarget()
      await effect.apply(t)
      expect(typeof t.state.fill, `${effect.id} apply fill`).toBe('object')
      expect(t.state.shadow, `${effect.id} apply shadow`).not.toBeNull()
      await effect.unapply(t)
      expect(typeof t.state.fill, `${effect.id} unapply fill`).toBe('string')
      expect(t.state.shadow, `${effect.id} unapply shadow`).toBeNull()
    }
  })
})
