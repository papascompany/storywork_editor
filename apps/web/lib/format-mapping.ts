/**
 * apps/web/lib/format-mapping.ts
 *
 * 클라이언트 preset ID ↔ DB Format ID 매핑 헬퍼.
 *
 * 배경:
 *   FormatPickerModal 에서 선택한 preset ID 는 'preset:b5-novel' 형태.
 *   DB Format 테이블의 id 는 'preset-b5-novel' (콜론 → 하이픈, seed 스크립트 기준).
 *   이 불일치를 서버 사이드에서 정규화해 DB 조회가 항상 성공하도록 한다.
 *
 * 전략:
 *   1. 'preset:*' 형태 → 콜론을 하이픈으로 치환 → DB ID 와 1:1 매핑
 *   2. 이미 cuid/하이픈 형태이면 그대로 통과
 *   3. 예외 처리 없이 변환만 담당 (존재 여부 확인은 호출자 책임)
 *
 * 서버 전용 여부: 퓨어 문자열 변환이므로 양쪽(server/client) 사용 가능.
 */

// ─── preset ID 매핑 테이블 ─────────────────────────────────────────────────────

/**
 * FormatPickerModal 의 preset id → DB Format.id 명시적 매핑.
 * seed-formats.ts 와 반드시 동기화 유지.
 */
const PRESET_ID_MAP: Record<string, string> = {
  'preset:b5-novel': 'preset-b5-novel',
  'preset:a5-artbook': 'preset-a5-artbook',
  'preset:square': 'preset-square',
  'preset:mobile-story': 'preset-mobile-story',
}

// ─── resolveFormatId ──────────────────────────────────────────────────────────

/**
 * 로컬 preset ID 를 DB Format.id 로 정규화한다.
 *
 * 변환 규칙:
 *  - 명시적 매핑 테이블에 있으면 해당 값 사용
 *  - 'preset:*' 패턴이면 콜론 → 하이픈 (폴백)
 *  - 그 외엔 그대로 반환 (DB cuid 등)
 *
 * @example
 *   resolveFormatId('preset:b5-novel')  // → 'preset-b5-novel'
 *   resolveFormatId('preset:a5-artbook') // → 'preset-a5-artbook'
 *   resolveFormatId('cma1234abcde')      // → 'cma1234abcde' (그대로)
 */
export function resolveFormatId(input: string): string {
  // 1. 명시적 매핑 우선
  const mapped = PRESET_ID_MAP[input]
  if (mapped !== undefined) return mapped

  // 2. 'preset:*' 패턴 폴백: 콜론 → 하이픈
  if (input.startsWith('preset:')) {
    return input.replace(':', '-')
  }

  // 3. 그대로 통과
  return input
}

// ─── KNOWN_PRESET_IDS ────────────────────────────────────────────────────────

/**
 * 현재 지원하는 preset DB ID 목록 (seed-formats.ts 와 동기화).
 * 관리자 콘솔에서 DB Format 조회 전 빠른 존재 확인용.
 */
export const KNOWN_PRESET_DB_IDS = Object.values(PRESET_ID_MAP)
