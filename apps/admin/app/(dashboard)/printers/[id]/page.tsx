/**
 * (dashboard)/printers/[id]/page.tsx — 인쇄소 프로필 편집 (Server Component)
 *
 * Server Component 에서 데이터를 조회해 PrinterEditClient 에 전달.
 * 인증은 requireRole() 에서 처리.
 */
import { notFound } from 'next/navigation'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import { PrinterEditClient } from './PrinterEditClient'

interface PageProps {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function PrinterEditPage({ params }: PageProps) {
  const user = await requireRole()
  const { id } = await params

  const profile = await prisma.printerProfile.findUnique({ where: { id } })
  if (!profile) notFound()

  return (
    <PrinterEditClient
      profile={{
        id: profile.id,
        slug: profile.slug,
        name: profile.name,
        description: profile.description ?? undefined,
        formats: profile.formats,
        bleedMinMm: profile.bleedMinMm,
        bleedMaxMm: profile.bleedMaxMm,
        safeMinMm: profile.safeMinMm,
        imageDpiMinPose: profile.imageDpiMinPose,
        imageDpiMinBg: profile.imageDpiMinBg,
        fontEmbedRequired: profile.fontEmbedRequired,
        colorSpaces: profile.colorSpaces as Array<'rgb' | 'cmyk'>,
        maxPages: profile.maxPages,
        customWarnings: profile.customWarnings,
        isSystem: profile.isSystem,
        isActive: profile.isActive,
      }}
      userRole={user.role}
    />
  )
}
