/**
 * apps/web/middleware.ts
 *
 * Web 미들웨어 — 모든 요청에 대해:
 * 1. Supabase 세션 갱신 (쿠키 리프레시)
 * 2. 보호 라우트 (/mypage/*, /api/projects/*, /editor/*) 미인증 → /login?next=...
 * 3. 탈퇴(soft-deleted) 사용자 → /goodbye 리다이렉트 (LEGAL-OPS-03)
 * 4. 일반 공개 라우트는 세션 갱신만 하고 통과
 *
 * 참조: admin 패턴 (apps/admin/middleware.ts)
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { isDemoModeEnabled } from './lib/feature-flags'
import { createMiddlewareClient } from './lib/supabase/middleware'

// 인증이 필요한 보호 경로 prefix 목록
const PROTECTED_PREFIXES = ['/mypage', '/api/projects', '/editor']

// 데모 모드(admin 토글) 시 익명 허용 경로 — 편집기 시연용.
// /mypage 는 제외(로그인 본인 데이터 전제). DB 쓰기(/api/projects/save)는 route 에서 401 유지.
const DEMO_BYPASS_PREFIXES = ['/editor', '/api/projects']

function isDemoBypassPath(pathname: string): boolean {
  return DEMO_BYPASS_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

// 탈퇴된 사용자 접근 시 /goodbye 로 리다이렉트할 경로 (인증 필요 경로와 동일)
// /mypage/account 는 탈퇴 절차 페이지이므로 제외하지 않음 (이미 탈퇴 시 goodbye 행)
const DELETED_BLOCK_PREFIXES = ['/mypage', '/editor', '/api/projects']

function isProtectedPath(pathname: string): boolean {
  return PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function isDeletedBlockedPath(pathname: string): boolean {
  return DELETED_BLOCK_PREFIXES.some((prefix) => pathname.startsWith(prefix))
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

  // /goodbye 자체는 통과 (무한 루프 방지)
  if (pathname === '/goodbye') {
    return NextResponse.next({ request })
  }

  // 세션 쿠키 갱신 (모든 경로 공통)
  const { supabase, response } = createMiddlewareClient(request)

  // 보호 경로가 아니면 세션 갱신만 하고 통과
  if (!isProtectedPath(pathname)) {
    await supabase.auth.getUser()
    return response
  }

  // 보호 경로: 인증 확인
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    // 데모 모드(admin 토글): /editor·/api/projects 는 익명 허용해 로그인 없이 시연.
    // isDemoModeEnabled 는 fail-closed(조회 실패 시 false) → 평시 인증 그대로.
    if (isDemoBypassPath(pathname) && (await isDemoModeEnabled())) {
      return response
    }
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // 탈퇴(soft-deleted) 사용자 차단 (LEGAL-OPS-03)
  // 미들웨어는 Prisma 직접 사용 불가 → Supabase REST API 로 User.deletedAt 확인
  // 성능 고려: 탈퇴 차단 대상 경로에서만 확인
  if (isDeletedBlockedPath(pathname)) {
    try {
      const { data: userData } = await supabase
        .from('User')
        .select('deletedAt')
        .eq('email', user.email ?? '')
        .maybeSingle()

      if (userData && (userData as { deletedAt: string | null }).deletedAt) {
        const goodbyeUrl = request.nextUrl.clone()
        goodbyeUrl.pathname = '/goodbye'
        goodbyeUrl.search = ''
        return NextResponse.redirect(goodbyeUrl)
      }
    } catch (err) {
      // DB 오류 시 통과(fail-open) — 가용성 우선. 단 운영 진단을 위해 반드시 로깅한다
      // (audit: 빈 catch 가 장애를 은폐 + 탈퇴자 통과를 silent 로 허용했음).
      // backstop: 30일 후 hard-delete cron 이 데이터 자체를 영구 파기.
      // TODO(FOLLOWUP): 서버 컴포넌트/projects API 레이어에 deletedAt 재검증(defense-in-depth) 추가.
      console.error('[middleware] deletedAt 확인 실패 — 접근 허용(fail-open):', err)
    }
  }

  return response
}

export const config = {
  matcher: [
    // 정적 자산 제외한 모든 경로
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
