/**
 * (dashboard)/templates/page.tsx — 템플릿 목록 (Server Component)
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { TemplateListClient } from './TemplateListClient'

export const dynamic = 'force-dynamic'

type TemplateListRow = {
  id: string
  name: string
  formatId: string
  formatName: string
  slotCount: number | bigint
  thumbnail: string | null
  createdAt: Date
}

export default async function TemplatesPage() {
  const user = await requireRole()

  const [templates, formats] = await Promise.all([
    prisma.$queryRaw<TemplateListRow[]>`
      SELECT
        t.id,
        t.name,
        t."formatId",
        t.thumbnail,
        t."createdAt",
        f.name AS "formatName",
        CASE
          WHEN jsonb_typeof(t.slots::jsonb) = 'array' THEN jsonb_array_length(t.slots::jsonb)
          ELSE 0
        END AS "slotCount"
      FROM "Template" t
      INNER JOIN "Format" f ON f.id = t."formatId"
      ORDER BY t."createdAt" DESC
    `,
    prisma.format.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const data = templates.map((t) => ({
    id: t.id,
    name: t.name,
    formatId: t.formatId,
    formatName: t.formatName,
    slotCount: Number(t.slotCount),
    thumbnail: t.thumbnail ?? null,
    createdAt: t.createdAt.toISOString(),
  }))

  return <TemplateListClient initialData={data} formats={formats} userRole={user.role} />
}
