/**
 * packages/pdf-engine/src/preflight/rules/safe-check.ts
 *
 * safe area(안전영역) 검증 룰
 *
 * - input.format.safeMm < profile.safeMm.min → error
 * - 텍스트/말풍선 레이어가 safe area 내부가 아닌 경우 → error
 * - 포즈 레이어가 safe area를 침범하는 경우 → warning
 */

import type { PdfBuildInput } from '../../types.js'
import type { PreflightProfile } from '../profiles.js'
import type { PreflightViolation } from '../types.js'

import { effectivePageDims } from './effective-dims.js'

/** 레이어 bounds 가 safe area(safeMm 안쪽) 안에 완전히 들어오는지 */
function isInsideSafeArea(
  x: number,
  y: number,
  width: number,
  height: number,
  contentWidthMm: number,
  contentHeightMm: number,
  safeMm: number,
): boolean {
  return (
    x >= safeMm &&
    y >= safeMm &&
    x + width <= contentWidthMm - safeMm &&
    y + height <= contentHeightMm - safeMm
  )
}

export function safeCheck(input: PdfBuildInput, profile: PreflightProfile): PreflightViolation[] {
  const violations: PreflightViolation[] = []
  const { safeMm } = input.format

  // 1. safeMm 값 최소 기준 검사
  if (safeMm < profile.safeMm.min) {
    violations.push({
      rule: 'safe-check',
      severity: 'error',
      message: `safe area ${safeMm}mm 가 최소 요구사항(${profile.safeMm.min}mm)보다 작습니다.`,
      suggestion: `format.safeMm 를 ${profile.safeMm.min}mm 이상으로 설정하세요.`,
    })
  }

  // 2. 페이지별 레이어 safe area 침범 검사
  for (const page of input.pages) {
    // FOLLOWUP-COVER-03: 표지 등 독립 치수 페이지는 해당 치수 기준으로 검사
    const { widthMm, heightMm } = effectivePageDims(input, page)
    const fabricJson = page.fabricJson as Record<string, unknown>
    const layers = fabricJson['layers']
    if (!Array.isArray(layers)) continue

    for (const layer of layers) {
      const fab = layer as Record<string, unknown>
      const kind = fab['kind'] as string | undefined
      if (!kind || kind === 'bg') continue

      const fabric = (fab['fabric'] ?? {}) as Record<string, unknown>
      const left = typeof fabric['left'] === 'number' ? fabric['left'] : 0
      const top = typeof fabric['top'] === 'number' ? fabric['top'] : 0
      const w = typeof fabric['width'] === 'number' ? fabric['width'] : 0
      const h = typeof fabric['height'] === 'number' ? fabric['height'] : 0
      const scaleX = typeof fabric['scaleX'] === 'number' ? fabric['scaleX'] : 1
      const scaleY = typeof fabric['scaleY'] === 'number' ? fabric['scaleY'] : 1
      const scaledW = w * scaleX
      const scaledH = h * scaleY

      const inside = isInsideSafeArea(left, top, scaledW, scaledH, widthMm, heightMm, safeMm)

      if (!inside) {
        // 텍스트/말풍선은 error, 포즈/소품 등은 warning
        const isTextLike = kind === 'text' || kind === 'bubble'
        violations.push({
          rule: 'safe-check',
          severity: isTextLike ? 'error' : 'warning',
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: ${kind} 레이어가 safe area(${safeMm}mm 이내)를 침범합니다.`,
          suggestion: isTextLike
            ? `텍스트/말풍선은 반드시 safe area 안쪽(${safeMm}mm 이상)에 배치하세요.`
            : `포즈/소품이 재단 시 잘릴 수 있습니다. safe area(${safeMm}mm) 안쪽 배치를 권장합니다.`,
        })
      }
    }
  }

  return violations
}
