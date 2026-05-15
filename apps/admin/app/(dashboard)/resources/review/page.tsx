/**
 * (dashboard)/resources/review/page.tsx — 검수 큐 전용
 *
 * status='draft' OR status='review' 인 항목을 ReviewQueue 로 표시.
 */
import type { Prisma } from '@prisma/client'
import Link from 'next/link'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import { ResourceReviewClient } from './ResourceReviewClient'

export const dynamic = 'force-dynamic'

export default async function ResourceReviewPage() {
  const user = await requireRole('curator')

  const pendingWhere: Prisma.ResourceWhereInput = { status: { in: ['draft', 'review'] } }

  const [resources, totalPending] = await Promise.all([
    prisma.resource.findMany({
      where: pendingWhere,
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
    }),
    prisma.resource.count({ where: pendingWhere }),
  ])

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
    <div className="nike-page" style={{ fontFamily: 'var(--nike-font-text)' }}>
      {/* 헤더 */}
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--nike-ink)',
              opacity: 0.4,
              marginBottom: '6px',
            }}
          >
            Admin / 리소스 / 검수
          </p>
          <h1
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: 'clamp(24px, 3.5vw, 32px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--nike-ink)',
              marginBottom: '6px',
            }}
          >
            검수 큐
          </h1>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '15px',
              fontWeight: 330,
              color: 'var(--nike-ink)',
              opacity: 0.55,
            }}
          >
            게시 대기 중인 리소스를 검수합니다. (총{' '}
            <strong style={{ fontWeight: 540, opacity: 1 }}>{totalPending.toLocaleString()}</strong>
            건)
          </p>
        </div>
        <Link
          href="/resources"
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 330,
            color: 'var(--nike-ink)',
            opacity: 0.5,
            textDecoration: 'none',
          }}
          className="focus-visible:outline-none focus-visible:ring-2 rounded mt-1"
        >
          ← 목록으로
        </Link>
      </div>

      <ResourceReviewClient initialItems={items} totalCount={totalPending} userRole={user.role} />
    </div>
  )
}
