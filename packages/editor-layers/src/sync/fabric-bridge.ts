// ─────────────────────────────────────────────
// fabric-bridge — editor-core의 fabric Canvas 와 양방향 동기화
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { FabricObject } from 'fabric'

/**
 * fabric 객체에 lock 상태를 적용한다.
 * locked=true 이면 선택/이동/크기조절/회전 모두 불가.
 */
export function applyLockToFabricObject(obj: FabricObject, locked: boolean): void {
  obj.selectable = !locked
  obj.evented = !locked
  obj.lockMovementX = locked
  obj.lockMovementY = locked
  obj.lockScalingX = locked
  obj.lockScalingY = locked
  obj.lockRotation = locked
}

/**
 * fabric 객체에 hidden 상태를 적용한다.
 */
export function applyHiddenToFabricObject(obj: FabricObject, hidden: boolean): void {
  obj.visible = !hidden
}

/**
 * fabric canvas 에서 z-order 를 재배열한다.
 *
 * fabric v6 의 `_objects` 배열은 인덱스 0이 최하위(배경), 마지막이 최상위(전면).
 * rootOrder 배열도 동일 규칙: 인덱스 0이 배경, 마지막이 전면.
 *
 * 그룹 안의 객체는 fabric Group 이 내부적으로 관리하므로 여기서는
 * root 레벨 객체만 재정렬한다.
 */
export function syncZOrderToFabric(orderedIds: string[], canvas: StoryCanvas): void {
  const fabricCanvas = canvas._fabricCanvas
  const objects: FabricObject[] = fabricCanvas._objects

  // id → fabric 객체 맵 구성
  const idToObj = new Map<string, FabricObject>()
  for (const obj of objects) {
    const data = (obj as { data?: { id?: string } }).data
    if (data?.id) {
      idToObj.set(data.id, obj)
    }
  }

  // orderedIds 순서대로 새 배열 구성 (없는 id 는 건너뜀)
  const reordered: FabricObject[] = []
  for (const id of orderedIds) {
    const obj = idToObj.get(id)
    if (obj) reordered.push(obj)
  }

  // orderedIds 에 없는 객체도 보존 (그룹 내부 객체 등)
  for (const obj of objects) {
    const data = (obj as { data?: { id?: string } }).data
    if (!data?.id || !orderedIds.includes(data.id)) {
      reordered.push(obj)
    }
  }

  fabricCanvas._objects = reordered
  fabricCanvas.requestRenderAll()
}
