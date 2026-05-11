/**
 * fill-slot.test.ts — fillSlot 동작 테스트
 *
 * 검증 항목:
 * 1. placeholder 제거 + 자산 추가
 * 2. 자산 위치가 슬롯 좌표와 일치
 * 3. SlotPlaceholder.filled = true
 * 4. filledObjectId 기록
 * 5. 없는 slotId → Error throw
 */

import { describe, expect, it, vi } from 'vitest'

import { fillSlot } from '../src/apply-template.js'
import type { Slot } from '../src/slot-types.js'
import type { SlotMap, SlotPlaceholder } from '../src/template-types.js'

vi.mock('fabric', () => {
  class RectMock {
    left = 0
    top = 0
    width = 100
    height = 100
    angle = 0
    scaleX = 1
    scaleY = 1
    data: Record<string, unknown> = {}
    setCoords = vi.fn()
    set(props: Record<string, unknown>) {
      Object.assign(this, props)
    }
  }
  return { Rect: RectMock }
})

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

function makeMockCanvas(canvasW = 390, canvasH = 600) {
  const objects = new Map<string, MockFabricObj>()
  let idCounter = 0

  const _fabricCanvas = {
    getWidth: () => canvasW,
    getHeight: () => canvasH,
    getObjects: () => Array.from(objects.values()),
    requestRenderAll: vi.fn(),
  }

  const canvas = {
    _fabricCanvas,
    addObject: vi.fn(
      (dataOverrides: { kind: string; slotId?: string }, fabricObj: MockFabricObj) => {
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
    format: { id: 'test', widthMm: 130, heightMm: 200, dpi: 72 },
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

function makeFabricObj(): MockFabricObj {
  return {
    left: 0,
    top: 0,
    width: 200,
    height: 300,
    scaleX: 1,
    scaleY: 1,
    angle: 0,
    data: {},
    set: vi.fn(function (this: MockFabricObj, props: Record<string, unknown>) {
      Object.assign(this, props)
    }),
    setCoords: vi.fn(),
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('fillSlot — 기본 동작', () => {
  it('placeholder 제거 후 자산 추가', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const fabricObj = makeFabricObj()

    // placeholder 설정
    const placeholderId = 'ph-1'
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: placeholderId, filled: false }],
    ])
    canvas._objects.set(placeholderId, fabricObj)

    fillSlot(
      slotMap,
      'slot-1',
      fabricObj as unknown as Parameters<typeof canvas.addObject>[1],
      canvas,
      slot,
    )

    // placeholder 제거됨
    expect(canvas.removeObject).toHaveBeenCalledWith(placeholderId)
    // 자산 추가됨
    expect(canvas.addObject).toHaveBeenCalledTimes(1)
  })

  it('SlotPlaceholder.filled = true', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const fabricObj = makeFabricObj()
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])

    fillSlot(
      slotMap,
      'slot-1',
      fabricObj as unknown as Parameters<typeof canvas.addObject>[1],
      canvas,
      slot,
    )

    const placeholder = slotMap.get('slot-1') as SlotPlaceholder
    expect(placeholder.filled).toBe(true)
  })

  it('filledObjectId 가 기록됨', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const fabricObj = makeFabricObj()
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])

    const returnedId = fillSlot(
      slotMap,
      'slot-1',
      fabricObj as unknown as Parameters<typeof canvas.addObject>[1],
      canvas,
      slot,
    )

    const placeholder = slotMap.get('slot-1') as SlotPlaceholder
    expect(placeholder.filledObjectId).toBe(returnedId)
    expect(returnedId).toBeTruthy()
  })
})

describe('fillSlot — 위치 매핑', () => {
  it('자산이 슬롯 좌표로 이동', () => {
    const canvasW = 390
    const canvasH = 600

    const canvas = makeMockCanvas(canvasW, canvasH) as any
    const slot = makeSlot({ x: 0.1, y: 0.2, rotation: 30 })
    const fabricObj = makeFabricObj()
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])

    fillSlot(
      slotMap,
      'slot-1',
      fabricObj as unknown as Parameters<typeof canvas.addObject>[1],
      canvas,
      slot,
    )

    // set 이 호출되어 left/top/angle 이 적용됐는지 확인
    expect(fabricObj.set).toHaveBeenCalledWith(
      expect.objectContaining({
        left: 0.1 * canvasW,
        top: 0.2 * canvasH,
        angle: 30,
      }),
    )
    expect(fabricObj.setCoords).toHaveBeenCalled()
  })
})

describe('fillSlot — 에러 처리', () => {
  it('없는 slotId → Error throw', () => {
    const canvas = makeMockCanvas() as any
    const slot = makeSlot()
    const fabricObj = makeFabricObj()
    const slotMap: SlotMap = new Map() // 비어 있음

    expect(() =>
      fillSlot(
        slotMap,
        'non-existent',
        fabricObj as unknown as Parameters<typeof canvas.addObject>[1],
        canvas,
        slot,
      ),
    ).toThrow('[editor-template] fillSlot: slotId "non-existent" not found')
  })
})
