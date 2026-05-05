// ─────────────────────────────────────────────
// @storywork/editor-history — 공개 API
// Command 기반 undo/redo, OT 슬롯
// React/DOM 에 의존하지 않는 헤드리스 히스토리 엔진
// ─────────────────────────────────────────────

// 공개 타입
export type {
  Command,
  HistoryEvent,
  HistoryEventMap,
  OTAdapter,
  TransformSnapshot,
} from './types.js'

// 메인 클래스
export { History } from './History.js'
export type { HistoryOptions } from './History.js'

// ─── 빌트인 Commands: canvas ───
export { AddObjectCommand } from './commands/canvas/AddObjectCommand.js'
export type { AddObjectCommandOptions } from './commands/canvas/AddObjectCommand.js'

export { RemoveObjectCommand } from './commands/canvas/RemoveObjectCommand.js'
export type { RemoveObjectCommandOptions } from './commands/canvas/RemoveObjectCommand.js'

export {
  TransformObjectCommand,
  snapshotFromFabricObject,
} from './commands/canvas/TransformObjectCommand.js'
export type { TransformObjectCommandOptions } from './commands/canvas/TransformObjectCommand.js'

// ─── 빌트인 Commands: layers ───
export { MoveLayerCommand } from './commands/layers/MoveLayerCommand.js'
export type { MoveLayerCommandOptions } from './commands/layers/MoveLayerCommand.js'

export { ZOrderCommand } from './commands/layers/ZOrderCommand.js'
export type { ZOrderCommandOptions, ZOrderAction } from './commands/layers/ZOrderCommand.js'

export { GroupCommand } from './commands/layers/GroupCommand.js'
export type { GroupCommandOptions } from './commands/layers/GroupCommand.js'

export { UngroupCommand } from './commands/layers/UngroupCommand.js'
export type { UngroupCommandOptions } from './commands/layers/UngroupCommand.js'

export { LockCommand, collectLockPrevStates } from './commands/layers/LockCommand.js'
export type { LockCommandOptions } from './commands/layers/LockCommand.js'

export { HiddenCommand, collectHiddenPrevStates } from './commands/layers/HiddenCommand.js'
export type { HiddenCommandOptions } from './commands/layers/HiddenCommand.js'

export { RenameLayerCommand } from './commands/layers/RenameLayerCommand.js'
export type { RenameLayerCommandOptions } from './commands/layers/RenameLayerCommand.js'

// ─── Coalesce 유틸 ───
export { isSameTransform, withinCoalesceWindow } from './coalesce/transform-coalesce.js'

// ─── OT 어댑터 ───
export { NullOTAdapter, SpyOTAdapter } from './ot/adapter.js'

// ─── Observer (자동 push 헬퍼) ───
export { attachAutoPush } from './observers/canvas-observer.js'
export type { AttachAutoPushOptions } from './observers/canvas-observer.js'
