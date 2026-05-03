import { z } from 'zod'

// ─────────────────────────────────────────────
// Format — 인쇄 판형
// ─────────────────────────────────────────────

export const GridDefSchema = z.record(z.string(), z.unknown()).nullable().optional()
export type GridDef = z.infer<typeof GridDefSchema>

export const FormatSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(100),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  dpi: z.number().int().min(72).max(1200).default(300),
  bleedMm: z.number().nonnegative().default(3),
  safeMm: z.number().nonnegative().default(5),
  gridDef: GridDefSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Format = z.infer<typeof FormatSchema>

export const CreateFormatSchema = FormatSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  dpi: z.number().int().min(72).max(1200).default(300),
  bleedMm: z.number().nonnegative().default(3),
  safeMm: z.number().nonnegative().default(5),
})
export type CreateFormat = z.infer<typeof CreateFormatSchema>

// ─────────────────────────────────────────────
// Slot — 템플릿 내 배치 슬롯
// ─────────────────────────────────────────────

export const SlotSchema = z.object({
  id: z.string(),
  /// 슬롯에 허용되는 ResourceKind 목록
  allowedKinds: z.array(z.string()),
  /// 0..1 정규화 좌표 (판형 기준)
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  zIndex: z.number().int().default(0),
  optional: z.boolean().default(false),
})
export type Slot = z.infer<typeof SlotSchema>

// ─────────────────────────────────────────────
// Template
// ─────────────────────────────────────────────

export const TemplateSchema = z.object({
  id: z.string().cuid(),
  formatId: z.string().cuid(),
  name: z.string().min(1).max(200),
  thumbnail: z.string().url().nullable().optional(),
  fabricJson: z.record(z.string(), z.unknown()),
  slots: z.array(SlotSchema),
  setId: z.string().cuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Template = z.infer<typeof TemplateSchema>

// ─────────────────────────────────────────────
// TemplateSet
// ─────────────────────────────────────────────

export const TemplateSetSchema = z.object({
  id: z.string().cuid(),
  name: z.string().min(1).max(200),
  coverIdx: z.number().int().nonnegative().default(0),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type TemplateSet = z.infer<typeof TemplateSetSchema>
