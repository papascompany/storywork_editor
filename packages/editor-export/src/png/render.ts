// ─────────────────────────────────────────────
// render.ts — off-screen 캔버스 렌더 유틸
// ─────────────────────────────────────────────

import type { Canvas as FabricCanvas, ImageFormat } from 'fabric'

export type RenderToDataUrlOptions = {
  scale: number
  background: string
  format: 'image/png' | 'image/jpeg' | 'image/webp'
  quality: number
}

/** MIME type → fabric ImageFormat 변환 */
function mimeToFabricFormat(mime: 'image/png' | 'image/jpeg' | 'image/webp'): ImageFormat {
  switch (mime) {
    case 'image/jpeg':
      return 'jpeg'
    case 'image/webp':
      return 'webp'
    case 'image/png':
    default:
      return 'png'
  }
}

/**
 * fabric Canvas 를 오프스크린 렌더해 dataURL 문자열을 반환한다.
 *
 * - backgroundColor 를 임시 재정의 후 복원한다.
 * - multiplier(scale) 를 이용해 고해상도 출력한다.
 * - bleed 는 현재 미지원 (M6 에서 확장).
 */
export function renderToDataUrl(fabricCanvas: FabricCanvas, opts: RenderToDataUrlOptions): string {
  const prevBg = fabricCanvas.backgroundColor

  // 배경색 임시 재정의
  if (opts.background !== 'transparent') {
    fabricCanvas.backgroundColor = opts.background
  } else {
    // transparent 요청 시 기존 배경을 초기화
    fabricCanvas.backgroundColor = ''
  }

  // fabric v6 의 toDataURL API
  const dataUrl = fabricCanvas.toDataURL({
    format: mimeToFabricFormat(opts.format),
    quality: opts.quality,
    multiplier: opts.scale,
  })

  // 배경색 복원
  fabricCanvas.backgroundColor = prevBg

  return dataUrl
}

/**
 * base64 dataURL → Blob 변환.
 *
 * 우선순위:
 * 1. Node.js Buffer (테스트/SSR 환경 — Blob 인스턴스가 일관됨)
 * 2. atob (순수 브라우저 폴백)
 * 3. fetch API (브라우저 — 환경 이슈가 없을 때)
 */
export async function dataUrlToBlob(dataUrl: string, mimeType: string): Promise<Blob> {
  const base64 = dataUrl.split(',')[1] ?? ''

  // 1. Node.js Buffer — 가장 안전한 경로 (jsdom 포함)
  if (typeof Buffer !== 'undefined') {
    const nodeBuf = Buffer.from(base64, 'base64')
    const arrayBuf = nodeBuf.buffer.slice(
      nodeBuf.byteOffset,
      nodeBuf.byteOffset + nodeBuf.byteLength,
    ) as ArrayBuffer
    return new Blob([arrayBuf], { type: mimeType })
  }

  // 2. atob (브라우저 폴백)
  if (typeof atob !== 'undefined') {
    const binaryStr = atob(base64)
    const arr = new Uint8Array(binaryStr.length)
    for (let i = 0; i < binaryStr.length; i++) {
      arr[i] = binaryStr.charCodeAt(i)
    }
    return new Blob([arr.buffer as ArrayBuffer], { type: mimeType })
  }

  // 3. fetch API
  if (typeof fetch !== 'undefined') {
    const res = await fetch(dataUrl)
    return res.blob()
  }

  throw new Error('[editor-export] base64 디코딩 환경을 찾을 수 없습니다.')
}

/**
 * dataURL 에서 픽셀 크기를 추출한다.
 * fabric.toDataURL 결과에는 width/height 가 직접 없으므로
 * canvas 의 width * multiplier 를 사용한다.
 */
export function computeOutputSize(
  fabricCanvas: FabricCanvas,
  scale: number,
): { width: number; height: number } {
  return {
    width: Math.round((fabricCanvas.width ?? 0) * scale),
    height: Math.round((fabricCanvas.height ?? 0) * scale),
  }
}
