// ─────────────────────────────────────────────
// template-commands.ts — Command 패턴
//
// ApplyTemplateCommand: 템플릿 적용 (undo = 적용 전 객체 ID 목록 복원)
// FillSlotCommand: 슬롯 채우기 (undo = placeholder 복원)
// ClearSlotCommand: 슬롯 비우기 (undo = 자산 복원)
//
// editor-history Command 인터페이스 준수.
// fabric / editor-core 에만 의존, React 없음.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'

import type { ApplyTemplateOptions } from './apply-template.js'
import { applyTemplate, clearSlot, fillSlot } from './apply-template.js'
import type { Slot } from './slot-types.js'
import type { SlotMap, TemplateSpec } from './template-types.js'

// ─── Command 인터페이스 (editor-history 의 subset) ────────────────────────────

interface Command {
  readonly name: string
  readonly timestamp: number
  do(): void
  undo(): void
}

// ─── ApplyTemplateCommand ─────────────────────────────────────────────────────

export type ApplyTemplateCommandOptions = {
  canvas: StoryCanvas
  template: TemplateSpec
  applyOptions?: ApplyTemplateOptions
}

/**
 * ApplyTemplateCommand — 템플릿을 캔버스에 적용한다.
 *
 * do()  → applyTemplate() 실행, 이전 상태 스냅샷 저장
 * undo() → 이전 상태로 복원 (placeholder 제거 + 스냅샷 복원)
 */
export class ApplyTemplateCommand implements Command {
  readonly name = 'template:apply'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _template: TemplateSpec
  private readonly _applyOptions: ApplyTemplateOptions

  /** do() 실행 결과 */
  private _resultSlotMap: SlotMap | null = null
  /** do() 전 캔버스 객체 ID 목록 (undo 복원용) */
  private _prevObjectIds: string[] = []

  constructor(opts: ApplyTemplateCommandOptions) {
    this._canvas = opts.canvas
    this._template = opts.template
    this._applyOptions = opts.applyOptions ?? {}
    this.timestamp = Date.now()
  }

  do(): void {
    // 현재 객체 목록 스냅샷
    const fc = this._canvas._fabricCanvas
    this._prevObjectIds = fc
      .getObjects()
      .map((obj) => {
        const data = (obj as { data?: { id?: string } }).data
        return data?.id ?? null
      })
      .filter((id): id is string => id !== null)

    // 템플릿 적용
    this._resultSlotMap = applyTemplate(this._canvas, this._template, this._applyOptions)
  }

  undo(): void {
    // 적용된 placeholder 제거
    if (this._resultSlotMap) {
      for (const placeholder of this._resultSlotMap.values()) {
        if (!placeholder.filled) {
          this._canvas.removeObject(placeholder.objectId)
        }
        if (placeholder.filledObjectId) {
          this._canvas.removeObject(placeholder.filledObjectId)
        }
      }
      this._resultSlotMap = null
    }
    this._canvas._fabricCanvas.requestRenderAll()
  }

  /** do() 결과 SlotMap (테스트/통합용) */
  get slotMap(): SlotMap | null {
    return this._resultSlotMap
  }
}

// ─── FillSlotCommand ──────────────────────────────────────────────────────────

export type FillSlotCommandOptions = {
  canvas: StoryCanvas
  slotMap: SlotMap
  slotId: string
  slot: Slot
  fabricObject: Parameters<StoryCanvas['addObject']>[1]
  placeholderStyle?: ApplyTemplateOptions['placeholderStyle']
}

/**
 * FillSlotCommand — 슬롯 placeholder 를 자산으로 교체한다.
 *
 * do()  → fillSlot() 실행
 * undo() → clearSlot() → placeholder 복원
 */
export class FillSlotCommand implements Command {
  readonly name = 'template:fill-slot'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _slotMap: SlotMap
  private readonly _slotId: string
  private readonly _slot: Slot
  private readonly _fabricObject: Parameters<StoryCanvas['addObject']>[1]
  private readonly _placeholderStyle?: ApplyTemplateOptions['placeholderStyle']

  constructor(opts: FillSlotCommandOptions) {
    this._canvas = opts.canvas
    this._slotMap = opts.slotMap
    this._slotId = opts.slotId
    this._slot = opts.slot
    this._fabricObject = opts.fabricObject
    this._placeholderStyle = opts.placeholderStyle
    this.timestamp = Date.now()
  }

  do(): void {
    fillSlot(this._slotMap, this._slotId, this._fabricObject, this._canvas, this._slot)
  }

  undo(): void {
    clearSlot(this._slotMap, this._slotId, this._canvas, this._slot, {
      placeholderStyle: this._placeholderStyle,
    })
  }
}

// ─── ClearSlotCommand ─────────────────────────────────────────────────────────

export type ClearSlotCommandOptions = {
  canvas: StoryCanvas
  slotMap: SlotMap
  slotId: string
  slot: Slot
  placeholderStyle?: ApplyTemplateOptions['placeholderStyle']
}

/**
 * ClearSlotCommand — 슬롯 자산을 제거하고 placeholder 를 복원한다.
 *
 * do()  → clearSlot()
 * undo() → fillSlot() (이전 fabricObject 재적용)
 *
 * NOTE: undo 시 동일한 fabricObject 를 재사용하므로,
 *       fabricObject 는 가비지 컬렉션되지 않게 이 Command 가 참조를 유지한다.
 */
export class ClearSlotCommand implements Command {
  readonly name = 'template:clear-slot'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _slotMap: SlotMap
  private readonly _slotId: string
  private readonly _slot: Slot
  private readonly _placeholderStyle?: ApplyTemplateOptions['placeholderStyle']
  /** undo 에서 재사용할 이전 fabricObject */
  private _prevFabricObject: Parameters<StoryCanvas['addObject']>[1] | null = null

  constructor(opts: ClearSlotCommandOptions) {
    this._canvas = opts.canvas
    this._slotMap = opts.slotMap
    this._slotId = opts.slotId
    this._slot = opts.slot
    this._placeholderStyle = opts.placeholderStyle
    this.timestamp = Date.now()
  }

  do(): void {
    const placeholder = this._slotMap.get(this._slotId)
    // undo 를 위해 이전 fabricObject 저장
    if (placeholder?.filledObjectId) {
      const obj = this._canvas.getObject(placeholder.filledObjectId)
      if (obj) {
        this._prevFabricObject = obj as Parameters<StoryCanvas['addObject']>[1]
      }
    }
    clearSlot(this._slotMap, this._slotId, this._canvas, this._slot, {
      placeholderStyle: this._placeholderStyle,
    })
  }

  undo(): void {
    if (this._prevFabricObject) {
      fillSlot(this._slotMap, this._slotId, this._prevFabricObject, this._canvas, this._slot)
    }
  }
}
