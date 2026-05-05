// ─────────────────────────────────────────────
// exportPng.ts — StoryCanvas → PNG Blob
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'

import type { ExportPngOptions, ExportPngResult } from '../types.js'

import { computeOutputSize, dataUrlToBlob, renderToDataUrl } from './render.js'

const DEFAULT_SCALE = 2
const DEFAULT_BACKGROUND = 'transparent'
const DEFAULT_FORMAT = 'image/png' as const
const DEFAULT_QUALITY = 0.92

/**
 * StoryCanvas 의 현재 상태를 PNG Blob 으로 내보낸다.
 *
 * - scale: 기본 2배(Retina) — 고해상도 출력
 * - background: 기본 transparent
 * - format: 기본 image/png
 * - bleed: M6 이후 구현, 현재 무시
 *
 * @throws Error fabric canvas 에 접근할 수 없을 때
 */
export async function exportPng(
  canvas: StoryCanvas,
  opts?: ExportPngOptions,
): Promise<ExportPngResult> {
  const scale = opts?.scale ?? DEFAULT_SCALE
  const background = opts?.background ?? DEFAULT_BACKGROUND
  const format = opts?.format ?? DEFAULT_FORMAT
  const quality = opts?.quality ?? DEFAULT_QUALITY

  if (scale <= 0) {
    throw new Error('[editor-export] exportPng: scale 은 양수여야 합니다.')
  }
  if (quality < 0 || quality > 1) {
    throw new Error('[editor-export] exportPng: quality 는 0..1 사이여야 합니다.')
  }

  const fabricCanvas = canvas._fabricCanvas

  // bleed 는 현재 미구현 — 향후 M6 에서 캔버스 영역 확장
  if (opts?.bleed) {
    console.warn('[editor-export] exportPng: bleed 옵션은 M6 이후 구현됩니다. 현재는 무시됩니다.')
  }

  const dataUrl = renderToDataUrl(fabricCanvas, {
    scale,
    background,
    format,
    quality,
  })

  const blob = await dataUrlToBlob(dataUrl, format)
  const { width, height } = computeOutputSize(fabricCanvas, scale)

  return {
    blob,
    width,
    height,
    scale,
    mimeType: format,
  }
}
