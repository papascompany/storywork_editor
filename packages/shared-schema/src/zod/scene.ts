import { z } from 'zod'

// ─────────────────────────────────────────────
// Line — 장면 내 대사 한 줄
// ─────────────────────────────────────────────

export const LineSchema = z.object({
  id: z.string().cuid(),
  sceneId: z.string().cuid(),
  index: z.number().int().nonnegative(),
  speaker: z.string().nullable().optional(),
  text: z.string().min(1),
  bubbleId: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Line = z.infer<typeof LineSchema>

// ─────────────────────────────────────────────
// Scene — 장면 단위 분석 결과
// ─────────────────────────────────────────────

export const SceneSchema = z.object({
  id: z.string().cuid(),
  sceneDocId: z.string().cuid(),
  index: z.number().int().nonnegative(),
  slug: z.string().min(1).max(200),
  summary: z.string().min(1),
  emotion: z.string().nullable().optional(),
  view: z.string().nullable().optional(),
  pageId: z.string().cuid().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  lines: z.array(LineSchema).optional(),
})
export type Scene = z.infer<typeof SceneSchema>

// ─────────────────────────────────────────────
// SceneDoc — AI 대본 분석 결과 (Project 1:1)
// ─────────────────────────────────────────────

export const SceneDocMetaSchema = z
  .object({
    model: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
    processingMs: z.number().nonnegative().optional(),
    version: z.string().optional(),
  })
  .catchall(z.unknown())
export type SceneDocMeta = z.infer<typeof SceneDocMetaSchema>

export const SceneDocSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  scriptRaw: z.string().min(1),
  meta: SceneDocMetaSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
  scenes: z.array(SceneSchema).optional(),
})
export type SceneDoc = z.infer<typeof SceneDocSchema>
