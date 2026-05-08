/**
 * POST /api/auth/logout
 * Supabase 세션 로그아웃 + TOTP 쿠키 삭제.
 */
import { NextResponse } from 'next/server'

import { createAdminServerClient } from '../../../../src/lib/supabase/server'

export async function POST() {
  const supabase = await createAdminServerClient()
  await supabase.auth.signOut()

  const response = NextResponse.redirect(
    new URL('/login', process.env['NEXT_PUBLIC_ADMIN_URL'] ?? 'http://localhost:3001'),
  )

  // TOTP 쿠키 삭제
  response.cookies.set('totp_verified', '', {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    maxAge: 0,
    path: '/',
  })

  return response
}
