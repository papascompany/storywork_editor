import { describe, expect, it, vi } from 'vitest'

import { glowEffects } from '../src/index.js'

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
    shadow: null,
    fill: '#000000',
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

describe('glowNeonBlue', () => {
  it('apply: shadow 가 설정된다', async () => {
    const t = makeMockTarget()
    await glowEffects.glowNeonBlue.apply(t)
    expect(t.state.shadow).not.toBeNull()
  })

  it('apply: offset 이 0 이다 (글로우)', async () => {
    const t = makeMockTarget()
    await glowEffects.glowNeonBlue.apply(t)
    const shadow = t.state.shadow as { offsetX: number; offsetY: number }
    expect(shadow.offsetX).toBe(0)
    expect(shadow.offsetY).toBe(0)
  })

  it('apply: blur > 0', async () => {
    const t = makeMockTarget()
    await glowEffects.glowNeonBlue.apply(t)
    const shadow = t.state.shadow as { blur: number }
    expect(shadow.blur).toBeGreaterThan(0)
  })

  it('apply: fill 이 변경된다', async () => {
    const t = makeMockTarget()
    await glowEffects.glowNeonBlue.apply(t)
    expect(t.state.fill).not.toBe('#000000')
  })

  it('unapply: shadow 가 null 이 된다', async () => {
    const t = makeMockTarget()
    await glowEffects.glowNeonBlue.apply(t)
    await glowEffects.glowNeonBlue.unapply(t)
    expect(t.state.shadow).toBeNull()
  })
})

describe('glowNeonPink', () => {
  it('apply: 핑크 계열 fill', async () => {
    const t = makeMockTarget()
    await glowEffects.glowNeonPink.apply(t)
    // fill 이 변경됨 (기본값 #000000 아님)
    expect(t.state.fill).not.toBe('#000000')
  })
})

describe('glowSoftWhite', () => {
  it('apply: fill 을 변경하지 않는다 (색상 없음)', async () => {
    const t = makeMockTarget()
    const initialFill = t.state.fill
    await glowEffects.glowSoftWhite.apply(t)
    // softWhite 는 fill 을 바꾸지 않음
    expect(t.state.fill).toBe(initialFill)
  })
})

describe('glow 라운드트립', () => {
  it('apply → unapply 모든 glow 효과', async () => {
    for (const effect of Object.values(glowEffects)) {
      const t = makeMockTarget()
      await effect.apply(t)
      expect(t.state.shadow, `${effect.id} apply`).not.toBeNull()
      await effect.unapply(t)
      expect(t.state.shadow, `${effect.id} unapply`).toBeNull()
    }
  })
})
