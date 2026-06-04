/**
 * prisma/seed-printer-profiles.ts
 *
 * 기본 3사 인쇄소 프리셋을 DB에 upsert 합니다.
 * isSystem=true — 관리자도 삭제 불가.
 *
 * 실행:
 *   npx ts-node --project tsconfig.json prisma/seed-printer-profiles.ts
 *   또는 pnpm seed:printers
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SYSTEM_PROFILES = [
  {
    slug: 'bookprint-korea',
    name: 'BookPrint Korea',
    description: '도서 표준 인쇄 (B5/A5 위주). 엄격한 bleed/safe 요구사항.',
    formats: ['b5', 'a5', 'b5-format', 'a5-format'],
    bleedMinMm: 3,
    bleedMaxMm: 5,
    safeMinMm: 5,
    imageDpiMinPose: 300,
    imageDpiMinBg: 150,
    fontEmbedRequired: true,
    colorSpaces: ['cmyk', 'rgb'],
    maxPages: null,
    customWarnings: [
      '투명도(opacity < 1) 객체는 인쇄 시 의도치 않은 색상 변화가 발생할 수 있습니다.',
    ],
    isSystem: true,
    isActive: true,
  },
  {
    slug: 'instaprint',
    name: 'InstaPrint',
    description: '정사각 1:1 인스타 카드 인쇄. 모바일 출판 최적화.',
    formats: ['square', 'square-format', '1:1'],
    bleedMinMm: 2,
    bleedMaxMm: 4,
    safeMinMm: 4,
    imageDpiMinPose: 200,
    imageDpiMinBg: 150,
    fontEmbedRequired: true,
    colorSpaces: ['rgb', 'cmyk'],
    maxPages: 1,
    customWarnings: [
      '인스타 카드는 1페이지만 허용됩니다.',
      '정사각 판형(1:1 비율)이 아니면 인쇄 품질이 저하될 수 있습니다.',
    ],
    isSystem: true,
    isActive: true,
  },
  {
    slug: 'comicmaker',
    name: 'ComicMaker',
    description: '만화/콘티 전문 인쇄. 페이지 수 ≤ 200. lowDpi 슬롯 허용.',
    formats: [],
    bleedMinMm: 3,
    bleedMaxMm: 5,
    safeMinMm: 5,
    imageDpiMinPose: 200,
    imageDpiMinBg: 72,
    fontEmbedRequired: true,
    colorSpaces: ['rgb', 'cmyk'],
    maxPages: 200,
    customWarnings: [
      '말풍선 내 텍스트는 safe area 안쪽에 위치해야 합니다.',
      '만화 특성상 말풍선 꼬리가 bleed 영역을 침범하지 않도록 주의하세요.',
    ],
    isSystem: true,
    isActive: true,
  },
] as const

async function main() {
  process.stderr.write('인쇄소 프리셋 seed 시작...\n')

  for (const profile of SYSTEM_PROFILES) {
    const result = await prisma.printerProfile.upsert({
      where: { slug: profile.slug },
      create: profile,
      update: {
        name: profile.name,
        description: profile.description,
        formats: profile.formats as string[],
        bleedMinMm: profile.bleedMinMm,
        bleedMaxMm: profile.bleedMaxMm,
        safeMinMm: profile.safeMinMm,
        imageDpiMinPose: profile.imageDpiMinPose,
        imageDpiMinBg: profile.imageDpiMinBg,
        fontEmbedRequired: profile.fontEmbedRequired,
        colorSpaces: profile.colorSpaces as string[],
        maxPages: profile.maxPages,
        customWarnings: profile.customWarnings as string[],
        // isSystem 은 update 에서 변경하지 않음 (기존 값 유지)
      },
    })
    process.stderr.write(`  ok: ${result.slug} (id: ${result.id})\n`)
  }

  process.stderr.write(`seed 완료 — ${SYSTEM_PROFILES.length}건 upsert\n`)
}

main()
  .catch((e) => {
    process.stderr.write(`seed 오류: ${String(e)}\n`)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
