/**
 * apps/web/lib/preflight/db-loader.ts
 *
 * Prisma 기반 ProfileLoader 구현체.
 * DB의 PrinterProfile 레코드를 PreflightProfile 타입으로 변환해 반환한다.
 *
 * 사용:
 *   import { initDbProfileLoader } from '@/lib/preflight/db-loader'
 *   initDbProfileLoader() // 앱 부팅 시 또는 첫 preflight 전 한 번 호출
 */

import type { PreflightProfile, ProfileLoader } from '@storywork/pdf-engine'
import { setProfileLoader } from '@storywork/pdf-engine'

import { getPrismaClient } from '../prisma'

// ─── DB row → PreflightProfile 변환 ─────────────────────────────────────────

function rowToProfile(row: {
  id: string
  slug: string
  name: string
  description: string | null
  formats: string[]
  bleedMinMm: number
  bleedMaxMm: number
  safeMinMm: number
  imageDpiMinPose: number
  imageDpiMinBg: number
  fontEmbedRequired: boolean
  colorSpaces: string[]
  maxPages: number | null
  customWarnings: string[]
}): PreflightProfile {
  return {
    id: row.slug, // pdf-engine 은 slug 를 id 로 사용 (하위 호환)
    name: row.name,
    description: row.description ?? '',
    formats: row.formats,
    bleedMm: { min: row.bleedMinMm, max: row.bleedMaxMm },
    safeMm: { min: row.safeMinMm },
    imageDpi: { minPose: row.imageDpiMinPose, minBg: row.imageDpiMinBg },
    fontEmbedRequired: row.fontEmbedRequired,
    colorSpace: row.colorSpaces.filter((cs): cs is 'rgb' | 'cmyk' => cs === 'rgb' || cs === 'cmyk'),
    maxPages: row.maxPages ?? undefined,
    customWarnings: row.customWarnings.length > 0 ? row.customWarnings : undefined,
  }
}

// ─── Prisma ProfileLoader ────────────────────────────────────────────────────

const prismaProfileLoader: ProfileLoader = {
  async getById(id: string): Promise<PreflightProfile | null> {
    const prisma = getPrismaClient()
    // id 는 slug 기준으로 조회 (pdf-engine 하위 호환)
    const row = await prisma.printerProfile.findUnique({
      where: { slug: id },
    })
    if (!row || !row.isActive) return null
    return rowToProfile(row)
  },

  async listActive(): Promise<PreflightProfile[]> {
    const prisma = getPrismaClient()
    const rows = await prisma.printerProfile.findMany({
      where: { isActive: true },
      orderBy: [{ isSystem: 'desc' }, { createdAt: 'asc' }],
    })
    return rows.map(rowToProfile)
  },
}

// ─── 초기화 ───────────────────────────────────────────────────────────────────

let initialized = false

/**
 * Prisma DB 어댑터를 pdf-engine 에 등록한다.
 * 중복 호출 시 무시 (idempotent).
 */
export function initDbProfileLoader(): void {
  if (initialized) return
  setProfileLoader(prismaProfileLoader)
  initialized = true
}
