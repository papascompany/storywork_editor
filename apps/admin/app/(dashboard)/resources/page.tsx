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

export default async function ResourcesPage() {
  const user = await requireRole()

  // 초기 데이터: 최근 20건
  const [resources, totalCount, kindCounts, statusCounts, ownerTypeCounts] = await Promise.all([
    prisma.resource.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
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
    prisma.resource.count(),
    prisma.resource.groupBy({ by: ['kind'], _count: { _all: true } }),
    prisma.resource.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.resource.groupBy({ by: ['ownerType'], _count: { _all: true } }),
  ])

  const initialData: ResourceRow[] = resources.map((r) => ({
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

  const initialFacets: ResourceListFacets = {
    byKind: Object.fromEntries(
      kindCounts.map((r) => [String(r.kind).replace('_', '-'), r._count._all]),
    ),
    byStatus: Object.fromEntries(statusCounts.map((r) => [String(r.status), r._count._all])),
    byOwnerType: Object.fromEntries(
      ownerTypeCounts.map((r) => [String(r.ownerType), r._count._all]),
    ),
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
