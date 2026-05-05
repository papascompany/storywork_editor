import { describe, expect, it, vi } from 'vitest'

import { createEditorBus } from '../src/events/bus.js'

describe('이벤트 버스', () => {
  it('object:added 이벤트 발행 및 수신', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    bus.on('object:added', handler)

    const payload = { id: 'obj-1', data: { id: 'obj-1', kind: 'pose' as const } }
    bus.emit('object:added', payload)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('object:changed 이벤트', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    bus.on('object:changed', handler)

    const payload = { id: 'obj-2', data: { id: 'obj-2', kind: 'background' as const } }
    bus.emit('object:changed', payload)

    expect(handler).toHaveBeenCalledWith(payload)
  })

  it('object:removed 이벤트', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    bus.on('object:removed', handler)

    bus.emit('object:removed', { id: 'obj-3' })
    expect(handler).toHaveBeenCalledWith({ id: 'obj-3' })
  })

  it('selection:changed 이벤트', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    bus.on('selection:changed', handler)

    bus.emit('selection:changed', { ids: ['obj-1', 'obj-2'] })
    expect(handler).toHaveBeenCalledWith({ ids: ['obj-1', 'obj-2'] })
  })

  it('history:applied 이벤트', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    bus.on('history:applied', handler)

    bus.emit('history:applied', { kind: 'undo' })
    expect(handler).toHaveBeenCalledWith({ kind: 'undo' })
  })

  it('구독 해제 (Unsubscribe)', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    const unsub = bus.on('object:added', handler)

    bus.emit('object:added', { id: 'x', data: { id: 'x', kind: 'pose' as const } })
    expect(handler).toHaveBeenCalledTimes(1)

    unsub()
    bus.emit('object:added', { id: 'x', data: { id: 'x', kind: 'pose' as const } })
    // 구독 해제 후 호출 안 됨
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('복수 구독자 동시 수신', () => {
    const bus = createEditorBus()
    const h1 = vi.fn()
    const h2 = vi.fn()
    bus.on('object:added', h1)
    bus.on('object:added', h2)

    bus.emit('object:added', { id: 'y', data: { id: 'y', kind: 'text' as const } })
    expect(h1).toHaveBeenCalledTimes(1)
    expect(h2).toHaveBeenCalledTimes(1)
  })

  it('render:after 이벤트', () => {
    const bus = createEditorBus()
    const handler = vi.fn()
    bus.on('render:after', handler)

    // void 페이로드
    bus.emit('render:after', undefined as unknown as void)
    expect(handler).toHaveBeenCalledTimes(1)
  })
})
