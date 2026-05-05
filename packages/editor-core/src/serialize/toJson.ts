import type { LayerJson, PageFormat, PageJsonV1 } from '@storywork/schema/editor'
import type { Canvas, FabricObject } from 'fabric'

import { pxToMm } from '../canvas/coords.js'
import { extractObjectData, kindToLayerKind } from '../data/object-meta.js'
import type { ObjectKind } from '../types.js'

/**
 * fabric Canvas → PageJsonV1 직렬화.
 *
 * 계약:
 * - 좌표(left/top/width/height)는 mm 단위로 정규화
 * - id, kind, resourceId, slotId, locked, meta 는 반드시 보존
 * - 하위 호환성: fabric 직렬화 결과는 LayerJson.fabric 에 보존
 */
export function serializeToJson(canvas: Canvas, format: PageFormat, dpi: number): PageJsonV1 {
  const objects = canvas.getObjects()
  const layers: LayerJson[] = objects
    .map((obj) => fabricObjectToLayer(obj, dpi))
    .filter((l): l is LayerJson => l !== null)

  return {
    v: 1,
    format,
    layers,
  }
}

function fabricObjectToLayer(obj: FabricObject, dpi: number): LayerJson | null {
  const data = extractObjectData(obj as { data?: unknown })
  if (!data) return null

  const layerKind = kindToLayerKind[data.kind as ObjectKind] ?? 'decoration'

  // fabric 직렬화 — internal px 좌표 포함한 원시 직렬화 결과
  const fabricRaw = obj.toObject([
    'data',
    'selectable',
    'evented',
    'visible',
    'opacity',
    'angle',
    'flipX',
    'flipY',
    'skewX',
    'skewY',
    'scaleX',
    'scaleY',
    'originX',
    'originY',
    'strokeWidth',
    'stroke',
    'fill',
    'shadow',
    'clipPath',
  ]) as Record<string, unknown>

  // 좌표를 mm 로 정규화하여 저장 (px 기반 left/top/width/height 을 mm 변환)
  const leftPx = typeof fabricRaw['left'] === 'number' ? fabricRaw['left'] : 0
  const topPx = typeof fabricRaw['top'] === 'number' ? fabricRaw['top'] : 0
  const widthPx = typeof fabricRaw['width'] === 'number' ? fabricRaw['width'] : 0
  const heightPx = typeof fabricRaw['height'] === 'number' ? fabricRaw['height'] : 0

  // scaleX/scaleY 를 적용한 실제 렌더 크기를 mm 로 변환
  const scaleX = typeof fabricRaw['scaleX'] === 'number' ? fabricRaw['scaleX'] : 1
  const scaleY = typeof fabricRaw['scaleY'] === 'number' ? fabricRaw['scaleY'] : 1

  const mmNormalized: Record<string, unknown> = {
    ...fabricRaw,
    leftMm: pxToMm(leftPx, dpi),
    topMm: pxToMm(topPx, dpi),
    widthMm: pxToMm(widthPx * scaleX, dpi),
    heightMm: pxToMm(heightPx * scaleY, dpi),
  }

  return {
    id: data.id,
    kind: layerKind as LayerJson['kind'],
    data: {
      resourceId: data.resourceId,
      slotId: data.slotId,
      locked: data.locked,
      visible: typeof fabricRaw['visible'] === 'boolean' ? fabricRaw['visible'] : true,
      meta: data.meta,
    },
    fabric: mmNormalized,
  }
}
