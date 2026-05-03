import { z } from 'zod'

import { JobStatusSchema } from './enums.js'

// ─────────────────────────────────────────────
// PublishJob — PDF/출판 잡 레코드
// ─────────────────────────────────────────────

export const PublishSpecSchema = z
  .object({
    formatId: z.string().cuid(),
    pageIds: z.array(z.string().cuid()).min(1),
    includeBleed: z.boolean().default(true),
    colorSpace: z.enum(['sRGB', 'CMYK']).default('sRGB'),
    resolution: z.number().int().min(72).max(1200).default(300),
  })
  .catchall(z.unknown())
export type PublishSpec = z.infer<typeof PublishSpecSchema>

export const PreflightResultSchema = z.object({
  passed: z.boolean(),
  checks: z.array(
    z.object({
      name: z.string(),
      passed: z.boolean(),
      message: z.string().optional(),
    }),
  ),
  runAt: z.coerce.date().optional(),
})
export type PreflightResult = z.infer<typeof PreflightResultSchema>

export const PublishJobSchema = z.object({
  id: z.string().cuid(),
  projectId: z.string().cuid(),
  kind: z.literal('pdf'),
  status: JobStatusSchema.default('queued'),
  pdfUrl: z.string().url().nullable().optional(),
  spec: PublishSpecSchema,
  preflight: PreflightResultSchema.nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type PublishJob = z.infer<typeof PublishJobSchema>

export const CreatePublishJobSchema = PublishJobSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreatePublishJob = z.infer<typeof CreatePublishJobSchema>
