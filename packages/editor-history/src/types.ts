// ─────────────────────────────────────────────
// @storywork/editor-history — 공개 타입 정의
// React/DOM 에 의존하지 않습니다.
// ─────────────────────────────────────────────

/**
 * 모든 사용자 액션을 표현하는 Command 인터페이스.
 * push 시 do() 가 즉시 호출되므로, 생성 시 부수 효과를 실행하면 안 된다.
 */
export interface Command {
  /** 'canvas:add', 'layers:group' 등 namespace 형식 */
  readonly name: string
  readonly timestamp: number
  /** 액션 실행 (부수 효과 발생) */
  do(): void
  /** 역방향 실행 (정확히 do() 이전 상태로 복원) */
  undo(): void
  /**
   * 같은 종류 + 같은 대상 + 짧은 시간 내에 연속으로 push 된 경우 합치기.
   * 합쳐진 새 Command 반환, 합칠 수 없으면 null 반환.
   * other 는 this 보다 나중에 발행된 Command.
   */
  coalesceWith?(other: Command): Command | null
}

/**
 * History 에서 발행하는 이벤트 이름
 */
export type HistoryEvent = 'history:pushed' | 'history:applied' | 'history:cleared'

/**
 * 이벤트별 핸들러 시그니처 맵
 */
export type HistoryEventMap = {
  'history:pushed': (e: { command: Command; depth: number }) => void
  'history:applied': (e: { command: Command; kind: 'do' | 'undo' | 'redo' }) => void
  'history:cleared': () => void
}

/**
 * OT(Operational Transform) 어댑터 인터페이스.
 * 구현체는 editor-history 에 포함되지 않는다 — 슬롯만 제공.
 * Yjs 등 협업 라이브러리와 연결할 때 구현한다.
 */
export interface OTAdapter {
  /** 로컬에서 Command 가 push/undo/redo 될 때 호출 */
  onLocalCommand(cmd: Command, kind: 'do' | 'undo' | 'redo'): void
  /**
   * 원격에서 수신한 Command 를 적용할 때 호출.
   * History 는 이 Command 를 do() 만 실행하고 스택에는 push 하지 않는다.
   */
  onRemoteCommand(cmd: Command): void
  /** 어댑터 해제 (내부 리소스 정리) */
  detach(): void
}

/**
 * Transform 스냅샷 — TransformObjectCommand 에서 사용
 */
export type TransformSnapshot = {
  left: number
  top: number
  scaleX: number
  scaleY: number
  angle: number
  flipX: boolean
  flipY: boolean
  width?: number
  height?: number
}
