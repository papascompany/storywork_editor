/**
 * POST /api/resources/upload — 신규 단건 PNG 업로드
 *
 * multipart/form-data:
 *   file    — PNG 파일 (최대 10MB)
 *   payload — JSON 문자열 (resourceUploadSchema)
 *
 * 처리 순서:
 * 1. 파일 매직바이트 검증 (PNG signature)
 * 2. sharp 재인코딩 (EXIF strip, RGBA 보장)
 * 3. WebP 파생본 + 256 thumb 생성
 * 4. slug 생성
 * 5. Supabase Storage 업로드
 * 6. 키포인트 자동 추정 (simplified 3점 fallback)
 * 7. masterDpi 계산 → lowDpi 플래그
 * 8. prisma.resource.create (status: 'review')
 * 9. audit log
 */
import { createClient } from '@supabase/supabase-js'
import { type NextRequest, NextResponse } from 'next/server'

import { apiError } from '../../../../src/lib/api-response'
import { recordAudit } from '../../../../src/lib/audit'
import { getAdminUser, getSession, hasRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { resourceUploadSchema } from '../../../../src/lib/schemas/resource'

// PNG 매직바이트: 89 50 4E 47 0D 0A 1A 0A
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

function isPng(buf: Buffer): boolean {
  if (buf.length < 8) return false
  return PNG_MAGIC.every((b, i) => buf[i] === b)
}

/** 파일명 → URL-safe slug */
function toSlug(filename: string): string {
  const base = filename.replace(/\.[^.]+$/, '') // 확장자 제거
  return base
    .toLowerCase()
    .replace(/[가-힣]+/g, (m) => encodeURIComponent(m)) // 한글 인코딩
    .replace(/[^a-z0-9-_%.]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 80)
}

/** 중복 slug 방지 — suffix 추가 */
async function uniqueSlug(baseSlug: string): Promise<string> {
  let slug = baseSlug
  let i = 0
  while (true) {
    const exists = await prisma.resource.findUnique({ where: { slug } })
    if (!exists) return slug
    i++
    slug = `${baseSlug}-${i}`
  }
}

/** 간단 3점 키포인트 추정 (head / mouth / center) — 사이드카 없을 때 fallback */
function estimateKeypoints3(width: number, height: number) {
  return [
    { name: 'head' as const, x: 0.5, y: 0.1, inferred: true, weight: 0.6 },
    { name: 'mouth' as const, x: 0.5, y: 0.17, inferred: true, weight: 0.5 },
    { name: 'center' as const, x: 0.5, y: 0.5, inferred: true, weight: 0.8 },
  ].map((kp) => ({ ...kp, _forDimensions: { width, height } }))
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return apiError('UNAUTHORIZED', '인증이 필요합니다.', 401)

  const adminUser = await getAdminUser(session.user.id)
  if (!adminUser) return apiError('FORBIDDEN', '관리자 권한이 필요합니다.', 403)

  if (!hasRole(adminUser.role, 'curator')) {
    return apiError('FORBIDDEN', '업로드 권한이 없습니다. (curator 이상 필요)', 403)
  }

  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return apiError('BAD_REQUEST', 'multipart/form-data 파싱 실패', 400)
  }

  const fileEntry = formData.get('file')
  const payloadEntry = formData.get('payload')

  if (!fileEntry || !(fileEntry instanceof File)) {
    return apiError('BAD_REQUEST', 'file 필드가 필요합니다.', 400)
  }

  if (!payloadEntry || typeof payloadEntry !== 'string') {
    return apiError('BAD_REQUEST', 'payload JSON 문자열이 필요합니다.', 400)
  }

  // payload 파싱
  let payloadRaw: unknown
  try {
    payloadRaw = JSON.parse(payloadEntry)
  } catch {
    return apiError('BAD_REQUEST', 'payload가 올바른 JSON이 아닙니다.', 400)
  }

  const payloadParsed = resourceUploadSchema.safeParse(payloadRaw)
  if (!payloadParsed.success) {
    return apiError('VALIDATION_ERROR', '페이로드 검증 실패', 400, payloadParsed.error.flatten())
  }

  // 파일 크기 확인 (10MB)
  if (fileEntry.size > 10 * 1024 * 1024) {
    return apiError('BAD_REQUEST', '파일 크기는 10MB 이하여야 합니다.', 400)
  }

  const fileBuffer = Buffer.from(await fileEntry.arrayBuffer())

  // 1. PNG 매직바이트 검증
  if (!isPng(fileBuffer)) {
    return apiError('BAD_REQUEST', 'PNG 파일만 허용됩니다. (매직바이트 불일치)', 400)
  }

  // 2-3. sharp 처리 (EXIF strip, WebP 파생본)
  // sharp 는 Next.js 서버에서 사용 가능 (빌드 시 설치됨)
  const sharp = (await import('sharp')).default

  let masterPng: Buffer
  let width = 0
  let height = 0
  let webp1x: Buffer
  let webp2x: Buffer
  let thumb: Buffer

  try {
    const img = sharp(fileBuffer)
    const meta = await img.metadata()
    width = meta.width ?? 0
    height = meta.height ?? 0

    // EXIF strip + RGBA 보장 (재인코딩)
    masterPng = await img.png({ compressionLevel: 8 }).toBuffer()

    // WebP 1x (원본 크기), 2x (2배 → 없으면 1x), thumb 256
    webp1x = await sharp(fileBuffer).webp({ quality: 85 }).toBuffer()
    webp2x = await sharp(fileBuffer)
      .resize(Math.min(width * 2, 2048))
      .webp({ quality: 85 })
      .toBuffer()
    thumb = await sharp(fileBuffer)
      .resize(256, 256, { fit: 'inside' })
      .webp({ quality: 80 })
      .toBuffer()
  } catch (err) {
    console.error('[upload] sharp 처리 오류:', err)
    return apiError('INTERNAL_ERROR', '이미지 처리 중 오류가 발생했습니다.', 500)
  }

  // 4. slug 생성
  const baseSlug = toSlug(fileEntry.name)
  const slug = await uniqueSlug(baseSlug)

  // 5. Supabase Storage 업로드
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceKey) {
    return apiError('INTERNAL_ERROR', 'Supabase 설정이 누락되었습니다.', 500)
  }

  const storageClient = createClient(supabaseUrl, serviceKey)
  const bucket = 'poses'
  const prefix = `poses/${slug}`

  const uploadResults = await Promise.allSettled([
    storageClient.storage.from(bucket).upload(`${prefix}/master.png`, masterPng, {
      contentType: 'image/png',
      upsert: false,
    }),
    storageClient.storage.from(bucket).upload(`${prefix}/v1.webp`, webp1x, {
      contentType: 'image/webp',
      upsert: false,
    }),
    storageClient.storage.from(bucket).upload(`${prefix}/v2.webp`, webp2x, {
      contentType: 'image/webp',
      upsert: false,
    }),
    storageClient.storage.from(bucket).upload(`${prefix}/thumb.webp`, thumb, {
      contentType: 'image/webp',
      upsert: false,
    }),
  ])

  const failed = uploadResults.filter(
    (r) => r.status === 'rejected' || (r.status === 'fulfilled' && r.value.error),
  )
  if (failed.length > 0) {
    console.error('[upload] Storage 업로드 실패:', failed)
    return apiError('INTERNAL_ERROR', 'Storage 업로드 중 오류가 발생했습니다.', 500)
  }

  // 공개 URL 구성
  const baseUrl = `${supabaseUrl}/storage/v1/object/public/${bucket}`
  const fileUrl = `${baseUrl}/${prefix}/master.png`
  const thumbUrl = `${baseUrl}/${prefix}/thumb.webp`
  const variants = {
    webp1x: `${baseUrl}/${prefix}/v1.webp`,
    webp2x: `${baseUrl}/${prefix}/v2.webp`,
    thumb: thumbUrl,
  }

  // 6. 키포인트 자동 추정
  const autoKeypoints = estimateKeypoints3(width, height)

  // 7. masterDpi 계산 (750x750 = ~90dpi 기준으로 추정)
  const longestSide = Math.max(width, height)
  // 인쇄 규격: A4(210mm) 기준 dpi = pixel / mm * 25.4
  // 750px / (210mm/25.4) 기준 ≈ 90dpi → lowDpi
  const masterDpi = longestSide > 0 ? Math.round((longestSide / 210) * 25.4) : 72
  const lowDpi = masterDpi < 150

  // 종류 변환 (snake_case ← kebab-case)
  const kindMap: Record<string, string> = {
    'mise-en-scene': 'mise_en_scene',
    'speech-bubble': 'speech_bubble',
    'word-fx': 'word_fx',
  }
  const dbKind = kindMap[payloadParsed.data.kind] ?? payloadParsed.data.kind

  // 기본 메타 구성
  const metaBase = {
    keypoints: autoKeypoints.map(({ _forDimensions: _, ...kp }) => kp),
    flippable: true,
    styleVariants: [],
    ...(payloadParsed.data.meta ?? {}),
  }

  // 라이선스 기본값 (시스템 자산)
  const licenseDefault = {
    id: 'storywork-all-rights',
    holder: 'StoryWork',
    terms: 'all-rights',
    source: 'admin-upload',
    commercialUse: true,
  }

  // 8. DB 레코드 생성
  const resource = await prisma.resource.create({
    data: {
      slug,
      originalFilename: fileEntry.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      kind: dbKind as any,
      format: 'png',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ownerType: payloadParsed.data.ownerType as any,
      ownerId: payloadParsed.data.ownerType === 'creator' ? adminUser.id : null,
      fileUrl,
      thumbUrl,
      variants,
      width,
      height,
      masterDpi,
      lowDpi,
      meta: metaBase,
      tags: payloadParsed.data.tags,
      tagsBootstrap: payloadParsed.data.tags,
      license: licenseDefault,
      licenseSource: 'admin-upload',
      status: 'review',
    },
  })

  // 9. audit log
  await recordAudit({
    actorId: adminUser.id,
    action: 'create',
    entityType: 'Resource',
    entityId: resource.id,
    meta: {
      slug,
      kind: dbKind,
      fileUrl,
      width,
      height,
      masterDpi,
      lowDpi,
    },
  })

  return NextResponse.json(
    {
      ...resource,
      kind: String(resource.kind).replace('_', '-'),
      ownerType: String(resource.ownerType),
      format: String(resource.format),
      status: String(resource.status),
      createdAt: resource.createdAt.toISOString(),
      updatedAt: resource.updatedAt.toISOString(),
    },
    { status: 201 },
  )
}
