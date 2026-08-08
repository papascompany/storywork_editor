import { z } from 'zod'

import { ProjectModeSchema, ProjectStatusSchema } from './enums.js'

// ─────────────────────────────────────────────
// Project
// ─────────────────────────────────────────────

export const ProjectSettingsSchema = z
  .object({
    autoSave: z.boolean().default(true),
    language: z.string().default('ko'),
  })
  .catchall(z.unknown())
export type ProjectSettings = z.infer<typeof ProjectSettingsSchema>

export const ProjectSchema = z.object({
  id: z.string().cuid(),
  ownerId: z.string().cuid(),
  formatId: z.string().cuid(),
  title: z.string().min(1).max(300),
  /// 산출물 모드 (ADR-0017 / MODE-01) — 생성 시 확정. 판형 단위계와 정합(pod=mm, webtoon=px)
  mode: ProjectModeSchema.default('pod'),
  status: ProjectStatusSchema.default('drafting'),
  settings: ProjectSettingsSchema.default({ autoSave: true, language: 'ko' }),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})
export type Project = z.infer<typeof ProjectSchema>

export const CreateProjectSchema = ProjectSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
})
export type CreateProject = z.infer<typeof CreateProjectSchema>
