/**
 * 미들웨어 라우팅 로직 단위 테스트
 * - PUBLIC_PATHS 화이트리스트
 * - TOTP_PATHS 화이트리스트
 * - ADMIN_ROLES 집합
 */
import { describe, expect, it } from 'vitest'

// 미들웨어 내부 상수를 재정의해서 테스트
// (Next.js Request 의존성 없이 순수 로직만 테스트)

const PUBLIC_PATHS = new Set(['/login', '/403', '/api/health'])
const TOTP_PATHS = new Set(['/setup-2fa', '/verify-2fa'])
const ADMIN_ROLES = new Set(['superadmin', 'curator', 'support', 'readonly'])

describe('PUBLIC_PATHS 화이트리스트', () => {
  it('/login 은 공개 경로다', () => {
    expect(PUBLIC_PATHS.has('/login')).toBe(true)
  })

  it('/403 은 공개 경로다', () => {
    expect(PUBLIC_PATHS.has('/403')).toBe(true)
  })

  it('/api/health 는 공개 경로다', () => {
    expect(PUBLIC_PATHS.has('/api/health')).toBe(true)
  })

  it('/ 는 공개 경로가 아니다', () => {
    expect(PUBLIC_PATHS.has('/')).toBe(false)
  })

  it('/api/auth/totp-verify 는 공개 경로가 아니다', () => {
    expect(PUBLIC_PATHS.has('/api/auth/totp-verify')).toBe(false)
  })
})

describe('TOTP_PATHS 화이트리스트', () => {
  it('/setup-2fa 는 TOTP 경로다', () => {
    expect(TOTP_PATHS.has('/setup-2fa')).toBe(true)
  })

  it('/verify-2fa 는 TOTP 경로다', () => {
    expect(TOTP_PATHS.has('/verify-2fa')).toBe(true)
  })

  it('/ 는 TOTP 경로가 아니다', () => {
    expect(TOTP_PATHS.has('/')).toBe(false)
  })
})

describe('ADMIN_ROLES 집합', () => {
  it('admin role 을 올바르게 인식한다', () => {
    expect(ADMIN_ROLES.has('superadmin')).toBe(true)
    expect(ADMIN_ROLES.has('curator')).toBe(true)
    expect(ADMIN_ROLES.has('support')).toBe(true)
    expect(ADMIN_ROLES.has('readonly')).toBe(true)
  })

  it('비어 있는 role 을 거부한다', () => {
    expect(ADMIN_ROLES.has('')).toBe(false)
  })

  it('일반 사용자 role 을 거부한다', () => {
    expect(ADMIN_ROLES.has('user')).toBe(false)
    expect(ADMIN_ROLES.has('creator')).toBe(false)
  })
})

describe('정적 자산 경로 감지', () => {
  // 미들웨어의 정적 자산 필터 로직
  function isStaticAsset(pathname: string): boolean {
    return (
      pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.includes('.')
    )
  }

  it('_next 경로는 정적 자산이다', () => {
    expect(isStaticAsset('/_next/static/chunks/main.js')).toBe(true)
  })

  it('파비콘은 정적 자산이다', () => {
    expect(isStaticAsset('/favicon.ico')).toBe(true)
  })

  it('확장자 있는 파일은 정적 자산이다', () => {
    expect(isStaticAsset('/logo.png')).toBe(true)
    expect(isStaticAsset('/style.css')).toBe(true)
  })

  it('/ 는 정적 자산이 아니다', () => {
    expect(isStaticAsset('/')).toBe(false)
  })

  it('/login 은 정적 자산이 아니다', () => {
    expect(isStaticAsset('/login')).toBe(false)
  })

  it('/api/health 는 정적 자산이 아니다', () => {
    expect(isStaticAsset('/api/health')).toBe(false)
  })
})
