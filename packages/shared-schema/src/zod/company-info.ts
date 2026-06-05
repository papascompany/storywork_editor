import { z } from 'zod'

// ─────────────────────────────────────────────
// CompanyInfo — 회사 정보 싱글톤
// 한국 전자상거래법 표준 + 개인정보보호법 처리 위탁 명시용
// ─────────────────────────────────────────────

/// 사업자등록번호 형식: 000-00-00000 (또는 빈 문자열 허용)
const businessRegistrationNoSchema = z
  .string()
  .optional()
  .refine(
    (v) => !v || /^\d{3}-\d{2}-\d{5}$/.test(v),
    '사업자등록번호 형식이 올바르지 않습니다 (000-00-00000)',
  )

export const CompanyInfoSchema = z.object({
  id: z.string(),
  // ── 기본 정보 ──
  companyName: z.string().max(200),
  ceoName: z.string().max(100),
  // ── 법적 등록 정보 ──
  businessRegistrationNo: businessRegistrationNoSchema,
  mailOrderBusinessNo: z.string().max(100).optional().nullable(),
  // ── 주소/연락처 ──
  address: z.string().max(500),
  phone: z.string().max(50),
  email: z.string().email('올바른 이메일 주소를 입력하세요').max(200),
  faxNo: z.string().max(50).optional().nullable(),
  // ── 부가정보 ──
  privacyOfficerName: z.string().max(100).optional().nullable(),
  privacyOfficerEmail: z
    .string()
    .email('올바른 이메일 주소를 입력하세요')
    .max(200)
    .optional()
    .nullable(),
  customerServiceHours: z.string().max(200).optional().nullable(),
  hostingProvider: z.string().max(200).default('Vercel · Supabase'),
  // ── 공개 설정 ──
  isPublished: z.boolean().default(false),
  // ── 메타 ──
  updatedById: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

export type CompanyInfo = z.infer<typeof CompanyInfoSchema>

// ─── 필수 필드 체크 (isPublished=true 허용 조건) ─────────────────────────────

export const COMPANY_INFO_REQUIRED_FOR_PUBLISH = [
  'companyName',
  'ceoName',
  'address',
  'phone',
  'email',
] as const satisfies ReadonlyArray<keyof CompanyInfo>

// ─── Update (PATCH, partial) ──────────────────────────────────────────────────

export const UpdateCompanyInfoSchema = CompanyInfoSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  updatedById: true,
}).partial()

export type UpdateCompanyInfo = z.infer<typeof UpdateCompanyInfoSchema>

// ─── Public (footer 노출용) — 공개 가능 필드만 ───────────────────────────────

export const PublicCompanyInfoSchema = CompanyInfoSchema.pick({
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
  isPublished: true,
})

export type PublicCompanyInfo = z.infer<typeof PublicCompanyInfoSchema>
