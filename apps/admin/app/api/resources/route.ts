/**
 * GET  /api/resources — 목록 조회 (모든 admin role)
 * POST /api/resources — 메타만 생성 (파일 없는 경우, superadmin|curator)
 */
import { type NextRequest } from 'next/server'

import { apiError, apiOk } from '../../../src/lib/api-response'
import { getAdminUser, getSession } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'
import type { ResourceListFacets } from '../../../src/lib/schemas/resource'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyWhere = any

// Prisma 에서 ResourceKind enum 이 snake_case 이므로 변환 헬퍼
function kindToDb(kind: string): string {
  return kind.replace(/-/g, '_')
}

// ─── GET /api/resources ───────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { searchParams } = req.nextUrl
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(100, Math.max(1, Number(searchParams.get('pageSize') ?? '20')))
  const search = searchParams.get('search') ?? ''
  const sortParam = searchParams.get('sort') ?? 'createdAt:desc'
  const [sortField, sortDir] = sortParam.split(':')

  // 다중 필터
  const kindsRaw = searchParams.getAll('kind')
  const statusesRaw = searchParams.getAll('status')
  const lowDpiRaw = searchParams.get('lowDpi')
  const ownerTypeRaw = searchParams.get('ownerType')

  const validSortFields = ['createdAt', 'updatedAt', 'slug', 'kind', 'status']
  const orderByField = validSortFields.includes(sortField ?? '')
    ? (sortField ?? 'createdAt')
    : 'createdAt'
  const orderByDir = sortDir === 'asc' ? 'asc' : 'desc'

  // 필터 조건 구성
  const where: AnyWhere = {}

  if (kindsRaw.length > 0) {
    where.kind = { in: kindsRaw.map(kindToDb) }
  }

  if (statusesRaw.length > 0) {
    where.status = { in: statusesRaw }
  }

  if (lowDpiRaw === 'true') {
    where.lowDpi = true
  } else if (lowDpiRaw === 'false') {
    where.lowDpi = false
  }

  if (ownerTypeRaw) {
    where.ownerType = ownerTypeRaw
  }

  if (search) {
    where.OR = [{ slug: { contains: search, mode: 'insensitive' } }, { tags: { has: search } }]
  }

  // 데이터 + 카운트 + facets 병렬 조회
  const [resources, totalCount, allKindCounts, allStatusCounts, allOwnerTypeCounts] =
    await Promise.all([
      prisma.resource.findMany({
        where,
        orderBy: { [orderByField]: orderByDir },
        skip: page * pageSize,
        take: pageSize,
        select: {
          id: true,
          slug: true,
          originalFilename: true,
          kind: true,
          format: true,
          ownerType: true,
          ownerId: true,
          fileUrl: true,
          thumbUrl: true,
          variants: true,
          width: true,
          height: true,
          masterDpi: true,
          lowDpi: true,
          meta: true,
          tags: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        },
      }),
      prisma.resource.count({ where }),
      // facets: kind 별 카운트 (현재 필터 기반)
      prisma.resource.groupBy({
        by: ['kind'],
        where: (statusesRaw.length > 0 ? { status: { in: statusesRaw } } : {}) as AnyWhere,
        _count: { _all: true },
      }),
      // facets: status 별 카운트
      prisma.resource.groupBy({
        by: ['status'],
        where: (kindsRaw.length > 0 ? { kind: { in: kindsRaw.map(kindToDb) } } : {}) as AnyWhere,
        _count: { _all: true },
      }),
      // facets: ownerType 별 카운트
      prisma.resource.groupBy({
        by: ['ownerType'],
        _count: { _all: true },
      }),
    ])

  const facets: ResourceListFacets = {
    byKind: Object.fromEntries(
      allKindCounts.map((r) => [String(r.kind).replace('_', '-'), r._count?._all ?? 0]),
    ),
    byStatus: Object.fromEntries(allStatusCounts.map((r) => [r.status, r._count?._all ?? 0])),
    byOwnerType: Object.fromEntries(
      allOwnerTypeCounts.map((r) => [r.ownerType, r._count?._all ?? 0]),
    ),
  }

  const data = resources.map((r) => ({
    ...r,
    kind: String(r.kind).replace('_', '-'),
    ownerType: String(r.ownerType),
    format: String(r.format),
    status: String(r.status),
    variants: r.variants as Record<string, string> | null,
    meta: r.meta as Record<string, unknown>,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }))

  return apiOk({ data, totalCount, facets })
}
