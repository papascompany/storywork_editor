// ─────────────────────────────────────────────
// @storywork/editor-text — 공개 API
// ─────────────────────────────────────────────

export type { CreateTextObjectOptions, SupportedFont } from './text-object.js'
export {
  createTextObject,
  SUPPORTED_FONTS,
  DEFAULT_FONT_FAMILY,
  hasForbiddenLineEnd,
  hasForbiddenLineStart,
  applyKoreanLineBreak,
  LINE_END_FORBIDDEN,
  LINE_START_FORBIDDEN,
} from './text-object.js'

export type { AddTextCommandOptions, EditTextCommandOptions, TextProps } from './text-commands.js'
export { AddTextCommand, EditTextCommand } from './text-commands.js'

export { attachTextInputMode } from './text-input-mode.js'

export type { Command } from './types.js'
