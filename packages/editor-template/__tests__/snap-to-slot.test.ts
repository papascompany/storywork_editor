/**
 * snap-to-slot.test.ts — findNearestSlot + attachSnapToSlot 단위 테스트
 *
 * 검증 항목:
 * 1. findNearestSlot — threshold 내 가장 가까운 슬롯 반환
 * 2. findNearestSlot — threshold 초과 → null
 * 3. findNearestSlot — 채워진 슬롯 제외
 * 4. findNearestSlot — kind 필터 동작
 * 5. findNearestSlot — 복수 슬롯 중 가장 가까운 것 선택
 * 6. attachSnapToSlot — dispose 호출 시 이벤트 해제
 */

import { describe, expect, it, vi } from 'vitest'

import type { Slot } from '../src/slot-types.js'
import { findNearestSlot, attachSnapToSlot } from '../src/snap-to-slot.js'
import type { SlotMap } from '../src/template-types.js'

// ─── 픽스처 ──────────────────────────────────────────────────────────────────

function makeSlot(
  id: string,
  x: number,
  y: number,
  w = 0.3,
  h = 0.4,
  kind: Slot['kind'] = 'pose',
): Slot {
  return { id, kind, x, y, w, h, rotation: 0, preferredTags: [], locked: false }
}

function makeEmptySlotMap(...slotIds: string[]): SlotMap {
  const map: SlotMap = new Map()
  for (const id of slotIds) {
    map.set(id, { slotId: id, objectId: `obj-${id}`, filled: false })
  }
  return map
}

// ─── findNearestSlot ──────────────────────────────────────────────────────────

describe('findNearestSlot', () => {
  const CANVAS_W = 390
  const CANVAS_H = 600

  it('threshold 내 슬롯 → SnapResult 반환', () => {
    // slot-1: x=0.1,y=0.1,w=0.3,h=0.4 → 중심 (0.25*390, 0.30*600) = (97.5, 180)
    const slots = [makeSlot('slot-1', 0.1, 0.1)]
    const slotMap = makeEmptySlotMap('slot-1')

    const result = findNearestSlot(slotMap, slots, { x: 97, y: 180 }, CANVAS_W, CANVAS_H, 40)

    expect(result).not.toBeNull()
    expect(result?.slotId).toBe('slot-1')
    expect(result?.distance).toBeLessThan(40)
  })

  it('threshold 초과 → null', () => {
    const slots = [makeSlot('slot-1', 0.1, 0.1)]
    const slotMap = makeEmptySlotMap('slot-1')

    // 슬롯 중심에서 100px 떨어진 점
    const result = findNearestSlot(slotMap, slots, { x: 0, y: 0 }, CANVAS_W, CANVAS_H, 30)

    // 중심 = (97.5, 180), 거리 ≈ sqrt(97.5² + 180²) ≈ 205 > 30
    expect(result).toBeNull()
  })

  it('채워진 슬롯은 제외', () => {
    const slots = [makeSlot('slot-1', 0.1, 0.1)]
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'obj-1', filled: true, filledObjectId: 'asset-1' }],
    ])

    const result = findNearestSlot(slotMap, slots, { x: 97, y: 180 }, CANVAS_W, CANVAS_H, 40)

    expect(result).toBeNull()
  })

  it('kind 필터 — 맞는 kind 만 반환', () => {
    const slots = [
      makeSlot('slot-pose', 0.1, 0.1, 0.3, 0.4, 'pose'),
      makeSlot('slot-bg', 0.1, 0.55, 0.3, 0.4, 'background'),
    ]
    const slotMap = makeEmptySlotMap('slot-pose', 'slot-bg')

    // 두 슬롯 모두 threshold 내이지만 'pose' 만 허용
    const result = findNearestSlot(slotMap, slots, { x: 97, y: 180 }, CANVAS_W, CANVAS_H, 400, [
      'pose',
    ])

    expect(result?.slotId).toBe('slot-pose')
  })

  it('복수 슬롯 중 가장 가까운 것 반환', () => {
    // slot-a 중심: (0.25*390, 0.30*600) = (97.5, 180)
    // slot-b 중심: (0.65*390, 0.30*600) = (253.5, 180)
    const slots = [makeSlot('slot-a', 0.1, 0.1), makeSlot('slot-b', 0.5, 0.1)]
    const slotMap = makeEmptySlotMap('slot-a', 'slot-b')

    // 테스트 점 (100, 180) — slot-a 에 더 가까움
    const result = findNearestSlot(slotMap, slots, { x: 100, y: 180 }, CANVAS_W, CANVAS_H, 400)

    expect(result?.slotId).toBe('slot-a')
  })

  it('슬롯 없을 때 → null', () => {
    const result = findNearestSlot(new Map(), [], { x: 100, y: 100 }, CANVAS_W, CANVAS_H, 40)
    expect(result).toBeNull()
  })
})

// ─── attachSnapToSlot ─────────────────────────────────────────────────────────

describe('attachSnapToSlot', () => {
  it('dispose 호출 시 이벤트 해제', () => {
    const onMock = vi.fn()
    const offMock = vi.fn()

    const _fabricCanvas = {
      getWidth: () => 390,
      getHeight: () => 600,
      on: onMock,
      off: offMock,
      requestRenderAll: vi.fn(),
    }

    const mockCanvas = {
      _fabricCanvas,
      getObject: vi.fn(),
      format: { id: 'test', widthMm: 130, heightMm: 200, dpi: 72 },
    }

    const slotMap: SlotMap = new Map()
    const slots: Slot[] = []
    const onSnap = vi.fn()

    const { dispose } = attachSnapToSlot(mockCanvas as any, slotMap, slots, onSnap)

    // 이벤트 등록됨
    expect(onMock).toHaveBeenCalledWith('object:moving', expect.any(Function))
    expect(onMock).toHaveBeenCalledWith('object:modified', expect.any(Function))

    dispose()

    // 이벤트 해제됨
    expect(offMock).toHaveBeenCalledWith('object:moving', expect.any(Function))
    expect(offMock).toHaveBeenCalledWith('object:modified', expect.any(Function))
  })

  it('options.threshold 커스텀 적용', () => {
    // threshold=10 → 가까운 슬롯이 없으면 no-op
    const slots = [makeSlot('slot-1', 0.1, 0.1)]
    const slotMap = makeEmptySlotMap('slot-1')
    const onSnap = vi.fn()

    const _fabricCanvas = {
      getWidth: () => 390,
      getHeight: () => 600,
      on: vi.fn(),
      off: vi.fn(),
      requestRenderAll: vi.fn(),
    }

    const mockCanvas = {
      _fabricCanvas,
      getObject: vi.fn(),
      format: { id: 'test', widthMm: 130, heightMm: 200, dpi: 72 },
    }

    const { dispose } = attachSnapToSlot(mockCanvas as any, slotMap, slots, onSnap, {
      threshold: 10,
    })

    expect(_fabricCanvas.on).toHaveBeenCalledTimes(2)
    dispose()
    expect(_fabricCanvas.off).toHaveBeenCalledTimes(2)
  })
})
