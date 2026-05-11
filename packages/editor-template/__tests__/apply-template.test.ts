/**
 * apply-template.test.ts — applyTemplate 핵심 동작 테스트
 *
 * 검증 항목:
 * 1. 슬롯 5개 → placeholder 5개 생성
 * 2. placeholder 위치/크기 정확성 (정규화 → px 변환)
 * 3. placeholder data.isPlaceholder === true
 * 4. placeholder data.slotId 일치
 * 5. SlotMap 반환 크기
 * 6. rotate 적용 확인
 * 7. locked 슬롯 → selectable/evented false
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

// ─── StoryCanvas mock ─────────────────────────────────────────────────────────

type MockRect = {
  left: number
  top: number
  width: number
  height: number
  angle: number
  selectable: boolean
  evented: boolean
  data: { id?: string; kind?: string; slotId?: string; isPlaceholder?: boolean; locked?: boolean }
  _hint: string
}

/** mm → px 변환 헬퍼 (테스트 내부 기댓값 계산용) */
function mmToPxHelper(mm: number, dpi: number): number {
  return (mm * dpi) / 25.4
}

function makeMockCanvas(dpi = 72, widthMm = 130, heightMm = 200) {
  const objects = new Map<string, MockRect>()
  let idCounter = 0
  const format = { id: 'test', widthMm, heightMm, dpi }

  const _fabricCanvas = {
    // getWidth/getHeight 는 이제 apply-template 에서 사용하지 않으나 mock 유지
    getWidth: () => Math.round(mmToPxHelper(widthMm, dpi)),
    getHeight: () => Math.round(mmToPxHelper(heightMm, dpi)),
    getObjects: () => Array.from(objects.values()),
    requestRenderAll: vi.fn(),
    on: vi.fn(),
    off: vi.fn(),
  }

  const canvas = {
    _fabricCanvas,
    addObject: vi.fn(
      (dataOverrides: { kind: string; slotId?: string; locked?: boolean }, fabricObj: MockRect) => {
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
    format,
    mmToPx: (mm: number) => mmToPxHelper(mm, dpi),
    _objects: objects,
  }

  return canvas
}

// ─── 공통 템플릿 픽스처 ───────────────────────────────────────────────────────

function make1on1Template(): TemplateSpec {
  return {
    id: 'test-1on1',
    name: '1대1 대화',
    formatId: 'b5',
    format: { widthMm: 130, heightMm: 200, bleedMm: 3, safeMm: 5 },
    slots: [
      {
        id: 'bg',
        kind: 'background',
        x: 0,
        y: 0,
        w: 1,
        h: 1,
        rotation: 0,
        preferredTags: [],
        locked: true,
      },
      {
        id: 'left',
        kind: 'pose',
        x: 0.1,
        y: 0.3,
        w: 0.35,
        h: 0.6,
        rotation: 0,
        preferredTags: [],
        locked: false,
      },
      {
        id: 'right',
        kind: 'pose',
        x: 0.55,
        y: 0.3,
        w: 0.35,
        h: 0.6,
        rotation: 0,
        preferredTags: [],
        locked: false,
      },
      {
        id: 'bubble-l',
        kind: 'speech-bubble',
        x: 0.05,
        y: 0.05,
        w: 0.4,
        h: 0.2,
        rotation: 0,
        preferredTags: [],
        locked: false,
      },
      {
        id: 'bubble-r',
        kind: 'speech-bubble',
        x: 0.55,
        y: 0.05,
        w: 0.4,
        h: 0.2,
        rotation: 0,
        preferredTags: [],
        locked: false,
      },
    ],
  }
}

// ─── 테스트 ──────────────────────────────────────────────────────────────────

describe('applyTemplate — 슬롯 생성', () => {
  it('슬롯 5개 → SlotMap 크기 5', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    const slotMap = applyTemplate(canvas, template)

    expect(slotMap.size).toBe(5)
  })

  it('각 슬롯 ID 가 SlotMap 키로 존재', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    const slotMap = applyTemplate(canvas, template)

    expect(slotMap.has('bg')).toBe(true)
    expect(slotMap.has('left')).toBe(true)
    expect(slotMap.has('right')).toBe(true)
    expect(slotMap.has('bubble-l')).toBe(true)
    expect(slotMap.has('bubble-r')).toBe(true)
  })

  it('addObject 가 슬롯 수만큼 호출됨', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    applyTemplate(canvas, template)

    expect(canvas.addObject).toHaveBeenCalledTimes(5)
  })

  it('초기 filled = false', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    const slotMap = applyTemplate(canvas, template)

    for (const placeholder of slotMap.values()) {
      expect(placeholder.filled).toBe(false)
    }
  })
})

describe('applyTemplate — 좌표 변환', () => {
  it('배경 슬롯(x=0,y=0,w=1,h=1) → 실제 페이지 px 크기(format 기반)와 일치', () => {
    // dpi=72, widthMm=130, heightMm=200 → pageW=368.5, pageH=566.9
    const canvas = makeMockCanvas(72, 130, 200) as any
    const pageW = mmToPxHelper(130, 72)
    const pageH = mmToPxHelper(200, 72)

    const template = make1on1Template()

    applyTemplate(canvas, template)

    const addedObjects = canvas._objects
    const bgSlotObj = Array.from(addedObjects.values()).find(
      (o: MockRect) => o.data?.kind === 'background',
    ) as MockRect | undefined

    expect(bgSlotObj).toBeDefined()
    expect(bgSlotObj?.left).toBe(0)
    expect(bgSlotObj?.top).toBe(0)
    expect(bgSlotObj?.width).toBeCloseTo(pageW, 1)
    expect(bgSlotObj?.height).toBeCloseTo(pageH, 1)
  })

  it('left 슬롯(x=0.1,y=0.3,w=0.35,h=0.6) → 정규화 좌표 × 실제 페이지 px 크기', () => {
    const canvas = makeMockCanvas(72, 130, 200) as any
    const pageW = mmToPxHelper(130, 72)
    const pageH = mmToPxHelper(200, 72)

    const template = make1on1Template()

    applyTemplate(canvas, template)

    const poseObjs = Array.from(canvas._objects.values()).filter(
      (o: MockRect) => o.data?.kind === 'pose',
    ) as MockRect[]

    const leftObj = poseObjs[0]
    expect(leftObj).toBeDefined()
    expect(leftObj?.left).toBeCloseTo(0.1 * pageW, 1)
    expect(leftObj?.top).toBeCloseTo(0.3 * pageH, 1)
    expect(leftObj?.width).toBeCloseTo(0.35 * pageW, 1)
    expect(leftObj?.height).toBeCloseTo(0.6 * pageH, 1)
  })
})

describe('applyTemplate — 메타 데이터', () => {
  it('placeholder data.isPlaceholder === true', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    applyTemplate(canvas, template)

    for (const obj of canvas._objects.values()) {
      expect((obj as MockRect).data?.isPlaceholder).toBe(true)
    }
  })

  it('placeholder data.slotId 가 Slot.id 와 일치', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    applyTemplate(canvas, template)

    const objs = Array.from(canvas._objects.values()) as MockRect[]
    const slotIds = objs.map((o) => o.data?.slotId)

    expect(slotIds).toContain('bg')
    expect(slotIds).toContain('left')
    expect(slotIds).toContain('right')
    expect(slotIds).toContain('bubble-l')
    expect(slotIds).toContain('bubble-r')
  })
})

describe('applyTemplate — 회전', () => {
  it('회전이 있는 슬롯에 angle 이 적용됨', () => {
    const canvas = makeMockCanvas() as any
    const template: TemplateSpec = {
      id: 'rot-test',
      name: '회전 테스트',
      formatId: 'b5',
      format: { widthMm: 130, heightMm: 200, bleedMm: 3, safeMm: 5 },
      slots: [
        {
          id: 'tilted',
          kind: 'decoration',
          x: 0.1,
          y: 0.1,
          w: 0.2,
          h: 0.2,
          rotation: 45,
          preferredTags: [],
          locked: false,
        },
      ],
    }

    applyTemplate(canvas, template)

    const obj = Array.from(canvas._objects.values())[0] as MockRect & { angle: number }
    expect(obj.angle).toBe(45)
  })

  it('rotation=0 인 슬롯 → angle=0', () => {
    const canvas = makeMockCanvas() as any
    const template: TemplateSpec = {
      id: 'no-rot',
      name: '회전 없음',
      formatId: 'b5',
      format: { widthMm: 130, heightMm: 200, bleedMm: 3, safeMm: 5 },
      slots: [
        {
          id: 'flat',
          kind: 'pose',
          x: 0,
          y: 0,
          w: 0.5,
          h: 0.5,
          rotation: 0,
          preferredTags: [],
          locked: false,
        },
      ],
    }

    applyTemplate(canvas, template)

    const obj = Array.from(canvas._objects.values())[0] as MockRect & { angle: number }
    expect(obj.angle).toBe(0)
  })
})

describe('applyTemplate — locked 슬롯', () => {
  it('locked=true → selectable=false, evented=false', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    applyTemplate(canvas, template)

    const bgObj = Array.from(canvas._objects.values()).find(
      (o: MockRect) => o.data?.slotId === 'bg',
    ) as MockRect & { selectable: boolean; evented: boolean }

    expect(bgObj).toBeDefined()
    expect(bgObj?.selectable).toBe(false)
    expect(bgObj?.evented).toBe(false)
  })

  it('locked=false → selectable=true, evented=true', () => {
    const canvas = makeMockCanvas() as any
    const template = make1on1Template()

    applyTemplate(canvas, template)

    const poseObj = Array.from(canvas._objects.values()).find(
      (o: MockRect) => o.data?.slotId === 'left',
    ) as MockRect & { selectable: boolean; evented: boolean }

    expect(poseObj).toBeDefined()
    expect(poseObj?.selectable).toBe(true)
    expect(poseObj?.evented).toBe(true)
  })
})
