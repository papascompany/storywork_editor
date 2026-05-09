/**
 * apps/admin/src/lib/schemas/resource.ts
 *
 * Resource (포즈/배경/소품 등) Zod 스키마 — admin 전용.
 * Prisma 의 ResourceKind/ResourceStatus enum 과 1:1 대응.
 */
import { z } from 'zod'

// ─── 열거 상수 ────────────────────────────────────────────────────────────────

export const RESOURCE_KINDS = [
  'pose',
  'background',
  'mise-en-scene',
  'prop',
  'speech-bubble',
  'word-fx',
  'decoration',
] as const

export const RESOURCE_STATUSES = ['draft', 'review', 'published', 'rejected'] as const

export const KP_NAMES = [
  'head',
  'mouth',
  'center',
  'left-shoulder',
  'right-shoulder',
  'left-hand',
  'right-hand',
  'left-foot',
  'right-foot',
  'waist',
] as const

export type KPName = (typeof KP_NAMES)[number]
export type ResourceKindValue = (typeof RESOURCE_KINDS)[number]
export type ResourceStatusValue = (typeof RESOURCE_STATUSES)[number]

// ─── 키포인트 스키마 ──────────────────────────────────────────────────────────

export const keypointSchema = z.object({
  name: z.enum(KP_NAMES),
  x: z.number().min(0).max(1),
  y: z.number().min(0).max(1),
  weight: z.number().min(0).max(1).optional(),
  inferred: z.boolean().optional(),
})
export type Keypoint = z.infer<typeof keypointSchema>

// ─── PoseMeta 스키마 ──────────────────────────────────────────────────────────

export const poseMetaSchema = z.object({
  bodyType: z.enum(['M', 'F', 'child', 'beast', 'unknown']).optional(),
  view: z.enum(['front', 'side', 'back', 'three-quarter']).optional(),
  /** 표준 액션 키 ('걷기', '놀람' 등) */
  action: z.string().min(1).max(50).optional(),
  keypoints: z.array(keypointSchema).default([]),
  bbox: z.object({ x: z.number(), y: z.number(), w: z.number(), h: z.number() }).optional(),
  anchorPoint: z.object({ x: z.number(), y: z.number() }).optional(),
  flippable: z.boolean().default(true),
  tintMaskUrl: z.string().url().optional(),
  styleVariants: z.array(z.string()).default([]),
})
export type PoseMeta = z.infer<typeof poseMetaSchema>

// ─── Resource 업데이트 스키마 ─────────────────────────────────────────────────

export const resourceUpdateSchema = z.object({
  meta: z.union([poseMetaSchema, z.object({}).passthrough()]).optional(),
  tags: z.array(z.string().min(1).max(30)).max(20).optional(),
  status: z.enum(RESOURCE_STATUSES).optional(),
})
export type ResourceUpdate = z.infer<typeof resourceUpdateSchema>

// ─── 신규 업로드 (단건 PNG) 스키마 ───────────────────────────────────────────

export const resourceUploadSchema = z.object({
  kind: z.enum(RESOURCE_KINDS),
  ownerType: z.enum(['system', 'creator']).default('system'),
  meta: z.union([poseMetaSchema.partial(), z.object({}).passthrough()]).optional(),
  tags: z.array(z.string()).default([]),
})
export type ResourceUpload = z.infer<typeof resourceUploadSchema>

// ─── 상태 전환 스키마 ─────────────────────────────────────────────────────────

export const resourceRejectSchema = z.object({
  reason: z.string().min(5).max(500),
})
export type ResourceReject = z.infer<typeof resourceRejectSchema>

// ─── 일괄 액션 스키마 ─────────────────────────────────────────────────────────

export const resourceBulkSchema = z.object({
  ids: z.array(z.string()).min(1).max(100),
  action: z.enum(['publish', 'reject', 'delete', 'tag-add', 'tag-remove']),
  reason: z.string().optional(), // reject
  tags: z.array(z.string()).optional(), // tag-add / tag-remove
})
export type ResourceBulk = z.infer<typeof resourceBulkSchema>

// ─── 키포인트 보정 스키마 ─────────────────────────────────────────────────────

export const resourceKeypointsSchema = z.object({
  keypoints: z.array(keypointSchema).min(1).max(10),
})
export type ResourceKeypoints = z.infer<typeof resourceKeypointsSchema>

// ─── 목록 쿼리 타입 (API 응답) ───────────────────────────────────────────────

export interface ResourceListFacets {
  byKind: Record<string, number>
  byStatus: Record<string, number>
  byOwnerType: Record<string, number>
}

export interface ResourceListResponse {
  data: ResourceRow[]
  totalCount: number
  facets: ResourceListFacets
}

/** API 응답 Resource 행 (UI 전용, Prisma 타입과 분리) */
export interface ResourceRow {
  id: string
  slug: string
  originalFilename: string
  kind: string
  format: string
  ownerType: string
  ownerId: string | null
  fileUrl: string
  thumbUrl: string | null
  variants: Record<string, string> | null
  width: number | null
  height: number | null
  masterDpi: number | null
  lowDpi: boolean
  meta: Record<string, unknown>
  tags: string[]
  status: string
  createdAt: string
  updatedAt: string
}
