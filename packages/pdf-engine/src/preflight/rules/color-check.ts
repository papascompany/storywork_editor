/**
 * packages/pdf-engine/src/preflight/rules/color-check.ts
 *
 * 색공간(Color Space) 검증 룰
 *
 * - profile.colorSpace 에 'cmyk' 만 있는데 input 에 RGB 이미지만 있음 → warning
 * - 투명도(opacity < 1) 객체 → warning (인쇄 위험)
 * - 배경 레이어가 순수 흰색(#ffffff) → info (인쇄 시 용지 색상 고려 필요)
 *
 * 참고: 현재 PDF 엔진은 RGB 출력 (1차). CMYK 변환은 M6-04 이후.
 * sRGB ICC 프로파일 동봉은 buildPdf() 차원에서 처리 예정.
 */

import type { PdfBuildInput } from '../../types.js'
import type { PreflightProfile } from '../profiles.js'
import type { PreflightViolation } from '../types.js'

/** 색상이 순수 흰색인지 판별 */
function isPureWhite(fill: string): boolean {
  const normalized = fill.trim().toLowerCase()
  return (
    normalized === '#ffffff' ||
    normalized === '#fff' ||
    normalized === 'white' ||
    normalized === 'rgb(255, 255, 255)' ||
    normalized === 'rgba(255, 255, 255, 1)'
  )
}

export function colorCheck(input: PdfBuildInput, profile: PreflightProfile): PreflightViolation[] {
  const violations: PreflightViolation[] = []

  // 1. CMYK 선호 프로필인데 현재 엔진이 RGB 출력
  const prefersCmyk = profile.colorSpace[0] === 'cmyk'
  if (prefersCmyk) {
    violations.push({
      rule: 'color-check',
      severity: 'warning',
      message: `${profile.name} 프로필은 CMYK 색공간을 선호합니다. 현재 엔진은 RGB(sRGB ICC) 출력입니다.`,
      suggestion:
        'M6-04 CMYK 변환 기능 활성화 후 재검증하거나, 인쇄소에 sRGB ICC 프로파일 첨부 여부를 확인하세요.',
    })
  }

  // 2. 페이지별 레이어 검사
  for (const page of input.pages) {
    const fabricJson = page.fabricJson as Record<string, unknown>
    const layers = fabricJson['layers']
    if (!Array.isArray(layers)) continue

    for (const layer of layers) {
      const fab = layer as Record<string, unknown>
      const kind = fab['kind'] as string | undefined
      if (!kind) continue

      const fabric = (fab['fabric'] ?? {}) as Record<string, unknown>
      const opacity = typeof fabric['opacity'] === 'number' ? fabric['opacity'] : 1
      const fill = typeof fabric['fill'] === 'string' ? fabric['fill'] : ''

      // 투명도 경고 (인쇄 위험)
      if (opacity < 1 && opacity > 0) {
        violations.push({
          rule: 'color-check',
          severity: 'warning',
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: ${kind} 레이어의 투명도(opacity: ${opacity})가 인쇄 시 예상치 못한 색상 변화를 일으킬 수 있습니다.`,
          suggestion:
            '인쇄용 PDF 에서는 투명도를 0 또는 1 로 설정하거나, 인쇄소에 투명도 처리 방법을 확인하세요.',
        })
      }

      // 배경 순수 흰색 info
      if (kind === 'bg' && fill && isPureWhite(fill)) {
        violations.push({
          rule: 'color-check',
          severity: 'info',
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: 배경이 순수 흰색(#ffffff)입니다. 용지 색상에 따라 차이가 없을 수 있습니다.`,
        })
      }
    }
  }

  return violations
}
