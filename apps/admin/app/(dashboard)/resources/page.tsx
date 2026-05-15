/**
 * (dashboard)/resources/page.tsx — 리소스 목록 (Server Component)
 *
 * 초기 데이터는 서버에서 조회 후 Client 컴포넌트에 전달.
 * 이후 필터/페이지 전환은 클라이언트에서 API 를 직접 호출.
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'
import type { ResourceListFacets, ResourceRow } from '../../../src/lib/schemas/resource'

import { ResourceListClient } from './ResourceListClient'

export const dynamic = 'force-dynamic'

function listMeta(meta: unknown): Record<string, unknown> {
  if (!meta || typeof meta !== 'object' || Array.isArray(meta)) return {}
  const action = (meta as { action?: unknown }).action
  return typeof action === 'string' ? { action } : {}
}

export default async function ResourcesPage() {
  const user = await requireRole()

  // 초기 데이터: 최근 20건 + facets(kind×status×ownerType 곱집합 1쿼리).
  // facets 4쿼리 → 1쿼리(combined groupBy)로 압축, totalCount 는 합산으로 도출.
  const [resources, combinedFacets] = await Promise.all([
    prisma.resource.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
      select: {
        id: true,
        slug: true,
        kind: true,
        fileUrl: true,
        thumbUrl: true,
        lowDpi: true,
        meta: true,
        status: true,
        createdAt: true,
      },
    }),
    prisma.resource.groupBy({
      by: ['kind', 'status', 'ownerType'],
      _count: { _all: true },
    }),
  ])

  let totalCount = 0
  const byKindMap = new Map<string, number>()
  const byStatusMap = new Map<string, number>()
  const byOwnerTypeMap = new Map<string, number>()
  for (const row of combinedFacets) {
    const n = row._count._all
    totalCount += n
    const kindKey = String(row.kind).replace('_', '-')
    byKindMap.set(kindKey, (byKindMap.get(kindKey) ?? 0) + n)
    const statusKey = String(row.status)
    byStatusMap.set(statusKey, (byStatusMap.get(statusKey) ?? 0) + n)
    const ownerKey = String(row.ownerType)
    byOwnerTypeMap.set(ownerKey, (byOwnerTypeMap.get(ownerKey) ?? 0) + n)
  }

  const initialData: ResourceRow[] = resources.map((r) => ({
    id: r.id,
    slug: r.slug,
    originalFilename: '',
    kind: String(r.kind).replace('_', '-'),
    format: 'png',
    ownerType: 'system',
    ownerId: null,
    fileUrl: r.fileUrl,
    thumbUrl: r.thumbUrl,
    variants: null,
    width: null,
    height: null,
    masterDpi: null,
    lowDpi: r.lowDpi,
    meta: listMeta(r.meta),
    tags: [],
    status: String(r.status),
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.createdAt.toISOString(),
  }))

  const initialFacets: ResourceListFacets = {
    byKind: Object.fromEntries(byKindMap),
    byStatus: Object.fromEntries(byStatusMap),
    byOwnerType: Object.fromEntries(byOwnerTypeMap),
  }

  return (
    <ResourceListClient
      initialData={initialData}
      initialTotalCount={totalCount}
      initialFacets={initialFacets}
      userRole={user.role}
    />
  )
}
