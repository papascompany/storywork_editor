// ─────────────────────────────────────────────
// tracker.ts — DirtyTracker
// editor-history events 를 구독해 dirty flag 와 autosave 타이머를 관리한다.
// ─────────────────────────────────────────────

import type { History } from '@storywork/editor-history'

const DEFAULT_DEBOUNCE_MS = 2000

type DirtyEvent = 'dirty:changed' | 'autosave:tick'

type DirtyChangedHandler = (dirty: boolean) => void
type AutosaveTickHandler = () => void

type HandlerMap = {
  'dirty:changed': Set<DirtyChangedHandler>
  'autosave:tick': Set<AutosaveTickHandler>
}

/**
 * DirtyTracker — 편집 변경 감지 + autosave 타이머.
 *
 * 책임:
 * - editor-history 의 `history:applied` 이벤트 구독 → dirty=true
 * - `markClean()` 호출 시 dirty=false
 * - `debounceMs` 이후 `autosave:tick` 이벤트 발행 (한 번만, 다음 변경 후 재시작)
 * - `dirty:changed` 이벤트로 UI 에 dirty 상태 변화 알림
 *
 * 비책임:
 * - 실제 저장 로직 (autosave:tick 핸들러가 담당)
 * - 영속화
 */
export class DirtyTracker {
  private readonly _history: History
  private readonly _debounceMs: number

  private _dirty = false
  private _timerId: ReturnType<typeof setTimeout> | null = null
  private _unsubHistory: (() => void) | null = null
  private _disposed = false

  private readonly _handlers: HandlerMap = {
    'dirty:changed': new Set(),
    'autosave:tick': new Set(),
  }

  constructor(opts: { history: History; debounceMs?: number }) {
    this._history = opts.history
    this._debounceMs = opts.debounceMs ?? DEFAULT_DEBOUNCE_MS
    this._attach()
  }

  // ─────────────────────────────────────────────
  // 공개 API
  // ─────────────────────────────────────────────

  isDirty(): boolean {
    return this._dirty
  }

  markClean(): void {
    this._assertNotDisposed()
    if (this._dirty) {
      this._dirty = false
      this._cancelTimer()
      this._emit('dirty:changed', false)
    }
  }

  on(event: 'dirty:changed', handler: DirtyChangedHandler): () => void
  on(event: 'autosave:tick', handler: AutosaveTickHandler): () => void
  on(event: DirtyEvent, handler: DirtyChangedHandler | AutosaveTickHandler): () => void {
    this._assertNotDisposed()

    if (event === 'dirty:changed') {
      this._handlers['dirty:changed'].add(handler as DirtyChangedHandler)
      return () => {
        this._handlers['dirty:changed'].delete(handler as DirtyChangedHandler)
      }
    } else {
      this._handlers['autosave:tick'].add(handler as AutosaveTickHandler)
      return () => {
        this._handlers['autosave:tick'].delete(handler as AutosaveTickHandler)
      }
    }
  }

  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this._unsubHistory?.()
    this._unsubHistory = null
    this._cancelTimer()
    this._handlers['dirty:changed'].clear()
    this._handlers['autosave:tick'].clear()
  }

  // ─────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────

  private _attach(): void {
    // history:applied: push/undo/redo 모두 dirty=true 로 처리
    this._unsubHistory = this._history.on('history:applied', () => {
      this._markDirty()
    })
  }

  private _markDirty(): void {
    const wasClean = !this._dirty
    this._dirty = true

    if (wasClean) {
      this._emit('dirty:changed', true)
    }

    // debounce 타이머 재시작
    this._cancelTimer()
    this._timerId = setTimeout(() => {
      this._timerId = null
      if (this._dirty) {
        this._emit('autosave:tick')
      }
    }, this._debounceMs)
  }

  private _cancelTimer(): void {
    if (this._timerId !== null) {
      clearTimeout(this._timerId)
      this._timerId = null
    }
  }

  private _emit(event: 'dirty:changed', dirty: boolean): void
  private _emit(event: 'autosave:tick'): void
  private _emit(event: DirtyEvent, ...args: unknown[]): void {
    if (event === 'dirty:changed') {
      const dirty = args[0] as boolean
      for (const h of this._handlers['dirty:changed']) {
        h(dirty)
      }
    } else {
      for (const h of this._handlers['autosave:tick']) {
        h()
      }
    }
  }

  private _assertNotDisposed(): void {
    if (this._disposed) {
      throw new Error('[editor-export] DirtyTracker 가 이미 dispose 되었습니다.')
    }
  }
}
