/**
 * (dashboard)/template-sets/page.tsx — 템플릿 세트 목록 (Server Component)
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { TemplateSetListClient } from './TemplateSetListClient'

export const dynamic = 'force-dynamic'

type TemplateSetListRow = {
  id: string
  name: string
  templateCount: number | bigint
  coverIdx: number
  coverThumbnail: string | null
  createdAt: Date
}

export default async function TemplateSetsPage() {
  const user = await requireRole()

  const sets = await prisma.$queryRaw<TemplateSetListRow[]>`
    SELECT
      s.id,
      s.name,
      s."coverIdx",
      s."createdAt",
      COUNT(t.id) AS "templateCount",
      COALESCE(
        (ARRAY_AGG(t.thumbnail ORDER BY t."createdAt" ASC))[s."coverIdx" + 1],
        (ARRAY_AGG(t.thumbnail ORDER BY t."createdAt" ASC))[1]
      ) AS "coverThumbnail"
    FROM "TemplateSet" s
    LEFT JOIN "Template" t ON t."setId" = s.id
    GROUP BY s.id
    ORDER BY s."createdAt" DESC
  `

  const data = sets.map((s) => ({
    id: s.id,
    name: s.name,
    templateCount: Number(s.templateCount),
    coverIdx: s.coverIdx,
    coverThumbnail: s.coverThumbnail,
    createdAt: s.createdAt.toISOString(),
  }))

  return <TemplateSetListClient initialData={data} userRole={user.role} />
}
