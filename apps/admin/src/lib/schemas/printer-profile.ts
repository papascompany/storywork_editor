/**
 * apps/admin/src/lib/schemas/printer-profile.ts
 *
 * PrinterProfile admin 폼 입력 스키마.
 * shared-schema 의 PrinterProfileSchema 를 기반으로 admin 폼에 최적화.
 */
import { z } from 'zod'

// base 오브젝트 스키마 (refine 전 — partial 에 사용)
const printerProfileBaseSchema = z.object({
  slug: z
    .string()
    .min(1, '슬러그를 입력하세요')
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL-safe 슬러그만 허용 (영소문자, 숫자, 하이픈)'),
  name: z.string().min(1, '인쇄소 이름을 입력하세요').max(200),
  description: z.string().max(2000).optional(),
  formats: z.array(z.string()).default([]),
  bleedMinMm: z.number().nonnegative(),
  bleedMaxMm: z.number().nonnegative(),
  safeMinMm: z.number().nonnegative(),
  imageDpiMinPose: z.number().positive(),
  imageDpiMinBg: z.number().positive(),
  fontEmbedRequired: z.boolean().default(true),
  colorSpaces: z
    .array(z.enum(['rgb', 'cmyk']))
    .min(1, '색공간을 최소 1개 이상 선택하세요')
    .default(['rgb']),
  maxPages: z.number().int().positive().nullable().optional(),
  customWarnings: z.array(z.string().max(500)).default([]),
  isActive: z.boolean().default(true),
})

export const printerProfileInputSchema = printerProfileBaseSchema.refine(
  (d) => d.bleedMaxMm >= d.bleedMinMm,
  { message: 'bleed 최대값은 최소값 이상이어야 합니다', path: ['bleedMaxMm'] },
)

export type PrinterProfileInput = z.input<typeof printerProfileInputSchema>
export type PrinterProfileOutput = z.output<typeof printerProfileInputSchema>

// PATCH 용 — 모든 필드 optional (refine 없이 base.partial() 사용)
export const printerProfilePatchSchema = printerProfileBaseSchema.partial()
export type PrinterProfilePatch = z.input<typeof printerProfilePatchSchema>
