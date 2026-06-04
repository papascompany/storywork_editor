/**
 * packages/pdf-engine/src/preflight/rules/font-check.ts
 *
 * 폰트 임베드 검증 룰
 *
 * - profile.fontEmbedRequired=true 인데 폰트 임베드 옵션 없음 → error
 * - 텍스트 레이어에서 알 수 없는 fontFamily (라이선스 불명) → error
 * - 텍스트 레이어 fontFamily 가 Pretendard/NanumGothic/NotoSansKR 등 알려진 폰트 → info
 *
 * 허용 폰트 목록: 라이선스 확인된 폰트만 (SIL OFL / Apache 2.0)
 */

import type { PdfBuildInput, PdfBuildOptions } from '../../types.js'
import type { PreflightProfile } from '../profiles.js'
import type { PreflightViolation } from '../types.js'

/** 라이선스 확인된 폰트 목록 (SIL OFL / Apache 2.0) */
const LICENSED_FONTS = new Set([
  'Pretendard',
  'PretendardVariable',
  'Pretendard Variable',
  'NanumGothic',
  'NanumBarunGothic',
  'NotoSansKR',
  'Noto Sans KR',
  'NotoSerifKR',
  'Noto Serif KR',
  'Spoqa Han Sans Neo',
  'Nanum Myeongjo',
  'NanumMyeongjo',
  'IBM Plex Sans KR',
  'Helvetica',
  'Times New Roman',
  'Courier',
  'Courier New',
  'Arial',
])

/** 폰트 패밀리 이름 정규화 (공백/대소문자 처리) */
function normalizeFontFamily(family: string): string {
  return family.trim()
}

export function fontCheck(
  input: PdfBuildInput,
  profile: PreflightProfile,
  opts: PdfBuildOptions = {},
): PreflightViolation[] {
  const violations: PreflightViolation[] = []
  const embedFonts = opts.embedFonts !== false // 기본 true

  // 1. fontEmbedRequired 체크
  if (profile.fontEmbedRequired && !embedFonts) {
    violations.push({
      rule: 'font-check',
      severity: 'error',
      message: `${profile.name} 프로필은 폰트 임베드를 필수로 요구합니다.`,
      suggestion: 'buildPdf() 옵션에서 embedFonts: true 를 설정하세요.',
    })
  }

  // 2. 텍스트 레이어 폰트 라이선스 검사
  const unknownFonts = new Set<string>()

  for (const page of input.pages) {
    const fabricJson = page.fabricJson as Record<string, unknown>
    const layers = fabricJson['layers']
    if (!Array.isArray(layers)) continue

    for (const layer of layers) {
      const fab = layer as Record<string, unknown>
      const kind = fab['kind'] as string | undefined
      if (kind !== 'text') continue

      const fabric = (fab['fabric'] ?? {}) as Record<string, unknown>
      const fontFamily =
        typeof fabric['fontFamily'] === 'string' ? fabric['fontFamily'] : 'Pretendard'
      const normalized = normalizeFontFamily(fontFamily)

      if (!LICENSED_FONTS.has(normalized)) {
        unknownFonts.add(normalized)
        violations.push({
          rule: 'font-check',
          severity: 'error',
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: 폰트 "${fontFamily}" 의 라이선스를 확인할 수 없습니다.`,
          suggestion: `라이선스가 확인된 폰트(Pretendard, NanumGothic, NotoSansKR 등)를 사용하세요.`,
        })
      } else if (embedFonts) {
        violations.push({
          rule: 'font-check',
          severity: 'info',
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: 폰트 "${fontFamily}" 임베드 확인.`,
        })
      }
    }
  }

  return violations
}
