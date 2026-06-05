/**
 * prisma/seed-company-info.ts
 *
 * CompanyInfo 싱글톤 1건 upsert.
 * 고정 id 'company-info-singleton' 을 사용해 중복 생성 방지.
 *
 * 실행: npx tsx prisma/seed-company-info.ts
 * (또는 pnpm prisma db seed 실행 시 자동 포함)
 */

import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const SINGLETON_ID = 'company-info-singleton'

async function main() {
  const existing = await prisma.companyInfo.findUnique({ where: { id: SINGLETON_ID } })

  if (existing) {
    process.stderr.write(`[seed-company-info] 이미 존재합니다. (id: ${SINGLETON_ID})\n`)
    return
  }

  await prisma.companyInfo.create({
    data: {
      id: SINGLETON_ID,
      companyName: '(준비 중)',
      ceoName: '',
      businessRegistrationNo: null,
      mailOrderBusinessNo: null,
      address: '',
      phone: '',
      email: '',
      faxNo: null,
      privacyOfficerName: null,
      privacyOfficerEmail: null,
      customerServiceHours: '평일 10:00 ~ 18:00 (점심 12:00~13:00 제외)',
      hostingProvider: 'Vercel · Supabase',
      isPublished: false,
    },
  })

  process.stderr.write(`[seed-company-info] CompanyInfo 싱글톤 생성 완료. (id: ${SINGLETON_ID})\n`)
  process.stderr.write(
    '[seed-company-info] admin /company 페이지에서 실제 사업자 정보를 입력하세요.\n',
  )
}

main()
  .catch((e) => {
    process.stderr.write(`[seed-company-info] 오류: ${String(e)}\n`)
    process.exit(1)
  })
  .finally(() => void prisma.$disconnect())
