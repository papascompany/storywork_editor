/**
 * History — push/undo/redo 기본 동작 테스트
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { History } from '../src/History.js'
import type { Command } from '../src/types.js'

// ─── 테스트용 더미 Command ───
function makeCmd(name = 'test:cmd'): Command & { doCount: number; undoCount: number } {
  const cmd = {
    name,
    timestamp: Date.now(),
    doCount: 0,
    undoCount: 0,
    do() {
      this.doCount++
    },
    undo() {
      this.undoCount++
    },
  }
  return cmd
}

describe('History — 기본 push/undo/redo', () => {
  let history: History

  beforeEach(() => {
    history = new History()
  })

  afterEach(() => {
    history.dispose()
  })

  it('초기 상태: canUndo/canRedo 모두 false', () => {
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
    expect(history.depth()).toEqual({ undo: 0, redo: 0 })
  })

  it('push → do() 호출, canUndo true', () => {
    const cmd = makeCmd()
    history.push(cmd)
    expect(cmd.doCount).toBe(1)
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
    expect(history.depth()).toEqual({ undo: 1, redo: 0 })
  })

  it('push → undo → canRedo true', () => {
    const cmd = makeCmd()
    history.push(cmd)
    const result = history.undo()
    expect(result).toBe(true)
    expect(cmd.undoCount).toBe(1)
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(true)
    expect(history.depth()).toEqual({ undo: 0, redo: 1 })
  })

  it('push → undo → redo → do() 한 번 더', () => {
    const cmd = makeCmd()
    history.push(cmd)
    history.undo()
    const result = history.redo()
    expect(result).toBe(true)
    expect(cmd.doCount).toBe(2) // 최초 push + redo
    expect(history.canUndo()).toBe(true)
    expect(history.canRedo()).toBe(false)
  })

  it('빈 스택에서 undo → false 반환', () => {
    expect(history.undo()).toBe(false)
  })

  it('빈 스택에서 redo → false 반환', () => {
    expect(history.redo()).toBe(false)
  })

  it('새 push → redo 스택 초기화', () => {
    const cmd1 = makeCmd('cmd1')
    const cmd2 = makeCmd('cmd2')
    const cmd3 = makeCmd('cmd3')
    history.push(cmd1)
    history.push(cmd2)
    history.undo()
    // redo 스택에 cmd2 있음
    expect(history.canRedo()).toBe(true)

    history.push(cmd3)
    // redo 스택 초기화
    expect(history.canRedo()).toBe(false)
    expect(history.depth().undo).toBe(2)
  })

  it('여러 커맨드 순서대로 undo', () => {
    const cmd1 = makeCmd('cmd1')
    const cmd2 = makeCmd('cmd2')
    const cmd3 = makeCmd('cmd3')
    history.push(cmd1)
    history.push(cmd2)
    history.push(cmd3)

    history.undo()
    expect(cmd3.undoCount).toBe(1)
    history.undo()
    expect(cmd2.undoCount).toBe(1)
    history.undo()
    expect(cmd1.undoCount).toBe(1)
    expect(history.canUndo()).toBe(false)
  })

  it('clear → 스택 모두 비워짐', () => {
    history.push(makeCmd())
    history.push(makeCmd())
    history.clear()
    expect(history.canUndo()).toBe(false)
    expect(history.canRedo()).toBe(false)
    expect(history.depth()).toEqual({ undo: 0, redo: 0 })
  })

  it('capacity 초과 시 oldest drop', () => {
    const smallHistory = new History({ capacity: 3 })
    smallHistory.push(makeCmd('a'))
    smallHistory.push(makeCmd('b'))
    smallHistory.push(makeCmd('c'))
    smallHistory.push(makeCmd('d')) // capacity 초과

    expect(smallHistory.depth().undo).toBe(3)
    smallHistory.dispose()
  })

  it('dispose 후 push → 에러', () => {
    history.dispose()
    expect(() => history.push(makeCmd())).toThrow()
  })
})

describe('History — 이벤트', () => {
  let history: History

  beforeEach(() => {
    history = new History()
  })

  afterEach(() => {
    history.dispose()
  })

  it('history:pushed 이벤트 발행', () => {
    const fn = vi.fn()
    history.on('history:pushed', fn)

    const cmd = makeCmd()
    history.push(cmd)

    expect(fn).toHaveBeenCalledOnce()
    expect(fn.mock.calls[0]?.[0]).toMatchObject({
      command: cmd,
      depth: 1,
    })
  })

  it('history:applied — do/undo/redo 모두 발행', () => {
    const fn = vi.fn()
    history.on('history:applied', fn)

    const cmd = makeCmd()
    history.push(cmd)
    history.undo()
    history.redo()

    expect(fn).toHaveBeenCalledTimes(3)
    expect(fn.mock.calls[0]?.[0]).toMatchObject({ kind: 'do' })
    expect(fn.mock.calls[1]?.[0]).toMatchObject({ kind: 'undo' })
    expect(fn.mock.calls[2]?.[0]).toMatchObject({ kind: 'redo' })
  })

  it('history:cleared 이벤트 발행', () => {
    const fn = vi.fn()
    history.on('history:cleared', fn)

    history.push(makeCmd())
    history.clear()

    expect(fn).toHaveBeenCalledOnce()
  })

  it('on 반환 함수로 구독 해제', () => {
    const fn = vi.fn()
    const off = history.on('history:pushed', fn)
    off()

    history.push(makeCmd())
    expect(fn).not.toHaveBeenCalled()
  })

  it('dispose 후 모든 핸들러 해제 — 추가 호출 없음', () => {
    const fn = vi.fn()
    history.on('history:pushed', fn)
    history.dispose()

    // dispose 된 history 는 push 시 throw → 핸들러 호출 안 됨
    try {
      history.push(makeCmd())
    } catch {
      // expected
    }
    expect(fn).not.toHaveBeenCalled()
  })
})
