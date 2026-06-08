/**
 * apps/admin/src/lib/schemas/template.ts
 *
 * Template / TemplateSet Zod 스키마 — admin 전용.
 * Slot = 페이지 위 직사각형 영역 + 무엇이 들어갈지 힌트.
 * fabricJson 은 MVP 에서 빈 객체 OK ({}).
 *
 * NOTE: Prisma schema.prisma 의 Template/TemplateSet 에는 현재 status/description
 * 컬럼이 없음. 마이그레이션 금지 지침에 따라 이 필드는 FOLLOWUP.
 * status 는 fabricJson 메타 또는 별도 마이그레이션으로 추후 추가 예정.
 */
import { z } from 'zod'

// ─── 슬롯 kind ────────────────────────────────────────────────────────────────

export const SLOT_KINDS = [
  'pose',
  'background',
  'mise-en-scene',
  'prop',
  'speech-bubble',
  'word-fx',
  'decoration',
  'text',
] as const

export type SlotKind = (typeof SLOT_KINDS)[number]

// ─── 슬롯 kind 별 색상 ────────────────────────────────────────────────────────

export const SLOT_KIND_COLORS: Record<SlotKind, string> = {
  pose: '#6366f1',
  background: '#10b981',
  'mise-en-scene': '#f59e0b',
  prop: '#8b5cf6',
  'speech-bubble': '#3b82f6',
  'word-fx': '#ef4444',
  decoration: '#ec4899',
  text: '#6b7280',
}

// ─── 슬롯 스키마 ─────────────────────────────────────────────────────────────

/**
 * 슬롯 = 페이지 위 직사각형 영역 + 무엇이 들어갈지 힌트.
 * 좌표는 정규화 (0..1, Format widthMm/heightMm 기준).
 */
export const slotSchema = z.object({
  id: z.string().min(1),
  kind: z.enum(SLOT_KINDS),
  /** 정규화 좌표 (0..1) */
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
  /** 회전 각도 (도, 0~360) */
  rotation: z.number().min(0).max(360).default(0),
  /** 자유 텍스트 힌트 */
  hint: z.string().max(100).optional(),
  /** 이 슬롯에 우선 매핑할 태그 (M4 ai-layout 가 활용) */
  preferredTags: z.array(z.string()).max(10).default([]),
  /** locked = true 시 자동 배치 제외 */
  locked: z.boolean().default(false),
})

export type Slot = z.infer<typeof slotSchema>

// ─── Template 스키마 ──────────────────────────────────────────────────────────

export const templateUpsertSchema = z.object({
  name: z.string().min(2).max(50),
  formatId: z.string().min(1),
  slots: z.array(slotSchema).max(30).default([]),
  thumbnail: z.string().url().optional(),
  fabricJson: z.record(z.string(), z.unknown()).default({}),
})

export type TemplateUpsert = z.infer<typeof templateUpsertSchema>

export const templatePatchSchema = templateUpsertSchema.partial()
export type TemplatePatch = z.infer<typeof templatePatchSchema>

// ─── TemplateSet 스키마 ───────────────────────────────────────────────────────

/** 표지 독립 치수(mm) 오버라이드 — 비우면 Format 값 상속. '' → null 정규화 */
const coverDimensionOverrideMm = z.preprocess(
  (v) => (v === '' || v === undefined ? null : v),
  z.number().min(10).max(1500).nullable(),
)

export const templateSetUpsertSchema = z.object({
  name: z.string().min(2).max(50),
  templateIds: z.array(z.string()).min(1).max(50),
  coverIdx: z.number().int().min(0).default(0),
  // ── 표지(Cover) 오버라이드 — null/미지정 = Format 기본값 상속 ──
  /** null=상속, true=사용, false=미사용 */
  coverEnabled: z.boolean().nullable().optional(),
  /** 표지 독립 폭(mm) 오버라이드 — null/비우면 Format 값 상속 */
  coverWidthMm: coverDimensionOverrideMm.optional(),
  /** 표지 독립 높이(mm) 오버라이드 — null/비우면 Format 값 상속 */
  coverHeightMm: coverDimensionOverrideMm.optional(),
  /** 세트 활성화/비활성화 */
  isActive: z.boolean().default(true),
})

export type TemplateSetUpsert = z.infer<typeof templateSetUpsertSchema>

export const templateSetPatchSchema = templateSetUpsertSchema.partial()
export type TemplateSetPatch = z.infer<typeof templateSetPatchSchema>
