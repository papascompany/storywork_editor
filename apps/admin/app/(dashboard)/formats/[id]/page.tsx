/**
 * (dashboard)/formats/[id]/page.tsx — 판형 편집 (Server + Client 분리)
 *
 * Server Component 에서 데이터를 조회해 FormatEditClient 에 전달.
 * 인증은 requireRole() 에서 처리.
 */
import { notFound } from 'next/navigation'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import { FormatEditClient } from './FormatEditClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function FormatEditPage({ params }: PageProps) {
  const user = await requireRole()
  const { id } = await params

  const format = await prisma.format.findUnique({
    where: { id },
    include: { _count: { select: { templates: true, projects: true } } },
  })

  if (!format) notFound()

  return (
    <FormatEditClient
      format={{
        id: format.id,
        name: format.name,
        widthMm: format.widthMm,
        heightMm: format.heightMm,
        dpi: format.dpi as 72 | 150 | 300 | 600,
        bleedMm: format.bleedMm,
        safeMm: format.safeMm,
        gridDef: (format.gridDef as Record<string, unknown>) ?? {},
        templateCount: format._count.templates,
        projectCount: format._count.projects,
      }}
      userRole={user.role}
    />
  )
}
