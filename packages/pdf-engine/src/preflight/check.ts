/**
 * packages/pdf-engine/src/preflight/check.ts
 *
 * preflight() — 메인 검증 API
 *
 * 처리 흐름:
 *   1. profileId 지정 시 해당 프로필만, 없으면 3개 모두 검증
 *   2. 6개 룰 모두 실행
 *   3. PreflightReport[] 반환 (profileId별 1개)
 *
 * Variant A: PdfBuildInput 기반 (빌드 전 검증 — 더 가벼움, 기본)
 * Variant B: 생성된 PDF buffer 기반 → placeholder (M6-04 이후)
 */

import type { PdfBuildInput, PdfBuildOptions } from '../types.js'

import { PROFILES, getProfileById } from './profiles.js'
import { bleedCheck, colorCheck, dpiCheck, fontCheck, pageCountCheck, safeCheck } from './rules.js'
import type { PreflightReport, PreflightViolation } from './types.js'

// ─── 단일 프로필 검증 ─────────────────────────────────────────────────────────

function runAllRules(
  input: PdfBuildInput,
  profile: ReturnType<typeof getProfileById>,
  opts: PdfBuildOptions,
): PreflightViolation[] {
  if (!profile) return []
  return [
    ...bleedCheck(input, profile),
    ...safeCheck(input, profile),
    ...dpiCheck(input, profile),
    ...fontCheck(input, profile, opts),
    ...colorCheck(input, profile),
    ...pageCountCheck(input, profile),
  ]
}

function buildReport(
  input: PdfBuildInput,
  profile: ReturnType<typeof getProfileById>,
  opts: PdfBuildOptions,
): PreflightReport {
  if (!profile) {
    return {
      profileId: 'unknown',
      profileName: 'Unknown',
      ok: false,
      errors: [
        {
          rule: 'preflight',
          severity: 'error',
          message: '알 수 없는 프로필 ID 입니다.',
        },
      ],
      warnings: [],
      infos: [],
      metadata: {
        totalPages: input.pages.length,
        checkedAt: new Date().toISOString(),
      },
    }
  }

  const all = runAllRules(input, profile, opts)
  const errors = all.filter((v) => v.severity === 'error')
  const warnings = all.filter((v) => v.severity === 'warning')
  const infos = all.filter((v) => v.severity === 'info')

  return {
    profileId: profile.id,
    profileName: profile.name,
    ok: errors.length === 0,
    errors,
    warnings,
    infos,
    metadata: {
      totalPages: input.pages.length,
      checkedAt: new Date().toISOString(),
    },
  }
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * Variant A: PdfBuildInput → PreflightReport[]
 *
 * @param input      buildPdf() 와 동일한 입력 객체
 * @param profileId  지정 시 해당 프로필만, 생략 시 3개 모두 검증
 * @param opts       buildPdf() 옵션 (embedFonts 등 font-check 에 전달)
 */
export async function preflight(
  input: PdfBuildInput,
  profileId?: string,
  opts: PdfBuildOptions = {},
): Promise<PreflightReport[]> {
  if (profileId !== undefined) {
    const profile = getProfileById(profileId)
    return [buildReport(input, profile, opts)]
  }

  // 모든 프로필 검증
  return PROFILES.map((profile) => buildReport(input, profile, opts))
}

/**
 * Variant B: PDF buffer → PreflightReport[] (placeholder)
 *
 * @todo M6-04 이후 pdf-lib 로 메타 추출 후 실제 구현
 */
export async function preflightBuffer(
  _pdfBuffer: Uint8Array,
  _profileId?: string,
): Promise<PreflightReport[]> {
  // placeholder — Variant A 로 모든 검증 가능. buffer 분석은 추후.
  return []
}
