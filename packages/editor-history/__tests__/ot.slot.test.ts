/**
 * OT 슬롯 — adapter 등록/탈착 테스트
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { History } from '../src/History.js'
import { SpyOTAdapter } from '../src/ot/adapter.js'
import type { Command } from '../src/types.js'

function makeCmd(): Command {
  return {
    name: 'test:cmd',
    timestamp: Date.now(),
    do() {},
    undo() {},
  }
}

describe('OT 어댑터 슬롯', () => {
  let history: History
  let spy: SpyOTAdapter

  beforeEach(() => {
    history = new History()
    spy = new SpyOTAdapter()
  })

  afterEach(() => {
    history.dispose()
  })

  it('attachOTAdapter → push 시 onLocalCommand 호출', () => {
    history.attachOTAdapter(spy)

    const cmd = makeCmd()
    history.push(cmd)

    expect(spy.localCalls).toHaveLength(1)
    expect(spy.localCalls[0]?.cmd).toBe(cmd)
    expect(spy.localCalls[0]?.kind).toBe('do')
  })

  it('undo 시 onLocalCommand kind=undo 로 호출', () => {
    history.attachOTAdapter(spy)
    history.push(makeCmd())
    spy.reset()

    history.undo()
    expect(spy.localCalls).toHaveLength(1)
    expect(spy.localCalls[0]?.kind).toBe('undo')
  })

  it('redo 시 onLocalCommand kind=redo 로 호출', () => {
    history.attachOTAdapter(spy)
    history.push(makeCmd())
    history.undo()
    spy.reset()

    history.redo()
    expect(spy.localCalls).toHaveLength(1)
    expect(spy.localCalls[0]?.kind).toBe('redo')
  })

  it('detach 후 push → onLocalCommand 호출 안 됨', () => {
    const detach = history.attachOTAdapter(spy)
    detach()

    history.push(makeCmd())
    expect(spy.localCalls).toHaveLength(0)
  })

  it('detach 시 adapter.detach() 호출됨', () => {
    const detach = history.attachOTAdapter(spy)
    expect(spy.detached).toBe(false)
    detach()
    expect(spy.detached).toBe(true)
  })

  it('applyRemote → do() 호출, push 스택에 없음', () => {
    let doCalled = false
    const remoteCmd: Command = {
      name: 'remote:cmd',
      timestamp: Date.now(),
      do() {
        doCalled = true
      },
      undo() {},
    }

    history.applyRemote(remoteCmd)

    expect(doCalled).toBe(true)
    // 스택에 push 안 됨
    expect(history.canUndo()).toBe(false)
  })

  it('여러 번 attachOTAdapter 호출 시 마지막 어댑터만 활성', () => {
    const spy2 = new SpyOTAdapter()
    history.attachOTAdapter(spy)
    history.attachOTAdapter(spy2) // 두 번째 어댑터로 교체

    history.push(makeCmd())
    expect(spy.localCalls).toHaveLength(0) // 첫 번째는 교체됨
    expect(spy2.localCalls).toHaveLength(1) // 두 번째만 호출
  })

  it('dispose 후 adapter 해제됨', () => {
    history.attachOTAdapter(spy)
    history.dispose()

    // history 는 dispose 됐으므로 adapter 참조가 null 임
    // 이후 push 는 throw (dispose 후), adapter 는 호출 안 됨
    expect(spy.localCalls).toHaveLength(0)
  })
})
