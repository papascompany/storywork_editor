/**
 * thumbnail.ts — 캔버스 썸네일 캡처
 *
 * editor-export 의 PNG 변환 활용 → 256px 다운스케일 → dataURL
 */

import type { StoryCanvas } from '@storywork/editor-core'

const THUMBNAIL_SIZE = 256

export interface ThumbnailOpts {
  /** 최대 너비/높이 (기본 256) */
  maxPx?: number
}

/**
 * captureThumbnail — 현재 캔버스 상태를 dataURL 썸네일로 반환
 *
 * @returns dataURL (image/jpeg) 또는 null (캔버스 미준비 시)
 */
export async function captureThumbnail(
  canvas: StoryCanvas,
  opts: ThumbnailOpts = {},
): Promise<string | null> {
  try {
    const maxPx = opts.maxPx ?? THUMBNAIL_SIZE
    const fabricCanvas = canvas._fabricCanvas

    // getContext 가드 (FOLLOWUP-16 패턴)
    const ctx = (fabricCanvas as { getContext?: () => unknown }).getContext?.()
    if (!ctx) return null

    const canvasEl = fabricCanvas.getElement()
    if (!canvasEl) return null

    const naturalW = fabricCanvas.getWidth()
    const naturalH = fabricCanvas.getHeight()
    if (!naturalW || !naturalH) return null

    // 오프스크린 캔버스에 다운스케일
    const scale = Math.min(1, maxPx / naturalW, maxPx / naturalH)
    const thumbW = Math.max(1, Math.round(naturalW * scale))
    const thumbH = Math.max(1, Math.round(naturalH * scale))

    const offscreen = document.createElement('canvas')
    offscreen.width = thumbW
    offscreen.height = thumbH
    const offCtx = offscreen.getContext('2d')
    if (!offCtx) return null

    // 흰 배경
    offCtx.fillStyle = '#ffffff'
    offCtx.fillRect(0, 0, thumbW, thumbH)

    offCtx.drawImage(canvasEl, 0, 0, thumbW, thumbH)
    return offscreen.toDataURL('image/jpeg', 0.7)
  } catch (e) {
    console.warn('[thumbnail] 캡처 실패:', e)
    return null
  }
}
