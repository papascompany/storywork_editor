import { describe, expect, it, vi } from 'vitest'

import { BindBubbleToTargetCommand } from '../src/bubble-commands.js'

// ─── mock StoryCanvas ──────────────────────────────────────────────────────────

function makeMockCanvas() {
  const objects = new Map<string, object>()
  const _fabricCanvas = {
    getObjects: () => Array.from(objects.values()),
    on: vi.fn(),
    off: vi.fn(),
    requestRenderAll: vi.fn(),
  }

  const canvas = {
    addObject: vi.fn(() => 'new-id'),
    removeObject: vi.fn(),
    getObject: (id: string) => objects.get(id),
    getObjectData: vi.fn(),
    _fabricCanvas,
    mmToPx: (mm: number) => mm * 3.78,
    pxToMm: (px: number) => px / 3.78,
    format: { id: 'test', widthMm: 148, heightMm: 210, dpi: 72 },
    on: vi.fn(),
    _objects: objects,
  }

  return canvas
}

// ─── BindBubbleToTargetCommand ────────────────────────────────────────────────

describe('BindBubbleToTargetCommand', () => {
  it('do() 가 새 targetId 로 바인딩한다', () => {
    const canvas = makeMockCanvas()

    const bubbleMeta = { shape: 'rounded-rect', targetId: null, tailOpts: {} }
    const bubble = {
      _bubbleMeta: bubbleMeta,
      data: { kind: 'speech-bubble', id: 'b1' },
      left: 100,
      top: 100,
      width: 180,
      height: 90,
      scaleX: 1,
      scaleY: 1,
      setCoords: vi.fn(),
      getObjects: vi.fn(() => []),
    }
    canvas._objects.set('b1', bubble)

    const cmd = new BindBubbleToTargetCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      bubbleId: 'b1',
      newTargetId: 'pose-1',
      prevTargetId: null,
    })

    cmd.do()
    // rebindBubbleTarget 이 targetId 를 설정했어야 함
    expect(bubbleMeta.targetId).toBe('pose-1')
  })

  it('undo() 가 이전 targetId 로 복원한다', () => {
    const canvas = makeMockCanvas()

    const bubbleMeta = { shape: 'rounded-rect', targetId: 'pose-1', tailOpts: {} }
    const bubble = {
      _bubbleMeta: bubbleMeta,
      data: { kind: 'speech-bubble', id: 'b1' },
      left: 100,
      top: 100,
      width: 180,
      height: 90,
      scaleX: 1,
      scaleY: 1,
      setCoords: vi.fn(),
      getObjects: vi.fn(() => []),
    }
    canvas._objects.set('b1', bubble)

    const cmd = new BindBubbleToTargetCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      bubbleId: 'b1',
      newTargetId: 'pose-2',
      prevTargetId: 'pose-1',
    })

    cmd.do()
    expect(bubbleMeta.targetId).toBe('pose-2')

    cmd.undo()
    expect(bubbleMeta.targetId).toBe('pose-1')
  })

  it('undo() → null 로 되돌리기', () => {
    const canvas = makeMockCanvas()

    const bubbleMeta = { shape: 'rounded-rect', targetId: null, tailOpts: {} }
    const bubble = {
      _bubbleMeta: bubbleMeta,
      data: { kind: 'speech-bubble', id: 'b1' },
      left: 100,
      top: 100,
      width: 180,
      height: 90,
      scaleX: 1,
      scaleY: 1,
      setCoords: vi.fn(),
      getObjects: vi.fn(() => []),
    }
    canvas._objects.set('b1', bubble)

    const cmd = new BindBubbleToTargetCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      bubbleId: 'b1',
      newTargetId: 'pose-1',
      prevTargetId: null,
    })

    cmd.do()
    expect(bubbleMeta.targetId).toBe('pose-1')

    cmd.undo()
    expect(bubbleMeta.targetId).toBeNull()
  })

  it('name 이 bubble:bind-target 이다', () => {
    const canvas = makeMockCanvas()
    const cmd = new BindBubbleToTargetCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      bubbleId: 'b1',
      newTargetId: 'pose-1',
      prevTargetId: null,
    })
    expect(cmd.name).toBe('bubble:bind-target')
  })

  it('timestamp 가 생성 시점과 가깝다', () => {
    const canvas = makeMockCanvas()
    const before = Date.now()
    const cmd = new BindBubbleToTargetCommand({
      // @ts-expect-error 테스트용 mock canvas
      canvas,
      bubbleId: 'b1',
      newTargetId: null,
      prevTargetId: null,
    })
    expect(cmd.timestamp).toBeGreaterThanOrEqual(before)
    expect(cmd.timestamp).toBeLessThanOrEqual(Date.now())
  })
})
