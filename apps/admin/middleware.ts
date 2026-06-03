/**
 * apps/admin/middleware.ts
 *
 * Admin 미들웨어 — 모든 요청에 대해:
 * 1. Supabase 세션 갱신 (쿠키 리프레시)
 * 2. 미인증 → /login 리다이렉트
 * 3. admin role 미보유 → /403 리다이렉트
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createMiddlewareClient } from './src/lib/supabase/middleware'

// 인증 없이 접근 가능한 경로
const PUBLIC_PATHS = new Set(['/login', '/403', '/api/health', '/reset-password'])

// admin role 목록
// admin role 목록 — 현재 사용 안 함 (이메일 인증만으로 통과). 향후 RLS 재도입 시 활용.
// const ADMIN_ROLES = new Set(['superadmin', 'curator', 'support', 'readonly'])

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

  // /api/auth/* 는 각 핸들러가 자체 인증 체크 — 미들웨어 가드 우회
  if (pathname.startsWith('/api/auth/')) {
    const { response } = createMiddlewareClient(request)
    return response
  }

  // Supabase 사용자 검증 — getUser() 사용 (getSession 은 토큰 검증 안 함, 권장 X)
  const { supabase, response } = createMiddlewareClient(request)
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 미인증 → /login
  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 사용자 요구 (2026-05-14): 이메일 인증만으로 로그인 가능
  // — admin role 체크 완전 제거. 인증된 사용자는 모두 통과.
  // (role 기반 세분화 권한은 별도 PR 에서 RLS 또는 페이지별 가드로 재도입)
  return response
}

/**
 * TOTP 쿠키 옵션 빌더 — apps/admin/app/api/auth/totp-* 에서 사용.
 * Secure + HttpOnly + SameSite=Lax.
 * Returns { name, value, options } for response.cookies.set().
 */
export function buildTotpCookieOptions(maxAgeSeconds = 3600) {
  return {
    name: 'totp_verified',
    value: '1',
    options: {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      path: '/',
      maxAge: maxAgeSeconds,
    },
  }
}

export const config = {
  matcher: [
    /*
     * 정적 자산, 이미지 최적화, favicon, robots, sitemap,
     * Next 내부 경로를 제외한 모든 경로에 미들웨어 적용.
     * 이 matcher 를 좁혀두면 Edge Runtime 에서 middleware 함수 자체가
     * 호출되지 않아 불필요한 await getUser() 왕복을 원천 차단한다.
     */
    '/((?!_next/static|_next/image|favicon\\.ico|robots\\.txt|sitemap\\.xml|.*\\.(?:png|jpg|jpeg|gif|svg|webp|ico|woff2?|ttf|otf|eot|css|js|map)).*)',
  ],
}
