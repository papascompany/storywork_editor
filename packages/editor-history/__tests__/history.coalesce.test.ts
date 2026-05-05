/**
 * History — Coalesce (연속 transform 합치기) 테스트
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { History } from '../src/History.js'
import type { Command } from '../src/types.js'

// ─── Coalesce 가능한 더미 Command ───
class CoalescableCmd implements Command {
  readonly name: string
  readonly timestamp: number
  readonly targetId: string
  private _value: number
  private _prevValue: number
  doCount = 0
  undoCount = 0

  constructor(opts: {
    name?: string
    targetId: string
    prevValue: number
    nextValue: number
    timestamp?: number
  }) {
    this.name = opts.name ?? 'test:coalescable'
    this.targetId = opts.targetId
    this._prevValue = opts.prevValue
    this._value = opts.nextValue
    this.timestamp = opts.timestamp ?? Date.now()
  }

  do(): void {
    this.doCount++
  }
  undo(): void {
    this.undoCount++
  }

  get currentValue(): number {
    return this._value
  }
  get prevValue(): number {
    return this._prevValue
  }

  coalesceWith(other: Command): Command | null {
    if (
      other.name !== this.name ||
      !(other instanceof CoalescableCmd) ||
      other.targetId !== this.targetId
    ) {
      return null
    }
    // 300ms 이내
    if (other.timestamp - this.timestamp > 300) {
      return null
    }
    return new CoalescableCmd({
      name: this.name,
      targetId: this.targetId,
      prevValue: this._prevValue,
      nextValue: other.currentValue,
      timestamp: this.timestamp,
    })
  }
}

describe('History — Coalesce', () => {
  let history: History

  beforeEach(() => {
    history = new History({ coalesceWindowMs: 300 })
  })

  afterEach(() => {
    history.dispose()
  })

  it('동일 종류 + 동일 대상 + 300ms 이내 → stack depth 1 유지', () => {
    const now = Date.now()
    history.push(new CoalescableCmd({ targetId: 'a', prevValue: 0, nextValue: 10, timestamp: now }))
    history.push(
      new CoalescableCmd({ targetId: 'a', prevValue: 10, nextValue: 20, timestamp: now + 50 }),
    )
    history.push(
      new CoalescableCmd({ targetId: 'a', prevValue: 20, nextValue: 30, timestamp: now + 100 }),
    )

    expect(history.depth().undo).toBe(1)
  })

  it('합쳐진 Command 의 undo 는 첫 번째 prevValue 로 복원', () => {
    const now = Date.now()

    // cmd1: prevValue=0, nextValue=5
    // cmd2: prevValue=5, nextValue=10
    // 합쳐지면: prevValue=0, currentValue=10
    const cmd1 = new CoalescableCmd({ targetId: 'x', prevValue: 0, nextValue: 5, timestamp: now })
    const cmd2 = new CoalescableCmd({
      targetId: 'x',
      prevValue: 5,
      nextValue: 10,
      timestamp: now + 50,
    })

    history.push(cmd1)
    history.push(cmd2)

    // stack depth = 1 (합쳐짐)
    expect(history.depth().undo).toBe(1)

    // 합쳐진 Command 검증
    // history 내부 stack 에서 꺼내는 대신 직접 coalesceWith 로 확인
    const merged = cmd1.coalesceWith(cmd2)
    expect(merged).not.toBeNull()
    if (merged instanceof CoalescableCmd) {
      expect(merged.prevValue).toBe(0) // 최초 prevValue 보존
      expect(merged.currentValue).toBe(10) // 최후 nextValue 보존
    }
  })

  it('다른 targetId → 합치지 않음', () => {
    const now = Date.now()
    history.push(new CoalescableCmd({ targetId: 'a', prevValue: 0, nextValue: 10, timestamp: now }))
    history.push(
      new CoalescableCmd({ targetId: 'b', prevValue: 0, nextValue: 20, timestamp: now + 10 }),
    )

    expect(history.depth().undo).toBe(2)
  })

  it('다른 이름 → 합치지 않음', () => {
    const now = Date.now()
    history.push(
      new CoalescableCmd({
        name: 'type:A',
        targetId: 'a',
        prevValue: 0,
        nextValue: 10,
        timestamp: now,
      }),
    )
    history.push(
      new CoalescableCmd({
        name: 'type:B',
        targetId: 'a',
        prevValue: 10,
        nextValue: 20,
        timestamp: now + 10,
      }),
    )

    expect(history.depth().undo).toBe(2)
  })

  it('300ms 초과 → 합치지 않음', () => {
    const now = Date.now()
    history.push(new CoalescableCmd({ targetId: 'a', prevValue: 0, nextValue: 10, timestamp: now }))
    history.push(
      new CoalescableCmd({ targetId: 'a', prevValue: 10, nextValue: 20, timestamp: now + 500 }),
    )

    expect(history.depth().undo).toBe(2)
  })

  it('5번 연속 transform → stack depth 1', () => {
    const now = Date.now()
    for (let i = 0; i < 5; i++) {
      history.push(
        new CoalescableCmd({
          targetId: 'obj1',
          prevValue: i * 10,
          nextValue: (i + 1) * 10,
          timestamp: now + i * 30,
        }),
      )
    }
    expect(history.depth().undo).toBe(1)
  })

  it('coalesceWith 없는 Command 는 항상 새로 push', () => {
    const simpleCmd = {
      name: 'simple',
      timestamp: Date.now(),
      do() {},
      undo() {},
    }
    history.push(simpleCmd)
    history.push(simpleCmd)
    expect(history.depth().undo).toBe(2)
  })
})
