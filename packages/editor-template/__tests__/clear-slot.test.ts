/**
 * clear-slot.test.ts — clearSlot 동작 테스트
 *
 * 검증 항목:
 * 1. 채워진 자산 제거
 * 2. placeholder 복원 (SlotMap 업데이트)
 * 3. filled = false 복원
 * 4. 빈 슬롯에 clearSlot 호출 → no-op (crash 없음)
 */

import { describe, expect, it, vi } from 'vitest'

import { clearSlot, fillSlot } from '../src/apply-template.js'
import type { Slot } from '../src/slot-types.js'
import type { SlotMap } from '../src/template-types.js'

// ─── fabric mock ──────────────────────────────────────────────────────────────

vi.mock('fabric', () => {
  class RectMock {
    left = 0
    top = 0
    width = 100
    height = 100
    angle = 0
    scaleX = 1
    scaleY = 1
    fill = ''
    opacity = 1
    stroke = ''
    strokeWidth = 1
    strokeDashArray: number[] = []
    selectable = true
    evented = true
    data: Record<string, unknown> = {}
    _hint = ''
    _slotKind = ''
    setCoords = vi.fn()
    set(props: Record<string, unknown>) {
      Object.assign(this, props)
    }
    constructor(opts: Record<string, unknown>) {
      Object.assign(this, opts)
    }
  }
  return { Rect: RectMock }
})

// ─── mock canvas ──────────────────────────────────────────────────────────────

type MockFabricObj = {
  left: number
  top: number
  width: number
  height: number
  scaleX: number
  scaleY: number
  angle: number
  data: Record<string, unknown>
  set: (props: Record<string, unknown>) => void
  setCoords: () => void
}

function makeMockCanvas(dpi = 72, widthMm = 130, heightMm = 200) {
  const objects = new Map<string, MockFabricObj>()
  let idCounter = 0
  const format = { id: 'test', widthMm, heightMm, dpi }

  const _fabricCanvas = {
    getWidth: () => Math.round((widthMm * dpi) / 25.4),
    getHeight: () => Math.round((heightMm * dpi) / 25.4),
    getObjects: () => Array.from(objects.values()),
    requestRenderAll: vi.fn(),
  }

  const canvas = {
    _fabricCanvas,
    addObject: vi.fn(
      (
        dataOverrides: { kind: string; slotId?: string; locked?: boolean },
        fabricObj: MockFabricObj,
      ) => {
        const id = `obj-${++idCounter}`
        fabricObj.data = { ...fabricObj.data, id }
        objects.set(id, fabricObj)
        return id
      },
    ),
    removeObject: vi.fn((id: string) => {
      objects.delete(id)
    }),
    getObject: (id: string) => objects.get(id),
    format,
    mmToPx: (mm: number) => (mm * dpi) / 25.4,
    _objects: objects,
  }

  return canvas
}

function makeSlot(overrides: Partial<Slot> = {}): Slot {
  return {
    id: 'slot-1',
    kind: 'pose',
    x: 0.1,
    y: 0.2,
    w: 0.4,
    h: 0.5,
    rotation: 0,
    preferredTags: [],
    locked: false,
    ...overrides,
  }
}

function makeFabricObj(id: string): MockFabricObj {
  return {
    left: 0,
    top: 0,
    width: 200,
    height: 300,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    data: { id },
    set: vi.fn(function (this: MockFabricObj, props: Record<string, unknown>) {
      Object.assign(this, props)
    }),
    setCoords: vi.fn(),
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('clearSlot — 기본 동작', () => {
  it('채워진 자산 제거 + filled = false 복원', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const assetObj = makeFabricObj('asset-1')
    canvas._objects.set('asset-1', assetObj)

    const slotMap: SlotMap = new Map([
      [
        'slot-1',
        {
          slotId: 'slot-1',
          objectId: 'ph-1',
          filled: true,
          filledObjectId: 'asset-1',
        },
      ],
    ])

    clearSlot(slotMap, 'slot-1', canvas, slot)

    // 자산 제거됨
    expect(canvas.removeObject).toHaveBeenCalledWith('asset-1')
    // filled 복원
    const placeholder = slotMap.get('slot-1')
    expect(placeholder?.filled).toBe(false)
    expect(placeholder?.filledObjectId).toBeUndefined()
  })

  it('placeholder 가 새로 추가됨 (복원)', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const assetObj = makeFabricObj('asset-1')
    canvas._objects.set('asset-1', assetObj)

    const slotMap: SlotMap = new Map([
      [
        'slot-1',
        {
          slotId: 'slot-1',
          objectId: 'ph-old',
          filled: true,
          filledObjectId: 'asset-1',
        },
      ],
    ])

    clearSlot(slotMap, 'slot-1', canvas, slot)

    // addObject 가 호출됨 (새 placeholder)
    expect(canvas.addObject).toHaveBeenCalledTimes(1)
    // slotMap.objectId 가 새 id 로 업데이트됨
    const placeholder = slotMap.get('slot-1')
    expect(placeholder?.objectId).not.toBe('ph-old')
  })

  it('빈 슬롯에 clearSlot 호출 → crash 없음', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()

    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])

    expect(() => clearSlot(slotMap, 'slot-1', canvas, slot)).not.toThrow()
    // 자산 제거 없음
    expect(canvas.removeObject).not.toHaveBeenCalled()
  })

  it('없는 slotId → no-op', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const slotMap: SlotMap = new Map()

    expect(() => clearSlot(slotMap, 'non-existent', canvas, slot)).not.toThrow()
    expect(canvas.removeObject).not.toHaveBeenCalled()
  })
})

describe('clearSlot — fillSlot 후 clearSlot 라운드트립', () => {
  it('fillSlot 후 clearSlot → filled=false, 새 placeholder 존재', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const fabricObj = makeFabricObj('asset-2')
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-init', filled: false }],
    ])

    // fill
    fillSlot(
      slotMap,
      'slot-1',
      fabricObj as unknown as Parameters<typeof canvas.addObject>[1],
      canvas,
      slot,
    )

    expect(slotMap.get('slot-1')?.filled).toBe(true)

    // clear
    clearSlot(slotMap, 'slot-1', canvas, slot)

    const placeholder = slotMap.get('slot-1')
    expect(placeholder?.filled).toBe(false)
    expect(placeholder?.filledObjectId).toBeUndefined()
  })
})
