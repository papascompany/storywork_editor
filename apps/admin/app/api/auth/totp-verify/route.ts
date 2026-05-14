/**
 * POST /api/auth/totp-verify
 * 로그인 후 TOTP 코드 검증:
 * 1. DB에서 totpSecret 조회
 * 2. 코드 검증 (5회 실패 시 세션 무효화)
 * 3. 성공 시 totp_verified 쿠키 설정
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

// 인메모리 실패 카운터 (프로덕션에서는 Redis 등으로 교체 권장)
// key: userId, value: { count, lastAt }
const failMap = new Map<string, { count: number; lastAt: number }>()
const MAX_ATTEMPTS = 5
const LOCKOUT_MS = 15 * 60 * 1000 // 15분 잠금

function getFailCount(userId: string): number {
  const entry = failMap.get(userId)
  if (!entry) return 0
  // 잠금 시간 지났으면 초기화
  if (Date.now() - entry.lastAt > LOCKOUT_MS) {
    failMap.delete(userId)
    return 0
  }
  return entry.count
}

function incrementFail(userId: string): number {
  const current = getFailCount(userId)
  const next = current + 1
  failMap.set(userId, { count: next, lastAt: Date.now() })
  return next
}

function resetFail(userId: string) {
  failMap.delete(userId)
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createAdminServerClient()
    const {
      data: { session },
    } = await supabase.auth.getSession()

    if (!session) {
      return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const userId = session.user.id

    // 실패 횟수 확인
    const failCount = getFailCount(userId)
    if (failCount >= MAX_ATTEMPTS) {
      // 세션 무효화
      await supabase.auth.signOut()
      failMap.delete(userId)
      return NextResponse.json(
        { error: '인증 시도 횟수를 초과했습니다. 다시 로그인하세요.' },
        { status: 429 },
      )
    }

    const body = (await request.json()) as { token?: unknown }
    const token = typeof body.token === 'string' ? body.token.replace(/\s/g, '') : ''

    if (!token || !/^\d{6}$/.test(token)) {
      return NextResponse.json({ error: '6자리 숫자를 입력하세요.' }, { status: 400 })
    }

    // DB에서 totpSecret 조회 — Prisma User.id 는 cuid() 자동 생성이라 auth.users.id 와 다름.
    // email 로 매칭 (User.email 은 unique).
    const userEmail = session.user.email
    if (!userEmail) {
      return NextResponse.json({ error: '세션에 이메일 정보가 없습니다.' }, { status: 400 })
    }
    const service = createAdminServiceClient()
    const { data: userData, error: dbError } = await service
      .from('User')
      .select('totpSecret, totpVerified')
      .eq('email', userEmail)
      .single()

    if (dbError || !userData) {
      return NextResponse.json({ error: '사용자 정보를 찾을 수 없습니다.' }, { status: 404 })
    }

    if (!userData.totpSecret) {
      return NextResponse.json(
        { error: 'TOTP가 설정되지 않았습니다. /setup-2fa 에서 설정하세요.' },
        { status: 400 },
      )
    }

    // TOTP 검증
    const isValid = await verifyTotpToken(token, userData.totpSecret as string)

    if (!isValid) {
      const newCount = incrementFail(userId)
      const remaining = MAX_ATTEMPTS - newCount

      if (remaining <= 0) {
        await supabase.auth.signOut()
        failMap.delete(userId)
        return NextResponse.json(
          { error: '인증 시도 횟수를 초과했습니다. 다시 로그인하세요.' },
          { status: 429 },
        )
      }

      return NextResponse.json(
        { error: `코드가 올바르지 않습니다. 남은 시도: ${remaining}회` },
        { status: 400 },
      )
    }

    // 성공 → 실패 카운터 초기화 + 쿠키 설정
    resetFail(userId)

    const response = NextResponse.json({ ok: true })
    const { name, value, options } = buildTotpCookieOptions()
    response.cookies.set(name, value, options)

    return response
  } catch (err) {
    console.error('[totp-verify] 예외:', err)
    return NextResponse.json({ error: '서버 오류가 발생했습니다.' }, { status: 500 })
  }
}
