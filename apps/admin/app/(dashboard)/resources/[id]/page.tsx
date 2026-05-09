/**
 * (dashboard)/resources/[id]/page.tsx — 리소스 편집 (Server Component)
 */
import { notFound } from 'next/navigation'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import { ResourceEditClient } from './ResourceEditClient'

export const dynamic = 'force-dynamic'

type PageProps = { params: Promise<{ id: string }> }

export default async function ResourceEditPage({ params }: PageProps) {
  const user = await requireRole()
  const { id } = await params

  const resource = await prisma.resource.findUnique({ where: { id } })
  if (!resource) notFound()

  const data = {
    id: resource.id,
    slug: resource.slug,
    originalFilename: resource.originalFilename,
    kind: String(resource.kind).replace('_', '-'),
    format: String(resource.format),
    ownerType: String(resource.ownerType),
    ownerId: resource.ownerId,
    fileUrl: resource.fileUrl,
    thumbUrl: resource.thumbUrl,
    variants: resource.variants as Record<string, string> | null,
    width: resource.width,
    height: resource.height,
    masterDpi: resource.masterDpi,
    lowDpi: resource.lowDpi,
    meta: resource.meta as Record<string, unknown>,
    tags: resource.tags,
    status: String(resource.status),
    createdAt: resource.createdAt.toISOString(),
    updatedAt: resource.updatedAt.toISOString(),
  }

  return <ResourceEditClient resource={data} userRole={user.role} />
}
