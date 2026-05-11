// ─────────────────────────────────────────────
// text-object.ts — fabric Textbox 생성 헬퍼
//
// 한글 splitByGrapheme, fallback 폰트 스택 적용.
// React/DOM 의존 없음 — 노드 환경 테스트 가능.
// ─────────────────────────────────────────────

import type { FabricObject } from 'fabric'

// ─── 기본 폰트 스택 ────────────────────────────────────────────────────────────

/**
 * 지원 폰트 목록 (MVP 3종).
 * Pretendard, Noto Sans KR 은 앱에서 font-face 선언 필요.
 */
export const SUPPORTED_FONTS = ['Pretendard', 'Noto Sans KR', 'system-ui'] as const
export type SupportedFont = (typeof SUPPORTED_FONTS)[number]

/**
 * 기본 폰트 fallback 체인.
 * layout.tsx 의 --font-pretendard CSS 변수 → Pretendard Variable → Pretendard → Noto Sans KR → system
 */
export const DEFAULT_FONT_FAMILY =
  "var(--font-pretendard, 'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, -apple-system, sans-serif)"

// ─── TextObject 옵션 ────────────────────────────────────────────────────────────

export type CreateTextObjectOptions = {
  /** 초기 텍스트 */
  text?: string
  /** 좌상단 위치 (px, 캔버스 좌표) */
  left?: number
  top?: number
  /** 폰트 */
  fontFamily?: SupportedFont
  /** 폰트 크기 (px) */
  fontSize?: number
  /** 색상 */
  fill?: string
  /** 정렬 */
  textAlign?: 'left' | 'center' | 'right'
  /** 굵기 */
  fontWeight?: 'normal' | 'bold'
  /** 기울임 */
  fontStyle?: 'normal' | 'italic'
  /** 밑줄 */
  underline?: boolean
  /** 줄간격 배수 */
  lineHeight?: number
  /** 자간 */
  charSpacing?: number
  /** 텍스트박스 너비 (px) */
  width?: number
}

/**
 * fabric Textbox 객체를 생성한다.
 * fabric 은 런타임에만 주입 (헤드리스 환경에서 import 분리).
 */
export async function createTextObject(opts: CreateTextObjectOptions = {}): Promise<FabricObject> {
  const { Textbox } = await import('fabric')

  const text = opts.text ?? '텍스트를 입력하세요'
  const fontFamily = opts.fontFamily
    ? `${opts.fontFamily}, 'Noto Sans KR', system-ui, -apple-system, sans-serif`
    : DEFAULT_FONT_FAMILY

  const obj = new Textbox(text, {
    left: opts.left ?? 100,
    top: opts.top ?? 100,
    width: opts.width ?? 200,
    fontFamily,
    fontSize: opts.fontSize ?? 24,
    fill: opts.fill ?? '#111111',
    textAlign: opts.textAlign ?? 'left',
    fontWeight: opts.fontWeight ?? 'normal',
    fontStyle: opts.fontStyle ?? 'normal',
    underline: opts.underline ?? false,
    lineHeight: opts.lineHeight ?? 1.4,
    charSpacing: opts.charSpacing ?? 0,
    // 한글 음절 단위 줄바꿈 (CLAUDE.md §2.4)
    splitByGrapheme: true,
  })

  return obj as unknown as FabricObject
}

// ─── 금칙어 처리 ──────────────────────────────────────────────────────────────

/**
 * 행 끝에 오면 안 되는 문자 — 한국어 출판 표준 금칙.
 *
 * 분류:
 * - 마침표류 (ASCII + 전각)
 * - 닫힘 괄호류 (ASCII + CJK 괄호)
 * - 닫힘 따옴표류
 * - 특수 구두점
 *
 * NOTE: 유니코드 따옴표 문자('’' 등)는 esbuild 이슈 방지를 위해
 * 유니코드 이스케이프 시퀀스로 표기한다.
 *
 * fabric Textbox 의 splitByGrapheme 와 병행 사용.
 * 실제 줄바꿈 강제는 applyKoreanLineBreak() 참조.
 */
export const LINE_END_FORBIDDEN = new Set([
  // ── 마침표류 (ASCII)
  '.',
  ',',
  '!',
  '?',
  ':',
  ';',
  '~',
  // ── 닫힘 괄호 ASCII
  ')',
  ']',
  '}',
  // ── 닫힘 괄호 CJK
  '〉', // 〉 RIGHT ANGLE BRACKET
  '》', // 》 RIGHT DOUBLE ANGLE BRACKET
  '」', // 」 RIGHT CORNER BRACKET
  '』', // 』 RIGHT WHITE CORNER BRACKET
  '】', // 】 RIGHT BLACK LENTICULAR BRACKET
  '〕', // 〕 RIGHT TORTOISE SHELL BRACKET
  '〗', // 〗 RIGHT WHITE LENTICULAR BRACKET
  '〙', // 〙 RIGHT WHITE TORTOISE SHELL BRACKET
  '〛', // 〛 RIGHT WHITE SQUARE BRACKET
  '）', // ） FULLWIDTH RIGHT PARENTHESIS
  '›', // › SINGLE RIGHT-POINTING ANGLE QUOTATION MARK
  '»', // » RIGHT-POINTING DOUBLE ANGLE QUOTATION MARK
  // ── 닫힘 따옴표 (유니코드 이스케이프)
  '”', // " RIGHT DOUBLE QUOTATION MARK
  '’', // ' RIGHT SINGLE QUOTATION MARK
  "'", // ASCII single quote (apostrophe)
  '"', // ASCII double quote
  // ── 마침표류 전각
  '。', // 。 CJK IDEOGRAPHIC FULL STOP
  '，', // ， FULLWIDTH COMMA
  '！', // ！ FULLWIDTH EXCLAMATION MARK
  '？', // ？ FULLWIDTH QUESTION MARK
  '：', // ： FULLWIDTH COLON
  '；', // ； FULLWIDTH SEMICOLON
  '～', // ～ FULLWIDTH TILDE
  // ── 특수 구두점
  '‼', // ‼ DOUBLE EXCLAMATION MARK
  '⁇', // ⁇ DOUBLE QUESTION MARK
  '⁈', // ⁈ QUESTION EXCLAMATION MARK
  '⁉', // ⁉ EXCLAMATION QUESTION MARK
  '〽', // 〽 PART ALTERNATION MARK
  '々', // 々 IDEOGRAPHIC ITERATION MARK
  '〆', // 〆 IDEOGRAPHIC CLOSING MARK
  'ヶ', // ヶ KATAKANA LETTER SMALL KE
  'ヵ', // ヵ KATAKANA LETTER SMALL KA
  // ── 말줄임표
  '…', // … HORIZONTAL ELLIPSIS
  '‥', // ‥ TWO DOT LEADER
  // ── 한국어 특수 기호
  '─', // ─ BOX DRAWINGS LIGHT HORIZONTAL (em dash 대용)
  '―', // ― HORIZONTAL BAR
  '·', // · MIDDLE DOT
  '•', // • BULLET
  '※', // ※ REFERENCE MARK
  '°', // ° DEGREE SIGN
])

/**
 * 행 시작에 오면 안 되는 문자 — 한국어 출판 표준 금칙.
 *
 * 분류:
 * - 열림 괄호류
 * - 열림 따옴표류
 *
 * NOTE: 유니코드 따옴표 문자('‘' 등)는 esbuild 이슈 방지를 위해
 * 유니코드 이스케이프 시퀀스로 표기한다.
 */
export const LINE_START_FORBIDDEN = new Set([
  // ── 열림 괄호 ASCII
  '(',
  '[',
  '{',
  // ── 열림 괄호 CJK
  '〈', // 〈 LEFT ANGLE BRACKET
  '《', // 《 LEFT DOUBLE ANGLE BRACKET
  '「', // 「 LEFT CORNER BRACKET
  '『', // 『 LEFT WHITE CORNER BRACKET
  '【', // 【 LEFT BLACK LENTICULAR BRACKET
  '〔', // 〔 LEFT TORTOISE SHELL BRACKET
  '〖', // 〖 LEFT WHITE LENTICULAR BRACKET
  '〘', // 〘 LEFT WHITE TORTOISE SHELL BRACKET
  '〚', // 〚 LEFT WHITE SQUARE BRACKET
  '（', // （ FULLWIDTH LEFT PARENTHESIS
  '‹', // ‹ SINGLE LEFT-POINTING ANGLE QUOTATION MARK
  '«', // « LEFT-POINTING DOUBLE ANGLE QUOTATION MARK
  // ── 열림 따옴표 (유니코드 이스케이프)
  '“', // " LEFT DOUBLE QUOTATION MARK
  '‘', // ' LEFT SINGLE QUOTATION MARK
])

/**
 * 텍스트에서 금칙어가 행 끝에 왔는지 감지.
 * (단순 검증용 — 실제 줄바꿈은 fabric 이 처리)
 */
export function hasForbiddenLineEnd(text: string): boolean {
  const lines = text.split('\n')
  return lines.some((line) => {
    const trimmed = line.trimEnd()
    if (trimmed.length === 0) return false
    return LINE_END_FORBIDDEN.has(trimmed[trimmed.length - 1] ?? '')
  })
}

/**
 * 텍스트에서 금칙어가 행 시작에 왔는지 감지.
 */
export function hasForbiddenLineStart(text: string): boolean {
  const lines = text.split('\n')
  return lines.some((line) => {
    const trimmed = line.trimStart()
    if (trimmed.length === 0) return false
    return LINE_START_FORBIDDEN.has(trimmed[0] ?? '')
  })
}

/**
 * 한글 금칙어 처리: 행 끝 금칙 문자를 다음 행으로 이동.
 *
 * fabric 의 자동 줄바꿈 이전에 텍스트를 사전 처리하거나,
 * 텍스트박스 내용 검증에 사용한다.
 *
 * 알고리즘:
 * 1. maxWidth 와 fontSize 를 기준으로 한 행의 최대 자수를 추정
 * 2. 금칙 문자가 행 끝에 오면 이전 음절로 줄바꿈을 삽입
 * 3. 행 시작 금칙 문자가 오면 이전 행 끝의 마지막 문자를 현재 행으로 이동
 *
 * NOTE: fabric Textbox 는 실제로 렌더 시 splitByGrapheme + measureText 로 줄바꿈을 결정함.
 * 이 함수는 사용자 입력 후 표시 경고 또는 사전 처리에 활용한다.
 *
 * @param text 원본 텍스트
 * @param maxWidth 텍스트박스 너비 (px)
 * @param fontSize 폰트 크기 (px)
 * @returns 금칙어 처리 후 텍스트
 */
export function applyKoreanLineBreak(text: string, maxWidth: number, fontSize: number): string {
  // 한 행의 최대 자수 추정 (평균 자폭 = fontSize * 0.6 으로 가정)
  const avgCharWidth = fontSize * 0.6
  const maxCharsPerLine = Math.max(1, Math.floor(maxWidth / avgCharWidth))

  const lines = text.split('\n')
  const result: string[] = []

  for (const line of lines) {
    // 자동 줄바꿈 위치를 추정하여 금칙 처리
    const processedLine = _processLineForKinsoku(line, maxCharsPerLine)
    result.push(processedLine)
  }

  return result.join('\n')
}

/**
 * 단일 행에 대해 금칙 처리를 수행한다.
 * @internal
 */
function _processLineForKinsoku(line: string, maxCharsPerLine: number): string {
  if (line.length <= maxCharsPerLine) {
    // 줄바꿈이 일어나지 않는다면 처리 불필요
    return line
  }

  const chars = [...line] // 유니코드 grapheme 분리 (Array spread)
  const resultChars: string[] = []
  let currentLineLen = 0

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i] ?? ''
    const nextCh = chars[i + 1] ?? ''

    if (currentLineLen >= maxCharsPerLine) {
      // 다음 문자가 행 시작 금칙이면 현재 문자를 다음 줄로
      if (LINE_START_FORBIDDEN.has(ch)) {
        // ch를 다음 줄 시작으로 이동 — 마지막 문자를 되돌림
        const last = resultChars.pop()
        resultChars.push('\n')
        if (last !== undefined) resultChars.push(last)
        resultChars.push(ch)
      } else if (LINE_END_FORBIDDEN.has(nextCh) && nextCh !== '') {
        // 다음 문자가 행 끝 금칙이면 현재 문자 후 다음 문자도 같은 행에
        resultChars.push(ch)
        resultChars.push(nextCh)
        resultChars.push('\n')
        i++ // nextCh 소비
      } else {
        resultChars.push('\n')
        resultChars.push(ch)
      }
      currentLineLen = resultChars[resultChars.length - 1] === '\n' ? 0 : 1
    } else {
      resultChars.push(ch)
      currentLineLen++
    }
  }

  return resultChars.join('')
}
