/**
 * template-commands.test.ts — Command 패턴 단위 테스트
 *
 * 검증 항목:
 * 1. ApplyTemplateCommand.name / timestamp
 * 2. ApplyTemplateCommand.do() → slotMap 생성
 * 3. ApplyTemplateCommand.undo() → placeholder 제거
 * 4. FillSlotCommand.do() → filled=true
 * 5. FillSlotCommand.undo() → filled=false
 * 6. ClearSlotCommand.do() → filled=false
 * 7. ClearSlotCommand.undo() → filled=true
 */

import { describe, expect, it, vi } from 'vitest'

import type { Slot } from '../src/slot-types.js'
import {
  ApplyTemplateCommand,
  ClearSlotCommand,
  FillSlotCommand,
} from '../src/template-commands.js'
import type { SlotMap } from '../src/template-types.js'
import type { TemplateSpec } from '../src/template-types.js'

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

function makeMockCanvas() {
  const objects = new Map<string, MockFabricObj>()
  let idCounter = 0

  const _fabricCanvas = {
    getWidth: () => 390,
    getHeight: () => 600,
    getObjects: () => Array.from(objects.values()),
    requestRenderAll: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
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
    format: { id: 'test', widthMm: 130, heightMm: 200, dpi: 72 },
    _objects: objects,
  }

  return canvas
}

function makeTemplate(): TemplateSpec {
  return {
    id: 'tmpl-1',
    name: '테스트 템플릿',
    formatId: 'b5',
    format: { widthMm: 130, heightMm: 200, bleedMm: 3, safeMm: 5 },
    slots: [
      {
        id: 'slot-a',
        kind: 'pose',
        x: 0.1,
        y: 0.1,
        w: 0.3,
        h: 0.5,
        rotation: 0,
        preferredTags: [],
        locked: false,
      },
      {
        id: 'slot-b',
        kind: 'background',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        rotation: 0,
        preferredTags: [],
        locked: true,
      },
    ],
  }
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

// ─── ApplyTemplateCommand ─────────────────────────────────────────────────────

describe('ApplyTemplateCommand', () => {
  it('name 이 template:apply', () => {
    const canvas = makeMockCanvas() as any
    const cmd = new ApplyTemplateCommand({ canvas, template: makeTemplate() })
    expect(cmd.name).toBe('template:apply')
  })

  it('timestamp 가 최근 시간', () => {
    const canvas = makeMockCanvas() as any
    const before = Date.now()
    const cmd = new ApplyTemplateCommand({ canvas, template: makeTemplate() })
    expect(cmd.timestamp).toBeGreaterThanOrEqual(before)
    expect(cmd.timestamp).toBeLessThanOrEqual(Date.now())
  })

  it('do() → slotMap 이 생성됨', () => {
    const canvas = makeMockCanvas() as any
    const cmd = new ApplyTemplateCommand({ canvas, template: makeTemplate() })

    expect(cmd.slotMap).toBeNull()
    cmd.do()
    expect(cmd.slotMap).not.toBeNull()
    expect(cmd.slotMap?.size).toBe(2)
  })

  it('do() 후 canvas 에 placeholder 추가됨', () => {
    const canvas = makeMockCanvas() as any
    const cmd = new ApplyTemplateCommand({ canvas, template: makeTemplate() })

    cmd.do()
    expect(canvas.addObject).toHaveBeenCalledTimes(2)
  })

  it('undo() → placeholder 제거됨', () => {
    const canvas = makeMockCanvas() as any
    const cmd = new ApplyTemplateCommand({ canvas, template: makeTemplate() })

    cmd.do()
    const objectsBefore = canvas._objects.size
    expect(objectsBefore).toBe(2)

    cmd.undo()
    expect(canvas._objects.size).toBe(0)
    expect(cmd.slotMap).toBeNull()
  })

  it('do() → undo() → do() 라운드트립', () => {
    const canvas = makeMockCanvas() as any
    const cmd = new ApplyTemplateCommand({ canvas, template: makeTemplate() })

    cmd.do()
    expect(cmd.slotMap?.size).toBe(2)

    cmd.undo()
    expect(cmd.slotMap).toBeNull()

    cmd.do()
    expect(cmd.slotMap?.size).toBe(2)
  })
})

// ─── FillSlotCommand ──────────────────────────────────────────────────────────

describe('FillSlotCommand', () => {
  it('name 이 template:fill-slot', () => {
    const canvas = makeMockCanvas() as any
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])
    const cmd = new FillSlotCommand({
      canvas,
      slotMap,
      slotId: 'slot-1',
      slot: makeSlot(),
      fabricObject: makeFabricObj() as unknown as Parameters<typeof canvas.addObject>[1],
    })
    expect(cmd.name).toBe('template:fill-slot')
  })

  it('do() → filled=true', () => {
    const canvas = makeMockCanvas() as any
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])
    const cmd = new FillSlotCommand({
      canvas,
      slotMap,
      slotId: 'slot-1',
      slot: makeSlot(),
      fabricObject: makeFabricObj() as unknown as Parameters<typeof canvas.addObject>[1],
    })

    cmd.do()
    expect(slotMap.get('slot-1')?.filled).toBe(true)
  })

  it('undo() → filled=false, placeholder 복원', () => {
    const canvas = makeMockCanvas() as any
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])
    const cmd = new FillSlotCommand({
      canvas,
      slotMap,
      slotId: 'slot-1',
      slot: makeSlot(),
      fabricObject: makeFabricObj() as unknown as Parameters<typeof canvas.addObject>[1],
    })

    cmd.do()
    expect(slotMap.get('slot-1')?.filled).toBe(true)

    cmd.undo()
    expect(slotMap.get('slot-1')?.filled).toBe(false)
  })
})

// ─── ClearSlotCommand ─────────────────────────────────────────────────────────

describe('ClearSlotCommand', () => {
  it('name 이 template:clear-slot', () => {
    const canvas = makeMockCanvas() as any
    const slotMap: SlotMap = new Map([
      ['slot-1', { slotId: 'slot-1', objectId: 'ph-1', filled: false }],
    ])
    const cmd = new ClearSlotCommand({
      canvas,
      slotMap,
      slotId: 'slot-1',
      slot: makeSlot(),
    })
    expect(cmd.name).toBe('template:clear-slot')
  })

  it('do() → 채워진 자산 제거', () => {
    const canvas = makeMockCanvas() as any
    const assetObj = makeFabricObj()
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

    const cmd = new ClearSlotCommand({
      canvas,
      slotMap,
      slotId: 'slot-1',
      slot: makeSlot(),
    })

    cmd.do()

    expect(canvas.removeObject).toHaveBeenCalledWith('asset-1')
    expect(slotMap.get('slot-1')?.filled).toBe(false)
  })
})
