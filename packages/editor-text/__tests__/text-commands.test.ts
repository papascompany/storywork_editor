import { describe, expect, it, vi } from 'vitest'

import { EditTextCommand } from '../src/text-commands.js'

// ─── mock StoryCanvas ──────────────────────────────────────────────────────────

function makeMockCanvas() {
  const mockObj = {
    set: vi.fn(),
    setCoords: vi.fn(),
  }
  const mockFabricCanvas = {
    requestRenderAll: vi.fn(),
  }
  const canvas = {
    getObject: vi.fn().mockReturnValue(mockObj),
    _fabricCanvas: mockFabricCanvas,
  }
  return { canvas, mockObj, mockFabricCanvas }
}

// ─── EditTextCommand ───────────────────────────────────────────────────────────

describe('EditTextCommand', () => {
  it('do() 가 after 속성을 적용한다', () => {
    const { canvas, mockObj } = makeMockCanvas()
    const cmd = new EditTextCommand({
      canvas: canvas as never,
      id: 'obj-1',
      before: { fontSize: 16 },
      after: { fontSize: 24 },
    })

    cmd.do()

    expect(mockObj.set).toHaveBeenCalledWith({ fontSize: 24 })
    expect(mockObj.setCoords).toHaveBeenCalled()
  })

  it('undo() 가 before 속성을 복원한다', () => {
    const { canvas, mockObj } = makeMockCanvas()
    const cmd = new EditTextCommand({
      canvas: canvas as never,
      id: 'obj-1',
      before: { fontSize: 16 },
      after: { fontSize: 24 },
    })

    cmd.do()
    cmd.undo()

    expect(mockObj.set).toHaveBeenLastCalledWith({ fontSize: 16 })
  })

  it('name 이 text:edit 이다', () => {
    const { canvas } = makeMockCanvas()
    const cmd = new EditTextCommand({
      canvas: canvas as never,
      id: 'obj-1',
      before: {},
      after: {},
    })
    expect(cmd.name).toBe('text:edit')
  })

  it('존재하지 않는 객체에서 do() 는 no-op', () => {
    const { canvas } = makeMockCanvas()
    canvas.getObject.mockReturnValue(undefined)
    const cmd = new EditTextCommand({
      canvas: canvas as never,
      id: 'nonexistent',
      before: { fontSize: 16 },
      after: { fontSize: 24 },
    })
    // 예외 없이 실행됨
    expect(() => cmd.do()).not.toThrow()
  })

  it('fill 변경을 처리한다', () => {
    const { canvas, mockObj } = makeMockCanvas()
    const cmd = new EditTextCommand({
      canvas: canvas as never,
      id: 'obj-1',
      before: { fill: '#000000' },
      after: { fill: '#ff0000' },
    })

    cmd.do()
    expect(mockObj.set).toHaveBeenCalledWith({ fill: '#ff0000' })
  })
})
