/**
 * apps/web/lib/company-info.ts
 *
 * 서비스 웹에서 CompanyInfo 싱글톤을 불러오는 캐시된 로더.
 *
 * 캐시 전략:
 *   - next/cache unstable_cache + revalidate 3600 (1시간)
 *   - admin PATCH 시 revalidateTag('company-info') 호출 → 즉시 무효화
 *
 * isPublished=true 인 데이터만 반환. false 이면 null 반환.
 * 반환 타입: 공개 가능 필드만 (사내 메타 필드 제외)
 */

import { unstable_cache } from 'next/cache'

import { prisma } from './prisma'

export interface PublicCompanyInfo {
  companyName: string
  ceoName: string
  businessRegistrationNo: string | null
  mailOrderBusinessNo: string | null
  address: string
  phone: string
  email: string
  faxNo: string | null
  privacyOfficerName: string | null
  privacyOfficerEmail: string | null
  customerServiceHours: string | null
  hostingProvider: string
}

const SINGLETON_ID = 'company-info-singleton'

/**
 * isPublished=true 인 회사정보를 반환한다.
 * isPublished=false 이거나 row 가 없으면 null 반환.
 *
 * 1시간 캐시 + 'company-info' 태그로 admin PATCH 즉시 무효화 가능.
 */
export const getPublishedCompanyInfo = unstable_cache(
  async (): Promise<PublicCompanyInfo | null> => {
    // CI/SSG 빌드 환경에서 DATABASE_URL 이 없으면 Prisma 초기화 오류 발생.
    // unstable_cache 콜백 내부에서 try/catch 로 감싸 graceful fallback 처리.
    try {
      const info = await prisma.companyInfo.findUnique({
        where: { id: SINGLETON_ID },
        select: {
          isPublished: true,
          companyName: true,
          ceoName: true,
          businessRegistrationNo: true,
          mailOrderBusinessNo: true,
          address: true,
          phone: true,
          email: true,
          faxNo: true,
          privacyOfficerName: true,
          privacyOfficerEmail: true,
          customerServiceHours: true,
          hostingProvider: true,
        },
      })

      if (!info || !info.isPublished) return null

      return {
        companyName: info.companyName,
        ceoName: info.ceoName,
        businessRegistrationNo: info.businessRegistrationNo,
        mailOrderBusinessNo: info.mailOrderBusinessNo,
        address: info.address,
        phone: info.phone,
        email: info.email,
        faxNo: info.faxNo,
        privacyOfficerName: info.privacyOfficerName,
        privacyOfficerEmail: info.privacyOfficerEmail,
        customerServiceHours: info.customerServiceHours,
        hostingProvider: info.hostingProvider,
      }
    } catch {
      // DB 미연결 환경 (CI 빌드, SSG prerender) — 사업자정보 없이 렌더
      return null
    }
  },
  ['company-info'],
  { revalidate: 3600, tags: ['company-info'] },
)
