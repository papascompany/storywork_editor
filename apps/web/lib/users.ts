/**
 * apps/web/lib/users.ts
 *
 * 서버 전용 사용자 헬퍼.
 * Supabase auth user(uuid) ↔ Prisma User(cuid) 불일치를 이메일 기준으로 해소.
 *
 * 주의: 이 파일은 Server Component / Server Action / Route Handler 전용.
 *       클라이언트 컴포넌트에서 import 금지.
 */

import { prisma } from './prisma'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface WebUser {
  /** Prisma DB cuid */
  id: string
  email: string
  role: string
  /** 표시 이름 (null 이면 이메일 앞부분 fallback) */
  name: string | null
  /** 아바타 이미지 URL (null 이면 이니셜 fallback) */
  avatarUrl: string | null
  createdAt: Date
  updatedAt: Date
}

// ─── 입력 검증 상수 ───────────────────────────────────────────────────────────

const NAME_MAX_LEN = 80
const AVATAR_URL_MAX_LEN = 500
/** https:// 로 시작하는 URL 패턴 */
const HTTPS_URL_RE = /^https:\/\/.+/

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
      name: true,
      avatarUrl: true,
      createdAt: true,
      updatedAt: true,
    },
  })

  return {
    id: user.id,
    email: user.email,
    role: String(user.role),
    name: user.name ?? null,
    avatarUrl: user.avatarUrl ?? null,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  }
}

// ─── updateUserProfile ────────────────────────────────────────────────────────

export type UpdateProfileInput = {
  name?: string
  avatarUrl?: string
}

export type UpdateProfileResult = { ok: true; user: WebUser } | { ok: false; error: string }

/**
 * 사용자 프로필을 업데이트한다 (name, avatarUrl).
 *
 * - service_role 권한으로 RLS 우회 (서버 전용)
 * - 입력값 검증: name 1~80자, avatarUrl https:// 패턴
 */
export async function updateUserProfile(
  userId: string,
  input: UpdateProfileInput,
): Promise<UpdateProfileResult> {
  // 입력 검증
  if (input.name !== undefined) {
    const trimmed = input.name.trim()
    if (trimmed.length === 0 || trimmed.length > NAME_MAX_LEN) {
      return { ok: false, error: `이름은 1~${NAME_MAX_LEN}자 사이여야 합니다.` }
    }
    input.name = trimmed
  }

  if (input.avatarUrl !== undefined) {
    const trimmed = input.avatarUrl.trim()
    if (trimmed.length > 0) {
      if (!HTTPS_URL_RE.test(trimmed)) {
        return { ok: false, error: '아바타 URL 은 https:// 로 시작해야 합니다.' }
      }
      if (trimmed.length > AVATAR_URL_MAX_LEN) {
        return { ok: false, error: `아바타 URL 은 ${AVATAR_URL_MAX_LEN}자 이하여야 합니다.` }
      }
    }
    input.avatarUrl = trimmed || undefined
  }

  try {
    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.avatarUrl !== undefined ? { avatarUrl: input.avatarUrl } : {}),
      },
      select: {
        id: true,
        email: true,
        role: true,
        name: true,
        avatarUrl: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    return {
      ok: true,
      user: {
        id: updated.id,
        email: updated.email,
        role: String(updated.role),
        name: updated.name ?? null,
        avatarUrl: updated.avatarUrl ?? null,
        createdAt: updated.createdAt,
        updatedAt: updated.updatedAt,
      },
    }
  } catch (err) {
    console.error('[users] updateUserProfile 오류:', err)
    return { ok: false, error: '프로필 업데이트 중 오류가 발생했습니다.' }
  }
}
