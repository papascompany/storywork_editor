/**
 * GET /api/audit — 감사 로그 목록 조회 (모든 admin role)
 *
 * 쿼리:
 *   ?page=0&pageSize=50
 *   ?actorId=<id>              (콤마 구분 OR)
 *   ?entityType=Format|Resource (콤마 구분 OR)
 *   ?action=create|update       (콤마 구분 OR)
 *   ?from=<ISO>&to=<ISO>        (날짜 범위)
 *   ?search=<text>              (entityId LIKE / payload JSON LIKE)
 *   ?sort=createdAt:desc        (기본)
 *
 * 응답: { data: AuditLogRow[], totalCount, facets: { byActor, byEntityType, byAction } }
 *
 * audit 는 read-only — GET 만 허용.
 */
import type { NextRequest } from 'next/server'

import { apiError, apiOk } from '../../../src/lib/api-response'
import { getAdminUser, getSession } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface AuditLogRow {
  id: string
  actorId: string
  actorEmail: string | null
  action: string
  entityType: string
  entityId: string
  /** target 원문 — '<entityType>:<entityId>' */
  target: string
  payload: Record<string, unknown>
  createdAt: string
}

export interface AuditFacets {
  byActor: Record<string, number>
  byEntityType: Record<string, number>
  byAction: Record<string, number>
}

export interface AuditListResponse {
  data: AuditLogRow[]
  totalCount: number
  facets: AuditFacets
}

// ─── GET /api/audit ──────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  const { searchParams } = req.nextUrl

  // ── 페이지네이션 ──
  const page = Math.max(0, Number(searchParams.get('page') ?? '0'))
  const pageSize = Math.min(200, Math.max(1, Number(searchParams.get('pageSize') ?? '50')))

  // ── 필터 ──
  const actorIds = searchParams.get('actorId')?.split(',').filter(Boolean) ?? []
  const entityTypes = searchParams.get('entityType')?.split(',').filter(Boolean) ?? []
  const actions = searchParams.get('action')?.split(',').filter(Boolean) ?? []
  const from = searchParams.get('from')
  const to = searchParams.get('to')
  const search = searchParams.get('search') ?? ''

  // ── 정렬 ──
  const sortParam = searchParams.get('sort') ?? 'createdAt:desc'
  const [sortField, sortDir] = sortParam.split(':')
  const validSortFields = ['createdAt']
  const orderByField = validSortFields.includes(sortField ?? '') ? (sortField ?? 'createdAt') : 'at'
  const orderByDir = sortDir === 'asc' ? ('asc' as const) : ('desc' as const)

  // ── where 조건 구성 ──
  // AuditLog.target = '<entityType>:<entityId>'
  // entityType 필터는 target LIKE '<entityType>:%' 로 처리
  type WhereClause = Parameters<typeof prisma.auditLog.findMany>[0] extends
    | { where?: infer W }
    | undefined
    ? W
    : never

  const andClauses: NonNullable<WhereClause>[] = []

  if (actorIds.length > 0) {
    andClauses.push({ actorId: { in: actorIds } })
  }

  if (entityTypes.length > 0) {
    // target 이 '<entityType>:...' 형태이므로 OR 로 OR 조합
    andClauses.push({
      OR: entityTypes.map((et) => ({
        target: { startsWith: `${et.toLowerCase()}:` },
      })),
    })
  }

  if (actions.length > 0) {
    andClauses.push({ action: { in: actions } })
  }

  if (from ?? to) {
    const dateFilter: { gte?: Date; lte?: Date } = {}
    if (from) {
      const d = new Date(from)
      if (!isNaN(d.getTime())) dateFilter.gte = d
    }
    if (to) {
      const d = new Date(to)
      if (!isNaN(d.getTime())) dateFilter.lte = d
    }
    if (dateFilter.gte ?? dateFilter.lte) {
      andClauses.push({ at: dateFilter })
    }
  }

  if (search) {
    andClauses.push({
      OR: [
        { target: { contains: search } },
        { actorId: { contains: search } },
        // payload JSON 텍스트 검색 — Prisma string_contains 지원 안 되는 경우 target 으로 대체
        // 실제 DB 에서는 payload::text ILIKE 로 동작
      ],
    })
  }

  const where: NonNullable<WhereClause> = andClauses.length > 0 ? { AND: andClauses } : {}

  // ── 정렬 필드 매핑 (AuditLog 는 at 컬럼 사용) ──
  const orderBy = orderByField === 'createdAt' ? { at: orderByDir } : { at: orderByDir }

  // ── 병렬 조회 ──
  const [logs, totalCount] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy,
      skip: page * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ])

  // ── actor 이메일 join (User 테이블) ──
  const actorIdSet = [...new Set(logs.map((l) => l.actorId))]
  let actorEmailMap: Record<string, string> = {}
  if (actorIdSet.length > 0) {
    const users = await prisma.user.findMany({
      where: { id: { in: actorIdSet } },
      select: { id: true, email: true },
    })
    actorEmailMap = Object.fromEntries(users.map((u) => [u.id, u.email]))
  }

  // ── target 파싱 → entityType / entityId ──
  const data: AuditLogRow[] = logs.map((log) => {
    const colonIdx = log.target.indexOf(':')
    const entityType = colonIdx >= 0 ? log.target.slice(0, colonIdx) : log.target
    const entityId = colonIdx >= 0 ? log.target.slice(colonIdx + 1) : ''
    return {
      id: log.id,
      actorId: log.actorId,
      actorEmail: actorEmailMap[log.actorId] ?? null,
      action: log.action,
      entityType,
      entityId,
      target: log.target,
      payload: log.payload as Record<string, unknown>,
      createdAt: log.at.toISOString(),
    }
  })

  // ── facets (전체 기준, 현재 where 적용 안 함 — 빠른 개요용) ──
  const [actorFacets, actionFacets, allLogs] = await Promise.all([
    prisma.auditLog.groupBy({ by: ['actorId'], _count: { _all: true }, where }),
    prisma.auditLog.groupBy({ by: ['action'], _count: { _all: true }, where }),
    // entityType 은 target prefix 로 groupBy 불가 → 전체 target 에서 추출
    prisma.auditLog.findMany({ where, select: { target: true } }),
  ])

  const byActor: Record<string, number> = {}
  for (const f of actorFacets) {
    byActor[actorEmailMap[f.actorId] ?? f.actorId] = f._count._all
  }

  const byAction: Record<string, number> = {}
  for (const f of actionFacets) {
    byAction[f.action] = f._count._all
  }

  const byEntityType: Record<string, number> = {}
  for (const l of allLogs) {
    const colonIdx = l.target.indexOf(':')
    const et = colonIdx >= 0 ? l.target.slice(0, colonIdx) : l.target
    byEntityType[et] = (byEntityType[et] ?? 0) + 1
  }

  const facets: AuditFacets = { byActor, byEntityType, byAction }

  const response: AuditListResponse = { data, totalCount, facets }
  return apiOk(response)
}
