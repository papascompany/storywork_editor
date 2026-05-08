/**
 * apps/admin/middleware.ts
 *
 * Admin 미들웨어 — 모든 요청에 대해:
 * 1. Supabase 세션 갱신 (쿠키 리프레시)
 * 2. 미인증 → /login 리다이렉트
 * 3. admin role 미보유 → /403 리다이렉트
 * 4. TOTP 미설정 → /setup-2fa 리다이렉트
 * 5. TOTP 미검증 → /verify-2fa 리다이렉트
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createMiddlewareClient } from './src/lib/supabase/middleware'

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = new Set(['/login', '/403', '/api/health'])

// TOTP 관련 경로 (인증 후 접근 가능하지만 TOTP 검증 전에 허용)
const TOTP_PATHS = new Set(['/setup-2fa', '/verify-2fa'])

// admin role 목록
const ADMIN_ROLES = new Set(['superadmin', 'curator', 'support', 'readonly'])

// TOTP 쿠키 이름
const TOTP_COOKIE = 'totp_verified'

// TOTP 세션 만료: 12시간 (초)
const TOTP_TTL_SECONDS = 12 * 60 * 60

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // 정적 자산 / Next 내부 경로는 통과
  if (pathname.startsWith('/_next/') || pathname.startsWith('/favicon') || pathname.includes('.')) {
    return NextResponse.next({ request })
  }

  // 공개 경로는 세션 갱신만 하고 통과
  if (PUBLIC_PATHS.has(pathname)) {
    const { response } = createMiddlewareClient(request)
    return response
  }

  // Supabase 세션 검증
  const { supabase, response } = createMiddlewareClient(request)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  // 미인증 → /login
  if (!session) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // admin role 확인 — Supabase user_metadata 또는 app_metadata 에서 role 조회
  // Supabase Auth 의 app_metadata 에 role 을 저장하거나, DB User 테이블을 조회.
  // 미들웨어에서는 app_metadata 를 우선 확인하고, 없으면 DB 조회.
  const userRole: string = (session.user.app_metadata?.['role'] as string | undefined) ?? ''

  const isAdminRole = ADMIN_ROLES.has(userRole)

  // TOTP 경로는 admin role 체크 없이 허용 (단, 로그인은 필요)
  if (TOTP_PATHS.has(pathname)) {
    return response
  }

  // admin role 미보유 → /403
  if (!isAdminRole) {
    const forbiddenUrl = request.nextUrl.clone()
    forbiddenUrl.pathname = '/403'
    return NextResponse.redirect(forbiddenUrl)
  }

  // TOTP 검증 쿠키 확인
  const totpCookie = request.cookies.get(TOTP_COOKIE)
  const isTotpVerified = totpCookie?.value === 'true'

  if (!isTotpVerified) {
    // TOTP 설정 여부를 app_metadata 에서 확인
    const totpSetup = Boolean(session.user.app_metadata?.['totp_setup'])

    const redirectPath = totpSetup ? '/verify-2fa' : '/setup-2fa'
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = redirectPath
    redirectUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

export const config = {
  matcher: [
    // 정적 자산 제외한 모든 경로
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}

// ─────────────────────────────────────────────
// TOTP 쿠키 설정 헬퍼 (Route Handler 에서 사용)
// ─────────────────────────────────────────────

export function buildTotpCookieOptions() {
  return {
    name: TOTP_COOKIE,
    value: 'true',
    options: {
      httpOnly: true,
      secure: process.env['NODE_ENV'] === 'production',
      sameSite: 'strict' as const,
      maxAge: TOTP_TTL_SECONDS,
      path: '/',
    },
  }
}
