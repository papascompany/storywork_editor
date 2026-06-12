/**
 * packages/pdf-engine/src/preflight/rules/bleed-check.ts
 *
 * bleed(재단여유) 검증 룰
 *
 * - input.format.bleedMm < profile.bleedMm.min → error
 * - input.format.bleedMm > profile.bleedMm.max → warning
 * - 페이지 레이어가 bleed 영역(trim 경계 밖)에 주요 객체(text/pose) → warning
 */

import type { PdfBuildInput } from '../../types.js'
import type { PreflightProfile } from '../profiles.js'
import type { PreflightViolation } from '../types.js'

import { effectivePageDims } from './effective-dims.js'

/** 레이어가 bleed 영역(trim 경계 바깥)에 있는지 판별 */
function isInBleedZone(
  x: number,
  y: number,
  width: number,
  height: number,
  contentWidthMm: number,
  contentHeightMm: number,
): boolean {
  // 레이어가 트림 박스(0..contentW, 0..contentH) 를 벗어나면 bleed 영역
  return x < 0 || y < 0 || x + width > contentWidthMm || y + height > contentHeightMm
}

export function bleedCheck(input: PdfBuildInput, profile: PreflightProfile): PreflightViolation[] {
  const violations: PreflightViolation[] = []
  const { bleedMm } = input.format

  // 1. bleed 값 최소 기준
  if (bleedMm < profile.bleedMm.min) {
    violations.push({
      rule: 'bleed-check',
      severity: 'error',
      message: `bleed ${bleedMm}mm 가 최소 요구사항(${profile.bleedMm.min}mm)보다 작습니다.`,
      suggestion: `format.bleedMm 를 ${profile.bleedMm.min}mm 이상으로 설정하세요.`,
    })
  }

  // 2. bleed 값 최대 기준 (너무 크면 낭비)
  if (bleedMm > profile.bleedMm.max) {
    violations.push({
      rule: 'bleed-check',
      severity: 'warning',
      message: `bleed ${bleedMm}mm 가 권장 최대(${profile.bleedMm.max}mm)를 초과합니다.`,
      suggestion: `bleed 를 ${profile.bleedMm.min}~${profile.bleedMm.max}mm 사이로 설정하는 것이 권장됩니다.`,
    })
  }

  // 3. 페이지별 레이어 bleed 침범 검사 (text/pose 레이어만 경고)
  for (const page of input.pages) {
    // FOLLOWUP-COVER-03: 표지 등 독립 치수 페이지는 해당 치수 기준으로 검사
    const { widthMm, heightMm } = effectivePageDims(input, page)
    const fabricJson = page.fabricJson as Record<string, unknown>
    const layers = fabricJson['layers']
    if (!Array.isArray(layers)) continue

    for (const layer of layers) {
      const fab = layer as Record<string, unknown>
      const kind = fab['kind'] as string | undefined
      if (kind !== 'text' && kind !== 'pose' && kind !== 'bubble') continue

      const fabric = (fab['fabric'] ?? {}) as Record<string, unknown>
      const left = typeof fabric['left'] === 'number' ? fabric['left'] : 0
      const top = typeof fabric['top'] === 'number' ? fabric['top'] : 0
      const w = typeof fabric['width'] === 'number' ? fabric['width'] : 0
      const h = typeof fabric['height'] === 'number' ? fabric['height'] : 0
      const scaleX = typeof fabric['scaleX'] === 'number' ? fabric['scaleX'] : 1
      const scaleY = typeof fabric['scaleY'] === 'number' ? fabric['scaleY'] : 1
      const scaledW = w * scaleX
      const scaledH = h * scaleY

      if (isInBleedZone(left, top, scaledW, scaledH, widthMm, heightMm)) {
        violations.push({
          rule: 'bleed-check',
          severity: 'warning',
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: ${kind} 레이어가 bleed(재단) 영역에 걸쳐 있습니다.`,
          suggestion: '텍스트/포즈/말풍선은 trim 경계 안쪽에 배치하세요.',
        })
      }
    }
  }

  return violations
}
