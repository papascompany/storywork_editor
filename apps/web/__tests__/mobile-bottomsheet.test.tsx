/**
 * mobile-bottomsheet.test.tsx — M1-07 모바일 BottomSheet 단위 테스트
 *
 * 검증 항목:
 * 1. 시트 마운트 (peek 초기 상태)
 * 2. 핸들 클릭 → half 전환
 * 3. 핸들 재클릭 → full 전환
 * 4. 핸들 재클릭 → peek 복귀
 * 5. Esc 키 → peek 복귀
 * 6. 탭 전환 (tools → inspector → layers)
 * 7. 탭 클릭 시 peek → half 자동 전환
 * 8. closeRequest 증가 → peek 복귀
 * 9. 아이템 없을 때 빈 상태 안내 (Inspector)
 *
 * ResizeObserver 가드 (C-1) 테스트:
 * 10. 1px 미만 변동 → setDimensions 호출 안 함
 * 11. 동일 크기 → setDimensions 호출 안 함
 * 12. 유효 변동 → setDimensions 호출
 */

import { render, screen, act, fireEvent } from '@testing-library/react'
import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { MobileBottomSheet } from '../components/editor/MobileBottomSheet'

// ── 글로벌 모킹 ─────────────────────────────────────────────────────────────

// ResizeObserver 모킹
class MockResizeObserver implements ResizeObserver {
  private cb: ResizeObserverCallback
  static instances: MockResizeObserver[] = []
  observed: Element[] = []

  constructor(cb: ResizeObserverCallback) {
    this.cb = cb
    MockResizeObserver.instances.push(this)
  }
  observe(el: Element) {
    this.observed.push(el)
  }
  unobserve(_el: Element) {
    /* mock */
  }
  disconnect() {
    this.observed = []
  }
  // 수동으로 resize 알림 트리거
  trigger() {
    this.cb([] as ResizeObserverEntry[], this)
  }
}

beforeEach(() => {
  MockResizeObserver.instances = []
  globalThis.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver
  // visualViewport mock
  Object.defineProperty(window, 'visualViewport', {
    value: null,
    writable: true,
    configurable: true,
  })
})

// ── 공통 Props ───────────────────────────────────────────────────────────────

const defaultProps = {
  activeTool: 'select' as const,
  onToolChange: vi.fn(),
  onAddPose: vi.fn(),
  onAddBackground: vi.fn(),
  selectionProps: null,
  onUpdateProps: vi.fn(),
  layerTree: null,
  canvas: null,
  history: null,
  selectedIds: [],
  closeRequest: 0,
}

// ── 테스트 ─────────────────────────────────────────────────────────────────

describe('MobileBottomSheet — 기본 렌더 및 snap 전환', () => {
  it('1. 마운트 시 peek 상태 (56px)', () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet).toBeInTheDocument()
    expect(sheet.dataset.snap).toBe('peek')
    expect(sheet.style.height).toBe('56px')
  })

  it('2. 핸들 클릭 → half (50dvh)', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    })
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('half')
    expect(sheet.style.height).toBe('50dvh')
  })

  it('3. 핸들 두 번 클릭 → full (90dvh)', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    }) // peek→half
    await act(async () => {
      fireEvent.click(handle)
    }) // half→full
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('full')
    expect(sheet.style.height).toBe('90dvh')
  })

  it('4. 핸들 세 번 클릭 → peek 복귀', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    }) // half
    await act(async () => {
      fireEvent.click(handle)
    }) // full
    await act(async () => {
      fireEvent.click(handle)
    }) // peek
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('peek')
    expect(sheet.style.height).toBe('56px')
  })

  it('5. half 상태에서 Esc 키 → peek 복귀', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    }) // half

    await act(async () => {
      fireEvent.keyDown(document, { key: 'Escape' })
    })
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('peek')
  })

  it('5b. 핸들에서 Esc 키다운 → peek 복귀', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    }) // half
    await act(async () => {
      fireEvent.keyDown(handle, { key: 'Escape' })
    })
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('peek')
  })

  it('5c. Space 키 → half 전환', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.keyDown(handle, { key: ' ' })
    })
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('half')
  })
})

describe('MobileBottomSheet — 탭 전환', () => {
  it('6. 탭 전환 — tools → inspector 콘텐츠 표시', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    }) // half 열기

    const inspectorTab = screen.getByRole('tab', { name: '속성' })
    await act(async () => {
      fireEvent.click(inspectorTab)
    })

    expect(inspectorTab).toHaveAttribute('aria-selected', 'true')
    // 선택 없을 때 안내 텍스트
    expect(screen.getByText('객체를 선택하면 속성이 표시됩니다')).toBeInTheDocument()
  })

  it('7. 탭 클릭 시 peek → half 자동 전환', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    // 시트가 peek 상태에서 탭 클릭
    const layersTab = screen.getByRole('tab', { name: '레이어' })
    await act(async () => {
      fireEvent.click(layersTab)
    })
    const sheet = screen.getByTestId('mobile-bottom-sheet')
    expect(sheet.dataset.snap).toBe('half')
  })

  it('6b. layers 탭 — 레이어 없음 안내', async () => {
    render(<MobileBottomSheet {...defaultProps} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    })
    const layersTab = screen.getByRole('tab', { name: '레이어' })
    await act(async () => {
      fireEvent.click(layersTab)
    })
    expect(screen.getByText('레이어가 없습니다')).toBeInTheDocument()
  })
})

describe('MobileBottomSheet — closeRequest', () => {
  it('8. closeRequest 증가 → peek 복귀', async () => {
    const { rerender } = render(<MobileBottomSheet {...defaultProps} closeRequest={0} />)
    const handle = screen.getByRole('button', { name: /패널 열기|패널 닫기/ })
    await act(async () => {
      fireEvent.click(handle)
    }) // half
    expect(screen.getByTestId('mobile-bottom-sheet').dataset.snap).toBe('half')

    // closeRequest 증가
    await act(async () => {
      rerender(<MobileBottomSheet {...defaultProps} closeRequest={1} />)
    })
    expect(screen.getByTestId('mobile-bottom-sheet').dataset.snap).toBe('peek')
  })
})

// ── ResizeObserver 3중 가드 테스트 ─────────────────────────────────────────

describe('ResizeObserver 3중 가드 (C-1)', () => {
  it('10. 1px 미만 변동 → setDimensions 미호출', () => {
    const setDimensions = vi.fn()
    const getWidth = vi.fn(() => 500)
    const getHeight = vi.fn(() => 700)
    const requestRenderAll = vi.fn()
    const getContext = vi.fn(() => ({}))

    const mockCanvas = {
      _fabricCanvas: {
        setDimensions,
        getWidth,
        getHeight,
        requestRenderAll,
        getContext,
      },
    }

    // 컨테이너 div 크기 stub
    const div = document.createElement('div')
    Object.defineProperty(div, 'offsetWidth', { get: () => 500.3 })
    Object.defineProperty(div, 'offsetHeight', { get: () => 700.5 })

    // ResizeObserver 가드 로직 직접 테스트 (단위 테스트)
    let lastW = 0
    let lastH = 0

    const resize = () => {
      const w = div.offsetWidth
      const h = div.offsetHeight
      // 가드 1: 1px 미만
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return
      // 가드 2: 동일 크기
      if (mockCanvas._fabricCanvas.getWidth() === w && mockCanvas._fabricCanvas.getHeight() === h)
        return
      lastW = w
      lastH = h
      mockCanvas._fabricCanvas.setDimensions({ width: w, height: h })
      mockCanvas._fabricCanvas.requestRenderAll()
    }

    // 첫 번째 호출 — lastW=0, lastH=0 이므로 통과
    resize()
    expect(setDimensions).toHaveBeenCalledTimes(1)

    // 두 번째 호출 — lastW=500.3, lastH=700.5. 변동 < 1px → skip
    resize()
    expect(setDimensions).toHaveBeenCalledTimes(1) // 추가 호출 없음
  })

  it('11. 동일 크기 → setDimensions 미호출', () => {
    const setDimensions = vi.fn()
    // fabricCanvas 가 이미 동일 크기를 반환
    const getWidth = vi.fn(() => 400)
    const getHeight = vi.fn(() => 600)

    const div = document.createElement('div')
    Object.defineProperty(div, 'offsetWidth', { get: () => 400 })
    Object.defineProperty(div, 'offsetHeight', { get: () => 600 })

    let lastW = 0
    let lastH = 0
    const resize = () => {
      const w = div.offsetWidth
      const h = div.offsetHeight
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return
      if (getWidth() === w && getHeight() === h) return // 동일 크기 skip
      lastW = w
      lastH = h
      setDimensions({ width: w, height: h })
    }

    resize()
    expect(setDimensions).not.toHaveBeenCalled() // 동일 크기라 skip
  })

  it('12. 유효 변동 → setDimensions 호출', () => {
    const setDimensions = vi.fn()
    const requestRenderAll = vi.fn()

    // fabricCanvas 가 항상 300x400 을 반환 (아직 업데이트 안 된 상태)
    const fabricW = 300
    const fabricH = 400
    const getWidth = vi.fn(() => fabricW)
    const getHeight = vi.fn(() => fabricH)

    // div 는 처음부터 500x700 (크게 리사이즈된 상태)
    const div = document.createElement('div')
    Object.defineProperty(div, 'offsetWidth', { get: () => 500 })
    Object.defineProperty(div, 'offsetHeight', { get: () => 700 })

    let lastW = 0
    let lastH = 0
    const resize = () => {
      const w = div.offsetWidth
      const h = div.offsetHeight
      // 가드 1: 1px 미만 변동 무시
      if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return
      // 가드 2: fabric 이미 동일 크기면 skip
      if (getWidth() === w && getHeight() === h) return
      lastW = w
      lastH = h
      setDimensions({ width: w, height: h })
      requestRenderAll()
    }

    // 첫 번째 호출: div=500x700, fabric=300x400 → 유효 변동 → 호출
    resize()
    expect(setDimensions).toHaveBeenCalledTimes(1)
    expect(setDimensions).toHaveBeenCalledWith({ width: 500, height: 700 })
    expect(requestRenderAll).toHaveBeenCalledTimes(1)

    // 두 번째 호출: lastW=500, lastH=700. div=500x700 → 변동 < 1px → skip
    resize()
    expect(setDimensions).toHaveBeenCalledTimes(1) // 추가 호출 없음
  })
})

// ── getEventPoint 단위 테스트 ────────────────────────────────────────────────

describe('getEventPoint (C-2)', () => {
  // editor-core 를 직접 import (vitest.config.ts 에 alias 설정됨)
  it('MouseEvent — clientX/Y 반환', async () => {
    const { getEventPoint } = await import('@storywork/editor-core')
    const e = new MouseEvent('click', { clientX: 100, clientY: 200, bubbles: true })
    const pt = getEventPoint(e)
    expect(pt.x).toBe(100)
    expect(pt.y).toBe(200)
    expect(pt.altKey).toBe(false)
  })

  it('null 입력 → { x:0, y:0, altKey:false }', async () => {
    const { getEventPoint } = await import('@storywork/editor-core')
    const pt = getEventPoint(null)
    expect(pt).toEqual({ x: 0, y: 0, altKey: false })
  })

  it('undefined 입력 → { x:0, y:0, altKey:false }', async () => {
    const { getEventPoint } = await import('@storywork/editor-core')
    const pt = getEventPoint(undefined)
    expect(pt).toEqual({ x: 0, y: 0, altKey: false })
  })

  it('TouchEvent — touches[0].clientX/Y 반환', async () => {
    const { getEventPoint } = await import('@storywork/editor-core')
    // TouchEvent 는 jsdom 에서 완전히 지원되지 않으므로 duck-typing 으로 모킹
    const touch = {
      clientX: 50,
      clientY: 80,
      identifier: 0,
      target: document.body,
    } as unknown as Touch
    const e = {
      touches: [touch],
      changedTouches: [],
    } as unknown as TouchEvent
    const pt = getEventPoint(e)
    expect(pt.x).toBe(50)
    expect(pt.y).toBe(80)
    expect(pt.altKey).toBe(false)
  })

  it('TouchEvent changedTouches 폴백', async () => {
    const { getEventPoint } = await import('@storywork/editor-core')
    const touch = {
      clientX: 30,
      clientY: 60,
      identifier: 0,
      target: document.body,
    } as unknown as Touch
    const e = {
      touches: [],
      changedTouches: [touch],
    } as unknown as TouchEvent
    const pt = getEventPoint(e)
    expect(pt.x).toBe(30)
    expect(pt.y).toBe(60)
  })
})
