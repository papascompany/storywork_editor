// ─────────────────────────────────────────────
// dirty.test.ts — DirtyTracker 단위 테스트
// ─────────────────────────────────────────────

import { History } from '@storywork/editor-history'
import type { Command } from '@storywork/editor-history'
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

import { DirtyTracker } from '../src/index.js'

// 최소 Command stub
function makeCmd(name = 'test:noop'): Command {
  return {
    name,
    timestamp: Date.now(),
    do() {},
    undo() {},
  }
}

describe('DirtyTracker', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('초기 상태: isDirty() === false', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    expect(tracker.isDirty()).toBe(false)

    tracker.dispose()
    history.dispose()
  })

  it('history.push 후 isDirty() === true', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    history.push(makeCmd())

    expect(tracker.isDirty()).toBe(true)

    tracker.dispose()
    history.dispose()
  })

  it('markClean() 후 isDirty() === false', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    history.push(makeCmd())
    expect(tracker.isDirty()).toBe(true)

    tracker.markClean()
    expect(tracker.isDirty()).toBe(false)

    tracker.dispose()
    history.dispose()
  })

  it('dirty:changed 이벤트: false → true 로 변할 때 한 번 발행', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })
    const handler = vi.fn()

    tracker.on('dirty:changed', handler)
    history.push(makeCmd())

    // 한 번만 (true 로 변화)
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith(true)

    // 이미 dirty 상태에서 다시 push → 이벤트 발행 안 함
    history.push(makeCmd())
    expect(handler).toHaveBeenCalledTimes(1)

    tracker.dispose()
    history.dispose()
  })

  it('dirty:changed 이벤트: markClean() 시 false 발행', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })
    const handler = vi.fn()

    history.push(makeCmd())
    tracker.on('dirty:changed', handler)
    tracker.markClean()

    expect(handler).toHaveBeenCalledWith(false)

    tracker.dispose()
    history.dispose()
  })

  it('autosave:tick: debounceMs 경과 후 발행', () => {
    const DEBOUNCE = 1000
    const history = new History()
    const tracker = new DirtyTracker({ history, debounceMs: DEBOUNCE })
    const tickHandler = vi.fn()

    tracker.on('autosave:tick', tickHandler)
    history.push(makeCmd())

    expect(tickHandler).not.toHaveBeenCalled()

    vi.advanceTimersByTime(DEBOUNCE)

    expect(tickHandler).toHaveBeenCalledTimes(1)

    tracker.dispose()
    history.dispose()
  })

  it('autosave:tick: debounce 중 새 변경이 오면 타이머 재시작', () => {
    const DEBOUNCE = 1000
    const history = new History()
    const tracker = new DirtyTracker({ history, debounceMs: DEBOUNCE })
    const tickHandler = vi.fn()

    tracker.on('autosave:tick', tickHandler)

    history.push(makeCmd())
    vi.advanceTimersByTime(500) // 아직 미발행

    history.push(makeCmd()) // 타이머 재시작
    vi.advanceTimersByTime(500) // 재시작 후 500ms — 아직 미발행

    expect(tickHandler).not.toHaveBeenCalled()

    vi.advanceTimersByTime(500) // 총 1000ms 경과 → 발행

    expect(tickHandler).toHaveBeenCalledTimes(1)

    tracker.dispose()
    history.dispose()
  })

  it('markClean() 후에는 autosave:tick 발행 안 함', () => {
    const DEBOUNCE = 500
    const history = new History()
    const tracker = new DirtyTracker({ history, debounceMs: DEBOUNCE })
    const tickHandler = vi.fn()

    tracker.on('autosave:tick', tickHandler)
    history.push(makeCmd())
    tracker.markClean() // 타이머 취소 + dirty=false

    vi.advanceTimersByTime(DEBOUNCE * 2)

    expect(tickHandler).not.toHaveBeenCalled()

    tracker.dispose()
    history.dispose()
  })

  it('undo 도 dirty:changed = true 로 처리한다', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    history.push(makeCmd())
    tracker.markClean()
    expect(tracker.isDirty()).toBe(false)

    history.undo()
    expect(tracker.isDirty()).toBe(true)

    tracker.dispose()
    history.dispose()
  })

  it('구독 해제 함수 호출 후 핸들러가 호출되지 않는다', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })
    const handler = vi.fn()

    const unsub = tracker.on('dirty:changed', handler)
    unsub()

    history.push(makeCmd())
    expect(handler).not.toHaveBeenCalled()

    tracker.dispose()
    history.dispose()
  })

  it('dispose 후 isDirty() 는 동작하지 않음 (dispose 전 상태 유지)', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    history.push(makeCmd())
    tracker.dispose()

    // dispose 후 조회는 그냥 현재 값 반환
    expect(tracker.isDirty()).toBe(true)

    history.dispose()
  })

  it('dispose 후 markClean() 은 에러를 던진다', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    tracker.dispose()

    expect(() => tracker.markClean()).toThrow(
      '[editor-export] DirtyTracker 가 이미 dispose 되었습니다.',
    )

    history.dispose()
  })

  it('dispose 후 history 이벤트가 발행되어도 dirty 변경 없음', () => {
    const history = new History()
    const tracker = new DirtyTracker({ history })

    tracker.dispose()

    // dispose 후 push — 내부 리스너가 이미 해제됨
    history.push(makeCmd())

    // isDirty 는 dispose 시점의 false 를 유지
    expect(tracker.isDirty()).toBe(false)

    history.dispose()
  })

  it('autosave:tick 이 발행된 뒤 다시 변경이 오면 tick 이 다시 발행된다', () => {
    const DEBOUNCE = 500
    const history = new History()
    const tracker = new DirtyTracker({ history, debounceMs: DEBOUNCE })
    const tickHandler = vi.fn()

    tracker.on('autosave:tick', tickHandler)

    // 1회차
    history.push(makeCmd())
    vi.advanceTimersByTime(DEBOUNCE)
    expect(tickHandler).toHaveBeenCalledTimes(1)

    // markClean 후 2회차
    tracker.markClean()
    history.push(makeCmd())
    vi.advanceTimersByTime(DEBOUNCE)
    expect(tickHandler).toHaveBeenCalledTimes(2)

    tracker.dispose()
    history.dispose()
  })
})
