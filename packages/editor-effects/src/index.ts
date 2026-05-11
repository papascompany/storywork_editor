// ─────────────────────────────────────────────
// @storywork/editor-effects — 공개 API
//
// 워드효과 45종 + Command 패턴 + Registry
// ─────────────────────────────────────────────

export type { EffectCategory, EffectTarget, WordEffect, WordEffectOptions } from './effect-types.js'
export { EFFECT_CATEGORIES } from './effect-types.js'

export { EFFECTS_REGISTRY, getEffectById, getEffectsByCategory, searchEffects } from './registry.js'

export type {
  ApplyEffectCommandOptions,
  Command,
  RemoveEffectCommandOptions,
} from './effect-commands.js'
export { ApplyEffectCommand, RemoveEffectCommand } from './effect-commands.js'

// 카테고리별 효과 (테스트/직접 접근용)
export { shadowEffects } from './effects/shadow.js'
export { outlineEffects } from './effects/outline.js'
export { glowEffects } from './effects/glow.js'
export { gradientEffects } from './effects/gradient.js'
export { metallicEffects } from './effects/metallic.js'
export { transformEffects } from './effects/transform.js'
export { backgroundEffects } from './effects/background.js'
export { patternEffects } from './effects/pattern.js'
