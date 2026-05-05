// ─────────────────────────────────────────────
// TransformObjectCommand — 위치/크기/회전 변경
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { FabricObject } from 'fabric'

import type { Command, TransformSnapshot } from '../../types.js'

export type TransformObjectCommandOptions = {
  canvas: StoryCanvas
  id: string
  before: TransformSnapshot
  after: TransformSnapshot
}

/**
 * TransformObjectCommand — 객체의 transform(위치/크기/회전/반전)을 변경하는 Command.
 *
 * do()  → after 스냅샷 적용
 * undo() → before 스냅샷 복원
 *
 * coalesceWith: 같은 객체(id), 같은 이름, 300ms 이내 → before 를 유지한 채 after 만 교체
 */
export class TransformObjectCommand implements Command {
  readonly name = 'canvas:transform'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _id: string
  private readonly _before: TransformSnapshot
  private _after: TransformSnapshot

  constructor(opts: TransformObjectCommandOptions) {
    this._canvas = opts.canvas
    this._id = opts.id
    this._before = opts.before
    this._after = opts.after
    this.timestamp = Date.now()
  }

  do(): void {
    const obj = this._canvas.getObject(this._id) as FabricObject | undefined
    if (!obj) return
    applySnapshot(obj, this._after)
    this._canvas._fabricCanvas.requestRenderAll()
  }

  undo(): void {
    const obj = this._canvas.getObject(this._id) as FabricObject | undefined
    if (!obj) return
    applySnapshot(obj, this._before)
    this._canvas._fabricCanvas.requestRenderAll()
  }

  /**
   * 같은 객체(id) + 같은 이름 + coalesceWindowMs 이내 → after 를 other.after 로 교체한 새 Command 반환.
   * other 는 this 보다 나중에 발행된 Command (더 최신).
   */
  coalesceWith(other: Command): Command | null {
    if (
      other.name !== this.name ||
      !(other instanceof TransformObjectCommand) ||
      other._id !== this._id
    ) {
      return null
    }
    // timestamp 차가 300ms 초과 시 합치지 않음 (History 가 windowMs 를 전달하지 않으므로 여기서 하드코딩)
    // 실제로는 History.coalesceWindowMs 를 참조해야 하지만, Command 는 History 를 모름.
    // 따라서 TransformObjectCommand 생성 시 windowMs 를 외부에서 주입받는 방식을 사용.
    if (other.timestamp - this.timestamp > this._coalesceWindowMs) {
      return null
    }
    return new TransformObjectCommand({
      canvas: this._canvas,
      id: this._id,
      before: this._before,
      after: other._after,
    })
  }

  private _coalesceWindowMs = 300

  setCoalesceWindowMs(ms: number): this {
    this._coalesceWindowMs = ms
    return this
  }

  get objectId(): string {
    return this._id
  }

  get before(): TransformSnapshot {
    return { ...this._before }
  }

  get after(): TransformSnapshot {
    return { ...this._after }
  }
}

function applySnapshot(obj: FabricObject, snap: TransformSnapshot): void {
  obj.set({
    left: snap.left,
    top: snap.top,
    scaleX: snap.scaleX,
    scaleY: snap.scaleY,
    angle: snap.angle,
    flipX: snap.flipX,
    flipY: snap.flipY,
  })
  if (snap.width !== undefined) obj.set({ width: snap.width })
  if (snap.height !== undefined) obj.set({ height: snap.height })
  obj.setCoords()
}

/**
 * fabric 객체에서 TransformSnapshot 을 추출하는 헬퍼.
 */
export function snapshotFromFabricObject(obj: FabricObject): TransformSnapshot {
  return {
    left: obj.left ?? 0,
    top: obj.top ?? 0,
    scaleX: obj.scaleX ?? 1,
    scaleY: obj.scaleY ?? 1,
    angle: obj.angle ?? 0,
    flipX: obj.flipX ?? false,
    flipY: obj.flipY ?? false,
    width: obj.width,
    height: obj.height,
  }
}
