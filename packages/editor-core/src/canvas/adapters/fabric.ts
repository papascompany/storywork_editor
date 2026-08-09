/**
 * fabric 인스턴스 라이프사이클 어댑터.
 * browser 환경(container: HTMLElement)과 headless 환경을 통합한다.
 *
 * H3: 모바일(coarse pointer) 분기:
 *   - enableRetinaScaling: false  → 9× 메모리 절감 (devicePixelRatio² 기준)
 *   - cornerSize / touchCornerSize / padding / borderScaleFactor 확대
 * 글로벌 prototype 설정은 __storywork_fabric_defaults_set 플래그로 중복 방지한다.
 */

import { Canvas, Object as FabricObjectClass } from 'fabric'

import type { Format } from '../../types.js'
import { isCoarsePointer } from '../../utils/coarse.js'
import { clampCanvasPx, formatPxSize } from '../coords.js'

import { createHeadlessCanvas } from './headless.js'

export type FabricAdapterOptions = {
  format: Format
  container?: HTMLElement | OffscreenCanvas
  backgroundColor?: string
}

/**
 * fabric 글로벌 prototype 기본값을 한 번만 설정한다.
 * H3: __storywork_fabric_defaults_set 플래그로 중복 적용을 방지한다.
 */
function applyFabricGlobalDefaults(coarse: boolean): void {
  if ((globalThis as Record<string, unknown>).__storywork_fabric_defaults_set) return
  ;(globalThis as Record<string, unknown>).__storywork_fabric_defaults_set = true

  FabricObjectClass.prototype.objectCaching = true

  if (coarse) {
    // 모바일: 컨트롤 핸들 크기를 터치에 적합하게 확대
    FabricObjectClass.prototype.cornerSize = 16
    FabricObjectClass.prototype.touchCornerSize = 36
    FabricObjectClass.prototype.padding = 8
    FabricObjectClass.prototype.borderScaleFactor = 2
  }
}

/**
 * format 에 맞게 fabric Canvas 를 생성한다.
 * - container 가 있으면 브라우저 모드
 * - container 가 없으면 헤드리스 모드 (Node/jsdom)
 */
export function createFabricCanvas(opts: FabricAdapterOptions): Canvas {
  const coarse = isCoarsePointer()

  // 단위계 자동 처리 — px(웹툰) 판형은 1:1 (MODE-04)
  const raw = formatPxSize(opts.format)
  // 브라우저 canvas 상한 방어 — 넘으면 예외 없이 빈 캔버스가 된다.
  // enableRetinaScaling 이 켜진 데스크톱은 백스토어가 dpr 배라 한계가 절반이다.
  const dpr = coarse || typeof window === 'undefined' ? 1 : (window.devicePixelRatio ?? 1)
  const { width, height, clamped } = clampCanvasPx(raw.width, raw.height, dpr)
  if (clamped) {
    console.warn(
      `[editor-core] 캔버스 크기 ${raw.width}×${raw.height}px 가 브라우저 상한을 넘어 ` +
        `${width}×${height}px 로 축소했습니다 (dpr=${dpr}).`,
    )
  }
  applyFabricGlobalDefaults(coarse)

  let canvas: Canvas

  if (opts.container instanceof HTMLElement) {
    // 브라우저 환경
    const el = document.createElement('canvas')
    opts.container.appendChild(el)
    canvas = new Canvas(el, {
      width,
      height,
      // H3: 모바일에서 enableRetinaScaling 비활성화 → devicePixelRatio² 메모리 절감
      enableRetinaScaling: !coarse,
      renderOnAddRemove: false,
      preserveObjectStacking: true,
      fireRightClick: false,
      stopContextMenu: true,
      allowTouchScrolling: false,
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
      enableRetinaScaling: !coarse,
      renderOnAddRemove: false,
      preserveObjectStacking: true,
      fireRightClick: false,
      stopContextMenu: true,
      allowTouchScrolling: false,
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
  const raw = formatPxSize(format)
  const { width, height, clamped } = clampCanvasPx(raw.width, raw.height)
  if (clamped) {
    console.warn(
      `[editor-core] resizeCanvas: ${raw.width}×${raw.height}px → ${width}×${height}px 로 축소(상한 방어).`,
    )
  }
  canvas.setWidth(width)
  canvas.setHeight(height)
}
