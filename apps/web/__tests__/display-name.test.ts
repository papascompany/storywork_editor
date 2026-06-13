/**
 * publicDisplayName — 공개 표시명 PII 마스킹 (BOARD-05 후속)
 */
import { describe, expect, it } from 'vitest'

import { publicDisplayName } from '@/lib/display-name'

describe('publicDisplayName', () => {
  it('name 이 있으면 그대로 사용 (trim)', () => {
    expect(publicDisplayName('홍길동', 'hong@example.com')).toBe('홍길동')
    expect(publicDisplayName('  김작가  ', 'a@b.com')).toBe('김작가')
  })

  it('name 이 없으면 이메일 로컬파트 앞 2글자만 노출 + 마스킹 (전체 이메일 비노출)', () => {
    const masked = publicDisplayName(null, 'alice@example.com')
    expect(masked).toBe('al***')
    expect(masked).not.toContain('@')
    expect(masked).not.toContain('example.com')
  })

  it('빈 문자열 name 도 미설정으로 취급', () => {
    expect(publicDisplayName('', 'bob@example.com')).toBe('bo***')
    expect(publicDisplayName('   ', 'carol@x.com')).toBe('ca***')
  })

  it('짧은 로컬파트(≤2)도 마스킹', () => {
    expect(publicDisplayName(null, 'ab@x.com')).toBe('ab***')
    expect(publicDisplayName(null, 'a@x.com')).toBe('a***')
  })

  it('name·email 모두 없으면 익명', () => {
    expect(publicDisplayName(null, null)).toBe('익명')
    expect(publicDisplayName(null, undefined)).toBe('익명')
    expect(publicDisplayName(undefined, '')).toBe('익명')
  })
})
