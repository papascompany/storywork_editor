/* eslint-disable no-console */
/**
 * scripts/migrate-dummyman-character.ts
 *
 * 시스템 Character "더미맨" 1건 upsert 후,
 * 기존 Resource(kind='pose') 전체를 해당 character 로 매핑한다.
 *
 * 멱등(idempotent): 재실행 시 동일 결과.
 *
 * 실행:
 *   pnpm migrate:character:dummyman
 *   또는
 *   tsx --tsconfig tsconfig.scripts.json scripts/migrate-dummyman-character.ts
 *
 * 옵션:
 *   --dry-run   DB 변경 없이 예상 작업 출력
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const DUMMYMAN_ID = 'char-system-dummyman'

async function main(): Promise<void> {
  const isDryRun = process.argv.includes('--dry-run')

  console.log(`[migrate-dummyman-character] ${isDryRun ? 'DRY RUN — ' : ''}시작`)

  // 1. 더미맨 Character upsert
  const existingChar = await prisma.character.findUnique({ where: { id: DUMMYMAN_ID } })

  if (isDryRun) {
    console.log(
      `[1/3] Character upsert: id="${DUMMYMAN_ID}", name="더미맨", ownerType=system, status=published`,
    )
    if (existingChar) {
      console.log(`      → 기존 레코드 존재 (updatedAt: ${existingChar.updatedAt.toISOString()})`)
    } else {
      console.log(`      → 신규 생성 예정`)
    }
  } else {
    const char = await prisma.character.upsert({
      where: { id: DUMMYMAN_ID },
      create: {
        id: DUMMYMAN_ID,
        ownerType: 'system',
        ownerId: null,
        name: '더미맨',
        description: '기본 포즈 라이브러리 캐릭터. 1,260개 표준 포즈 보유.',
        bodyType: 'M',
        styleTag: '흑백 단순화',
        thumbnail: null,
        status: 'published',
      },
      update: {
        // 멱등: 이름/설명은 재실행해도 업데이트하지 않음 (이미 존재하면 유지)
        status: 'published',
      },
    })
    console.log(
      `[1/3] Character upsert 완료: id="${char.id}", createdAt=${char.createdAt.toISOString()}`,
    )
  }

  // 2. 대상 Resource(pose) 집계
  const poseCount = await prisma.resource.count({
    where: { kind: 'pose' },
  })
  const alreadyMappedCount = await prisma.resource.count({
    where: { kind: 'pose', characterId: DUMMYMAN_ID },
  })
  const unmappedCount = poseCount - alreadyMappedCount

  console.log(
    `[2/3] 포즈 현황: 전체=${poseCount}, 이미 매핑=${alreadyMappedCount}, 미매핑=${unmappedCount}`,
  )

  if (isDryRun) {
    console.log(
      `      → 미매핑 ${unmappedCount}건에 characterId="${DUMMYMAN_ID}" 설정 예정 (updateMany)`,
    )
  } else {
    // 3. 미매핑 Resource(pose) 일괄 업데이트
    if (unmappedCount > 0) {
      const result = await prisma.resource.updateMany({
        where: { kind: 'pose', characterId: null },
        data: { characterId: DUMMYMAN_ID },
      })
      console.log(`[3/3] 포즈 매핑 완료: ${result.count}건 업데이트`)
    } else {
      console.log(`[3/3] 포즈 매핑 스킵: 모든 포즈 이미 매핑됨`)
    }

    // 검증 쿼리
    const finalMapped = await prisma.resource.count({
      where: { kind: 'pose', characterId: DUMMYMAN_ID },
    })
    const finalTotal = await prisma.resource.count({ where: { kind: 'pose' } })

    console.log(`\n--- 검증 결과 ---`)
    console.log(`Character 수: 1 (id="${DUMMYMAN_ID}")`)
    console.log(`포즈 전체: ${finalTotal}`)
    console.log(`더미맨 포즈: ${finalMapped}`)
    console.log(`매핑률: ${((finalMapped / finalTotal) * 100).toFixed(1)}%`)

    // AuditLog 기록
    await prisma.auditLog.create({
      data: {
        actorId: 'system-migration',
        action: 'migrate:dummyman-character',
        target: `Character:${DUMMYMAN_ID}`,
        payload: {
          characterId: DUMMYMAN_ID,
          poseMapped: finalMapped,
          poseTotal: finalTotal,
          script: 'migrate-dummyman-character.ts',
          executedAt: new Date().toISOString(),
        },
      },
    })
    console.log(`[audit] AuditLog 기록 완료`)
  }

  console.log(`\n[migrate-dummyman-character] ${isDryRun ? 'DRY RUN ' : ''}완료`)
}

main()
  .catch((err: unknown) => {
    console.error('[migrate-dummyman-character] 오류:', err)
    process.exit(1)
  })
  .finally(() => {
    void prisma.$disconnect()
  })
