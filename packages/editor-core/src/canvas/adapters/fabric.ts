/**
 * fabric 인스턴스 라이프사이클 어댑터.
 * browser 환경(container: HTMLElement)과 headless 환경을 통합한다.
 */

import { Canvas } from 'fabric'

import type { Format } from '../../types.js'
import { formatToPxSize } from '../coords.js'

import { createHeadlessCanvas } from './headless.js'

export type FabricAdapterOptions = {
  format: Format
  container?: HTMLElement | OffscreenCanvas
  backgroundColor?: string
}

/**
 * format 에 맞게 fabric Canvas 를 생성한다.
 * - container 가 있으면 브라우저 모드
 * - container 가 없으면 헤드리스 모드 (Node/jsdom)
 */
export function createFabricCanvas(opts: FabricAdapterOptions): Canvas {
  const { width, height } = formatToPxSize(
    opts.format.widthMm,
    opts.format.heightMm,
    opts.format.dpi,
  )

  let canvas: Canvas

  if (opts.container instanceof HTMLElement) {
    // 브라우저 환경
    const el = document.createElement('canvas')
    opts.container.appendChild(el)
    canvas = new Canvas(el, {
      width,
      height,
      renderOnAddRemove: false,
      backgroundColor: opts.backgroundColor ?? '#ffffff',
    })
  } else if (typeof OffscreenCanvas !== 'undefined' && opts.container instanceof OffscreenCanvas) {
    // OffscreenCanvas 환경
    const el = document.createElement('canvas')
    el.width = width
    el.height = height
    canvas = new Canvas(el, {
      width,
      height,
      renderOnAddRemove: false,
      backgroundColor: opts.backgroundColor ?? '#ffffff',
    })
  } else {
    // 헤드리스 환경
    canvas = createHeadlessCanvas(width, height)
    if (opts.backgroundColor) {
      canvas.backgroundColor = opts.backgroundColor
    }
  }

  return canvas
}

/**
 * format 변경 시 캔버스 크기를 재계산한다.
 */
export function resizeCanvas(canvas: Canvas, format: Format): void {
  const { width, height } = formatToPxSize(format.widthMm, format.heightMm, format.dpi)
  canvas.setWidth(width)
  canvas.setHeight(height)
}
