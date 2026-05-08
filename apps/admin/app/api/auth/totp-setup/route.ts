/**
 * POST /api/auth/totp-setup
 * TOTP 설정 완료 처리:
 * 1. 사용자가 QR 코드를 스캔하고 6자리 코드 입력
 * 2. 서버에서 시크릿으로 검증
 * 3. DB에 totpVerified=true 저장 + app_metadata 업데이트
 * 4. totp_verified 쿠키 설정
 *
 * 서버 전용 — service role key 사용.
 */
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { buildTotpCookieOptions } from '../../../../middleware'
import {
  createAdminServerClient,
  createAdminServiceClient,
} from '../../../../src/lib/supabase/server'
import { verifyTotpToken } from '../../../../src/lib/totp/totp'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = (await request.json()) as { token?: unknown; secret?: unknown }
    const token = typeof body.token === 'string' ? body.token.replace(/\s/g, '') : ''
    const secret = typeof body.secret === 'string' ? body.secret : ''

    if (!token || !/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: '6자리 숫자를 입력하세요.' }, { status: 400 })
    }

    if (!secret) {
      return NextResponse.json({ error: '시크릿이 없습니다.' }, { status: 400 })
    }

    // TOTP 검증
    const isValid = await verifyTotpToken(token, secret)
    if (!isValid) {
      return NextResponse.json(
        { error: '코드가 올바르지 않습니다. 다시 시도하세요.' },
        { status: 400 },
      )
    }

    // DB 업데이트: totpSecret, totpVerified 저장
    const service = createAdminServiceClient()
    const { error: dbError } = await service
      .from('User')
      .update({ totpSecret: secret, totpVerified: true })
      .eq('id', session.user.id)

    if (dbError) {
      console.error('[totp-setup] DB 업데이트 실패:', dbError)
      return NextResponse.json({ error: '설정 저장에 실패했습니다.' }, { status: 500 })
    }

    // app_metadata 업데이트 (미들웨어에서 빠른 조회를 위해)
    await service.auth.admin.updateUserById(session.user.id, {
      app_metadata: { ...session.user.app_metadata, totp_setup: true },
    })

    // 응답에 TOTP 쿠키 설정
    const response = NextResponse.json({ ok: true })
    const { name, value, options } = buildTotpCookieOptions()
    response.cookies.set(name, value, options)

    return response
  } catch (err) {
    console.error('[totp-setup] 예외:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
