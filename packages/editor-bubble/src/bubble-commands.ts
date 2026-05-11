// ─────────────────────────────────────────────
// bubble-commands.ts — 말풍선 Command 패턴
//
// AddBubbleCommand: 말풍선 추가 (화자 자동 감지 포함)
// EditBubbleCommand: 모양/색상/꼬리 변경
// BindBubbleToTargetCommand: 화자 변경
//
// editor-history Command 인터페이스 준수.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'

import type { CreateBubbleObjectOptions } from './bubble-object.js'
import { getBubbleMeta, isBubbleGroup } from './bubble-object.js'
import type { BubbleShape } from './bubble-shapes.js'
import type { TailOptions } from './bubble-tail.js'
import { detectSpeaker, rebindBubbleTarget } from './bubble-tracking.js'

/** Command 인터페이스 (editor-history 의 subset) */
export interface Command {
  readonly name: string
  readonly timestamp: number
  do(): void | Promise<void>
  undo(): void | Promise<void>
}

// ─── AddBubbleCommand ────────────────────────────────────────────────────────

export type AddBubbleCommandOptions = {
  canvas: StoryCanvas
  bubbleOpts?: CreateBubbleObjectOptions
  /** 추가 후 화자 자동 감지 여부. 기본: true */
  autoDetectSpeaker?: boolean
}

/**
 * AddBubbleCommand — 말풍선 객체를 캔버스에 추가한다.
 *
 * do()  → createBubbleObject + canvas.addObject + 화자 자동 감지
 * undo() → canvas.removeObject(id)
 */
export class AddBubbleCommand implements Command {
  readonly name = 'bubble:add'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _bubbleOpts: CreateBubbleObjectOptions
  private readonly _autoDetect: boolean

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _fabricObj: any = null
  private _assignedId: string | null = null

  constructor(opts: AddBubbleCommandOptions) {
    this._canvas = opts.canvas
    this._bubbleOpts = opts.bubbleOpts ?? {}
    this._autoDetect = opts.autoDetectSpeaker ?? true
    this.timestamp = Date.now()
  }

  async do(): Promise<void> {
    const { createBubbleObject } = await import('./bubble-object.js')

    if (this._fabricObj === null) {
      this._fabricObj = await createBubbleObject(this._bubbleOpts)
    }

    this._assignedId = this._canvas.addObject(
      { kind: 'speech-bubble' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._fabricObj as any,
    )

    // 화자 자동 감지
    if (this._autoDetect && this._fabricObj) {
      const fc = this._canvas._fabricCanvas
      const nearest = detectSpeaker(fc, this._fabricObj)
      if (nearest) {
        const nearestId = (nearest.data as { id?: string } | undefined)?.id ?? null
        rebindBubbleTarget(fc, this._fabricObj, nearestId)
      }
    }
  }

  undo(): void {
    if (this._assignedId === null) return
    this._canvas.removeObject(this._assignedId)
  }

  get assignedId(): string | null {
    return this._assignedId
  }
}

// ─── EditBubbleCommand ───────────────────────────────────────────────────────

export type BubbleProps = {
  shape?: BubbleShape
  fill?: string
  stroke?: string
  strokeWidth?: number
  text?: string
  fontSize?: number
  tailOpts?: TailOptions
}

export type EditBubbleCommandOptions = {
  canvas: StoryCanvas
  id: string
  before: BubbleProps
  after: BubbleProps
}

/**
 * EditBubbleCommand — 말풍선 속성 변경 (undo 가능).
 *
 * MVP: fill/stroke/text 변경만 지원.
 * shape 변경은 Group 재생성이 필요하므로 FOLLOWUP 로 분리.
 */
export class EditBubbleCommand implements Command {
  readonly name = 'bubble:edit'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _id: string
  private readonly _before: BubbleProps
  private readonly _after: BubbleProps

  constructor(opts: EditBubbleCommandOptions) {
    this._canvas = opts.canvas
    this._id = opts.id
    this._before = { ...opts.before }
    this._after = { ...opts.after }
    this.timestamp = Date.now()
  }

  do(): void {
    this._applyProps(this._after)
  }

  undo(): void {
    this._applyProps(this._before)
  }

  private _applyProps(props: BubbleProps): void {
    const obj = this._canvas.getObject(this._id)
    if (!obj || !isBubbleGroup(obj)) return

    // Group 내부의 path(body)와 polygon(tail)에 fill/stroke 적용
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items: any[] = (obj as any).getObjects?.() ?? []

    for (const item of items) {
      if (item.type === 'path' || item.type === 'polygon') {
        if (props.fill !== undefined) item.set({ fill: props.fill })
        if (props.stroke !== undefined) item.set({ stroke: props.stroke })
        if (props.strokeWidth !== undefined) item.set({ strokeWidth: props.strokeWidth })
      }
      if (item.type === 'textbox' || item.type === 'i-text') {
        if (props.text !== undefined) item.set({ text: props.text })
        if (props.fontSize !== undefined) item.set({ fontSize: props.fontSize })
      }
    }

    // BubbleMeta 의 tailOpts 업데이트
    if (props.tailOpts !== undefined) {
      const meta = getBubbleMeta(obj)
      if (meta) {
        meta.tailOpts = props.tailOpts
      }
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(obj as any).setCoords?.()
    this._canvas._fabricCanvas.requestRenderAll()
  }
}

// ─── BindBubbleToTargetCommand ────────────────────────────────────────────────

export type BindBubbleToTargetCommandOptions = {
  canvas: StoryCanvas
  bubbleId: string
  /** 새 화자 포즈 ID (null = 자유 말풍선) */
  newTargetId: string | null
  /** 이전 화자 포즈 ID (undo 용) */
  prevTargetId: string | null
}

/**
 * BindBubbleToTargetCommand — 말풍선의 화자를 변경한다 (undo 가능).
 */
export class BindBubbleToTargetCommand implements Command {
  readonly name = 'bubble:bind-target'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _bubbleId: string
  private readonly _newTargetId: string | null
  private readonly _prevTargetId: string | null

  constructor(opts: BindBubbleToTargetCommandOptions) {
    this._canvas = opts.canvas
    this._bubbleId = opts.bubbleId
    this._newTargetId = opts.newTargetId
    this._prevTargetId = opts.prevTargetId
    this.timestamp = Date.now()
  }

  do(): void {
    this._bind(this._newTargetId)
  }

  undo(): void {
    this._bind(this._prevTargetId)
  }

  private _bind(targetId: string | null): void {
    const obj = this._canvas.getObject(this._bubbleId)
    if (!obj || !isBubbleGroup(obj)) return
    rebindBubbleTarget(this._canvas._fabricCanvas, obj, targetId)
  }
}
