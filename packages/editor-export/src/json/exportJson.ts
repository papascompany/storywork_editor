// ─────────────────────────────────────────────
// exportJson.ts — StoryCanvas + LayerTree → ExportJsonResult
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { LayerTree } from '@storywork/editor-layers'

import type { ExportJsonResult } from '../types.js'

/**
 * 현재 캔버스 상태를 PageJsonV1 + LayerNodeJson[] 로 직렬화한다.
 *
 * - page: editor-core 의 toJson() 결과 (fabric 직렬화, mm 좌표)
 * - layers: editor-layers 의 toJson() 결과 (트리 메타 — 잠금/숨김/이름)
 *
 * LayerTree 가 없을 경우 layers 는 빈 배열을 반환한다.
 *
 * @param canvas StoryCanvas 인스턴스
 * @param layers LayerTree 인스턴스 (선택)
 */
export function exportJson(canvas: StoryCanvas, layers?: LayerTree): ExportJsonResult {
  const page = canvas.toJson()
  const layerNodes = layers ? layers.toJson() : []

  return {
    page,
    layers: layerNodes,
  }
}
