// ─────────────────────────────────────────────
// types.ts — editor-text 공용 타입
// editor-history 의 Command 인터페이스를 로컬 재정의
// (패키지 간 nominal type 충돌 방지)
// ─────────────────────────────────────────────

/** Command 인터페이스 (editor-history 의 subset) */
export interface Command {
  readonly name: string
  readonly timestamp: number
  do(): void | Promise<void>
  undo(): void | Promise<void>
}
