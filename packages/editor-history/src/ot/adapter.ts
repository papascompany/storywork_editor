// ─────────────────────────────────────────────
// OT 어댑터 — 인터페이스 재export + 기본 구현 슬롯
// ─────────────────────────────────────────────

/**
 * OT(Operational Transform) 어댑터 인터페이스.
 *
 * 이 파일은 인터페이스 재export + Null 구현(no-op) 만 제공한다.
 * 실제 Yjs 연동 구현은 apps/web 또는 별도 패키지에서 이 인터페이스를 구현한다.
 *
 * 연결 방법:
 * ```ts
 * const history = new History()
 * const myAdapter: OTAdapter = createYjsAdapter(yjsDoc)
 * const detach = history.attachOTAdapter(myAdapter)
 * // ... 협업 세션 종료 시
 * detach()
 * ```
 */

export type { OTAdapter } from '../types.js'

import type { Command, OTAdapter } from '../types.js'

/**
 * NullOTAdapter — 아무 동작도 하지 않는 기본 구현.
 * 테스트 또는 OT 없는 단독 모드에서 인터페이스 검증용으로 사용한다.
 */
export class NullOTAdapter implements OTAdapter {
  onLocalCommand(_cmd: Command, _kind: 'do' | 'undo' | 'redo'): void {
    // no-op
  }

  onRemoteCommand(_cmd: Command): void {
    // no-op
  }

  detach(): void {
    // no-op
  }
}

/**
 * SpyOTAdapter — 테스트에서 호출 기록을 검증하기 위한 구현.
 */
export class SpyOTAdapter implements OTAdapter {
  readonly localCalls: Array<{ cmd: Command; kind: 'do' | 'undo' | 'redo' }> = []
  readonly remoteCalls: Command[] = []
  detached = false

  onLocalCommand(cmd: Command, kind: 'do' | 'undo' | 'redo'): void {
    this.localCalls.push({ cmd, kind })
  }

  onRemoteCommand(cmd: Command): void {
    this.remoteCalls.push(cmd)
  }

  detach(): void {
    this.detached = true
  }

  reset(): void {
    this.localCalls.length = 0
    this.remoteCalls.length = 0
    this.detached = false
  }
}
