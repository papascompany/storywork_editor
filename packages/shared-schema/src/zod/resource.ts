import { z } from 'zod'

import {
  OwnerTypeSchema,
  ResourceFormatSchema,
  ResourceKindSchema,
  ResourceStatusSchema,
} from './enums.js'

// ─────────────────────────────────────────────
// KP (Keypoint) — 0..1 정규화 좌표
// ─────────────────────────────────────────────

export const KPNameSchema = z.enum([
  'head',
  'mouth',
  'neck',
  'left_shoulder',
  'right_shoulder',
  'left_elbow',
  'right_elbow',
  'left_wrist',
  'right_wrist',
  'left_hand',
  'right_hand',
  'torso',
  'center',
  'hip',
  'left_hip',
  'right_hip',
  'left_knee',
  'right_knee',
  'left_ankle',
  'right_ankle',
  'left_foot',
  'right_foot',
  'left_eye',
  'right_eye',
  'chest',
])
export type KPName = z.infer<typeof KPNameSchema>

/// 키포인트 — 0..1 정규화 좌표. viewBox 1024 기준
const normalizedCoord = z.number().min(0).max(1)

export const KPSchema = z.object({
  name: KPNameSchema,
  /// 0..1 정규화 x 좌표
  x: normalizedCoord,
  /// 0..1 정규화 y 좌표
  y: normalizedCoord,
  weight: z.number().min(0).max(1).optional(),
  /// AI 추정 여부 — 사이드카 미보유 시 자동 추정 (CLAUDE.md §1)
  inferred: z.boolean().optional(),
})
export type KP = z.infer<typeof KPSchema>

// ─────────────────────────────────────────────
// Bounding Box — 0..1 정규화
// ─────────────────────────────────────────────

const BBoxSchema = z.object({
  x: normalizedCoord,
  y: normalizedCoord,
  w: z.number().min(0).max(1),
  h: z.number().min(0).max(1),
})

const AnchorPointSchema = z.object({
  x: normalizedCoord,
  y: normalizedCoord,
})

// ─────────────────────────────────────────────
// PoseMeta — kind='pose' 일 때 Resource.meta
// PNG/SVG 모두 동일 스키마 (ADR-0011)
// ─────────────────────────────────────────────

export const PoseMetaSchema = z.object({
  bodyType: z.union([z.enum(['M', 'F', 'child', 'beast']), z.string().min(1)]),
  view: z.enum(['front', 'side', 'back', 'three-quarter']),
  action: z.string().min(1),
  mood: z.string().optional(),
  bbox: BBoxSchema,
  anchorPoint: AnchorPointSchema,
  flippable: z.boolean(),
  /// 최소 1개 이상의 키포인트 (자동 추정 최소 3점: head/mouth/center)
  keypoints: z.array(KPSchema).min(1),
  styleVariants: z.array(z.string()).optional(),
})
export type PoseMeta = z.infer<typeof PoseMetaSchema>

// ─────────────────────────────────────────────
// BgMeta — kind='background' 일 때 Resource.meta
// ─────────────────────────────────────────────

export const BgMetaSchema = z.object({
  setting: z.string().optional(),
  timeOfDay: z.string().optional(),
  mood: z.string().optional(),
})
export type BgMeta = z.infer<typeof BgMetaSchema>

// ─────────────────────────────────────────────
// BubbleMeta — kind='speech_bubble' 일 때 Resource.meta
// ─────────────────────────────────────────────

export const BubbleMetaSchema = z.object({
  shape: z.string().optional(),
  tailDirection: z.string().optional(),
})
export type BubbleMeta = z.infer<typeof BubbleMetaSchema>

// ─────────────────────────────────────────────
// ResourceMeta — kind별 다형
// ─────────────────────────────────────────────

export const ResourceMetaSchema = z.union([
  PoseMetaSchema,
  BgMetaSchema,
  BubbleMetaSchema,
  z.record(z.string(), z.unknown()),
])
export type ResourceMeta = z.infer<typeof ResourceMetaSchema>

// ─────────────────────────────────────────────
// ResourceVariants — sharp 파생본
// ─────────────────────────────────────────────

export const ResourceVariantsSchema = z.object({
  webp1x: z.string().url().optional(),
  webp2x: z.string().url().optional(),
  avif: z.string().url().optional(),
  thumb: z.string().url().optional(),
})
export type ResourceVariants = z.infer<typeof ResourceVariantsSchema>

// ─────────────────────────────────────────────
// ResourceLicense — 라이선스 정보
// ─────────────────────────────────────────────

export const ResourceLicenseSchema = z.object({
  id: z.string().min(1),
  holder: z.string().min(1),
  terms: z.string().min(1),
  source: z.string().optional(),
  commercialUse: z.boolean().optional(),
  redistribution: z.string().optional(),
  attributionRequired: z.boolean().optional(),
  note: z.string().optional(),
})
export type ResourceLicense = z.infer<typeof ResourceLicenseSchema>

// ─────────────────────────────────────────────
// Resource — 베이스 스키마 (superRefine 없음)
// CreateResourceSchema 는 이 베이스에서 파생
// ─────────────────────────────────────────────

const ResourceBaseSchema = z.object({
  id: z.string().cuid(),
  slug: z
    .string()
    .min(1)
    .max(200)
    .regex(/^[a-z0-9_-]+$/, 'slug must be URL-safe lowercase'),
  originalFilename: z.string().min(1),
  kind: ResourceKindSchema,
  format: ResourceFormatSchema.default('png'),
  ownerType: OwnerTypeSchema,
  ownerId: z.string().cuid().nullable().optional(),
  fileUrl: z.string().url(),
  thumbUrl: z.string().url().nullable().optional(),
  variants: ResourceVariantsSchema.nullable().optional(),
  width: z.number().int().positive().nullable().optional(),
  height: z.number().int().positive().nullable().optional(),
  /// PNG 한정. SVG=null (ADR-0011)
  masterDpi: z.number().int().positive().nullable().optional(),
  /// true 면 ai-layout 이 페이지 1/2 이하 슬롯에만 배치 (ADR-0011a)
  lowDpi: z.boolean().default(false),
  tintMaskUrl: z.string().url().nullable().optional(),
  meta: z.record(z.string(), z.unknown()),
  tags: z.array(z.string()),
  tagsBootstrap: z.array(z.string()),
  license: ResourceLicenseSchema,
  licenseSource: z.enum(['folder-default', 'sidecar', 'override']),
  /// kind='pose' 일 때 소속 캐릭터 ID (선택)
  characterId: z.string().cuid().nullable().optional(),
  status: ResourceStatusSchema.default('draft'),
  reviewer: z.string().nullable().optional(),
  reviewNote: z.string().nullable().optional(),
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
})

// ─────────────────────────────────────────────
// Resource — 비즈니스 규칙 superRefine 적용
// ─────────────────────────────────────────────

export const ResourceSchema = ResourceBaseSchema.superRefine((data, ctx) => {
  // lowDpi 자동 태깅 비즈니스 규칙 검증 (ADR-0011a)
  // lowDpi=true 인데 width/height 가 모두 1500 이상이면 경고
  if (
    data.lowDpi &&
    data.width !== undefined &&
    data.width !== null &&
    data.height !== undefined &&
    data.height !== null &&
    data.width >= 1500 &&
    data.height >= 1500
  ) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['lowDpi'],
      message:
        'lowDpi=true 이지만 width/height가 모두 1500px 이상입니다. lowDpi 태그를 재검토하세요.',
    })
  }
  // creator 소유 리소스는 ownerId 필수
  if (data.ownerType === 'creator' && !data.ownerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ownerId'],
      message: 'ownerType=creator 인 경우 ownerId 가 필수입니다.',
    })
  }
  // SVG 는 masterDpi 불필요
  if (data.format === 'svg' && data.masterDpi !== null && data.masterDpi !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['masterDpi'],
      message: 'SVG 포맷 리소스에는 masterDpi 를 설정하지 않습니다 (ADR-0011).',
    })
  }
})
export type Resource = z.infer<typeof ResourceSchema>

// ─────────────────────────────────────────────
// CreateResourceSchema — 베이스에서 파생 (Zod v4: superRefine 후 omit 불가)
// ─────────────────────────────────────────────

export const CreateResourceSchema = ResourceBaseSchema.omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).superRefine((data, ctx) => {
  if (data.ownerType === 'creator' && !data.ownerId) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['ownerId'],
      message: 'ownerType=creator 인 경우 ownerId 가 필수입니다.',
    })
  }
  if (data.format === 'svg' && data.masterDpi !== null && data.masterDpi !== undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['masterDpi'],
      message: 'SVG 포맷 리소스에는 masterDpi 를 설정하지 않습니다 (ADR-0011).',
    })
  }
})
export type CreateResource = z.infer<typeof CreateResourceSchema>
