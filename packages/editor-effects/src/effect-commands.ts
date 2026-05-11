// ─────────────────────────────────────────────
// effect-commands.ts — ApplyEffectCommand / RemoveEffectCommand
//
// editor-history Command 패턴 준수.
// fabric / editor-core 에만 의존, React 없음.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'

import type { EffectTarget, WordEffectOptions } from './effect-types.js'
import { getEffectById } from './registry.js'

// ─── Command 인터페이스 (editor-history subset) ───────────────────────────────

export interface Command {
  readonly name: string
  readonly timestamp: number
  do(): void | Promise<void>
  undo(): void | Promise<void>
}

// ─── EffectSnapshot ───────────────────────────────────────────────────────────

/**
 * 효과 적용 전 객체 상태 스냅샷.
 * unapply/undo 시 이 상태로 복원한다.
 */
interface EffectSnapshot {
  /** 적용 전 appliedEffects 배열 */
  appliedEffects: string[]
  /** 효과와 관련된 fabric 속성 (Shadow, fill, stroke 등) */
  shadow: unknown
  fill: unknown
  stroke: unknown
  strokeWidth: unknown
  strokeDashArray: unknown
  paintFirst: unknown
  objectCaching: unknown
  skewX: unknown
  skewY: unknown
  scaleX: unknown
  scaleY: unknown
  backgroundColor: unknown
  padding: unknown
}

function captureSnapshot(obj: EffectTarget & Record<string, unknown>): EffectSnapshot {
  return {
    appliedEffects: [...(obj.data?.appliedEffects ?? [])],
    shadow: obj.shadow,
    fill: obj.fill,
    stroke: obj.stroke,
    strokeWidth: obj.strokeWidth,
    strokeDashArray: obj.strokeDashArray,
    paintFirst: obj.paintFirst,
    objectCaching: obj.objectCaching,
    skewX: obj.skewX,
    skewY: obj.skewY,
    scaleX: obj.scaleX,
    scaleY: obj.scaleY,
    backgroundColor: obj.backgroundColor,
    padding: obj.padding,
  }
}

function restoreSnapshot(obj: EffectTarget, snap: EffectSnapshot): void {
  obj.set({
    shadow: snap.shadow,
    fill: snap.fill,
    stroke: snap.stroke,
    strokeWidth: snap.strokeWidth,
    strokeDashArray: snap.strokeDashArray,
    paintFirst: snap.paintFirst,
    objectCaching: snap.objectCaching,
    skewX: snap.skewX,
    skewY: snap.skewY,
    scaleX: snap.scaleX,
    scaleY: snap.scaleY,
    backgroundColor: snap.backgroundColor,
    padding: snap.padding,
  })
  if (obj.data) {
    obj.data.appliedEffects = [...snap.appliedEffects]
  }
  if (obj.dirty !== undefined) obj.dirty = true
}

// ─── ApplyEffectCommand ───────────────────────────────────────────────────────

export type ApplyEffectCommandOptions = {
  canvas: StoryCanvas
  /** 대상 객체의 ID */
  targetId: string
  /** 적용할 효과 ID */
  effectId: string
  /** 효과 옵션 (색상/강도/크기) */
  options?: WordEffectOptions
}

/**
 * ApplyEffectCommand — 텍스트 객체에 워드효과를 적용한다.
 *
 * do()  → effect.apply(target, options)
 * undo() → 이전 상태 스냅샷으로 복원
 */
export class ApplyEffectCommand implements Command {
  readonly name = 'wordfx:apply'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _targetId: string
  private readonly _effectId: string
  private readonly _options?: WordEffectOptions
  private _snapshot: EffectSnapshot | null = null

  constructor(opts: ApplyEffectCommandOptions) {
    this._canvas = opts.canvas
    this._targetId = opts.targetId
    this._effectId = opts.effectId
    this._options = opts.options
    this.timestamp = Date.now()
  }

  async do(): Promise<void> {
    const obj = this._canvas.getObject(this._targetId)
    if (!obj) return

    const effect = getEffectById(this._effectId)
    if (!effect) {
      console.warn(`[editor-effects] 효과를 찾을 수 없습니다: ${this._effectId}`)
      return
    }

    // 스냅샷 저장 (최초 do() 시에만)
    if (this._snapshot === null) {
      this._snapshot = captureSnapshot(obj as unknown as EffectTarget & Record<string, unknown>)
    }

    const target = obj as unknown as EffectTarget
    await effect.apply(target, this._options)

    // appliedEffects 메타 추적
    if (!target.data) target.data = {}
    if (!target.data.appliedEffects) target.data.appliedEffects = []
    if (!target.data.appliedEffects.includes(this._effectId)) {
      target.data.appliedEffects.push(this._effectId)
    }

    if (target.setCoords) target.setCoords()
    this._canvas._fabricCanvas.requestRenderAll()
  }

  async undo(): Promise<void> {
    if (this._snapshot === null) return
    const obj = this._canvas.getObject(this._targetId)
    if (!obj) return
    restoreSnapshot(obj as unknown as EffectTarget, this._snapshot)
    if ((obj as unknown as EffectTarget).setCoords) {
      ;(obj as unknown as EffectTarget).setCoords?.()
    }
    this._canvas._fabricCanvas.requestRenderAll()
  }

  get targetId(): string {
    return this._targetId
  }

  get effectId(): string {
    return this._effectId
  }
}

// ─── RemoveEffectCommand ──────────────────────────────────────────────────────

export type RemoveEffectCommandOptions = {
  canvas: StoryCanvas
  /** 대상 객체의 ID */
  targetId: string
  /** 제거할 효과 ID */
  effectId: string
}

/**
 * RemoveEffectCommand — 텍스트 객체에서 워드효과를 제거한다.
 *
 * do()  → effect.unapply(target)
 * undo() → effect.apply(target) 재적용 (이전 options 없이)
 */
export class RemoveEffectCommand implements Command {
  readonly name = 'wordfx:remove'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _targetId: string
  private readonly _effectId: string
  private _snapshot: EffectSnapshot | null = null

  constructor(opts: RemoveEffectCommandOptions) {
    this._canvas = opts.canvas
    this._targetId = opts.targetId
    this._effectId = opts.effectId
    this.timestamp = Date.now()
  }

  async do(): Promise<void> {
    const obj = this._canvas.getObject(this._targetId)
    if (!obj) return

    const effect = getEffectById(this._effectId)
    if (!effect) return

    if (this._snapshot === null) {
      this._snapshot = captureSnapshot(obj as unknown as EffectTarget & Record<string, unknown>)
    }

    const target = obj as unknown as EffectTarget
    await effect.unapply(target)

    // appliedEffects 에서 제거
    if (target.data?.appliedEffects) {
      target.data.appliedEffects = target.data.appliedEffects.filter((id) => id !== this._effectId)
    }

    if (target.setCoords) target.setCoords()
    this._canvas._fabricCanvas.requestRenderAll()
  }

  async undo(): Promise<void> {
    if (this._snapshot === null) return
    const obj = this._canvas.getObject(this._targetId)
    if (!obj) return
    restoreSnapshot(obj as unknown as EffectTarget, this._snapshot)
    ;(obj as unknown as EffectTarget).setCoords?.()
    this._canvas._fabricCanvas.requestRenderAll()
  }

  get targetId(): string {
    return this._targetId
  }

  get effectId(): string {
    return this._effectId
  }
}
