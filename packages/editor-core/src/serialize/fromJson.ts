import { parsePageJson } from '@storywork/schema/editor'
import type { LayerJson, PageJsonV1 } from '@storywork/schema/editor'
import { FabricImage, Rect, Group } from 'fabric'
import type { FabricObject } from 'fabric'

import { mmToPx } from '../canvas/coords.js'
import { layerKindToKind } from '../data/object-meta.js'
import type { ObjectData, ObjectKind } from '../types.js'

/**
 * PageJsonV1 → fabric 객체 배열.
 * 반환된 객체들은 Canvas.add() 로 추가한다.
 *
 * 계약:
 * - mm 좌표 → px 변환 후 fabric 에 적용
 * - id, kind, resourceId, slotId, locked, meta 복원
 */
export async function deserializeFromJson(
  json: unknown,
  dpi: number,
): Promise<{ objects: FabricObject[]; json: PageJsonV1 }> {
  const validated = parsePageJson(json)
  const objects = await Promise.all(
    validated.layers.map((layer) => layerToFabricObject(layer, dpi)),
  )
  return {
    objects: objects.filter((o): o is FabricObject => o !== null),
    json: validated,
  }
}

async function layerToFabricObject(layer: LayerJson, dpi: number): Promise<FabricObject | null> {
  const fabricDef = layer.fabric

  // mm 좌표 → px 복원
  const leftMm = typeof fabricDef['leftMm'] === 'number' ? fabricDef['leftMm'] : 0
  const topMm = typeof fabricDef['topMm'] === 'number' ? fabricDef['topMm'] : 0
  const widthMm = typeof fabricDef['widthMm'] === 'number' ? fabricDef['widthMm'] : 100
  const heightMm = typeof fabricDef['heightMm'] === 'number' ? fabricDef['heightMm'] : 100

  const scaleX = typeof fabricDef['scaleX'] === 'number' ? fabricDef['scaleX'] : 1
  const scaleY = typeof fabricDef['scaleY'] === 'number' ? fabricDef['scaleY'] : 1

  const kind = layerKindToKind[layer.kind] ?? 'decoration'

  const objectData: ObjectData = {
    id: layer.id,
    kind: kind as ObjectKind,
    resourceId: layer.data.resourceId,
    slotId: layer.data.slotId,
    locked: layer.data.locked,
    meta: layer.data.meta,
  }

  if (layer.kind === 'group' && Array.isArray(layer.children)) {
    // 재귀적으로 하위 객체 복원
    const children = await Promise.all(
      layer.children.map((child) => layerToFabricObject(child, dpi)),
    )
    const validChildren = children.filter((c): c is FabricObject => c !== null)
    const group = new Group(validChildren, {
      left: mmToPx(leftMm, dpi),
      top: mmToPx(topMm, dpi),
      scaleX,
      scaleY,
      angle: typeof fabricDef['angle'] === 'number' ? fabricDef['angle'] : 0,
      visible: typeof fabricDef['visible'] === 'boolean' ? fabricDef['visible'] : true,
      selectable: !objectData.locked,
      evented: !objectData.locked,
    })
    // @ts-expect-error fabric data property
    group.data = objectData
    return group
  }

  // fabric.type 이 'image' 이거나 kind 가 'pose' 인 경우 FabricImage 로 복원
  const fabricType = typeof fabricDef['type'] === 'string' ? fabricDef['type'] : ''
  const src = typeof fabricDef['src'] === 'string' ? fabricDef['src'] : ''

  if ((fabricType === 'image' || kind === 'pose') && src) {
    try {
      const img = await FabricImage.fromURL(src, { crossOrigin: 'anonymous' })
      img.set({
        left: mmToPx(leftMm, dpi),
        top: mmToPx(topMm, dpi),
        scaleX,
        scaleY,
        angle: typeof fabricDef['angle'] === 'number' ? fabricDef['angle'] : 0,
        opacity: typeof fabricDef['opacity'] === 'number' ? fabricDef['opacity'] : 1,
        flipX: typeof fabricDef['flipX'] === 'boolean' ? fabricDef['flipX'] : false,
        flipY: typeof fabricDef['flipY'] === 'boolean' ? fabricDef['flipY'] : false,
        visible: typeof fabricDef['visible'] === 'boolean' ? fabricDef['visible'] : true,
        selectable: !objectData.locked,
        evented: !objectData.locked,
      })
      // @ts-expect-error fabric data property
      img.data = objectData
      return img
    } catch {
      // 이미지 로드 실패 시 Rect 폴백 (콘솔 경고 없이 무음 처리)
      console.warn(`[editor-core] 이미지 복원 실패 (src=${src.slice(0, 60)}...) → Rect 폴백`)
    }
  }

  // 기본 Rect 로 복원 (배경, 도형 등)
  const obj = new Rect({
    left: mmToPx(leftMm, dpi),
    top: mmToPx(topMm, dpi),
    width: mmToPx(widthMm, dpi) / scaleX,
    height: mmToPx(heightMm, dpi) / scaleY,
    scaleX,
    scaleY,
    angle: typeof fabricDef['angle'] === 'number' ? fabricDef['angle'] : 0,
    opacity: typeof fabricDef['opacity'] === 'number' ? fabricDef['opacity'] : 1,
    flipX: typeof fabricDef['flipX'] === 'boolean' ? fabricDef['flipX'] : false,
    flipY: typeof fabricDef['flipY'] === 'boolean' ? fabricDef['flipY'] : false,
    visible: typeof fabricDef['visible'] === 'boolean' ? fabricDef['visible'] : true,
    selectable: !objectData.locked,
    evented: !objectData.locked,
    fill: typeof fabricDef['fill'] === 'string' ? fabricDef['fill'] : 'transparent',
    stroke: typeof fabricDef['stroke'] === 'string' ? fabricDef['stroke'] : '',
    strokeWidth: typeof fabricDef['strokeWidth'] === 'number' ? fabricDef['strokeWidth'] : 0,
  })

  // @ts-expect-error fabric data property
  obj.data = objectData
  return obj
}
