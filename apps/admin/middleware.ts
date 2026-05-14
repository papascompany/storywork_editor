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
const ADMIN_ROLES = new Set(['superadmin', 'curator', 'support', 'readonly'])

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

  // admin role 확인 — Supabase app_metadata 에서 role 조회
  const userRole: string = (session.user.app_metadata?.['role'] as string | undefined) ?? ''

  const isAdminRole = ADMIN_ROLES.has(userRole)

  // admin role 미보유 → /403
  if (!isAdminRole) {
    const forbiddenUrl = request.nextUrl.clone()
    forbiddenUrl.pathname = '/403'
    return NextResponse.redirect(forbiddenUrl)
  }

  return response
}

export const config = {
  matcher: [
    // 정적 자산 제외한 모든 경로
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
