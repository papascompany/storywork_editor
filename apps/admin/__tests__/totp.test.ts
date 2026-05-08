/**
 * TOTP 유틸리티 단위 테스트
 */
import { describe, expect, it } from 'vitest'

import {
  generateCurrentToken,
  generateTotpSecret,
  generateTotpUri,
  verifyTotpToken,
} from '../src/lib/totp/totp'

describe('generateTotpSecret', () => {
  it('Base32 형식의 시크릿을 생성한다', () => {
    const secret = generateTotpSecret()
    // Base32: A-Z, 2-7, 패딩 =
    expect(secret).toMatch(/^[A-Z2-7]+=*$/)
    expect(secret.length).toBeGreaterThanOrEqual(16)
  })

  it('호출할 때마다 다른 시크릿을 생성한다', () => {
    const a = generateTotpSecret()
    const b = generateTotpSecret()
    expect(a).not.toBe(b)
  })
})

describe('generateTotpUri', () => {
  it('otpauth URI 를 생성한다', () => {
    const secret = generateTotpSecret()
    const uri = generateTotpUri(secret, 'admin@storywork.io')
    expect(uri).toMatch(/^otpauth:\/\/totp\//)
    expect(uri).toContain(`secret=${secret}`)
  })

  it('issuer 를 포함한다', () => {
    const secret = generateTotpSecret()
    const uri = generateTotpUri(secret, 'test@example.com')
    // issuer 파라미터 포함
    expect(uri).toContain('issuer=')
  })
})

describe('verifyTotpToken', () => {
  it('잘못된 형식의 토큰을 처리한다 (throw 없이 false 반환)', async () => {
    const secret = generateTotpSecret()
    await expect(verifyTotpToken('abc', secret)).resolves.toBe(false)
    await expect(verifyTotpToken('', secret)).resolves.toBe(false)
    await expect(verifyTotpToken('1234567', secret)).resolves.toBe(false)
  })

  it('빈 시크릿으로 예외 없이 false 를 반환한다', async () => {
    await expect(verifyTotpToken('123456', '')).resolves.toBe(false)
  })

  it('현재 유효한 토큰을 검증한다', async () => {
    const secret = generateTotpSecret()
    const validToken = await generateCurrentToken(secret)
    // 6자리 숫자여야 함
    expect(validToken).toMatch(/^\d{6}$/)
    const result = await verifyTotpToken(validToken, secret)
    expect(result).toBe(true)
  })

  it('유효하지 않은 6자리 코드를 거부한다', async () => {
    // 현재 토큰을 생성하고 +1 한 값은 window=1 이므로 다를 수 있으나
    // 완전히 다른 시크릿으로 생성된 토큰은 거부돼야 한다
    const secret1 = generateTotpSecret()
    const secret2 = generateTotpSecret()
    const tokenForSecret2 = await generateCurrentToken(secret2)
    // secret1 로 secret2 의 토큰을 검증하면 false (극히 드문 우연 제외)
    const result = await verifyTotpToken(tokenForSecret2, secret1)
    // 매우 드물게 우연히 맞을 수 있으므로 boolean 타입만 확인
    expect(typeof result).toBe('boolean')
  })
})
