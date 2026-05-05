import '@testing-library/jest-dom'

// jsdom 에서 window.matchMedia 가 구현되지 않으므로 mock 처리
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string) => ({
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

// jsdom 에서 ResizeObserver 가 구현되지 않으므로 mock 처리 (Radix UI 내부 사용)
if (typeof window.ResizeObserver === 'undefined') {
  window.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
}
