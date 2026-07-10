/**
 * apps/web/app/api/_lib/require-active-user.ts
 *
 * 탈퇴(soft-deleted) 사용자 심층방어 가드 (FOLLOWUP-69).
 *
 * 미들웨어(apps/web/middleware.ts)의 deletedAt 차단은 REST 조회 실패 시 fail-open 이므로
 * 서버 레이어(Route Handler)에서도 재검증한다. dbUser.deletedAt 이 설정돼 있으면 403.
 *
 * 사용 패턴:
 *   const dbUser = await findUserByEmail(email)
 *   if (!dbUser) return jsonError('...', 404)
 *   const deleted = guardDeletedUser(dbUser)
 *   if (deleted) return deleted
 */

import { NextResponse } from 'next/server'

/**
 * 탈퇴 처리된 사용자면 403 응답을 반환한다. 활성 사용자면 null(통과).
 *
 * findUserByEmail / prisma.user.findUnique 가 반환하는 User(전체 컬럼)를 그대로 받는다.
 * 응답 형태는 projects API 의 { error } 규약을 따른다.
 */
export function guardDeletedUser(dbUser: { deletedAt: Date | null }): NextResponse | null {
  if (dbUser.deletedAt) {
    return NextResponse.json({ error: '탈퇴 처리된 계정입니다.' }, { status: 403 })
  }
  return null
}
