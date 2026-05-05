// ─────────────────────────────────────────────
// RemoveObjectCommand — 캔버스에서 객체 제거
// ─────────────────────────────────────────────

import type { ObjectData, StoryCanvas } from '@storywork/editor-core'
import type { FabricObject } from 'fabric'

import type { Command } from '../../types.js'

export type RemoveObjectCommandOptions = {
  canvas: StoryCanvas
  id: string
  /** undo 시 재추가할 fabric 객체 참조 */
  fabricObj: FabricObject
  /** undo 시 재추가할 ObjectData */
  objectData: ObjectData
}

/**
 * RemoveObjectCommand — 캔버스에서 객체 한 개를 제거/복원하는 Command.
 *
 * do()  → StoryCanvas.removeObject(id)
 * undo() → 저장해 둔 fabricObj + objectData 로 재추가
 */
export class RemoveObjectCommand implements Command {
  readonly name = 'canvas:remove'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _id: string
  private readonly _fabricObj: FabricObject
  private readonly _objectData: ObjectData

  constructor(opts: RemoveObjectCommandOptions) {
    this._canvas = opts.canvas
    this._id = opts.id
    this._fabricObj = opts.fabricObj
    this._objectData = opts.objectData
    this.timestamp = Date.now()
  }

  do(): void {
    this._canvas.removeObject(this._id)
  }

  undo(): void {
    // fabricObj.data 를 원래 ObjectData 로 복원한 뒤,
    // canvas 내부 objectMap 에 직접 등록하고 fabric canvas 에 추가한다.
    // StoryCanvas.addObject 는 createObjectData 로 새 id 를 생성하므로 사용 불가.
    // _fabricCanvas.add → 'object:added' 이벤트에서 objectMap 등록이 없으므로
    // canvas 내부 접근이 불가피하다.
    // @ts-expect-error fabric data property
    this._fabricObj.data = this._objectData

    // @ts-expect-error 내부 _objectMap 직접 접근 (addObject 의 createObjectData 우회)
    const objectMap = this._canvas._objectMap as Map<string, FabricObject>
    objectMap.set(this._objectData.id, this._fabricObj)
    this._canvas._fabricCanvas.add(this._fabricObj)
    this._canvas._fabricCanvas.renderAll()
  }
}
