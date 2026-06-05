/**
 * GET  /api/admin/company — 회사정보 싱글톤 조회
 * PATCH /api/admin/company — 회사정보 수정 (curator+)
 *
 * 싱글톤 id: 'company-info-singleton'
 * 수정 시 audit log 기록 + web 캐시 revalidate
 */
import { revalidatePath, revalidateTag } from 'next/cache'
import { type NextRequest, NextResponse } from 'next/server'

import { apiError, apiOk } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { companyInfoPatchSchema } from '../../../../src/lib/schemas/company-info'

const SINGLETON_ID = 'company-info-singleton'

// ─── GET /api/admin/company ───────────────────────────────────────────────────

export async function GET() {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const info = await prisma.companyInfo.findUnique({ where: { id: SINGLETON_ID } })

  if (!info) {
    // seed 가 실행되지 않은 경우 빈 row 자동 생성
    const created = await prisma.companyInfo.create({
      data: {
        id: SINGLETON_ID,
        companyName: '(준비 중)',
        ceoName: '',
        address: '',
        phone: '',
        email: '',
        hostingProvider: 'Vercel · Supabase',
        isPublished: false,
      },
    })
    return apiOk(created)
  }

  return apiOk(info)
}

// ─── PATCH /api/admin/company ─────────────────────────────────────────────────

export async function PATCH(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '회사정보 수정 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return apiError('BAD_REQUEST', '요청 본문이 올바른 JSON 형식이 아닙니다.', 400)
  }

  const parsed = companyInfoPatchSchema.safeParse(body)
  if (!parsed.success) {
    return apiError('VALIDATION_ERROR', 'Zod 검증 실패', 400, parsed.error.flatten())
  }

  const data = parsed.data

  // isPublished=true 요청 시 필수 필드 완성 여부 확인
  if (data.isPublished === true) {
    const current = await prisma.companyInfo.findUnique({ where: { id: SINGLETON_ID } })
    const merged = { ...current, ...data }
    const requiredFields = ['companyName', 'ceoName', 'address', 'phone', 'email'] as const
    const missing = requiredFields.filter((f) => !merged[f as keyof typeof merged])
    if (missing.length > 0) {
      return apiError(
        'VALIDATION_ERROR',
        `다음 필수 항목을 먼저 입력하세요: ${missing.join(', ')}`,
        400,
      )
    }
  }

  const updated = await prisma.companyInfo.upsert({
    where: { id: SINGLETON_ID },
    create: {
      id: SINGLETON_ID,
      companyName: data.companyName ?? '(준비 중)',
      ceoName: data.ceoName ?? '',
      address: data.address ?? '',
      phone: data.phone ?? '',
      email: data.email ?? '',
      hostingProvider: data.hostingProvider ?? 'Vercel · Supabase',
      isPublished: data.isPublished ?? false,
      updatedById: adminUser.id,
    },
    update: {
      ...data,
      updatedById: adminUser.id,
    },
  })

  // audit log
  await recordAudit({
    actorId: adminUser.id,
    action: 'update',
    entityType: 'CompanyInfo',
    entityId: SINGLETON_ID,
    meta: { isPublished: updated.isPublished },
  })

  // web 캐시 revalidate (footer / 약관 / PP 즉시 반영)
  try {
    revalidateTag('company-info')
    revalidatePath('/', 'layout')
    revalidatePath('/legal/terms')
    revalidatePath('/legal/privacy')
  } catch {
    // revalidate 실패는 non-critical — 다음 요청 시 자연 만료
  }

  return NextResponse.json(updated)
}
