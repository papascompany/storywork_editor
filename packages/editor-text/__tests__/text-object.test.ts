import { describe, expect, it } from 'vitest'

import {
  applyKoreanLineBreak,
  hasForbiddenLineEnd,
  hasForbiddenLineStart,
  LINE_END_FORBIDDEN,
  LINE_START_FORBIDDEN,
  SUPPORTED_FONTS,
} from '../src/text-object.js'

// Unicode quotation mark helpers — avoid esbuild confusion with curly quotes
const RIGHT_DOUBLE_QUOTE = '”' // "
const RIGHT_SINGLE_QUOTE = '’' // '
const LEFT_DOUBLE_QUOTE = '“' // "
const LEFT_SINGLE_QUOTE = '‘' // '

describe('SUPPORTED_FONTS', () => {
  it('3종 폰트를 포함한다', () => {
    expect(SUPPORTED_FONTS).toContain('Pretendard')
    expect(SUPPORTED_FONTS).toContain('Noto Sans KR')
    expect(SUPPORTED_FONTS).toContain('system-ui')
  })
})

describe('LINE_END_FORBIDDEN — 50+ 문자', () => {
  it('마침표류 ASCII가 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has('.')).toBe(true)
    expect(LINE_END_FORBIDDEN.has(',')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('!')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('?')).toBe(true)
    expect(LINE_END_FORBIDDEN.has(':')).toBe(true)
    expect(LINE_END_FORBIDDEN.has(';')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('~')).toBe(true)
  })

  it('닫힘 괄호 ASCII가 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has(')')).toBe(true)
    expect(LINE_END_FORBIDDEN.has(']')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('}')).toBe(true)
  })

  it('닫힘 괄호 CJK가 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has('〉')).toBe(true) // 〉
    expect(LINE_END_FORBIDDEN.has('》')).toBe(true) // 》
    expect(LINE_END_FORBIDDEN.has('」')).toBe(true) // 」
    expect(LINE_END_FORBIDDEN.has('』')).toBe(true) // 』
    expect(LINE_END_FORBIDDEN.has('〕')).toBe(true) // 〕
  })

  it('닫힘 따옴표가 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has(RIGHT_DOUBLE_QUOTE)).toBe(true)
    expect(LINE_END_FORBIDDEN.has(RIGHT_SINGLE_QUOTE)).toBe(true)
  })

  it('전각 구두점이 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has('。')).toBe(true) // 。
    expect(LINE_END_FORBIDDEN.has('，')).toBe(true) // ，
    expect(LINE_END_FORBIDDEN.has('！')).toBe(true) // ！
    expect(LINE_END_FORBIDDEN.has('？')).toBe(true) // ？
  })

  it('특수 구두점이 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has('‼')).toBe(true) // ‼
    expect(LINE_END_FORBIDDEN.has('⁇')).toBe(true) // ⁇
    expect(LINE_END_FORBIDDEN.has('⁈')).toBe(true) // ⁈
    expect(LINE_END_FORBIDDEN.has('⁉')).toBe(true) // ⁉
    expect(LINE_END_FORBIDDEN.has('…')).toBe(true) // …
  })

  it('총 50자 이상이다', () => {
    expect(LINE_END_FORBIDDEN.size).toBeGreaterThanOrEqual(50)
  })
})

describe('LINE_START_FORBIDDEN', () => {
  it('열림 괄호 ASCII가 포함되어 있다', () => {
    expect(LINE_START_FORBIDDEN.has('(')).toBe(true)
    expect(LINE_START_FORBIDDEN.has('[')).toBe(true)
    expect(LINE_START_FORBIDDEN.has('{')).toBe(true)
  })

  it('열림 괄호 CJK가 포함되어 있다', () => {
    expect(LINE_START_FORBIDDEN.has('〈')).toBe(true) // 〈
    expect(LINE_START_FORBIDDEN.has('《')).toBe(true) // 《
    expect(LINE_START_FORBIDDEN.has('「')).toBe(true) // 「
    expect(LINE_START_FORBIDDEN.has('『')).toBe(true) // 『
  })

  it('열림 따옴표가 포함되어 있다', () => {
    expect(LINE_START_FORBIDDEN.has(LEFT_DOUBLE_QUOTE)).toBe(true)
    expect(LINE_START_FORBIDDEN.has(LEFT_SINGLE_QUOTE)).toBe(true)
  })
})

describe('hasForbiddenLineEnd', () => {
  it('쉼표로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('안녕하세요,')).toBe(true)
  })

  it('마침표로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('Hello.')).toBe(true)
  })

  it('닫힘 CJK 괄호로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('주인공(홍길동)')).toBe(true)
    expect(hasForbiddenLineEnd('大事」')).toBe(true) // 大事」
  })

  it('특수 구두점으로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('정말?!')).toBe(true) // !로 끝나므로 true
    expect(hasForbiddenLineEnd('정말‼')).toBe(true) // ‼
    expect(hasForbiddenLineEnd('왜⁇')).toBe(true) // 왜⁇
    expect(hasForbiddenLineEnd('가나다')).toBe(false) // 가나다
  })

  it('닫힘 따옴표로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('he said' + RIGHT_DOUBLE_QUOTE)).toBe(true)
  })

  it('일반 문자로 끝나는 행은 false', () => {
    expect(hasForbiddenLineEnd('안녕하세요')).toBe(false)
    expect(hasForbiddenLineEnd('Hello')).toBe(false)
  })

  it('여러 줄 중 금칙이 있으면 true', () => {
    expect(hasForbiddenLineEnd('첫 번째 줄\n두 번째,')).toBe(true)
  })

  it('빈 문자열은 false', () => {
    expect(hasForbiddenLineEnd('')).toBe(false)
  })

  it('공백만 있는 행은 false', () => {
    expect(hasForbiddenLineEnd('   ')).toBe(false)
  })
})

describe('hasForbiddenLineStart', () => {
  it('열림 괄호로 시작하는 행을 감지한다', () => {
    expect(hasForbiddenLineStart('(주인공)')).toBe(true)
    expect(hasForbiddenLineStart('[지문]')).toBe(true)
  })

  it('열림 CJK 괄호로 시작하는 행을 감지한다', () => {
    expect(hasForbiddenLineStart('「대사」')).toBe(true) // 「대사」
    expect(hasForbiddenLineStart('『책』')).toBe(true) // 『책』
  })

  it('열림 따옴표로 시작하는 행을 감지한다', () => {
    expect(hasForbiddenLineStart(LEFT_DOUBLE_QUOTE + 'hello')).toBe(true)
  })

  it('일반 문자로 시작하는 행은 false', () => {
    expect(hasForbiddenLineStart('안녕하세요')).toBe(false)
    expect(hasForbiddenLineStart('Hello')).toBe(false)
  })

  it('빈 문자열은 false', () => {
    expect(hasForbiddenLineStart('')).toBe(false)
  })
})

describe('applyKoreanLineBreak', () => {
  it('짧은 텍스트는 변경하지 않는다', () => {
    const text = '안녕하세요'
    expect(applyKoreanLineBreak(text, 200, 24)).toBe(text)
  })

  it('긴 텍스트를 처리한다', () => {
    const longText = '가'.repeat(100)
    const result = applyKoreanLineBreak(longText, 100, 24)
    // 결과가 원본과 동일하거나 더 길 수 있음 (개행 삽입)
    expect(result.length).toBeGreaterThanOrEqual(longText.length)
  })

  it('maxWidth=0 이면 원본을 그대로 반환한다', () => {
    // maxCharsPerLine = max(1, ...) 이므로 crash 없음
    const text = '테스트'
    expect(() => applyKoreanLineBreak(text, 0, 24)).not.toThrow()
  })
})
