/**
 * H4: History capacity 모바일/데스크톱 분기 검증
 *
 * isCoarsePointer 를 vi.mock 으로 제어해
 * coarse(모바일) → capacity=15, fine(데스크톱) → capacity=50 임을 확인한다.
 */

import type * as EditorCore from '@storywork/editor-core'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// isCoarsePointer 모킹 — History 생성 전에 설정해야 한다
vi.mock('@storywork/editor-core', async (importOriginal) => {
  const actual = await importOriginal<typeof EditorCore>()
  return {
    ...actual,
    isCoarsePointer: vi.fn(() => false), // 기본값: 데스크톱
  }
})

describe('H4: History capacity 모바일/데스크톱 자동 분기', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('데스크톱(fine pointer) — capacity=50', async () => {
    const { isCoarsePointer } = await import('@storywork/editor-core')
    const { History } = await import('../src/History.js')

    vi.mocked(isCoarsePointer).mockReturnValue(false)

    const h = new History()
    const makeCmd = () => ({
      do: vi.fn(),
      undo: vi.fn(),
    })

    // 55개 push → 50개 초과분 drop
    for (let i = 0; i < 55; i++) {
      h.push(makeCmd())
    }
    expect(h.depth().undo).toBe(50)
    h.dispose()
  })

  it('모바일(coarse pointer) — capacity=15', async () => {
    const { isCoarsePointer } = await import('@storywork/editor-core')
    const { History } = await import('../src/History.js')

    vi.mocked(isCoarsePointer).mockReturnValue(true)

    const h = new History()
    const makeCmd = () => ({
      do: vi.fn(),
      undo: vi.fn(),
    })

    // 20개 push → 15개만 유지
    for (let i = 0; i < 20; i++) {
      h.push(makeCmd())
    }
    expect(h.depth().undo).toBe(15)
    h.dispose()
  })

  it('capacity 명시 시 장치 분기 무시', async () => {
    const { isCoarsePointer } = await import('@storywork/editor-core')
    const { History } = await import('../src/History.js')

    vi.mocked(isCoarsePointer).mockReturnValue(true) // 모바일로 설정해도

    const h = new History({ capacity: 100 }) // 명시적 100
    const makeCmd = () => ({
      do: vi.fn(),
      undo: vi.fn(),
    })

    for (let i = 0; i < 105; i++) {
      h.push(makeCmd())
    }
    expect(h.depth().undo).toBe(100) // 명시값 적용
    h.dispose()
  })
})
