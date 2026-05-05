// ─────────────────────────────────────────────
// History — Command 스택 + undo/redo + OT 슬롯
// ─────────────────────────────────────────────

import type { Command, HistoryEvent, HistoryEventMap, OTAdapter } from './types.js'

export type HistoryOptions = {
  /** 최대 유지 스텝 수. 초과 시 가장 오래된 명령 drop. 기본값 200 */
  capacity?: number
  /** Coalesce 창 (ms). 이 시간 이내 동일 종류/대상 명령은 합쳐진다. 기본값 300 */
  coalesceWindowMs?: number
}

type HistoryListener = (e: Parameters<HistoryEventMap[HistoryEvent]>[0]) => void

/**
 * History — Command 기반 undo/redo 스택.
 *
 * 책임:
 * - Command push/undo/redo
 * - capacity 초과 시 oldest drop
 * - 연속 Command coalesce (transform 등)
 * - OTAdapter 슬롯 (협업 어댑터 연결 포인트)
 * - 이벤트 버스 (history:pushed / history:applied / history:cleared)
 *
 * 비책임:
 * - 구체적인 편집 로직 (Command 에 위임)
 * - UI, 영속화
 */
export class History {
  private readonly _capacity: number
  private readonly _coalesceWindowMs: number

  private readonly _undoStack: Command[] = []
  private readonly _redoStack: Command[] = []

  private _otAdapter: OTAdapter | null = null
  private readonly _listeners = new Map<HistoryEvent, Set<HistoryListener>>()
  private _disposed = false

  constructor(opts: HistoryOptions = {}) {
    this._capacity = opts.capacity ?? 200
    this._coalesceWindowMs = opts.coalesceWindowMs ?? 300
  }

  // ─────────────────────────────────────────────
  // 핵심 연산
  // ─────────────────────────────────────────────

  /**
   * Command 를 실행하고 undo 스택에 추가한다.
   * - 직전 명령과 coalesce 가능하면 합쳐서 stack 마지막 항목 교체
   * - capacity 초과 시 가장 오래된 항목 drop
   * - redo 스택은 비워진다
   */
  push(cmd: Command): void {
    this._assertNotDisposed()

    // do 실행
    cmd.do()
    this._notifyApplied(cmd, 'do')

    // redo 스택 초기화
    this._redoStack.length = 0

    // coalesce 시도
    // last = 이전 Command, cmd = 새(나중) Command
    // last.coalesceWith(cmd): last 관점에서 cmd 가 'other'(나중) → 올바른 방향
    const last = this._undoStack[this._undoStack.length - 1]
    if (last && last.coalesceWith) {
      const merged = last.coalesceWith(cmd)
      if (merged !== null) {
        // stack 마지막 항목을 합쳐진 명령으로 교체 (do 는 이미 실행됨)
        this._undoStack[this._undoStack.length - 1] = merged
        this._notifyPushed(merged)
        this._notifyOT(cmd, 'do')
        return
      }
    }
    // coalesce 실패 or 없음: 새로 push
    this._undoStack.push(cmd)

    // capacity 초과 시 oldest drop
    if (this._undoStack.length > this._capacity) {
      this._undoStack.shift()
    }

    this._notifyPushed(cmd)
    this._notifyOT(cmd, 'do')
  }

  /**
   * undo 수행.
   * @returns 가능하면 true, 스택이 비어 있으면 false
   */
  undo(): boolean {
    this._assertNotDisposed()
    const cmd = this._undoStack.pop()
    if (!cmd) return false

    cmd.undo()
    this._redoStack.push(cmd)
    this._notifyApplied(cmd, 'undo')
    this._notifyOT(cmd, 'undo')
    return true
  }

  /**
   * redo 수행.
   * @returns 가능하면 true, 스택이 비어 있으면 false
   */
  redo(): boolean {
    this._assertNotDisposed()
    const cmd = this._redoStack.pop()
    if (!cmd) return false

    cmd.do()
    this._undoStack.push(cmd)
    this._notifyApplied(cmd, 'redo')
    this._notifyOT(cmd, 'redo')
    return true
  }

  canUndo(): boolean {
    return this._undoStack.length > 0
  }

  canRedo(): boolean {
    return this._redoStack.length > 0
  }

  clear(): void {
    this._assertNotDisposed()
    this._undoStack.length = 0
    this._redoStack.length = 0
    this._notifyCleared()
  }

  depth(): { undo: number; redo: number } {
    return { undo: this._undoStack.length, redo: this._redoStack.length }
  }

  // ─────────────────────────────────────────────
  // OT 어댑터
  // ─────────────────────────────────────────────

  /**
   * OT 어댑터를 등록한다.
   * push/undo/redo 시 adapter.onLocalCommand 가 호출된다.
   * @returns detach 함수 (호출 시 어댑터 해제 + adapter.detach() 호출)
   */
  attachOTAdapter(adapter: OTAdapter): () => void {
    this._assertNotDisposed()
    this._otAdapter = adapter
    return () => {
      if (this._otAdapter === adapter) {
        this._otAdapter = null
        adapter.detach()
      }
    }
  }

  /**
   * 원격 Command 를 직접 적용한다 (history 스택에 push 하지 않음).
   * OT 어댑터가 원격 오퍼레이션을 수신했을 때 이 메서드를 호출한다.
   */
  applyRemote(cmd: Command): void {
    this._assertNotDisposed()
    cmd.do()
    this._notifyApplied(cmd, 'do')
  }

  // ─────────────────────────────────────────────
  // 이벤트
  // ─────────────────────────────────────────────

  on<K extends HistoryEvent>(event: K, handler: HistoryEventMap[K]): () => void {
    let set = this._listeners.get(event)
    if (!set) {
      set = new Set()
      this._listeners.set(event, set)
    }
    set.add(handler as HistoryListener)
    return () => {
      set?.delete(handler as HistoryListener)
    }
  }

  // ─────────────────────────────────────────────
  // 수명
  // ─────────────────────────────────────────────

  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this._undoStack.length = 0
    this._redoStack.length = 0
    this._otAdapter = null
    this._listeners.clear()
  }

  // ─────────────────────────────────────────────
  // 내부 헬퍼
  // ─────────────────────────────────────────────

  private _assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error('[editor-history] History 가 이미 dispose 되었습니다.')
    }
  }

  private _notifyPushed(cmd: Command): void {
    const listeners = this._listeners.get('history:pushed')
    if (!listeners) return
    const payload = { command: cmd, depth: this._undoStack.length }
    for (const h of listeners) {
      h(payload)
    }
  }

  private _notifyApplied(cmd: Command, kind: 'do' | 'undo' | 'redo'): void {
    const listeners = this._listeners.get('history:applied')
    if (!listeners) return
    const payload = { command: cmd, kind }
    for (const h of listeners) {
      h(payload)
    }
  }

  private _notifyCleared(): void {
    const listeners = this._listeners.get('history:cleared')
    if (!listeners) return
    for (const h of listeners) {
      h(undefined as unknown as never)
    }
  }

  private _notifyOT(cmd: Command, kind: 'do' | 'undo' | 'redo'): void {
    if (this._otAdapter) {
      this._otAdapter.onLocalCommand(cmd, kind)
    }
  }
}
