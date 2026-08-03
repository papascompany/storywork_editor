/**
 * packages/pdf-engine/src/fonts.ts
 *
 * 폰트 임베드 로더.
 *
 * 전략:
 *   1. 환경변수 PRETENDARD_TTF_PATH 가 있으면 해당 경로의 폰트 로드
 *      (절대경로 그대로, 상대경로는 cwd → cwd/../.. 순으로 해석)
 *   2. 없으면 패키지 번들 assets/fonts/Pretendard-Regular.otf 자동 발견
 *      (모노레포 루트/앱 디렉터리 어느 cwd 에서든 candidates 로 해석 —
 *       Vercel 서버리스는 outputFileTracingIncludes 로 트레이스된 경로)
 *   3. 모두 실패하면 null 반환 → pdf-lib StandardFonts.Helvetica 폴백
 *
 * 한글 텍스트는 폰트 임베드 없이는 깨짐(스킵 경고). 임베드는 fontkit 등록 필수
 * (render/page-renderer.ts createRenderContext 에서 registerFontkit).
 *
 * 주의: import.meta.url 기반 번들 경로는 Next.js 빌드(transpilePackages)와
 *       호환되지 않으므로 cwd 기반 candidates 만 사용한다.
 */

import { readFile } from 'node:fs/promises'
import path from 'node:path'

/** 모노레포 루트 기준 번들 폰트 상대경로
 *  (정적 OTF 는 CFF 아웃라인이라 @pdf-lib/fontkit 구형 CFF 파서가 실패 —
 *   TrueType 아웃라인의 variable ttf 사용) */
const BUNDLED_FONT_REL = 'packages/pdf-engine/assets/fonts/PretendardVariable.ttf'

let _fontCache: Uint8Array | null | undefined = undefined

async function tryRead(p: string): Promise<Uint8Array | null> {
  try {
    const buf = await readFile(p)
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

/**
 * Pretendard 폰트 바이트 로드 (lazy, singleton)
 *
 * @returns 폰트 Uint8Array 또는 null (임베드 불가 폴백)
 */
export async function loadPretendardFont(): Promise<Uint8Array | null> {
  if (_fontCache !== undefined) return _fontCache

  const cwd = process.cwd()
  const candidates: string[] = []

  // 1) 환경변수 경로 (절대 → 그대로, 상대 → cwd 기준 해석)
  const envPath = process.env['PRETENDARD_TTF_PATH']
  if (envPath) {
    if (path.isAbsolute(envPath)) {
      candidates.push(envPath)
    } else {
      candidates.push(path.resolve(cwd, envPath), path.resolve(cwd, '../..', envPath))
    }
  }

  // 2) 번들 폰트 자동 발견 — cwd 가 모노레포 루트 / apps/* / 패키지 어디든 커버
  candidates.push(
    path.resolve(cwd, BUNDLED_FONT_REL),
    path.resolve(cwd, '../..', BUNDLED_FONT_REL),
    path.resolve(cwd, '../../..', BUNDLED_FONT_REL),
  )

  for (const candidate of candidates) {
    const bytes = await tryRead(candidate)
    if (bytes) {
      _fontCache = bytes
      return _fontCache
    }
  }

  _fontCache = null
  return null
}

/** 테스트에서 캐시 초기화용 */
export function resetFontCache(): void {
  _fontCache = undefined
}
