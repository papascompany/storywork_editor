import { z } from 'zod'

// ─────────────────────────────────────────────
// Page — fabricJson 은 editor/v1.ts 의 PageJsonV1
// ─────────────────────────────────────────────

export const PageSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  index: z.number().int().nonnegative(),
  templateId: z.string().cuid().nullable().optional(),
  /// PageJsonV1 — 직렬화된 fabric.js 캔버스 상태
  fabricJson: z.record(z.string(), z.unknown()),
  thumbnail: z.string().url().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Page = z.infer<typeof PageSchema>

export const CreatePageSchema = PageSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreatePage = z.infer<typeof CreatePageSchema>
