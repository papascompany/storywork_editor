/**
 * (dashboard)/template-sets/page.tsx — 템플릿 세트 목록 (Server Component)
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { TemplateSetListClient } from './TemplateSetListClient'

export const dynamic = 'force-dynamic'

export default async function TemplateSetsPage() {
  const user = await requireRole()

  const sets = await prisma.templateSet.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      templates: {
        select: { id: true, name: true, thumbnail: true },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  const data = sets.map((s) => ({
    id: s.id,
    name: s.name,
    templateCount: s.templates.length,
    coverIdx: s.coverIdx,
    coverThumbnail: s.templates[s.coverIdx]?.thumbnail ?? s.templates[0]?.thumbnail ?? null,
    createdAt: s.createdAt.toISOString(),
  }))

  return <TemplateSetListClient initialData={data} userRole={user.role} />
}
