/**
 * packages/pdf-engine/src/preflight/rules/page-count-check.ts
 *
 * 페이지 수 및 페이지 크기 검증 룰
 *
 * - profile.maxPages 초과 → error
 * - pages 가 0개 → warning
 * - 페이지 크기가 format 과 불일치 (fabricJson 내 format 기준) → error
 */

import type { PdfBuildInput } from '../../types.js'
import type { PreflightProfile } from '../profiles.js'
import type { PreflightViolation } from '../types.js'

import { effectivePageDims } from './effective-dims.js'

/** mm 비교 허용 오차 */
const MM_TOLERANCE = 0.5

export function pageCountCheck(
  input: PdfBuildInput,
  profile: PreflightProfile,
): PreflightViolation[] {
  const violations: PreflightViolation[] = []
  const totalPages = input.pages.length

  // 1. 빈 페이지
  if (totalPages === 0) {
    violations.push({
      rule: 'page-count-check',
      severity: 'warning',
      message: '페이지가 없습니다.',
      suggestion: '최소 1개 이상의 페이지를 추가하세요.',
    })
    return violations
  }

  // 2. maxPages 초과
  if (profile.maxPages !== undefined && totalPages > profile.maxPages) {
    violations.push({
      rule: 'page-count-check',
      severity: 'error',
      message: `총 페이지 수(${totalPages}p)가 ${profile.name} 최대 허용(${profile.maxPages}p)을 초과합니다.`,
      suggestion: `페이지를 ${profile.maxPages}p 이하로 줄이거나 다른 인쇄소 프로필을 선택하세요.`,
    })
  }

  // 3. 각 페이지 크기 불일치 검사
  for (const page of input.pages) {
    // FOLLOWUP-COVER-03: 표지 페이지는 PageInput.dims(표지 치수)와 비교
    const { widthMm, heightMm } = effectivePageDims(input, page)
    const fabricJson = page.fabricJson as Record<string, unknown>
    const pageFormat = fabricJson['format'] as Record<string, unknown> | undefined

    if (pageFormat) {
      const pageWidth = typeof pageFormat['widthMm'] === 'number' ? pageFormat['widthMm'] : null
      const pageHeight = typeof pageFormat['heightMm'] === 'number' ? pageFormat['heightMm'] : null

      if (pageWidth !== null && Math.abs(pageWidth - widthMm) > MM_TOLERANCE) {
        violations.push({
          rule: 'page-count-check',
          severity: 'error',
          pageIndex: page.pageIndex,
          message: `페이지 ${page.pageIndex + 1}: fabricJson 내 widthMm(${pageWidth}mm)이 format.widthMm(${widthMm}mm)과 불일치합니다.`,
          suggestion: '모든 페이지의 fabricJson format 이 프로젝트 판형과 일치하는지 확인하세요.',
        })
      }

      if (pageHeight !== null && Math.abs(pageHeight - heightMm) > MM_TOLERANCE) {
        violations.push({
          rule: 'page-count-check',
          severity: 'error',
          pageIndex: page.pageIndex,
          message: `페이지 ${page.pageIndex + 1}: fabricJson 내 heightMm(${pageHeight}mm)이 format.heightMm(${heightMm}mm)과 불일치합니다.`,
          suggestion: '모든 페이지의 fabricJson format 이 프로젝트 판형과 일치하는지 확인하세요.',
        })
      }
    }
  }

  return violations
}
