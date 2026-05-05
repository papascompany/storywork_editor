/**
 * vitest 전역 셋업 — jsdom 환경에서 fabric 을 사용하기 위한 polyfill
 *
 * fabric 브라우저 엔트리는 requestAnimationFrame / cancelAnimationFrame 을 요구한다.
 * jsdom 은 이를 제공하지 않으므로 setTimeout 기반으로 폴리필한다.
 */

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

// HTMLCanvasElement.getContext mock — jsdom 은 canvas API 를 완전 지원하지 않는다
// fabric 내부에서 getContext('2d') 호출 시 최소한의 stub 을 반환한다
const OriginalGetContext = HTMLCanvasElement.prototype.getContext
HTMLCanvasElement.prototype.getContext = function (
  contextId: string,
  ...args: unknown[]
): RenderingContext | null {
  if (contextId === '2d') {
    // 이미 구현되어 있으면 그대로 사용, 없으면 minimal stub
    const ctx = OriginalGetContext.call(
      this,
      contextId,
      ...(args as []),
    ) as CanvasRenderingContext2D | null
    if (ctx) return ctx

    // minimal stub for jsdom environments without canvas
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
      measureText: (_text: string) => ({
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
      createLinearGradient: () => ({
        addColorStop: () => {},
      }),
      createRadialGradient: () => ({
        addColorStop: () => {},
      }),
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
  return OriginalGetContext.call(this, contextId, ...(args as [])) as RenderingContext | null
}
