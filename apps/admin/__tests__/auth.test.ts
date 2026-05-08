/**
 * 인증 헬퍼 단위 테스트
 * - hasRole 역할 계층 확인
 * - ADMIN_ROLES 목록 확인
 */
import { describe, expect, it } from 'vitest'

import { ADMIN_ROLES, hasRole } from '../src/lib/auth'

describe('ADMIN_ROLES', () => {
  it('4개 admin role 을 포함한다', () => {
    expect(ADMIN_ROLES).toContain('superadmin')
    expect(ADMIN_ROLES).toContain('curator')
    expect(ADMIN_ROLES).toContain('support')
    expect(ADMIN_ROLES).toContain('readonly')
  })

  it('일반 사용자 role 은 포함하지 않는다', () => {
    expect(ADMIN_ROLES).not.toContain('user')
    expect(ADMIN_ROLES).not.toContain('creator')
  })
})

describe('hasRole', () => {
  it('superadmin 은 모든 역할 요구사항을 통과한다', () => {
    expect(hasRole('superadmin', 'superadmin')).toBe(true)
    expect(hasRole('superadmin', 'curator')).toBe(true)
    expect(hasRole('superadmin', 'support')).toBe(true)
    expect(hasRole('superadmin', 'readonly')).toBe(true)
  })

  it('curator 는 curator 이하만 통과한다', () => {
    expect(hasRole('curator', 'superadmin')).toBe(false)
    expect(hasRole('curator', 'curator')).toBe(true)
    expect(hasRole('curator', 'support')).toBe(true)
    expect(hasRole('curator', 'readonly')).toBe(true)
  })

  it('support 는 support 이하만 통과한다', () => {
    expect(hasRole('support', 'superadmin')).toBe(false)
    expect(hasRole('support', 'curator')).toBe(false)
    expect(hasRole('support', 'support')).toBe(true)
    expect(hasRole('support', 'readonly')).toBe(true)
  })

  it('readonly 는 readonly 만 통과한다', () => {
    expect(hasRole('readonly', 'superadmin')).toBe(false)
    expect(hasRole('readonly', 'curator')).toBe(false)
    expect(hasRole('readonly', 'support')).toBe(false)
    expect(hasRole('readonly', 'readonly')).toBe(true)
  })
})
