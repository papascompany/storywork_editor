// ─────────────────────────────────────────────
// registry.ts — 워드효과 레지스트리
//
// 모든 효과 카테고리를 하나의 배열로 통합.
// getEffectById / getEffectsByCategory 헬퍼 제공.
// ─────────────────────────────────────────────

import type { EffectCategory, WordEffect } from './effect-types.js'
import { backgroundEffects } from './effects/background.js'
import { glowEffects } from './effects/glow.js'
import { gradientEffects } from './effects/gradient.js'
import { metallicEffects } from './effects/metallic.js'
import { outlineEffects } from './effects/outline.js'
import { patternEffects } from './effects/pattern.js'
import { shadowEffects } from './effects/shadow.js'
import { transformEffects } from './effects/transform.js'

// ─── 레지스트리 빌드 ──────────────────────────────────────────────────────────

export const EFFECTS_REGISTRY: WordEffect[] = [
  ...Object.values(shadowEffects), // 8종
  ...Object.values(outlineEffects), // 6종
  ...Object.values(glowEffects), // 5종
  ...Object.values(gradientEffects), // 6종
  ...Object.values(metallicEffects), // 5종
  ...Object.values(transformEffects), // 5종
  ...Object.values(backgroundEffects), // 5종
  ...Object.values(patternEffects), // 5종
  // 총 45종
]

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

/**
 * ID 로 효과를 조회한다.
 */
export function getEffectById(id: string): WordEffect | undefined {
  return EFFECTS_REGISTRY.find((e) => e.id === id)
}

/**
 * 카테고리로 효과를 필터링한다.
 */
export function getEffectsByCategory(cat: EffectCategory): WordEffect[] {
  return EFFECTS_REGISTRY.filter((e) => e.category === cat)
}

/**
 * 효과 이름/카테고리로 검색한다 (대소문자 무관).
 */
export function searchEffects(query: string): WordEffect[] {
  const q = query.toLowerCase().trim()
  if (!q) return EFFECTS_REGISTRY
  return EFFECTS_REGISTRY.filter(
    (e) =>
      e.name.toLowerCase().includes(q) ||
      e.category.toLowerCase().includes(q) ||
      (e.description?.toLowerCase().includes(q) ?? false),
  )
}
