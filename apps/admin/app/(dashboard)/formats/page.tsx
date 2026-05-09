/**
 * (dashboard)/formats/page.tsx — 판형 목록 (Server Component)
 *
 * Prisma 로 판형 목록을 조회해 FormatListClient 에 전달.
 * 인증은 requireRole() 에서 처리.
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { FormatListClient } from './FormatListClient'

export const dynamic = 'force-dynamic'

export default async function FormatsPage() {
  const user = await requireRole()

  const formats = await prisma.format.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { templates: true } },
    },
  })

  const data = formats.map((f) => ({
    id: f.id,
    name: f.name,
    widthMm: f.widthMm,
    heightMm: f.heightMm,
    dpi: f.dpi,
    bleedMm: f.bleedMm,
    safeMm: f.safeMm,
    templateCount: f._count.templates,
    createdAt: f.createdAt.toISOString(),
  }))

  return <FormatListClient initialData={data} userRole={user.role} />
}
