import { describe, expect, it, vi } from 'vitest'

import { ApplyEffectCommand, RemoveEffectCommand } from '../src/index.js'

// ─── mock fabric ──────────────────────────────────────────────────────────────

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

// ─── mock StoryCanvas ─────────────────────────────────────────────────────────

function makeMockCanvas() {
  const objects = new Map<string, Record<string, unknown>>()
  const _fabricCanvas = {
    requestRenderAll: vi.fn(),
  }

  return {
    getObject: (id: string) => objects.get(id),
    _fabricCanvas,
    _objects: objects,
    addMockObject(id: string, extra: Record<string, unknown> = {}) {
      const obj: Record<string, unknown> = {
        ...extra,
        dirty: false,
        shadow: null,
        fill: '#000000',
        stroke: null,
        strokeWidth: 0,
        strokeDashArray: null,
        paintFirst: 'fill',
        objectCaching: false,
        skewX: 0,
        skewY: 0,
        scaleX: 1,
        scaleY: 1,
        backgroundColor: '',
        padding: 0,
        data: { id, kind: 'text', appliedEffects: [] },
        set(props: Record<string, unknown>) {
          Object.assign(obj, props)
        },
        setCoords: vi.fn(),
      }
      objects.set(id, obj)
      return obj
    },
  }
}

// ─── ApplyEffectCommand ───────────────────────────────────────────────────────

describe('ApplyEffectCommand', () => {
  it('name 이 wordfx:apply 다', () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')
    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    expect(cmd.name).toBe('wordfx:apply')
  })

  it('timestamp 가 현재 시각과 가깝다', () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')
    const before = Date.now()
    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    expect(cmd.timestamp).toBeGreaterThanOrEqual(before)
    expect(cmd.timestamp).toBeLessThanOrEqual(Date.now())
  })

  it('do(): shadow 효과가 적용된다', async () => {
    const canvas = makeMockCanvas()
    const obj = canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await cmd.do()
    expect(obj.shadow).not.toBeNull()
  })

  it('do(): appliedEffects 에 effectId 가 추가된다', async () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await cmd.do()
    const obj = canvas.getObject('obj1')
    const data = obj?.data as { appliedEffects?: string[] }
    expect(data.appliedEffects).toContain('shadow-drop-soft')
  })

  it('undo(): shadow 가 null 로 복원된다', async () => {
    const canvas = makeMockCanvas()
    const obj = canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await cmd.do()
    expect(obj.shadow).not.toBeNull()

    await cmd.undo()
    expect(obj.shadow).toBeNull()
  })

  it('undo(): appliedEffects 가 빈 배열로 복원된다', async () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await cmd.do()
    await cmd.undo()
    const obj = canvas.getObject('obj1')
    const data = obj?.data as { appliedEffects?: string[] }
    expect(data.appliedEffects).toHaveLength(0)
  })

  it('do() → undo() → do(): 재적용 가능', async () => {
    const canvas = makeMockCanvas()
    const obj = canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })

    await cmd.do()
    expect(obj.shadow).not.toBeNull()
    await cmd.undo()
    expect(obj.shadow).toBeNull()
    await cmd.do()
    expect(obj.shadow).not.toBeNull()
  })

  it('존재하지 않는 effectId 는 무시된다', async () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'no-such-effect',
    })
    // 에러 없이 완료
    await expect(cmd.do()).resolves.toBeUndefined()
  })

  it('존재하지 않는 targetId 는 무시된다', async () => {
    const canvas = makeMockCanvas()

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'not-found',
      effectId: 'shadow-drop-soft',
    })
    await expect(cmd.do()).resolves.toBeUndefined()
  })

  it('requestRenderAll 이 호출된다', async () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await cmd.do()
    expect(canvas._fabricCanvas.requestRenderAll).toHaveBeenCalled()
  })

  it('targetId getter', () => {
    const canvas = makeMockCanvas()
    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    expect(cmd.targetId).toBe('obj1')
  })

  it('effectId getter', () => {
    const canvas = makeMockCanvas()
    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    expect(cmd.effectId).toBe('shadow-drop-soft')
  })
})

// ─── RemoveEffectCommand ──────────────────────────────────────────────────────

describe('RemoveEffectCommand', () => {
  it('name 이 wordfx:remove 다', () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')
    const cmd = new RemoveEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    expect(cmd.name).toBe('wordfx:remove')
  })

  it('do(): 효과가 제거된다 (shadow=null)', async () => {
    const canvas = makeMockCanvas()
    const obj = canvas.addMockObject('obj1')
    // 먼저 효과 적용
    const applyCmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await applyCmd.do()
    expect(obj.shadow).not.toBeNull()

    const removeCmd = new RemoveEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await removeCmd.do()
    expect(obj.shadow).toBeNull()
  })

  it('undo(): 제거 전 상태로 복원된다', async () => {
    const canvas = makeMockCanvas()
    const obj = canvas.addMockObject('obj1')
    // 먼저 효과 적용
    const applyCmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await applyCmd.do()
    const shadowAfterApply = obj.shadow

    const removeCmd = new RemoveEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await removeCmd.do()
    expect(obj.shadow).toBeNull()

    await removeCmd.undo()
    expect(obj.shadow).toStrictEqual(shadowAfterApply)
  })
})

// ─── effect-meta.test (appliedEffects 누적) ───────────────────────────────────

describe('appliedEffects 누적 추적', () => {
  it('두 효과를 순서대로 적용하면 두 ID 가 모두 기록된다', async () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')

    const cmd1 = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    const cmd2 = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'outline-single-thin',
    })
    await cmd1.do()
    await cmd2.do()

    const obj = canvas.getObject('obj1')
    const data = obj?.data as { appliedEffects?: string[] }
    expect(data.appliedEffects).toContain('shadow-drop-soft')
    expect(data.appliedEffects).toContain('outline-single-thin')
  })

  it('같은 효과를 두 번 apply 해도 ID 는 한 번만 기록된다', async () => {
    const canvas = makeMockCanvas()
    canvas.addMockObject('obj1')

    const cmd = new ApplyEffectCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      targetId: 'obj1',
      effectId: 'shadow-drop-soft',
    })
    await cmd.do()
    await cmd.do()

    const obj = canvas.getObject('obj1')
    const data = obj?.data as { appliedEffects?: string[] }
    const count = data.appliedEffects?.filter((id) => id === 'shadow-drop-soft').length ?? 0
    expect(count).toBe(1)
  })
})
