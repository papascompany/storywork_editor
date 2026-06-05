/**
 * apps/admin/src/lib/schemas/company-info.ts
 *
 * CompanyInfo admin 폼 입력 스키마.
 * shared-schema 의 UpdateCompanyInfoSchema 기반, admin 폼에 최적화.
 */
import { z } from 'zod'

const businessRegistrationNoSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^\d{3}-\d{2}-\d{5}$/.test(v),
    '사업자등록번호 형식이 올바르지 않습니다 (000-00-00000)',
  )

export const companyInfoPatchSchema = z.object({
  companyName: z.string().max(200).optional(),
  ceoName: z.string().max(100).optional(),
  businessRegistrationNo: businessRegistrationNoSchema,
  mailOrderBusinessNo: z.string().max(100).optional().nullable(),
  address: z.string().max(500).optional(),
  phone: z.string().max(50).optional(),
  email: z.string().email('올바른 이메일 주소를 입력하세요').max(200).optional().or(z.literal('')),
  faxNo: z.string().max(50).optional().nullable(),
  privacyOfficerName: z.string().max(100).optional().nullable(),
  privacyOfficerEmail: z
    .string()
    .email('올바른 이메일 주소를 입력하세요')
    .max(200)
    .optional()
    .nullable()
    .or(z.literal('').nullable()),
  customerServiceHours: z.string().max(200).optional().nullable(),
  hostingProvider: z.string().max(200).optional(),
  isPublished: z.boolean().optional(),
})

export type CompanyInfoPatch = z.infer<typeof companyInfoPatchSchema>
