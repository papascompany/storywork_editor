/**
 * apps/web vitest setup — jsdom + fabric polyfills + React Testing Library
 */

import '@testing-library/jest-dom'

// ── fabric polyfills ─────────────────────────────────────────────────────────
if (typeof globalThis.requestAnimationFrame === 'undefined') {
  globalThis.requestAnimationFrame = (cb: FrameRequestCallback): number => {
    return setTimeout(() => cb(Date.now()), 16) as unknown as number
  }
}

if (typeof globalThis.cancelAnimationFrame === 'undefined') {
  globalThis.cancelAnimationFrame = (id: number): void => {
    clearTimeout(id)
  }
}

// HTMLCanvasElement.getContext stub — jsdom 의 canvas 미지원 환경 대응

const OriginalGetContext = HTMLCanvasElement.prototype.getContext

// @ts-expect-error overriding with simplified signature for jsdom test env
HTMLCanvasElement.prototype.getContext = function (contextId: string, ...args: unknown[]) {
  if (contextId === '2d') {
    const ctx = OriginalGetContext.call(
      this,
      contextId,
      ...(args as any[]),
    ) as CanvasRenderingContext2D | null
    if (ctx) return ctx

    return {
      canvas: this,
      fillRect: () => {},
      clearRect: () => {},
      getImageData: (_x: number, _y: number, w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
        colorSpace: 'srgb' as PredefinedColorSpace,
      }),
      putImageData: () => {},
      createImageData: (w: number, h: number) => ({
        data: new Uint8ClampedArray(w * h * 4),
        width: w,
        height: h,
        colorSpace: 'srgb' as PredefinedColorSpace,
      }),
      setTransform: () => {},
      drawImage: () => {},
      save: () => {},
      fillText: () => {},
      restore: () => {},
      beginPath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      closePath: () => {},
      stroke: () => {},
      fill: () => {},
      rotate: () => {},
      translate: () => {},
      scale: () => {},
      transform: () => {},
      rect: () => {},
      clip: () => {},
      arc: () => {},
      bezierCurveTo: () => {},
      quadraticCurveTo: () => {},
      measureText: () => ({
        width: 0,
        actualBoundingBoxAscent: 0,
        actualBoundingBoxDescent: 0,
        actualBoundingBoxLeft: 0,
        actualBoundingBoxRight: 0,
        fontBoundingBoxAscent: 0,
        fontBoundingBoxDescent: 0,
        alphabeticBaseline: 0,
        emHeightAscent: 0,
        emHeightDescent: 0,
        hangingBaseline: 0,
        ideographicBaseline: 0,
      }),
      createPattern: () => null,
      createLinearGradient: () => ({ addColorStop: () => {} }),
      createRadialGradient: () => ({ addColorStop: () => {} }),
      isPointInPath: () => false,
      strokeRect: () => {},
      strokeText: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
      lineCap: 'butt' as CanvasLineCap,
      lineJoin: 'miter' as CanvasLineJoin,
      globalAlpha: 1,
      globalCompositeOperation: 'source-over' as GlobalCompositeOperation,
      font: '10px sans-serif',
      textAlign: 'start' as CanvasTextAlign,
      textBaseline: 'alphabetic' as CanvasTextBaseline,
      shadowBlur: 0,
      shadowColor: '',
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      miterLimit: 10,
      lineDashOffset: 0,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'low' as ImageSmoothingQuality,
      direction: 'ltr' as CanvasDirection,
      filter: 'none',
      getLineDash: () => [],
      setLineDash: () => {},
      resetTransform: () => {},
      getTransform: () => new DOMMatrix(),
    } as unknown as CanvasRenderingContext2D
  }

  return OriginalGetContext.call(this, contextId, ...(args as any[]))
}

// localStorage mock — jsdom 에서 localStorage 지원
if (typeof globalThis.localStorage === 'undefined') {
  const store: Record<string, string> = {}
  Object.defineProperty(globalThis, 'localStorage', {
    value: {
      getItem: (key: string) => store[key] ?? null,
      setItem: (key: string, value: string) => {
        store[key] = value
      },
      removeItem: (key: string) => {
        delete store[key]
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k])
      },
    },
  })
}
