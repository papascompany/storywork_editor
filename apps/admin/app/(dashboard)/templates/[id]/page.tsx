/**
 * (dashboard)/templates/[id]/page.tsx — 템플릿 편집 (Server Component)
 */
import { notFound } from 'next/navigation'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import type { Slot } from '../../../../src/lib/schemas/template'

import type { TemplateData } from './TemplateEditClient'
import { TemplateEditClient } from './TemplateEditClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function TemplateEditPage({ params }: PageProps) {
  const user = await requireRole()
  const { id } = await params

  const template = await prisma.template.findUnique({
    where: { id },
    include: {
      format: {
        select: {
          id: true,
          name: true,
          widthMm: true,
          heightMm: true,
          bleedMm: true,
          safeMm: true,
        },
      },
    },
  })

  if (!template) notFound()

  const templateData: TemplateData = {
    id: template.id,
    name: template.name,
    formatId: template.formatId,
    format: template.format,
    slots: (Array.isArray(template.slots) ? template.slots : []) as Slot[],
    thumbnail: template.thumbnail ?? null,
    fabricJson: (template.fabricJson as Record<string, unknown>) ?? {},
  }

  return <TemplateEditClient template={templateData} userRole={user.role} />
}
