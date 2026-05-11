// ─────────────────────────────────────────────
// text-commands.ts — AddTextCommand / EditTextCommand
//
// editor-history Command 패턴 준수.
// fabric / editor-core 에만 의존, React 없음.
// ─────────────────────────────────────────────

import type { ObjectData, StoryCanvas } from '@storywork/editor-core'

import type { CreateTextObjectOptions } from './text-object.js'
import type { Command } from './types.js'

// ─── AddTextCommand ───────────────────────────────────────────────────────────

export type AddTextCommandOptions = {
  canvas: StoryCanvas
  textOpts?: CreateTextObjectOptions
}

/**
 * AddTextCommand — Textbox 객체를 캔버스에 추가한다.
 *
 * do()  → createTextObject + canvas.addObject
 * undo() → canvas.removeObject(id)
 *
 * NOTE: fabric 은 dynamic import 로 로드 (헤드리스 환경 대응).
 */
export class AddTextCommand implements Command {
  readonly name = 'text:add'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _textOpts: CreateTextObjectOptions
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private _fabricObj: any = null
  private _assignedId: string | null = null

  constructor(opts: AddTextCommandOptions) {
    this._canvas = opts.canvas
    this._textOpts = opts.textOpts ?? {}
    this.timestamp = Date.now()
  }

  async do(): Promise<void> {
    const { createTextObject } = await import('./text-object.js')

    if (this._fabricObj === null) {
      this._fabricObj = await createTextObject(this._textOpts)
    }

    this._assignedId = this._canvas.addObject(
      { kind: 'text' } as Pick<ObjectData, 'kind'>,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this._fabricObj as any,
    )
  }

  undo(): void {
    if (this._assignedId === null) return
    this._canvas.removeObject(this._assignedId)
  }

  get assignedId(): string | null {
    return this._assignedId
  }
}

// ─── EditTextCommand ──────────────────────────────────────────────────────────

/** 텍스트 속성 변경 가능 필드 */
export type TextProps = {
  fontFamily?: string
  fontSize?: number
  fill?: string
  textAlign?: 'left' | 'center' | 'right'
  fontWeight?: 'normal' | 'bold'
  fontStyle?: 'normal' | 'italic'
  underline?: boolean
  lineHeight?: number
  charSpacing?: number
  text?: string
}

export type EditTextCommandOptions = {
  canvas: StoryCanvas
  id: string
  before: TextProps
  after: TextProps
}

/**
 * EditTextCommand — 텍스트 속성 변경 (undo 가능).
 *
 * do()  → after 속성 적용
 * undo() → before 속성 복원
 */
export class EditTextCommand implements Command {
  readonly name = 'text:edit'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _id: string
  private readonly _before: TextProps
  private readonly _after: TextProps

  constructor(opts: EditTextCommandOptions) {
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

  private _applyProps(props: TextProps): void {
    const obj = this._canvas.getObject(this._id)
    if (!obj) return // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(obj as any).set(props)
    obj.setCoords()
    this._canvas._fabricCanvas.requestRenderAll()
  }
}
