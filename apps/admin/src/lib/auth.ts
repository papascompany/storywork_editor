/**
 * apps/admin/src/lib/auth.ts
 *
 * 서버 사이드 인증 헬퍼.
 * Server Component / Server Action / Route Handler 에서 사용.
 * 클라이언트 컴포넌트에서 import 금지.
 *
 * 사용자 요구 (2026-05-14): 2FA 제거, 이메일 인증만으로 로그인.
 * — role 미존재 시에도 readonly 로 통과 (관리자 콘솔 진입은 미들웨어가 통제).
 */
import { redirect } from 'next/navigation'
import { cache } from 'react'

import { createAdminServerClient, createAdminServiceClient } from './supabase/server'

// ─────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────

export type AdminRole = 'superadmin' | 'curator' | 'support' | 'readonly'

export const ADMIN_ROLES: AdminRole[] = ['superadmin', 'curator', 'support', 'readonly']

export interface AdminUser {
  id: string
  email: string
  role: AdminRole
  /** @deprecated 2FA 제거됨. 호환을 위해 항상 true. */
  totpVerified: boolean
  /** @deprecated 2FA 제거됨. 호환을 위해 항상 true. */
  totpSetup: boolean
}

// ─────────────────────────────────────────────
// 세션 조회
// ─────────────────────────────────────────────

/**
 * 현재 요청의 Supabase 세션을 반환한다.
 * 세션이 없으면 null 반환.
 *
 * 주의: getSession() 은 토큰 검증을 하지 않으므로 권한 결정에는 getUser() 사용 권장.
 * 본 헬퍼는 호환성을 위해 유지.
 */
export async function getSession() {
  const supabase = await createAdminServerClient()
  const {
    data: { session },
  } = await supabase.auth.getSession()
  return session
}

// ─────────────────────────────────────────────
// admin 사용자 정보 조회
// ─────────────────────────────────────────────

/**
 * 이메일로 DB User 레코드를 조회한다.
 * service role 클라이언트로 RLS 우회 (서버 전용).
 *
 * 왜 email 기준인가:
 *   Prisma User.id 는 cuid 인 반면 Supabase auth.users.id 는 uuid 라
 *   두 값이 일치하지 않는다. email 은 양쪽 모두 unique key 로 보존되므로
 *   조인 키로 안정적이다.
 */
export const getAdminUserByEmail = cache(async function getAdminUserByEmailImpl(
  email: string,
): Promise<AdminUser | null> {
  const service = createAdminServiceClient()
  const { data, error } = await service
    .from('User')
    .select('id, email, role')
    .eq('email', email)
    .maybeSingle()

  if (error || !data) return null

  const role = data.role as string
  const safeRole: AdminRole = ADMIN_ROLES.includes(role as AdminRole)
    ? (role as AdminRole)
    : 'readonly'

  return {
    id: data.id as string,
    email: data.email as string,
    role: safeRole,
    totpVerified: true,
    totpSetup: true,
  }
})

const getVerifiedAdminUser = cache(async function getVerifiedAdminUserImpl(): Promise<AdminUser> {
  const supabase = await createAdminServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user || !user.email) {
    redirect('/login')
  }

  const fromDb = await getAdminUserByEmail(user.email)

  // DB row 가 없어도 인증된 이메일이면 readonly 로 통과
  // (관리자 콘솔 자체 진입 가드는 미들웨어가 담당)
  return (
    fromDb ?? {
      id: user.id,
      email: user.email,
      role: 'readonly',
      totpVerified: true,
      totpSetup: true,
    }
  )
})

/**
 * @deprecated `getAdminUserByEmail` 사용 권장.
 *   userId 가 Supabase uuid 일 경우 Prisma User(cuid) 와 매칭되지 않는다.
 *
 * 호환 유지: id 직접 매칭 실패 시 현재 인증 세션의 email 로 fallback 조회.
 *   → 이로 인해 모든 API route(getSession + getAdminUser 패턴) 가 일관 동작.
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  const service = createAdminServiceClient()
  let { data } = await service.from('User').select('id, email, role').eq('id', userId).maybeSingle()

  // id 매칭 실패 → email fallback (Supabase uuid ↔ Prisma cuid 불일치 케이스)
  if (!data) {
    const supabase = await createAdminServerClient()
    const { data: authData } = await supabase.auth.getUser()
    const email = authData?.user?.email
    if (email) {
      const r = await service
        .from('User')
        .select('id, email, role')
        .eq('email', email)
        .maybeSingle()
      data = r.data
    }
  }

  if (!data) return null

  const role = data.role as string
  const safeRole: AdminRole = ADMIN_ROLES.includes(role as AdminRole)
    ? (role as AdminRole)
    : 'readonly'

  return {
    id: data.id as string,
    email: data.email as string,
    role: safeRole,
    totpVerified: true,
    totpSetup: true,
  }
}

// ─────────────────────────────────────────────
// requireRole — 서버 컴포넌트/액션에서 사용
// ─────────────────────────────────────────────

/**
 * 현재 요청을 검증하고 AdminUser 를 돌려준다.
 *
 * 동작 (2026-05-14 단순화):
 *   1. getUser() 로 토큰 검증된 사용자 조회 — 미인증 → /login
 *   2. 이메일 기준으로 DB User 조회
 *      - 존재: DB role 사용
 *      - 미존재: readonly 로 fallthrough (이메일 인증만으로 통과)
 *   3. requiredRole 지정 시 계층 비교 — 부족하면 /403
 *      (단, requiredRole 미지정 호출은 인증만 확인하므로 /403 없음)
 */
export const requireRole = cache(async function requireRoleImpl(
  requiredRole?: AdminRole,
): Promise<AdminUser> {
  const adminUser = await getVerifiedAdminUser()

  if (requiredRole && !hasRole(adminUser.role, requiredRole)) {
    redirect('/403')
  }

  return adminUser
})

// ─────────────────────────────────────────────
// 역할 계층
// ─────────────────────────────────────────────

/**
 * 역할 권한 계층 (높을수록 강한 권한).
 * superadmin > curator > support > readonly
 */
const ROLE_WEIGHT: Record<AdminRole, number> = {
  superadmin: 4,
  curator: 3,
  support: 2,
  readonly: 1,
}

/**
 * userRole 이 required 역할 이상의 권한을 갖는지 확인한다.
 */
export function hasRole(userRole: AdminRole, required: AdminRole): boolean {
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[required]
}
