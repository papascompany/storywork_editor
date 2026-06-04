/**
 * GET    /api/admin/printers/[id] — 단건 조회 (모든 admin role)
 * PATCH  /api/admin/printers/[id] — 편집 (curator+, isSystem=true 는 isActive 만)
 * DELETE /api/admin/printers/[id] — 삭제 (superadmin, isSystem=true 는 불가)
 */
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../../src/lib/api-response'
import { recordAudit } from '../../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../../src/lib/auth'
import { prisma } from '../../../../../src/lib/prisma'
import { printerProfilePatchSchema } from '../../../../../src/lib/schemas/printer-profile'

type RouteContext = { params: Promise<{ id: string }> }

// ─── GET /api/admin/printers/[id] ────────────────────────────────────────────

export async function GET(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { id } = await params

  const profile = await prisma.printerProfile.findUnique({ where: { id } })
  if (!profile) return apiError('NOT_FOUND', '인쇄소 프로필을 찾을 수 없습니다.', 404)

  return NextResponse.json(profile)
}

// ─── PATCH /api/admin/printers/[id] ──────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '인쇄소 프로필 편집 권한이 없습니다. (curator 이상 필요)', 403)
  }

  const { id } = await params

  const existing = await prisma.printerProfile.findUnique({ where: { id } })
  if (!existing) return apiError('NOT_FOUND', '인쇄소 프로필을 찾을 수 없습니다.', 404)

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = printerProfilePatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  // isSystem=true 인 프로필은 isActive 토글만 허용 — raw body 키 기준으로 체크
  if (existing.isSystem) {
    const rawKeys = Object.keys(body as Record<string, unknown>)
    const allowedKeys = new Set(['isActive'])
    const disallowedKeys = rawKeys.filter((k) => !allowedKeys.has(k))
    if (disallowedKeys.length > 0) {
      return apiError(
        'FORBIDDEN',
        `시스템 프리셋은 isActive 토글만 변경 가능합니다. (금지 필드: ${disallowedKeys.join(', ')})`,
        403,
      )
    }
  }

  // 슬러그 중복 확인 (자신 제외)
  if (parsed.data.slug && parsed.data.slug !== existing.slug) {
    const dup = await prisma.printerProfile.findUnique({ where: { slug: parsed.data.slug } })
    if (dup) {
      return apiError('CONFLICT', `슬러그 "${parsed.data.slug}" 는 이미 사용 중입니다.`, 409)
    }
  }

  // diff 계산
  const diff: Record<string, { before: unknown; after: unknown }> = {}
  for (const [key, after] of Object.entries(parsed.data)) {
    const before = (existing as Record<string, unknown>)[key]
    if (JSON.stringify(before) !== JSON.stringify(after)) {
      diff[key] = { before, after }
    }
  }

  const updated = await prisma.printerProfile.update({
    where: { id },
    data: parsed.data,
  })

  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'PrinterProfile',
    entityId: id,
    diff,
  })

  return NextResponse.json(updated)
}

// ─── DELETE /api/admin/printers/[id] ─────────────────────────────────────────

export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'superadmin')) {
    return apiError('FORBIDDEN', '인쇄소 프로필 삭제 권한이 없습니다. (superadmin 전용)', 403)
  }

  const { id } = await params

  const profile = await prisma.printerProfile.findUnique({ where: { id } })
  if (!profile) return apiError('NOT_FOUND', '인쇄소 프로필을 찾을 수 없습니다.', 404)

  // isSystem=true 삭제 불가
  if (profile.isSystem) {
    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'PrinterProfile',
      entityId: id,
      meta: { slug: profile.slug, name: profile.name, blocked: true, reason: 'isSystem=true' },
    })
    return apiError('FORBIDDEN', '시스템 프리셋은 삭제할 수 없습니다.', 403)
  }

  try {
    await prisma.printerProfile.delete({ where: { id } })

    await recordAudit({
      actorId: adminUser.id,
      action: 'delete',
      entityType: 'PrinterProfile',
      entityId: id,
      meta: { slug: profile.slug, name: profile.name },
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return apiError('INTERNAL_ERROR', `삭제 처리 중 오류가 발생했습니다: ${message}`, 500)
  }

  return new NextResponse(null, { status: 204 })
}
