import { z } from 'zod'

// ─────────────────────────────────────────────
// Enum Zod 스키마 — Prisma enum 과 1:1 대응
// ─────────────────────────────────────────────

export const RoleSchema = z.enum(['user', 'creator', 'curator', 'superadmin', 'readonly'])
export type Role = z.infer<typeof RoleSchema>

export const ResourceKindSchema = z.enum([
  'pose',
  'background',
  'mise_en_scene',
  'prop',
  'speech_bubble',
  'word_fx',
  'decoration',
])
export type ResourceKind = z.infer<typeof ResourceKindSchema>

/// 자산 포맷 — 1차: png, 향후 svg 병행 (ADR-0011)
export const ResourceFormatSchema = z.enum(['png', 'svg', 'webp'])
export type ResourceFormat = z.infer<typeof ResourceFormatSchema>

export const OwnerTypeSchema = z.enum(['system', 'creator'])
export type OwnerType = z.infer<typeof OwnerTypeSchema>

export const ResourceStatusSchema = z.enum(['draft', 'review', 'published', 'rejected'])
export type ResourceStatus = z.infer<typeof ResourceStatusSchema>

export const ProjectStatusSchema = z.enum([
  'drafting',
  'composing',
  'editing',
  'publishing',
  'archived',
])
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>

/// 산출물 모드 (ADR-0017 / MODE-01) — pod=인쇄 PDF, webtoon=세로 스트립
export const ProjectModeSchema = z.enum(['pod', 'webtoon'])
export type ProjectMode = z.infer<typeof ProjectModeSchema>

/// 판형 단위계 (ADR-0017 / MODE-01) — mm=인쇄, px=화면. 한 판형은 하나의 단위계만
export const FormatUnitSchema = z.enum(['mm', 'px'])
export type FormatUnit = z.infer<typeof FormatUnitSchema>

export const JobStatusSchema = z.enum(['queued', 'running', 'succeeded', 'failed'])
export type JobStatus = z.infer<typeof JobStatusSchema>

export const ShowcaseModeSchema = z.enum(['contest', 'gallery'])
export type ShowcaseMode = z.infer<typeof ShowcaseModeSchema>
