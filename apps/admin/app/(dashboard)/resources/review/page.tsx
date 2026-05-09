/**
 * (dashboard)/resources/review/page.tsx — 검수 큐 전용
 *
 * status='draft' OR status='review' 인 항목을 ReviewQueue 로 표시.
 */
import Link from 'next/link'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import { ResourceReviewClient } from './ResourceReviewClient'

export const dynamic = 'force-dynamic'

export default async function ResourceReviewPage() {
  const user = await requireRole('curator')

  const resources = await prisma.resource.findMany({
    where: { status: { in: ['draft', 'review'] } },
    orderBy: { createdAt: 'asc' }, // 오래된 것 먼저
    take: 50,
    select: {
      id: true,
      slug: true,
      kind: true,
      thumbUrl: true,
      variants: true,
      meta: true,
      tags: true,
      status: true,
      lowDpi: true,
      createdAt: true,
    },
  })

  const totalPending = await prisma.resource.count({
    where: { status: { in: ['draft', 'review'] } },
  })

  const items = resources.map((r) => ({
    id: r.id,
    slug: r.slug,
    kind: String(r.kind).replace('_', '-'),
    thumbUrl: r.thumbUrl ?? (r.variants as Record<string, string> | null)?.['thumb'] ?? null,
    meta: r.meta as Record<string, unknown>,
    tags: r.tags,
    status: String(r.status),
    lowDpi: r.lowDpi,
    createdAt: r.createdAt.toISOString(),
  }))

  return (
    <div className="p-6 lg:p-8">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">검수 큐</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            게시 대기 중인 리소스를 검수합니다. (총 {totalPending.toLocaleString()}건)
          </p>
        </div>
        <Link
          href="/resources"
          className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
        >
          목록으로 돌아가기
        </Link>
      </div>

      <ResourceReviewClient initialItems={items} totalCount={totalPending} userRole={user.role} />
    </div>
  )
}
