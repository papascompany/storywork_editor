/* eslint-disable no-console */
/**
 * scripts/cleanup-stale-poses.ts
 *
 * 2026-08-03 재적재(신 slug 체계)로 이중화된 구 포즈 리소스 정리.
 *
 * 배경: 2026-06-03 적재분(구 slug, 예: 01-seogi-02)과 2026-08-03 재적재분
 * (신 slug, 예: heubsyeon-01-1)은 slug 가 완전 분리 집합이라 upsert 가 전부
 * 신규 insert 로 동작 → kind='pose' 리소스가 2,530행으로 이중화됐다.
 *
 * 정책:
 *   - 삭제 대상: 신 적재 기준시각(CUTOFF) 이전에 만들어진 pose 리소스
 *   - 단, Page.fabricJson 레이어가 참조하는 resourceId 는 보존 (기존 작품 보호)
 *   - Storage 파일은 건드리지 않음 (구 slug 폴더는 무해한 고아로 남음)
 *
 * 실행:
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/cleanup-stale-poses.ts            # dry-run
 *   pnpm tsx --tsconfig tsconfig.scripts.json scripts/cleanup-stale-poses.ts --apply    # 실제 삭제
 */
import fs from 'node:fs'
import path from 'node:path'

// 신 적재분 시작 시각 (2026-08-03 재적재는 14:2x UTC 진행)
const CUTOFF_ISO = '2026-08-03T00:00:00.000Z'

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnv()

async function main(): Promise<void> {
  const apply = process.argv.includes('--apply')
  const { PrismaClient } = await import('@prisma/client')
  const prisma = new PrismaClient()
  try {
    const cutoff = new Date(CUTOFF_ISO)

    const referenced = await prisma.$queryRaw<{ rid: string }[]>`
      SELECT DISTINCT layer->'data'->>'resourceId' AS rid
      FROM "Page", jsonb_array_elements("fabricJson"->'layers') AS layer
      WHERE layer->'data'->>'resourceId' IS NOT NULL`
    const referencedIds = referenced.map((r) => r.rid)

    const stale = await prisma.resource.findMany({
      where: {
        kind: 'pose',
        updatedAt: { lt: cutoff },
        id: { notIn: referencedIds.length > 0 ? referencedIds : ['__none__'] },
      },
      select: { id: true, slug: true },
    })
    const kept = await prisma.resource.count({
      where: { kind: 'pose', updatedAt: { lt: cutoff }, id: { in: referencedIds } },
    })
    const fresh = await prisma.resource.count({
      where: { kind: 'pose', updatedAt: { gte: cutoff } },
    })

    console.log(`구(스테일) 삭제 대상: ${stale.length}`)
    console.log(`구 중 참조로 보존:   ${kept}`)
    console.log(`신 적재분(유지):     ${fresh}`)
    console.log(
      `샘플: ${stale
        .slice(0, 5)
        .map((s) => s.slug)
        .join(', ')}`,
    )

    if (!apply) {
      console.log('\n[DRY-RUN] 실제 삭제 없음. --apply 로 실행하세요.')
      return
    }

    const result = await prisma.resource.deleteMany({
      where: { id: { in: stale.map((s) => s.id) } },
    })
    console.log(`\n삭제 완료: ${result.count}행`)
  } finally {
    await prisma.$disconnect()
  }
}

void main()
