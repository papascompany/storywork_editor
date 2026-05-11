// ─────────────────────────────────────────────
// @storywork/editor-template — public API
// ─────────────────────────────────────────────

// 타입
export type { Slot, SlotKind } from './slot-types.js'
export { SLOT_KINDS, SLOT_KIND_COLORS, SLOT_KIND_LABELS } from './slot-types.js'

export type {
  TemplateSpec,
  SlotMap,
  SlotPlaceholder,
  ApplyTemplateResult,
} from './template-types.js'

// 핵심 함수
export type { ApplyTemplateOptions, PlaceholderStyle } from './apply-template.js'
export { applyTemplate, fillSlot, clearSlot } from './apply-template.js'

// Command 패턴
export type {
  ApplyTemplateCommandOptions,
  FillSlotCommandOptions,
  ClearSlotCommandOptions,
} from './template-commands.js'
export { ApplyTemplateCommand, FillSlotCommand, ClearSlotCommand } from './template-commands.js'

// 스냅 유틸리티
export type { SnapResult, SnapToSlotOptions } from './snap-to-slot.js'
export { findNearestSlot, attachSnapToSlot } from './snap-to-slot.js'

// 기본 프리셋
export { DEFAULT_TEMPLATES } from './default-templates.js'
