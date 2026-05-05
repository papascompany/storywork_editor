// ─────────────────────────────────────────────
// Editor 공용 타입 (Next.js src/dist 모듈 해석 충돌 회피)
//
// 배경: @storywork/editor-history 의 History 클래스가 Next.js 빌드 시
//       src와 dist 두 인스턴스로 해석되어 nominal type 비교가 실패.
//       모든 React 컴포넌트는 이 타입을 사용해 한 번만 정의된 구조 사용.
// ─────────────────────────────────────────────

// 일부러 약한 인터페이스 — 다른 모듈에서 import 한 History 클래스도 호환되도록.
// (editor-history 의 History 클래스가 Next.js dist/src 두 인스턴스로 해석되는 충돌 회피)
/* eslint-disable @typescript-eslint/no-explicit-any */
export type HistoryRef = {
  push: (cmd: any) => void
  undo: () => boolean
  redo: () => boolean
  canUndo: () => boolean
  canRedo: () => boolean
  clear: () => void
  depth: () => { undo: number; redo: number }
  on: (event: any, handler: any) => () => void
  attachOTAdapter?: (adapter: any) => () => void
  dispose: () => void
}
/* eslint-enable @typescript-eslint/no-explicit-any */
