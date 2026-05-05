// ─────────────────────────────────────────────
// AddObjectCommand — 캔버스에 객체 추가
// ─────────────────────────────────────────────

import type { ObjectData, StoryCanvas } from '@storywork/editor-core'
import type { FabricObject } from 'fabric'

import type { Command } from '../../types.js'

export type AddObjectCommandOptions = {
  canvas: StoryCanvas
  /** fabric 객체 */
  fabricObj: FabricObject
  /** ObjectData 오버라이드 */
  dataOverrides: Pick<ObjectData, 'kind'> & Partial<ObjectData>
}

/**
 * AddObjectCommand — 캔버스에 객체 한 개를 추가/제거하는 Command.
 *
 * do()  → StoryCanvas.addObject(dataOverrides, fabricObj) [첫 번째]
 *          → objectMap 에 직접 등록 + fabricCanvas.add [이후]
 * undo() → StoryCanvas.removeObject(id)
 *
 * 첫 번째 do() 호출 시 id 가 할당된다.
 * 이후 do() 호출(redo)에서는 동일 id 를 유지하기 위해 내부 경로를 사용한다.
 */
export class AddObjectCommand implements Command {
  readonly name = 'canvas:add'
  readonly timestamp: number

  private readonly _canvas: StoryCanvas
  private readonly _fabricObj: FabricObject
  private readonly _dataOverrides: Pick<ObjectData, 'kind'> & Partial<ObjectData>
  private _assignedId: string | null = null

  constructor(opts: AddObjectCommandOptions) {
    this._canvas = opts.canvas
    this._fabricObj = opts.fabricObj
    this._dataOverrides = opts.dataOverrides
    this.timestamp = Date.now()
  }

  do(): void {
    if (this._assignedId === null) {
      // 최초 실행: addObject 로 id 할당
      this._assignedId = this._canvas.addObject(this._dataOverrides, this._fabricObj)
    } else {
      // redo: 동일 id 재사용 — fabricObj.data 가 이미 있으므로 내부 경로 사용
      const savedData = { ...(this._fabricObj as { data?: ObjectData }).data }
      if (!savedData.id) {
        // fallback: 다시 addObject (id 변경될 수 있음)
        this._assignedId = this._canvas.addObject(this._dataOverrides, this._fabricObj)
        return
      }
      // @ts-expect-error 내부 _objectMap 직접 접근 (동일 id 유지)
      const objectMap = this._canvas._objectMap as Map<string, FabricObject>
      objectMap.set(savedData.id, this._fabricObj)
      this._canvas._fabricCanvas.add(this._fabricObj)
      this._canvas._fabricCanvas.renderAll()
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
