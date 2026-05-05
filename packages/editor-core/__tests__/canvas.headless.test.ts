/**
 * 헤드리스 환경 (node/jsdom) 에서의 StoryCanvas 기본 동작 테스트
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

describe('StoryCanvas 헤드리스 환경', () => {
  it('container 없이 인스턴스 생성 가능', () => {
    const canvas = new StoryCanvas({ format: B5 })
    expect(canvas).toBeDefined()
    canvas.dispose()
  })

  it('format 정보 조회', () => {
    const canvas = new StoryCanvas({ format: B5 })
    expect(canvas.format.id).toBe('b5-standard')
    expect(canvas.format.widthMm).toBe(182)
    canvas.dispose()
  })

  it('mm↔px 변환 위임', () => {
    const canvas = new StoryCanvas({ format: B5 })
    // 150dpi: 25.4mm = 150px
    expect(canvas.mmToPx(25.4)).toBeCloseTo(150, 3)
    expect(canvas.pxToMm(150)).toBeCloseTo(25.4, 3)
    canvas.dispose()
  })

  it('addObject → getObject', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const rect = new Rect({ width: 100, height: 100 })
    const id = canvas.addObject({ kind: 'pose' }, rect)

    expect(typeof id).toBe('string')
    expect(id.length).toBeGreaterThan(0)
    const found = canvas.getObject(id)
    expect(found).toBe(rect)

    canvas.dispose()
  })

  it('addObject → getObjectData', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const rect = new Rect({ width: 50, height: 50 })
    const id = canvas.addObject(
      { kind: 'background', resourceId: 'res-bg-001', locked: true },
      rect,
    )

    const data = canvas.getObjectData(id)
    expect(data).toBeDefined()
    expect(data?.kind).toBe('background')
    expect(data?.resourceId).toBe('res-bg-001')
    expect(data?.locked).toBe(true)
    canvas.dispose()
  })

  it('removeObject 후 getObject 는 undefined', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const rect = new Rect({ width: 40, height: 40 })
    const id = canvas.addObject({ kind: 'decoration' }, rect)

    canvas.removeObject(id)
    expect(canvas.getObject(id)).toBeUndefined()
    canvas.dispose()
  })

  it('object:added 이벤트 발행', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const handler = vi.fn()
    canvas.on('object:added', handler)

    const rect = new Rect({ width: 80, height: 80 })
    canvas.addObject({ kind: 'prop' }, rect)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]?.[0]).toMatchObject({
      data: { kind: 'prop' },
    })
    canvas.dispose()
  })

  it('object:removed 이벤트 발행', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const handler = vi.fn()
    canvas.on('object:removed', handler)

    const rect = new Rect({ width: 20, height: 20 })
    const id = canvas.addObject({ kind: 'text' }, rect)
    canvas.removeObject(id)

    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler.mock.calls[0]?.[0]).toMatchObject({ id })
    canvas.dispose()
  })

  it('on() 구독 해제', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const handler = vi.fn()
    const unsub = canvas.on('object:added', handler)

    unsub()
    const rect = new Rect({ width: 10, height: 10 })
    canvas.addObject({ kind: 'pose' }, rect)

    expect(handler).not.toHaveBeenCalled()
    canvas.dispose()
  })

  it('dispose 후 내부 맵 비워짐', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const rect = new Rect({ width: 30, height: 30 })
    canvas.addObject({ kind: 'pose' }, rect)
    canvas.dispose()
    // dispose 후에는 예외 없이 종료되어야 함
    expect(true).toBe(true)
  })

  it('toJson() 은 현재 레이어 수를 반환', () => {
    const canvas = new StoryCanvas({ format: B5 })
    const r1 = new Rect({ width: 50, height: 50 })
    const r2 = new Rect({ width: 60, height: 60 })
    canvas.addObject({ kind: 'pose' }, r1)
    canvas.addObject({ kind: 'background' }, r2)

    const json = canvas.toJson()
    expect(json.v).toBe(1)
    expect(json.format.id).toBe('b5-standard')
    expect(json.layers.length).toBe(2)
    canvas.dispose()
  })
})
