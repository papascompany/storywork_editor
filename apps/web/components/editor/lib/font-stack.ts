// ─────────────────────────────────────────────
// font-stack.ts — 편집기 폰트 fallback 정의
//
// 각 폰트의 완전한 fallback 체인을 정의한다.
// fabric Textbox 의 fontFamily 에 직접 사용.
// ─────────────────────────────────────────────

/** 폰트 ID → 표시 이름 */
export const FONT_DISPLAY_NAMES: Record<string, string> = {
  Pretendard: 'Pretendard',
  'Noto Sans KR': 'Noto Sans KR',
  'system-ui': '시스템 기본',
  'JetBrains Mono': 'JetBrains Mono',
}

/**
 * 폰트별 fallback 체인.
 * fabric Textbox 의 fontFamily 프로퍼티에 직접 사용 가능한 완전한 CSS font-family 문자열.
 */
export const FONT_STACKS: Record<string, string> = {
  Pretendard:
    "var(--font-pretendard, 'Pretendard Variable', Pretendard, 'Noto Sans KR', -apple-system, BlinkMacSystemFont, system-ui, sans-serif)",
  'Noto Sans KR':
    "'Noto Sans KR', Pretendard, -apple-system, BlinkMacSystemFont, system-ui, sans-serif",
  'system-ui': "-apple-system, BlinkMacSystemFont, 'Segoe UI', system-ui, sans-serif",
  'JetBrains Mono': "'JetBrains Mono', 'SF Mono', Menlo, Consolas, 'Courier New', monospace",
}

/**
 * ControlBar 폰트 드롭다운에 표시할 옵션 목록.
 * value: fabric 에 넘길 fontFamily 식별자 (FONT_STACKS 의 키)
 * label: 사용자에게 표시할 이름
 */
export const FONT_OPTIONS: Array<{ value: string; label: string }> = [
  { value: 'Pretendard', label: 'Pretendard (기본)' },
  { value: 'Noto Sans KR', label: 'Noto Sans KR' },
  { value: 'system-ui', label: '시스템 기본' },
]

/**
 * 폰트 식별자로 fallback 체인을 가져온다.
 * 알 수 없는 폰트는 Pretendard 체인으로 fallback.
 */
export function getFontStack(fontId: string): string {
  return FONT_STACKS[fontId] ?? FONT_STACKS['Pretendard'] ?? fontId
}

/**
 * fabric 폰트 문자열에서 첫 번째 폰트 이름을 추출한다.
 * ControlBar 드롭다운의 현재 값으로 사용.
 */
export function extractPrimaryFont(fontFamily: string): string {
  // var(--font-pretendard, ...) 패턴 처리
  if (fontFamily.startsWith('var(')) {
    return 'Pretendard'
  }

  // 첫 번째 폰트 이름 추출
  const first = fontFamily.split(',')[0]?.trim().replace(/['"]/g, '') ?? ''

  // 알려진 키와 매칭
  for (const key of Object.keys(FONT_STACKS)) {
    if (first === key || first.toLowerCase() === key.toLowerCase()) {
      return key
    }
  }

  return first || 'Pretendard'
}
