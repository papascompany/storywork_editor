import { describe, expect, it, vi } from 'vitest'

import { shadowEffects } from '../src/index.js'

// ─── mock fabric Shadow ────────────────────────────────────────────────────────

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
    colorStops: unknown[]
    constructor(opts: { type: string; coords: unknown; colorStops: unknown[] }) {
      this.type = opts.type
      this.coords = opts.coords
      this.colorStops = opts.colorStops
    }
  },
  Pattern: class MockPattern {
    source: unknown
    repeat: string
    constructor(opts: { source: unknown; repeat: string }) {
      this.source = opts.source
      this.repeat = opts.repeat
    }
  },
}))

// ─── mock 대상 객체 ───────────────────────────────────────────────────────────

function makeMockTarget() {
  const state: Record<string, unknown> = { dirty: false, data: { appliedEffects: [] } }
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

// ─── shadow-drop-soft ─────────────────────────────────────────────────────────

describe('shadow-drop-soft', () => {
  it('apply: shadow 객체가 설정된다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropSoft.apply(target)
    expect(target.state.shadow).toBeDefined()
  })

  it('apply: blur > 0', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropSoft.apply(target)
    const shadow = target.state.shadow as { blur: number }
    expect(shadow.blur).toBeGreaterThan(0)
  })

  it('apply: dirty 가 true 가 된다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropSoft.apply(target)
    expect(target.dirty).toBe(true)
  })

  it('unapply: shadow 가 null 이 된다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropSoft.apply(target)
    await shadowEffects.shadowDropSoft.unapply(target)
    expect(target.state.shadow).toBeNull()
  })

  it('apply opts.color 가 반영된다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropSoft.apply(target, { color: 'rgba(255,0,0,0.5)' })
    const shadow = target.state.shadow as { color: string }
    expect(shadow.color).toBe('rgba(255,0,0,0.5)')
  })

  it('apply opts.intensity 가 blur 에 영향을 준다', async () => {
    const t1 = makeMockTarget()
    const t2 = makeMockTarget()
    await shadowEffects.shadowDropSoft.apply(t1, { intensity: 0 })
    await shadowEffects.shadowDropSoft.apply(t2, { intensity: 1 })
    const blur1 = (t1.state.shadow as { blur: number }).blur
    const blur2 = (t2.state.shadow as { blur: number }).blur
    expect(blur2).toBeGreaterThan(blur1)
  })
})

// ─── shadow-drop-hard ─────────────────────────────────────────────────────────

describe('shadow-drop-hard', () => {
  it('apply: blur 가 0 이다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropHard.apply(target)
    const shadow = target.state.shadow as { blur: number }
    expect(shadow.blur).toBe(0)
  })

  it('apply → unapply: shadow 가 null 이 된다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowDropHard.apply(target)
    await shadowEffects.shadowDropHard.unapply(target)
    expect(target.state.shadow).toBeNull()
  })
})

// ─── shadow-long ──────────────────────────────────────────────────────────────

describe('shadow-long', () => {
  it('apply: offset 이 크다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowLong.apply(target)
    const shadow = target.state.shadow as { offsetX: number; offsetY: number }
    expect(shadow.offsetX).toBeGreaterThan(8)
    expect(shadow.offsetY).toBeGreaterThan(8)
  })
})

// ─── shadow-blur ──────────────────────────────────────────────────────────────

describe('shadow-blur', () => {
  it('apply: blur 가 크다', async () => {
    const target = makeMockTarget()
    await shadowEffects.shadowBlur.apply(target)
    const shadow = target.state.shadow as { blur: number }
    expect(shadow.blur).toBeGreaterThanOrEqual(16)
  })
})

// ─── 라운드트립 ───────────────────────────────────────────────────────────────

describe('shadow 라운드트립', () => {
  it('apply → unapply 모든 shadow 효과', async () => {
    for (const effect of Object.values(shadowEffects)) {
      const target = makeMockTarget()
      await effect.apply(target)
      expect(target.state.shadow, `${effect.id} apply`).not.toBeNull()
      await effect.unapply(target)
      expect(target.state.shadow, `${effect.id} unapply`).toBeNull()
    }
  })
})
