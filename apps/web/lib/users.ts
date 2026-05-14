/**
 * apps/web/lib/users.ts
 *
 * 서버 전용 사용자 헬퍼.
 * Supabase auth user(uuid) ↔ Prisma User(cuid) 불일치를 이메일 기준으로 해소.
 *
 * 주의: 이 파일은 Server Component / Server Action / Route Handler 전용.
 *       클라이언트 컴포넌트에서 import 금지.
 *
 * 참고: Prisma User 모델에는 name/avatarUrl 필드가 없으므로
 *       표시 이름은 이메일 앞부분(@-prefix) 에서 파생하고,
 *       아바타는 이니셜 fallback 을 사용한다.
 *       프로필 확장(name/avatarUrl 추가)은 별도 마이그레이션 PR 에서 처리.
 */

import { prisma } from './prisma'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface WebUser {
  /** Prisma DB cuid */
  id: string
  email: string
  role: string
  createdAt: Date
  updatedAt: Date
}

// ─── getCurrentUser ───────────────────────────────────────────────────────────

/**
 * Supabase 인증 사용자를 받아 Prisma DB User 레코드를 upsert 후 반환한다.
 *
 * 왜 이메일 기준인가:
 *   Prisma User.id 는 cuid 이고 Supabase auth.users.id 는 uuid 이므로
 *   두 값이 일치하지 않는다. email 은 양쪽에서 unique key 로 보존되므로
 *   안정적인 조인 키다.
 */
export async function getCurrentUser(authUser: {
  id: string
  email: string | undefined
}): Promise<WebUser | null> {
  if (!authUser.email) return null

  const email = authUser.email

  // DB row 없으면 자동 생성 (upsert)
  const user = await prisma.user.upsert({
    where: { email },
    update: {}, // 이미 존재하면 아무것도 변경 안 함
    create: {
      email,
      role: 'user',
    },
    select: {
      id: true,
      email: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    id: user.id,
    email: user.email,
    role: String(user.role),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}
