/**
 * (dashboard)/printers/page.tsx — 인쇄소 프로필 목록 (Server Component)
 *
 * Prisma 로 목록을 조회해 PrinterListClient 에 전달.
 * 인증은 requireRole() 에서 처리.
 */
import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

import { PrinterListClient } from './PrinterListClient'

export const dynamic = 'force-dynamic'

export default async function PrintersPage() {
  const user = await requireRole()

  const profiles = await prisma.printerProfile.findMany({
    orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    select: {
      id: true,
      slug: true,
      name: true,
      formats: true,
      maxPages: true,
      isSystem: true,
      isActive: true,
      colorSpaces: true,
      updatedAt: true,
    },
  })

  const data = profiles.map((p) => ({
    id: p.id,
    slug: p.slug,
    name: p.name,
    formats: p.formats,
    maxPages: p.maxPages,
    isSystem: p.isSystem,
    isActive: p.isActive,
    colorSpaces: p.colorSpaces,
    updatedAt: p.updatedAt.toISOString(),
  }))

  return <PrinterListClient initialData={data} userRole={user.role} />
}
