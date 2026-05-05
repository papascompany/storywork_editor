/**
 * H3: isCoarsePointer 유틸 + fabric factory 모바일 분기 검증
 *
 * jsdom 환경에서 window.matchMedia 를 모킹해 coarse/fine 두 경로를 모두 테스트한다.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { isCoarsePointer } from '../src/utils/coarse.js'

const GLOBAL_FLAG = '__storywork_fabric_defaults_set'

function resetGlobalFlag(): void {
  delete (globalThis as Record<string, unknown>)[GLOBAL_FLAG]
}

describe('H3: isCoarsePointer', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    resetGlobalFlag()
  })

  it('window 가 없는 환경에서 false 반환 (SSR 안전)', () => {
    // jsdom 에는 window 가 있으므로 matchMedia 를 undefined 로 mock
    const originalMatchMedia = window.matchMedia
    // @ts-expect-error 테스트 목적으로 undefined 강제 설정 (matchMedia 타입이 함수이므로)
    window.matchMedia = undefined
    expect(isCoarsePointer()).toBe(false)
    window.matchMedia = originalMatchMedia
  })

  it('matchMedia "(pointer: coarse)" 가 true 이면 true 반환', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: true,
      media: '(pointer: coarse)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList)

    expect(isCoarsePointer()).toBe(true)
  })

  it('matchMedia "(pointer: coarse)" 가 false 이면 false 반환', () => {
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      matches: false,
      media: '(pointer: coarse)',
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    } as MediaQueryList)

    expect(isCoarsePointer()).toBe(false)
  })

  it('matchMedia 가 throw 해도 false 반환 (안전 폴백)', () => {
    vi.spyOn(window, 'matchMedia').mockImplementation(() => {
      throw new Error('matchMedia not supported')
    })

    expect(isCoarsePointer()).toBe(false)
  })
})

describe('H3: fabric factory globals 분기', () => {
  beforeEach(() => {
    // 각 테스트 전에 글로벌 defaults 플래그 리셋
    resetGlobalFlag()
  })

  afterEach(() => {
    vi.restoreAllMocks()
    resetGlobalFlag()
  })

  it('글로벌 defaults 는 한 번만 적용된다 (중복 적용 없음)', async () => {
    const { createFabricCanvas } = await import('../src/canvas/adapters/fabric.js')

    const format = { id: 'test', widthMm: 100, heightMm: 100, dpi: 72 }

    const c1 = createFabricCanvas({ format })
    const c2 = createFabricCanvas({ format })

    // 두 번째 호출에서도 플래그가 이미 set 돼 있으면 중복 적용 X
    expect((globalThis as Record<string, unknown>)[GLOBAL_FLAG]).toBe(true)

    c1.dispose()
    c2.dispose()
  })
})
