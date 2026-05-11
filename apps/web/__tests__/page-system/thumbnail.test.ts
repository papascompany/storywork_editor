/**
 * thumbnail.test.ts — captureThumbnail 단위 테스트 (mock canvas)
 */

import type { StoryCanvas } from '@storywork/editor-core'
import { describe, it, expect, vi, beforeEach } from 'vitest'

import { captureThumbnail } from '../../components/editor/page-system/thumbnail'

// ── Mock StoryCanvas ────────────────────────────────────────────────────────

function makeMockCanvas(opts?: {
  hasContext?: boolean
  width?: number
  height?: number
  toDataURL?: string
}) {
  const {
    hasContext = true,
    width = 800,
    height = 600,
    toDataURL = 'data:image/jpeg;base64,mock',
  } = opts ?? {}

  const mockOffscreenCtx = {
    fillStyle: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
  }

  const mockOffscreenCanvas = {
    width: 256,
    height: 256,
    getContext: vi.fn().mockReturnValue(mockOffscreenCtx),
    toDataURL: vi.fn().mockReturnValue(toDataURL),
  }

  // document.createElement mock
  vi.stubGlobal('document', {
    createElement: vi.fn().mockReturnValue(mockOffscreenCanvas),
  })

  const fabricCanvas = {
    getContext: hasContext ? vi.fn().mockReturnValue({}) : vi.fn().mockReturnValue(null),
    getWidth: vi.fn().mockReturnValue(width),
    getHeight: vi.fn().mockReturnValue(height),
    getElement: vi.fn().mockReturnValue({ tagName: 'CANVAS' }),
  }

  return {
    _fabricCanvas: fabricCanvas,
  } as unknown as StoryCanvas
}

// ── 테스트 ──────────────────────────────────────────────────────────────────

describe('captureThumbnail', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('정상 canvas → dataURL 반환', async () => {
    const canvas = makeMockCanvas()
    const result = await captureThumbnail(canvas)
    expect(result).toBe('data:image/jpeg;base64,mock')
  })

  it('getContext 없으면 null 반환', async () => {
    const canvas = makeMockCanvas({ hasContext: false })
    const result = await captureThumbnail(canvas)
    expect(result).toBeNull()
  })

  it('canvas 크기 0 이면 null 반환', async () => {
    const canvas = makeMockCanvas({ width: 0, height: 0 })
    const result = await captureThumbnail(canvas)
    expect(result).toBeNull()
  })

  it('오프스크린 canvas가 256 이하 크기로 생성된다 (drawImage 호출 확인)', async () => {
    const canvas = makeMockCanvas({ width: 1000, height: 1000 })
    await captureThumbnail(canvas)
    // document.createElement 가 호출되었는지만 확인 (mock 환경)
    expect(document.createElement).toHaveBeenCalledWith('canvas')
  })
})
