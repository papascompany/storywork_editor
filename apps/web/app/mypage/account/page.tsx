/**
 * /mypage/account — 계정 설정 페이지
 *
 * - 데이터 다운로드 (PIPA 이동권)
 * - 마케팅 동의 토글
 * - 회원 탈퇴 (위험 영역)
 *
 * LEGAL-OPS-03
 */
import { redirect } from 'next/navigation'
import * as React from 'react'

import { AccountSettingsClient } from '@/components/mypage/AccountSettingsClient'
import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

export const dynamic = 'force-dynamic'

export default async function AccountPage() {
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login?next=/mypage/account')
  }

  let dbUser = null
  try {
    dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  } catch {
    // DB 오류 시 auth 정보만
  }

  // 마케팅 동의 상태 조회
  let marketingConsent = false
  if (dbUser) {
    try {
      const row = await prisma.user.findUnique({
        where: { id: dbUser.id },
        select: { marketingConsent: true },
      })
      marketingConsent = row?.marketingConsent ?? false
    } catch {
      // fallback
    }
  }

  const email = dbUser?.email ?? authUser.email ?? ''

  return <AccountSettingsClient email={email} marketingConsent={marketingConsent} />
}
