/**
 * packages/pdf-engine/src/fonts.ts
 *
 * 폰트 임베드 로더.
 *
 * 전략:
 *   1. 환경변수 PRETENDARD_TTF_PATH 가 있으면 해당 경로의 ttf 로드
 *   2. 없으면 assets/fonts/Pretendard-Regular.ttf (패키지 번들) 시도
 *   3. 없으면 null 반환 → pdf-lib StandardFonts.Helvetica 폴백
 *
 * 한글 텍스트는 ttf 임베드 없이는 깨짐. 서버에서 반드시 ttf 공급 필요.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))

let _fontCache: Uint8Array | null | undefined = undefined

/**
 * Pretendard-Regular ttf 바이트 로드 (lazy, singleton)
 * @returns ttf Uint8Array 또는 null (임베드 불가 폴백)
 */
export async function loadPretendardFont(): Promise<Uint8Array | null> {
  if (_fontCache !== undefined) return _fontCache

  // 1. 환경변수 경로
  const envPath = process.env['PRETENDARD_TTF_PATH']
  if (envPath) {
    try {
      const buf = await readFile(envPath)
      _fontCache = new Uint8Array(buf)
      return _fontCache
    } catch {
      // 경로 실패 → 다음 시도
    }
  }

  // 2. 패키지 번들 경로
  const bundlePath = resolve(__dirname, '../assets/fonts/Pretendard-Regular.ttf')
  try {
    const buf = await readFile(bundlePath)
    _fontCache = new Uint8Array(buf)
    return _fontCache
  } catch {
    // 번들도 없으면 null
  }

  _fontCache = null
  return null
}

/** 테스트에서 캐시 초기화용 */
export function resetFontCache(): void {
  _fontCache = undefined
}
