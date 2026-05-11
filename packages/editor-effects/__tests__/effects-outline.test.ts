import { describe, expect, it, vi } from 'vitest'

import { outlineEffects } from '../src/index.js'

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
}))

function makeMockTarget() {
  const state: Record<string, unknown> = {
    dirty: false,
    stroke: null,
    strokeWidth: 0,
    strokeDashArray: null,
    paintFirst: 'fill',
    shadow: null,
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
    get data() {
      return state.data as { appliedEffects?: string[] }
    },
  }
}

describe('outlineSingleThin', () => {
  it('apply: stroke 가 설정된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(t)
    expect(t.state.stroke).toBeTruthy()
  })

  it('apply: strokeWidth > 0', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(t)
    expect(t.state.strokeWidth as number).toBeGreaterThan(0)
  })

  it('apply: paintFirst 가 stroke 다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(t)
    expect(t.state.paintFirst).toBe('stroke')
  })

  it('unapply: stroke 가 null 이 된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(t)
    await outlineEffects.outlineSingleThin.unapply(t)
    expect(t.state.stroke).toBeNull()
    expect(t.state.strokeWidth).toBe(0)
  })

  it('apply opts.color 가 반영된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(t, { color: '#ff0000' })
    expect(t.state.stroke).toBe('#ff0000')
  })

  it('apply opts.size 가 strokeWidth 에 반영된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(t, { size: 5 })
    expect(t.state.strokeWidth).toBe(5)
  })
})

describe('outlineSingleBold', () => {
  it('apply: thin 보다 strokeWidth 가 크다', async () => {
    const thin = makeMockTarget()
    const bold = makeMockTarget()
    await outlineEffects.outlineSingleThin.apply(thin)
    await outlineEffects.outlineSingleBold.apply(bold)
    expect(bold.state.strokeWidth as number).toBeGreaterThan(thin.state.strokeWidth as number)
  })
})

describe('outlineDashed', () => {
  it('apply: strokeDashArray 가 설정된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineDashed.apply(t)
    expect(Array.isArray(t.state.strokeDashArray)).toBe(true)
    expect((t.state.strokeDashArray as number[]).length).toBeGreaterThan(0)
  })
})

describe('outlineGlow', () => {
  it('apply: stroke 와 shadow 모두 설정된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineGlow.apply(t)
    expect(t.state.stroke).toBeTruthy()
    expect(t.state.shadow).not.toBeNull()
  })

  it('unapply: stroke 와 shadow 모두 제거된다', async () => {
    const t = makeMockTarget()
    await outlineEffects.outlineGlow.apply(t)
    await outlineEffects.outlineGlow.unapply(t)
    expect(t.state.stroke).toBeNull()
    expect(t.state.shadow).toBeNull()
  })
})

describe('outline 라운드트립', () => {
  it('apply → unapply 모든 outline 효과', async () => {
    for (const effect of Object.values(outlineEffects)) {
      const t = makeMockTarget()
      await effect.apply(t)
      expect(t.state.stroke, `${effect.id} apply`).toBeTruthy()
      await effect.unapply(t)
      expect(t.state.stroke, `${effect.id} unapply`).toBeFalsy()
    }
  })
})
