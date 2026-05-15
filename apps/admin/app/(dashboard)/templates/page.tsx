/**
 * (dashboard)/templates/page.tsx — 템플릿 목록 (Server Component)
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { TemplateListClient } from './TemplateListClient'

export const dynamic = 'force-dynamic'

export default async function TemplatesPage() {
  const user = await requireRole()

  const [templates, formats] = await Promise.all([
    prisma.template.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        formatId: true,
        thumbnail: true,
        slots: true,
        createdAt: true,
        format: { select: { id: true, name: true } },
      },
    }),
    prisma.format.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, name: true },
    }),
  ])

  const data = templates.map((t) => ({
    id: t.id,
    name: t.name,
    formatId: t.formatId,
    formatName: t.format.name,
    slotCount: Array.isArray(t.slots) ? (t.slots as unknown[]).length : 0,
    thumbnail: t.thumbnail ?? null,
    createdAt: t.createdAt.toISOString(),
  }))

  return <TemplateListClient initialData={data} formats={formats} userRole={user.role} />
}
