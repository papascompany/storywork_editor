import { describe, expect, it } from 'vitest'

import { hasForbiddenLineEnd, LINE_END_FORBIDDEN, SUPPORTED_FONTS } from '../src/text-object.js'

describe('SUPPORTED_FONTS', () => {
  it('3종 폰트를 포함한다', () => {
    expect(SUPPORTED_FONTS).toContain('Pretendard')
    expect(SUPPORTED_FONTS).toContain('Noto Sans KR')
    expect(SUPPORTED_FONTS).toContain('system-ui')
  })
})

describe('LINE_END_FORBIDDEN', () => {
  it('금칙 문자가 포함되어 있다', () => {
    expect(LINE_END_FORBIDDEN.has(',')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('.')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('?')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('!')).toBe(true)
    expect(LINE_END_FORBIDDEN.has('」')).toBe(true)
  })
})

describe('hasForbiddenLineEnd', () => {
  it('쉼표로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('안녕하세요,')).toBe(true)
  })

  it('마침표로 끝나는 행을 감지한다', () => {
    expect(hasForbiddenLineEnd('Hello.')).toBe(true)
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
