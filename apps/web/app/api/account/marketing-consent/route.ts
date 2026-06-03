/**
 * PATCH /api/account/marketing-consent
 *
 * 마케팅 수신 동의 변경 — 서비스 이용약관과 별도 관리.
 * LEGAL-OPS-07 (마케팅 동의 별도 관리) 부분 구현.
 *
 * 인증 필수 + 본인만.
 */
import { MarketingConsentUpdateSchema } from '@storywork/schema'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser?.email) {
    return NextResponse.json({ error: '인증이 필요합니다.' }, { status: 401 })
  }

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: '요청 형식이 올바르지 않습니다.' }, { status: 400 })
  }

  const parsed = MarketingConsentUpdateSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: '입력값이 올바르지 않습니다.' }, { status: 400 })
  }

  const { consent } = parsed.data
  const now = new Date()

  const updated = await prisma.user.update({
    where: { email: authUser.email },
    data: {
      marketingConsent: consent,
      marketingConsentAt: now,
    },
    select: { marketingConsent: true, marketingConsentAt: true },
  })

  return NextResponse.json({
    ok: true,
    marketingConsent: updated.marketingConsent,
    marketingConsentAt: updated.marketingConsentAt?.toISOString(),
  })
}
