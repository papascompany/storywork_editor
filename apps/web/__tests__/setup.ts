/**
 * apps/web vitest setup — jsdom + fabric polyfills + React Testing Library
 */

import '@testing-library/jest-dom'

// ── Supabase browser client mock ──────────────────────────────────────────────
// marketing/* 테스트가 Header.tsx 를 통해 supabase/client 를 의존한다.
// jsdom 환경에서 환경변수 없이 createBrowserClient 를 호출하면 throw 하므로
// setup 단계에서 module-level mock 으로 교체한다.
// vi.mock 은 hoisted 되지 않으므로 여기서는 globalThis 에 환경변수를 주입한다.
// (실제 createBrowserClient 호출이 일어나기 전에 값이 있어야 한다)
if (!process.env['NEXT_PUBLIC_SUPABASE_URL']) {
  process.env['NEXT_PUBLIC_SUPABASE_URL'] = 'http://localhost:54321'
}
if (!process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
  process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] = 'test-anon-key'
}

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

// window.matchMedia mock — jsdom 미지원 환경 대응
if (typeof window !== 'undefined' && typeof window.matchMedia === 'undefined') {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: (query: string): MediaQueryList => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {},
      removeListener: () => {},
      addEventListener: () => {},
      removeEventListener: () => {},
      dispatchEvent: () => false,
    }),
  })
}

// scrollIntoView mock — jsdom 미지원 환경 대응
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {}
}

// IntersectionObserver mock — jsdom 미지원 환경 대응
if (typeof globalThis.IntersectionObserver === 'undefined') {
  globalThis.IntersectionObserver = class MockIntersectionObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof IntersectionObserver
}

// localStorage mock — jsdom 에서 localStorage 지원
// CI 환경의 jsdom 이 localStorage 객체는 제공하지만 setItem 등 메서드가
// 손상된 경우가 있어 typeof check 만으로는 부족하다 (회고 25977212881).
// → setItem 이 function 인지 검증 후 항상 안전한 mock 으로 교체.
{
  const existing = globalThis.localStorage as unknown
  const isHealthy =
    existing &&
    typeof (existing as Record<string, unknown>)['setItem'] === 'function' &&
    typeof (existing as Record<string, unknown>)['getItem'] === 'function' &&
    typeof (existing as Record<string, unknown>)['removeItem'] === 'function'
  if (!isHealthy) {
    const store: Record<string, string> = {}
    const storageMock = {
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
      key: (index: number) => Object.keys(store)[index] ?? null,
      get length() {
        return Object.keys(store).length
      },
    }
    Object.defineProperty(globalThis, 'localStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    })
    Object.defineProperty(globalThis, 'sessionStorage', {
      value: storageMock,
      writable: true,
      configurable: true,
    })
  }
}
