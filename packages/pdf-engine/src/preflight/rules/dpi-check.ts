/**
 * packages/pdf-engine/src/preflight/rules/dpi-check.ts
 *
 * 이미지 해상도(DPI) 검증 룰
 * ADR-0011a lowDpi 정책 통합
 *
 * - 포즈/인물 이미지: effectiveDpi < minPose → error (<200) or warning (<300)
 * - 배경 이미지: effectiveDpi < minBg → warning
 * - lowDpi 태그 자산이 페이지 1/2 초과 슬롯에 배치 → error (ADR-0011a)
 *
 * effectiveDpi 계산:
 *   물리 픽셀 수 / (레이어 widthMm / 25.4)
 *   (masterDpi 가 없으면 format.dpi 기준으로 추정)
 */

import type { PdfBuildInput } from '../../types.js'
import type { PreflightProfile } from '../profiles.js'
import type { PreflightViolation } from '../types.js'

/** effectiveDpi 계산: 픽셀 너비 / (렌더 너비 inch) */
function calcEffectiveDpi(pixelWidth: number, renderWidthMm: number): number {
  if (renderWidthMm <= 0) return 0
  const renderWidthInch = renderWidthMm / 25.4
  return Math.round(pixelWidth / renderWidthInch)
}

export function dpiCheck(input: PdfBuildInput, profile: PreflightProfile): PreflightViolation[] {
  const violations: PreflightViolation[] = []
  const { widthMm, heightMm } = input.format
  const pageAreaMm2 = widthMm * heightMm

  for (const page of input.pages) {
    const fabricJson = page.fabricJson as Record<string, unknown>
    const layers = fabricJson['layers']
    if (!Array.isArray(layers)) continue

    for (const layer of layers) {
      const fab = layer as Record<string, unknown>
      const kind = fab['kind'] as string | undefined
      if (!kind || kind === 'bg' || kind === 'text' || kind === 'bubble') continue

      const fabric = (fab['fabric'] ?? {}) as Record<string, unknown>
      const data = (fab['data'] ?? {}) as Record<string, unknown>
      const meta = (data['meta'] ?? {}) as Record<string, unknown>
      const tags = Array.isArray(meta['tags']) ? (meta['tags'] as string[]) : []

      // 렌더 크기 (mm)
      const w = typeof fabric['width'] === 'number' ? fabric['width'] : 0
      const h = typeof fabric['height'] === 'number' ? fabric['height'] : 0
      const scaleX = typeof fabric['scaleX'] === 'number' ? fabric['scaleX'] : 1
      const scaleY = typeof fabric['scaleY'] === 'number' ? fabric['scaleY'] : 1
      const renderWidthMm = w * scaleX
      const renderHeightMm = h * scaleY

      // masterDpi 또는 기본 추정
      const masterDpi = typeof meta['masterDpi'] === 'number' ? meta['masterDpi'] : null
      const pixelWidth =
        typeof meta['pixelWidth'] === 'number'
          ? meta['pixelWidth']
          : masterDpi !== null
            ? Math.round((renderWidthMm / 25.4) * masterDpi)
            : null

      const isPose = kind === 'pose'
      const isBg = kind === 'bg' || (meta['kind'] as string) === 'background'
      const minDpi = isPose
        ? profile.imageDpi.minPose
        : isBg
          ? profile.imageDpi.minBg
          : profile.imageDpi.minPose

      // ADR-0011a: lowDpi 태그 자산 슬롯 제약
      const isLowDpi = tags.includes('lowDpi')
      if (isLowDpi) {
        const layerAreaMm2 = renderWidthMm * renderHeightMm
        const occupancyRatio = pageAreaMm2 > 0 ? layerAreaMm2 / pageAreaMm2 : 0
        if (occupancyRatio > 0.5) {
          violations.push({
            rule: 'dpi-check',
            severity: 'error',
            pageIndex: page.pageIndex,
            layerId: fab['id'] as string | undefined,
            message: `페이지 ${page.pageIndex + 1}: lowDpi 자산이 페이지 면적의 ${Math.round(occupancyRatio * 100)}%를 차지합니다 (ADR-0011a 제한: ≤50%).`,
            suggestion:
              'lowDpi 자산은 페이지 절반 이하 크기의 슬롯에만 배치하세요. 더 큰 슬롯에는 고해상도 자산을 사용하세요.',
          })
        }
      }

      // effectiveDpi 검증
      if (pixelWidth !== null && renderWidthMm > 0) {
        const effectiveDpi = calcEffectiveDpi(pixelWidth, renderWidthMm)

        if (effectiveDpi > 0 && effectiveDpi < minDpi) {
          // 200 미만이면 error, 그 이상이면 warning
          const severity = effectiveDpi < 200 ? 'error' : 'warning'
          violations.push({
            rule: 'dpi-check',
            severity,
            pageIndex: page.pageIndex,
            layerId: fab['id'] as string | undefined,
            message: `페이지 ${page.pageIndex + 1}: ${kind} 이미지의 유효 해상도 ${effectiveDpi}dpi 가 최소 기준(${minDpi}dpi)보다 낮습니다.`,
            suggestion: `이미지 크기를 줄이거나 고해상도 자산으로 교체하세요. 권장: ${minDpi}dpi 이상.`,
          })
        }
      } else if (masterDpi !== null && masterDpi < minDpi) {
        // masterDpi 만 있는 경우 (renderWidth 없음)
        const severity = masterDpi < 200 ? 'error' : 'warning'
        violations.push({
          rule: 'dpi-check',
          severity,
          pageIndex: page.pageIndex,
          layerId: fab['id'] as string | undefined,
          message: `페이지 ${page.pageIndex + 1}: ${kind} 이미지 masterDpi ${masterDpi}dpi 가 최소 기준(${minDpi}dpi)보다 낮습니다.`,
          suggestion: `고해상도 자산으로 교체하세요. 권장: ${minDpi}dpi 이상.`,
        })
      }
    }
  }

  return violations
}
