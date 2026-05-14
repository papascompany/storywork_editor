/**
 * scripts/seed-formats.ts
 *
 * 시스템 판형(Format) preset 을 DB 에 등록한다 (idempotent upsert).
 *
 * 실행:
 *   pnpm tsx scripts/seed-formats.ts
 *
 * 전제조건:
 *   - DATABASE_URL / DIRECT_URL 환경변수 설정 (또는 .env 파일)
 *   - prisma generate 완료
 *
 * 중요:
 *   - id 는 고정 문자열 ('preset-b5-novel' 등) — FormatPickerModal 의 preset ID 와 매핑
 *   - format-mapping.ts 의 PRESET_ID_MAP 과 반드시 동기화 유지
 *   - 기존 row 가 있으면 update 없이 create 부분만 skip (upsert update: {})
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// ─── 시드 데이터 ──────────────────────────────────────────────────────────────

const FORMAT_SEEDS = [
  {
    id: 'preset-b5-novel',
    name: 'B5 단행본',
    widthMm: 130,
    heightMm: 200,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    gridDef: null,
  },
  {
    id: 'preset-a5-artbook',
    name: 'A5 작품집',
    widthMm: 148,
    heightMm: 210,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    gridDef: null,
  },
  {
    id: 'preset-square',
    name: '정사각 1:1',
    widthMm: 150,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    gridDef: null,
  },
  {
    id: 'preset-mobile-story',
    name: '세로형 모바일',
    widthMm: 90,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    gridDef: null,
  },
] as const

// ─── 실행 ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  console.warn('Format preset 시드 시작...\n')

  const results: { id: string; name: string; action: 'created' | 'existing' }[] = []

  for (const seed of FORMAT_SEEDS) {
    // upsert: 이미 있으면 update 없이 skip (name 충돌 방지를 위해 id 기준)
    // name 은 @unique 이므로 기존 row 의 name 을 변경하면 충돌 가능 → update 비워둠
    const result = await prisma.format.upsert({
      where: { id: seed.id },
      update: {},
      create: {
        id: seed.id,
        name: seed.name,
        widthMm: seed.widthMm,
        heightMm: seed.heightMm,
        dpi: seed.dpi,
        bleedMm: seed.bleedMm,
        safeMm: seed.safeMm,
        gridDef: seed.gridDef,
      },
    })

    // upsert 는 항상 레코드를 반환 — updatedAt 으로 신규/기존 구분
    const isNew =
      result.createdAt.getTime() === result.updatedAt.getTime() ||
      Date.now() - result.createdAt.getTime() < 5000

    results.push({
      id: result.id,
      name: result.name,
      action: isNew ? 'created' : 'existing',
    })
  }

  console.warn('등록된 Format preset 목록:')
  console.warn('─'.repeat(60))
  for (const r of results) {
    const badge = r.action === 'created' ? '[신규]' : '[기존]'
    console.warn(`  ${badge} ${r.id} — ${r.name}`)
  }
  console.warn('─'.repeat(60))
  console.warn(`\n완료: ${results.length}개 처리됨`)
}

main()
  .catch((err: unknown) => {
    console.error('시드 실패:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
