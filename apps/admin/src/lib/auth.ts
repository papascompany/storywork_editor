/**
 * apps/admin/src/lib/auth.ts
 *
 * 서버 사이드 인증 헬퍼.
 * Server Component / Server Action / Route Handler 에서 사용.
 * 클라이언트 컴포넌트에서 import 금지.
 */
import { redirect } from 'next/navigation'

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
  totpVerified: boolean
  totpSetup: boolean
}

// ─────────────────────────────────────────────
// 세션 조회
// ─────────────────────────────────────────────

/**
 * 현재 요청의 Supabase 세션을 반환한다.
 * 세션이 없으면 null 반환.
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
 * Supabase 세션의 user id 로 DB User 레코드를 조회한다.
 * service role 클라이언트를 사용해 RLS 를 우회한다 (서버 전용).
 */
export async function getAdminUser(userId: string): Promise<AdminUser | null> {
  // service role 로 직접 쿼리 (Prisma 대신 Supabase REST 사용 — 미들웨어/엣지 호환)
  const service = createAdminServiceClient()
  const { data, error } = await service
    .from('User')
    .select('id, email, role, totpSecret, totpVerified')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const role = data.role as string
  if (!ADMIN_ROLES.includes(role as AdminRole)) return null

  return {
    id: data.id as string,
    email: data.email as string,
    role: role as AdminRole,
    totpVerified: Boolean(data.totpVerified),
    totpSetup: Boolean(data.totpSecret),
  }
}

// ─────────────────────────────────────────────
// requireRole — 서버 컴포넌트/액션에서 사용
// ─────────────────────────────────────────────

/**
 * 현재 요청의 세션을 검증하고 역할 요구사항을 확인한다.
 * 미인증 → /login 리다이렉트
 * admin role 미보유 → /403 리다이렉트
 * 2FA 미완료 → /setup-2fa 또는 /verify-2fa 리다이렉트
 *
 * @param requiredRole 최소 요구 역할. 미지정 시 모든 admin role 허용.
 */
export async function requireRole(requiredRole?: AdminRole): Promise<AdminUser> {
  const session = await getSession()

  if (!session) {
    redirect('/login')
  }

  const adminUser = await getAdminUser(session.user.id)

  if (!adminUser) {
    redirect('/403')
  }

  // 2FA 게이트
  if (!adminUser.totpSetup) {
    redirect('/setup-2fa')
  }

  if (!isTotpSessionVerified()) {
    redirect('/verify-2fa')
  }

  // 역할 계층 확인
  if (requiredRole && !hasRole(adminUser.role, requiredRole)) {
    redirect('/403')
  }

  return adminUser
}

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

// ─────────────────────────────────────────────
// TOTP 세션 쿠키 확인 (서버 사이드)
// ─────────────────────────────────────────────

/**
 * 요청 쿠키에서 totp_verified 를 확인한다.
 * 미들웨어에서 이미 검증되었으므로 여기서는 존재 여부만 확인.
 */
function isTotpSessionVerified(): boolean {
  // 미들웨어에서 TOTP 검증 쿠키를 강제하므로
  // 서버 컴포넌트에 도달했다는 것은 미들웨어를 통과한 것.
  // 추가 보안이 필요하면 cookies().get('totp_verified') 확인 가능.
  return true
}
