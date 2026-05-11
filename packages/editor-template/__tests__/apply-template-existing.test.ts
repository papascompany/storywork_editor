/**
 * apply-template-existing.test.ts
 *
 * existingObjects 모드별 검증:
 * - 'keep': 기존 객체 유지, 슬롯 추가
 * - 'clear': 기존 객체 전부 제거 후 슬롯 추가
 * - 'preserve-user': placeholder 만 제거, 사용자 객체는 유지
 */

import { describe, expect, it, vi } from 'vitest'

import { applyTemplate } from '../src/apply-template.js'
import type { TemplateSpec } from '../src/template-types.js'

// ─── fabric mock ──────────────────────────────────────────────────────────────

vi.mock('fabric', () => {
  class RectMock {
    left: number
    top: number
    width: number
    height: number
    angle: number
    fill: string
    opacity: number
    stroke: string
    strokeWidth: number
    strokeDashArray: number[]
    selectable: boolean
    evented: boolean
    data: Record<string, unknown>
    _hint: string
    _slotKind: string

    constructor(opts: Record<string, unknown>) {
      this.left = (opts.left as number) ?? 0
      this.top = (opts.top as number) ?? 0
      this.width = (opts.width as number) ?? 0
      this.height = (opts.height as number) ?? 0
      this.angle = (opts.angle as number) ?? 0
      this.fill = (opts.fill as string) ?? ''
      this.opacity = (opts.opacity as number) ?? 1
      this.stroke = (opts.stroke as string) ?? ''
      this.strokeWidth = (opts.strokeWidth as number) ?? 1
      this.strokeDashArray = (opts.strokeDashArray as number[]) ?? []
      this.selectable = (opts.selectable as boolean) ?? true
      this.evented = (opts.evented as boolean) ?? true
      this.data = (opts.data as Record<string, unknown>) ?? {}
      this._hint = (opts._hint as string) ?? ''
      this._slotKind = (opts._slotKind as string) ?? ''
    }
  }

  return { Rect: RectMock }
})

// ─── mock canvas factory ──────────────────────────────────────────────────────

type MockObj = {
  data: {
    id?: string
    kind?: string
    slotId?: string
    isPlaceholder?: boolean
    locked?: boolean
  }
}

function makeMockCanvas(initialObjects: MockObj[] = []) {
  const objects = new Map<string, MockObj>()
  let idCounter = 0

  for (const obj of initialObjects) {
    const id = obj.data.id ?? `pre-${++idCounter}`
    obj.data.id = id
    objects.set(id, obj)
  }

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
      (dataOverrides: { kind: string; slotId?: string; locked?: boolean }, fabricObj: MockObj) => {
        const id = `obj-${++idCounter}`
        fabricObj.data = { ...fabricObj.data, id, kind: dataOverrides.kind }
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

function makeSimpleTemplate(): TemplateSpec {
  return {
    id: 'simple',
    name: '단순',
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

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe("existingObjects: 'keep'", () => {
  it('기존 객체를 제거하지 않고 슬롯 추가', () => {
    const userObj: MockObj = { data: { id: 'user-1', kind: 'text' } }

    const canvas = makeMockCanvas([userObj]) as any
    const template = makeSimpleTemplate()

    const slotMap = applyTemplate(canvas, template, { existingObjects: 'keep' })

    // 사용자 객체 여전히 존재
    expect(canvas._objects.has('user-1')).toBe(true)
    // 슬롯 2개 추가됨
    expect(slotMap.size).toBe(2)
    // removeObject 호출 없음
    expect(canvas.removeObject).not.toHaveBeenCalled()
  })
})

describe("existingObjects: 'clear'", () => {
  it('기존 객체 모두 제거 후 슬롯 추가', () => {
    const userObj: MockObj = { data: { id: 'user-1', kind: 'text' } }

    const canvas = makeMockCanvas([userObj]) as any
    const template = makeSimpleTemplate()

    const slotMap = applyTemplate(canvas, template, { existingObjects: 'clear' })

    // 사용자 객체 제거됨
    expect(canvas._objects.has('user-1')).toBe(false)
    // 슬롯 2개 추가됨
    expect(slotMap.size).toBe(2)
    // removeObject 호출됨
    expect(canvas.removeObject).toHaveBeenCalledWith('user-1')
  })
})

describe("existingObjects: 'preserve-user' (기본값)", () => {
  it('placeholder 는 제거, 사용자 객체는 유지', () => {
    const userObj: MockObj = { data: { id: 'user-1', kind: 'pose', isPlaceholder: undefined } }
    const placeholderObj: MockObj = {
      data: { id: 'ph-1', kind: 'background', isPlaceholder: true, slotId: 'old-slot' },
    }

    const canvas = makeMockCanvas([userObj, placeholderObj]) as any
    const template = makeSimpleTemplate()

    const slotMap = applyTemplate(canvas, template, { existingObjects: 'preserve-user' })

    // 사용자 객체 유지
    expect(canvas._objects.has('user-1')).toBe(true)
    // 기존 placeholder 제거됨
    expect(canvas._objects.has('ph-1')).toBe(false)
    // 새 슬롯 추가됨
    expect(slotMap.size).toBe(2)
  })

  it('기본값도 preserve-user 동작', () => {
    const userObj: MockObj = { data: { id: 'user-2', kind: 'text' } }

    const canvas = makeMockCanvas([userObj]) as any
    const template = makeSimpleTemplate()

    // options 미전달 → 기본값 preserve-user
    applyTemplate(canvas, template)

    expect(canvas._objects.has('user-2')).toBe(true)
    expect(canvas.removeObject).not.toHaveBeenCalled()
  })
})
