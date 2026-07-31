/**
 * rate-limit.test.ts — 인메모리 슬라이딩 윈도 rate limiter (CONTI-03 보안 후속)
 */

import { describe, it, expect, beforeEach } from 'vitest'

import { checkRateLimit, resetRateLimits } from '../../app/api/_lib/rate-limit'

describe('checkRateLimit', () => {
  beforeEach(() => {
    resetRateLimits()
  })

  it('한도 내 호출은 모두 허용', () => {
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit('k1', 5, 60_000, 1_000 + i).allowed).toBe(true)
    }
  })

  it('한도 초과 시 거부 + Retry-After 계산', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('k2', 3, 60_000, 1_000)
    }
    const denied = checkRateLimit('k2', 3, 60_000, 31_000)
    expect(denied.allowed).toBe(false)
    // 첫 호출(1,000) + 60,000 - 31,000 = 30,000ms → 30초
    expect(denied.retryAfterSec).toBe(30)
  })

  it('윈도가 지나면 다시 허용 (슬라이딩)', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('k3', 3, 60_000, 1_000)
    }
    expect(checkRateLimit('k3', 3, 60_000, 62_000).allowed).toBe(true)
  })

  it('키별 독립 카운트', () => {
    for (let i = 0; i < 3; i++) {
      checkRateLimit('user-a', 3, 60_000, 1_000)
    }
    expect(checkRateLimit('user-b', 3, 60_000, 1_000).allowed).toBe(true)
  })
})
