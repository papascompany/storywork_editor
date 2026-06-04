/**
 * packages/pdf-engine/src/preflight/rules.ts
 *
 * 6개 룰 re-export 집계 파일
 *
 * 각 룰 시그니처: (input, profile, opts?) => PreflightViolation[]
 */

export { bleedCheck } from './rules/bleed-check.js'
export { safeCheck } from './rules/safe-check.js'
export { dpiCheck } from './rules/dpi-check.js'
export { fontCheck } from './rules/font-check.js'
export { colorCheck } from './rules/color-check.js'
export { pageCountCheck } from './rules/page-count-check.js'
