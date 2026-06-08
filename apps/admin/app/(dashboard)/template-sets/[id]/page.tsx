/**
 * (dashboard)/template-sets/[id]/page.tsx — 템플릿 세트 편집 (Server Component)
 */
import { notFound } from 'next/navigation'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import type { TemplateSetData } from './TemplateSetEditClient'
import { TemplateSetEditClient } from './TemplateSetEditClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function TemplateSetEditPage({ params }: PageProps) {
  const user = await requireRole()
  const { id } = await params

  const set = await prisma.templateSet.findUnique({
    where: { id },
    include: {
      templates: {
        select: {
          id: true,
          name: true,
          thumbnail: true,
          slots: true,
          format: { select: { name: true } },
        },
        orderBy: { createdAt: 'asc' },
      },
    },
  })

  if (!set) notFound()

  const setData: TemplateSetData = {
    id: set.id,
    name: set.name,
    coverIdx: set.coverIdx,
    coverEnabled: set.coverEnabled,
    coverWidthMm: set.coverWidthMm,
    coverHeightMm: set.coverHeightMm,
    isActive: set.isActive,
    templates: set.templates.map((t) => ({
      id: t.id,
      name: t.name,
      thumbnail: t.thumbnail ?? null,
      slotCount: Array.isArray(t.slots) ? (t.slots as unknown[]).length : 0,
      formatName: t.format.name,
    })),
  }

  return <TemplateSetEditClient set={setData} userRole={user.role} />
}
