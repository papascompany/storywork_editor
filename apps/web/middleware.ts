/**
 * apps/web/middleware.ts
 *
 * Web 미들웨어 — 모든 요청에 대해:
 * 1. Supabase 세션 갱신 (쿠키 리프레시)
 * 2. 보호 라우트 (/mypage/*, /api/projects/*) 미인증 → /login?next=... 리다이렉트
 * 3. 일반 공개 라우트는 세션 갱신만 하고 통과
 *
 * 참조: admin 패턴 (apps/admin/middleware.ts)
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { createMiddlewareClient } from './lib/supabase/middleware'

// 인증이 필요한 보호 경로 prefix 목록
const PROTECTED_PREFIXES = ['/mypage', '/api/projects']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl

  // 정적 자산 / Next 내부 경로는 즉시 통과
  if (
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') // .png, .ico, .svg 등 파일 확장자
  ) {
    return NextResponse.next({ request })
  }

  // 세션 쿠키 갱신 (모든 경로 공통)
  const { supabase, response } = createMiddlewareClient(request)

  // 보호 경로가 아니면 세션 갱신만 하고 통과
  if (!isProtectedPath(pathname)) {
    // 세션 갱신을 위해 getUser 호출 (쿠키 리프레시 부작용)
    await supabase.auth.getUser()
    return response
  }

  // 보호 경로: 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return response
}

export const config = {
  matcher: [
    // 정적 자산 제외한 모든 경로
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
