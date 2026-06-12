/**
 * packages/pdf-engine/src/preflight/rules/effective-dims.ts
 *
 * 페이지별 유효 치수 헬퍼 (FOLLOWUP-COVER-03).
 * PageInput.dims(표지 등 독립 치수)가 있으면 우선, 없으면 format 치수.
 */
import type { PageInput, PdfBuildInput } from '../../types.js'

export function effectivePageDims(
  input: PdfBuildInput,
  page: PageInput,
): { widthMm: number; heightMm: number } {
  return {
    widthMm: page.dims?.widthMm ?? input.format.widthMm,
    heightMm: page.dims?.heightMm ?? input.format.heightMm,
  }
}
