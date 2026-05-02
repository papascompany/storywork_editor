import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

/**
 * Admin 미들웨어 placeholder
 *
 * M3 구현 시 다음을 추가:
 * - Supabase Auth 세션 검증
 * - admin role 확인
 * - 2FA 강제 (TOTP)
 * - 별도 도메인 CORS 설정
 */
export function middleware(_req: NextRequest): NextResponse {
  // TODO(M3): 인증/2FA 게이트 구현
  return NextResponse.next()
}

export const config = {
  matcher: [
    // admin 대시보드 경로만 적용 (정적 자산 제외)
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}
