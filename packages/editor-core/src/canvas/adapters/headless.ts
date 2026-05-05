/**
 * 헤드리스(Node/jsdom) 환경에서 fabric Canvas 를 초기화하는 어댑터.
 *
 * browser 환경에서는 container HTMLElement 를 직접 사용하므로 이 파일은 node 전용이다.
 * vitest jsdom 환경에서는 document.createElement('canvas') 가 동작한다.
 */

import { Canvas } from 'fabric'

/**
 * Node 환경에서 사용할 fabric Canvas 를 생성한다.
 * jsdom 환경일 때도 HTMLCanvasElement polyfill 로 동작한다.
 */
export function createHeadlessCanvas(width: number, height: number): Canvas {
  let canvasEl: HTMLCanvasElement

  if (typeof document !== 'undefined') {
    // jsdom 환경 (vitest)
    canvasEl = document.createElement('canvas')
    canvasEl.width = width
    canvasEl.height = height
  } else {
    // 순수 Node 환경 — node-canvas 사용
    // node-canvas 는 devDependency 이며, 이 분기는 순수 Node 실행 시에만 도달한다

    const nodeCanvas = require('canvas') as { createCanvas: (w: number, h: number) => unknown }
    canvasEl = nodeCanvas.createCanvas(width, height) as HTMLCanvasElement
  }

  return new Canvas(canvasEl, {
    width,
    height,
    renderOnAddRemove: false,
  })
}
