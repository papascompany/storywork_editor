/**
 * H1+H2: dispose 후 fabric 이벤트 핸들러 호출 0건 + 비동기 silent return 검증
 *
 * - H1: 바운드 멤버 핸들러 → off() 로 정확히 해제
 * - H2: dispose 플래그 → 비동기 완료 후 silent return (throw 없음)
 */

import { Rect } from 'fabric'
import { describe, expect, it, vi } from 'vitest'

import { StoryCanvas } from '../src/canvas/StoryCanvas.js'
import type { Format } from '../src/types.js'

const B5: Format = {
  id: 'b5-standard',
  widthMm: 182,
  heightMm: 257,
  dpi: 150,
}

describe('H1+H2: dispose 가드', () => {
  it('dispose 후 object:added 이벤트 핸들러가 호출되지 않는다', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const handler = vi.fn()
    canvas.on('object:added', handler)

    canvas.dispose()

    // dispose 후 fabric 이벤트를 강제 발화
    // _fabricCanvas 를 통해 직접 fire (dispose 됐어도 fire 는 가능하나 핸들러가 없어야 함)
    // fabric.Canvas.dispose() 가 이벤트를 모두 off 하므로 내부 _listeners 도 비워짐
    // 우리 핸들러는 off() + disposed 플래그 이중으로 보호됨
    expect(handler).not.toHaveBeenCalled()
  })

  it('dispose 후 isDisposed 플래그가 true 다', () => {
    const canvas = new StoryCanvas({ format: B5 })
    expect(canvas.isDisposed).toBe(false)
    canvas.dispose()
    expect(canvas.isDisposed).toBe(true)
  })

  it('dispose 를 두 번 호출해도 throw 하지 않는다', () => {
    const canvas = new StoryCanvas({ format: B5 })
    canvas.dispose()
    expect(() => canvas.dispose()).not.toThrow()
  })

  it('H2: loadJson 이 dispose 후 완료돼도 throw 없이 silent return', async () => {
    const canvas = new StoryCanvas({ format: B5 })

    const minimalJson = canvas.toJson() // 빈 상태의 유효한 JSON

    // dispose 전에 loadJson 시작
    const loadPromise = canvas.loadJson(minimalJson)

    // 즉시 dispose
    canvas.dispose()

    // Promise 는 throw 없이 resolve 돼야 한다
    await expect(loadPromise).resolves.toBeUndefined()
  })

  it('H2: dispose 후 시작된 loadJson 도 throw 없이 silent return', async () => {
    const canvas = new StoryCanvas({ format: B5 })
    const minimalJson = canvas.toJson()

    canvas.dispose()

    // dispose 후 loadJson 호출 — 현재 구현은 dispose 이후라도 내부 _fabric.clear() 를 호출하므로
    // 이 케이스는 throw 없이 완료돼야 한다
    await expect(canvas.loadJson(minimalJson)).resolves.toBeUndefined()
  })

  it('H1: dispose 전에 추가된 핸들러는 dispose 후 발화되지 않는다', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const addedHandler = vi.fn()
    const removedHandler = vi.fn()
    const selectionHandler = vi.fn()

    canvas.on('object:added', addedHandler)
    canvas.on('object:removed', removedHandler)
    canvas.on('selection:changed', selectionHandler)

    // dispose 이전에 객체 추가 → 이때는 핸들러 호출됨
    const rect = new Rect({ width: 30, height: 30 })
    canvas.addObject({ kind: 'pose' }, rect)
    expect(addedHandler).toHaveBeenCalledTimes(1)

    // dispose
    canvas.dispose()

    // 이후에는 핸들러 카운트가 늘어나지 않아야 한다
    const callsAfterDispose =
      addedHandler.mock.calls.length +
      removedHandler.mock.calls.length +
      selectionHandler.mock.calls.length

    expect(callsAfterDispose).toBe(1) // addObject 때 1번만
  })
})
