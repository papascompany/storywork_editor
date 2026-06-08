/**
 * apps/web/app/api/auth/logout/route.ts
 *
 * POST /api/auth/logout
 * Supabase 세션 로그아웃 후 홈(/)으로 리다이렉트.
 */
import { NextResponse } from 'next/server'

import { createWebServerClient } from '@/lib/supabase/server'

export async function POST() {
  const supabase = await createWebServerClient()
  await supabase.auth.signOut()

  // NEXT_PUBLIC_APP_URL 사용 (이전엔 미정의 NEXT_PUBLIC_WEB_URL 참조 →
  // prod 에서 항상 localhost 로 리다이렉트되던 버그. env.ts/.env.example 도 APP_URL 사용).
  return NextResponse.redirect(
    new URL('/', process.env['NEXT_PUBLIC_APP_URL'] ?? 'http://localhost:3000'),
  )
}
