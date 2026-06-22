/**
 * POST /api/auth/logout
 * Supabase 세션 로그아웃. (2FA(TOTP) 는 2026-05 제거됨 — 잔존 쿠키 처리 코드 정리)
 */
import { NextResponse } from 'next/server'

import { createAdminServerClient } from '../../../../src/lib/supabase/server'

export async function POST() {
  const supabase = await createAdminServerClient()
  await supabase.auth.signOut()

  return NextResponse.redirect(
    new URL('/login', process.env['NEXT_PUBLIC_ADMIN_URL'] ?? 'http://localhost:3001'),
  )
}
