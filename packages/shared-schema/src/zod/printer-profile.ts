import { z } from 'zod'

// ─────────────────────────────────────────────
// PrinterProfile — 인쇄소 사양 프리셋
// ─────────────────────────────────────────────

export const PrinterProfileSchema = z.object({
  id: z.string().cuid(),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL-safe 슬러그만 허용 (영소문자, 숫자, 하이픈)'),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).nullable().optional(),
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
  isSystem: z.boolean().default(false),
  isActive: z.boolean().default(true),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  createdById: z.string().cuid().nullable().optional(),
})
export type PrinterProfile = z.infer<typeof PrinterProfileSchema>

// ─── Create ───────────────────────────────────────────────────────────────────

export const CreatePrinterProfileSchema = PrinterProfileSchema.omit({
  id: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  createdById: true,
}).extend({
  bleedMaxMm: z
    .number()
    .nonnegative()
    .refine((v) => v >= 0, 'bleedMaxMm 은 0 이상이어야 합니다'),
})

export type CreatePrinterProfile = z.infer<typeof CreatePrinterProfileSchema>

// ─── Update (PATCH, partial) ──────────────────────────────────────────────────

export const UpdatePrinterProfileSchema = CreatePrinterProfileSchema.partial()

export type UpdatePrinterProfile = z.infer<typeof UpdatePrinterProfileSchema>
