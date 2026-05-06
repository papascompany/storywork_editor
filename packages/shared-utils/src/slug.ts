/**
 * Filename → URL-safe slug 정규화
 *
 * 규칙:
 * - 확장자 제거
 * - 한글 → 로마자 음역 (간략 음운 매핑)
 * - 공백/밑줄/하이픈 → 하이픈 정규화
 * - 괄호/특수문자 제거
 * - 대문자 → 소문자
 * - 연속 하이픈 → 단일 하이픈
 * - 앞뒤 하이픈 제거
 *
 * 예: "Fight-ax(도끼)_01_1.png" → "fight-ax-dokki-01-1"
 * 예: "12_비스듬히 팔은 정면_1.png" → "12-bisdeumhi-pareun-jeongmyeon-1"
 */

// ─────────────────────────────────────────────
// 한글 음역 테이블 (초성 + 중성 + 종성)
// ─────────────────────────────────────────────

const CHOSEONG = [
  'g',
  'gg',
  'n',
  'd',
  'dd',
  'r',
  'm',
  'b',
  'bb',
  's',
  'ss',
  '',
  'j',
  'jj',
  'ch',
  'k',
  't',
  'p',
  'h',
]

const JUNGSEONG = [
  'a',
  'ae',
  'ya',
  'yae',
  'eo',
  'e',
  'yeo',
  'ye',
  'o',
  'wa',
  'wae',
  'oe',
  'yo',
  'u',
  'weo',
  'we',
  'wi',
  'yu',
  'eu',
  'ui',
  'i',
]

const JONGSEONG = [
  '',
  'g',
  'gg',
  'gs',
  'n',
  'nj',
  'nh',
  'r',
  'rg',
  'rm',
  'rb',
  'rs',
  'rt',
  'rp',
  'rh',
  'm',
  'b',
  'bs',
  's',
  'ss',
  'ng',
  'j',
  'ch',
  'k',
  't',
  'p',
  'h',
]

/** 한글 한 음절을 로마자로 변환 */
function syllableToRoman(code: number): string {
  const offset = code - 0xac00
  if (offset < 0 || offset > 11171) return ''

  const jongIdx = offset % 28
  const jungIdx = Math.floor(offset / 28) % 21
  const choIdx = Math.floor(offset / 28 / 21)

  return (CHOSEONG[choIdx] ?? '') + (JUNGSEONG[jungIdx] ?? '') + (JONGSEONG[jongIdx] ?? '')
}

/** 한글 문자열을 로마자 음역으로 변환 */
function koreanToRoman(str: string): string {
  // macOS 파일시스템이 NFD로 저장 → NFC로 정규화하여 완성형 음절로 변환
  const normalized = str.normalize('NFC')
  let result = ''
  const KO_START = 44032 // 0xac00
  const KO_END = 55203 // 0xd7a3
  const chars = Array.from(normalized)
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i] ?? ''
    const code = char.codePointAt(0) ?? 0
    if (code >= KO_START && code <= KO_END) {
      result += syllableToRoman(code)
    } else if (code >= 0x3131 && code <= 0x318e) {
      // 호환 자모 (낱자) — 그냥 제거
      result += ''
    } else {
      result += char
    }
  }
  return result
}

/**
 * 파일명을 URL-safe slug 로 변환
 * @param filename 원본 파일명 (확장자 포함 가능)
 * @returns URL-safe lowercase slug
 */
export function slugifyFilename(filename: string): string {
  // 1. 확장자 제거
  const withoutExt = filename.replace(/\.[^.]+$/, '')

  // 2. 한글 → 로마자
  const romanized = koreanToRoman(withoutExt)

  // 3. 괄호 내용 제거 (한글 괄호 포함) 후 괄호 자체 제거
  //    괄호 안 내용은 이미 romanized 처리됨 — 괄호 기호만 제거
  const noBrackets = romanized.replace(/[()[\]{}（）]/g, '-')

  // 4. 소문자화
  const lower = noBrackets.toLowerCase()

  // 5. URL-unsafe 문자(공백, 특수기호 등) → 하이픈
  const hyphened = lower.replace(/[^a-z0-9-]/g, '-')

  // 6. 연속 하이픈 → 단일
  const deduped = hyphened.replace(/-{2,}/g, '-')

  // 7. 앞뒤 하이픈 제거
  return deduped.replace(/^-+|-+$/g, '')
}

/**
 * slug 충돌 방지용 suffix 추가
 * @param slug 기존 slug
 * @param index 충돌 순번 (1부터)
 */
export function slugWithSuffix(slug: string, index: number): string {
  return `${slug}-${index}`
}
