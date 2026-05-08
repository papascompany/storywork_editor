/**
 * GET /api/auth/totp-setup-init
 * 새 TOTP 시크릿을 생성하고 QR 코드 데이터 URL 을 반환한다.
 * 세션이 있어야 접근 가능 (TOTP_PATHS 는 인증 후 허용).
 *
 * 주의: 시크릿은 DB에 저장하지 않음 — /api/auth/totp-setup POST 에서 검증 후 저장.
 * 서버 전용 (service role key 사용).
 */
import { NextResponse } from 'next/server'
import QRCode from 'qrcode'

import { createAdminServerClient } from '../../../../src/lib/supabase/server'
import { generateTotpSecret, generateTotpUri } from '../../../../src/lib/totp/totp'

export async function GET() {
  const supabase = await createAdminServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const email = session.user.email ?? session.user.id
  const secret = generateTotpSecret()
  const uri = generateTotpUri(secret, email)

  const qrDataUrl = await QRCode.toDataURL(uri, {
    width: 200,
    margin: 1,
    errorCorrectionLevel: 'M',
  })

  return NextResponse.json({ qrDataUrl, secret })
}
