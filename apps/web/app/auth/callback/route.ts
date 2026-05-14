/**
 * apps/web/app/auth/callback/route.ts
 *
 * OAuth / 이메일 인증 콜백 핸들러.
 * Supabase 가 code 쿼리 파라미터로 리다이렉트 → 세션 교환 → next 또는 / 로 이동.
 */
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { createWebServerClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  // 안전한 next 만 허용 (외부 URL 차단)
  const requestedNext = searchParams.get('next') ?? '/'
  const next =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'

  if (code) {
    const supabase = await createWebServerClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error) {
      // 인증 성공 → 목표 페이지로 리다이렉트
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // 코드 없음 또는 교환 실패 → 로그인 페이지로
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
