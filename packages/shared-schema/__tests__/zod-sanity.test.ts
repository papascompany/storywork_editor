import { describe, expect, it } from 'vitest'

import {
  AuditLogSchema,
  ContestSeasonSchema,
  CreateResourceSchema,
  FormatSchema,
  JobStatusSchema,
  LineSchema,
  PageSchema,
  PoseMetaSchema,
  ProjectSchema,
  PublishJobSchema,
  ResourceKindSchema,
  ResourceSchema,
  RoleSchema,
  SceneDocSchema,
  SceneSchema,
  ShowcaseSchema,
  SubscriptionSchema,
  TemplateSchema,
} from '../src/zod/index.js'

// ─────────────────────────────────────────────
// Enum sanity
// ─────────────────────────────────────────────

describe('Enum schemas', () => {
  it('RoleSchema 정상 값 파싱', () => {
    expect(RoleSchema.parse('user')).toBe('user')
    expect(RoleSchema.parse('superadmin')).toBe('superadmin')
  })

  it('RoleSchema 비정상 값 거부', () => {
    expect(RoleSchema.safeParse('admin').success).toBe(false)
  })

  it('ResourceKindSchema pose 파싱', () => {
    expect(ResourceKindSchema.parse('pose')).toBe('pose')
  })

  it('JobStatusSchema queued 파싱', () => {
    expect(JobStatusSchema.parse('queued')).toBe('queued')
  })
})

// ─────────────────────────────────────────────
// Format 스키마
// ─────────────────────────────────────────────

describe('FormatSchema', () => {
  const baseFormat = {
    id: 'cltest1234567890123456',
    name: 'A4',
    widthMm: 210,
    heightMm: 297,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('정상 Format 파싱', () => {
    const result = FormatSchema.safeParse(baseFormat)
    expect(result.success).toBe(true)
  })

  it('widthMm 음수 거부', () => {
    expect(FormatSchema.safeParse({ ...baseFormat, widthMm: -1 }).success).toBe(false)
  })

  it('dpi 범위 초과 거부', () => {
    expect(FormatSchema.safeParse({ ...baseFormat, dpi: 2000 }).success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// PoseMeta 스키마
// ─────────────────────────────────────────────

describe('PoseMetaSchema', () => {
  const validMeta = {
    bodyType: 'F',
    view: 'front',
    action: '놀람',
    bbox: { x: 0.1, y: 0.05, w: 0.8, h: 0.9 },
    anchorPoint: { x: 0.5, y: 0.9 },
    flippable: true,
    keypoints: [
      { name: 'head', x: 0.5, y: 0.1 },
      { name: 'center', x: 0.5, y: 0.5 },
    ],
  }

  it('정상 PoseMeta 파싱', () => {
    expect(PoseMetaSchema.safeParse(validMeta).success).toBe(true)
  })

  it('keypoints x 좌표 1 초과 거부', () => {
    const bad = {
      ...validMeta,
      keypoints: [{ name: 'head', x: 1.1, y: 0.1 }],
    }
    expect(PoseMetaSchema.safeParse(bad).success).toBe(false)
  })

  it('bbox w+x > 1 이어도 Zod 통과 (비즈니스 룰은 인입 파이프라인에서 별도 검증)', () => {
    // bbox 는 각 필드 0..1 범위만 체크 (합계는 체크 안 함)
    const borderCase = {
      ...validMeta,
      bbox: { x: 0.5, y: 0.5, w: 1.0, h: 1.0 }, // 모두 max 값
    }
    expect(PoseMetaSchema.safeParse(borderCase).success).toBe(true)
  })

  it('anchorPoint 좌표 0..1 경계값 허용', () => {
    const edgeCase = { ...validMeta, anchorPoint: { x: 0, y: 1 } }
    expect(PoseMetaSchema.safeParse(edgeCase).success).toBe(true)
  })
})

// ─────────────────────────────────────────────
// Resource 스키마
// ─────────────────────────────────────────────

describe('ResourceSchema', () => {
  const baseResource = {
    id: 'cltest1234567890123456',
    slug: 'pose-woman-front-surprise',
    originalFilename: 'pose_woman_front_surprise.png',
    kind: 'pose',
    format: 'png',
    ownerType: 'system',
    fileUrl: 'https://cdn.example.com/poses/test.png',
    meta: {
      bodyType: 'F',
      view: 'front',
      action: '놀람',
      bbox: { x: 0.1, y: 0.05, w: 0.8, h: 0.9 },
      anchorPoint: { x: 0.5, y: 0.9 },
      flippable: true,
      keypoints: [{ name: 'head', x: 0.5, y: 0.1 }],
    },
    tags: ['포즈', '여성', '놀람'],
    tagsBootstrap: ['pose', 'woman', 'surprise'],
    license: {
      id: 'storywork-internal-2026',
      holder: 'StoryWork',
      terms: 'all-rights',
      commercialUse: true,
      attributionRequired: false,
    },
    licenseSource: 'folder-default',
    lowDpi: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  }

  it('정상 Resource 파싱', () => {
    const result = ResourceSchema.safeParse(baseResource)
    expect(result.success).toBe(true)
  })

  it('slug 에 대문자 포함 시 거부', () => {
    const result = ResourceSchema.safeParse({ ...baseResource, slug: 'Pose-Woman' })
    expect(result.success).toBe(false)
  })

  it('fileUrl 이 유효한 URL 이 아니면 거부', () => {
    const result = ResourceSchema.safeParse({ ...baseResource, fileUrl: 'not-a-url' })
    expect(result.success).toBe(false)
  })

  it('creator ownerType 인데 ownerId 없으면 superRefine 에러', () => {
    const result = ResourceSchema.safeParse({
      ...baseResource,
      ownerType: 'creator',
      ownerId: undefined,
    })
    expect(result.success).toBe(false)
  })

  it('SVG 포맷에 masterDpi 설정 시 superRefine 에러', () => {
    const result = ResourceSchema.safeParse({
      ...baseResource,
      format: 'svg',
      masterDpi: 300,
    })
    expect(result.success).toBe(false)
  })

  it('lowDpi=true 인데 width/height 모두 1500 이상이면 superRefine 경고 이슈 발생', () => {
    const result = ResourceSchema.safeParse({
      ...baseResource,
      lowDpi: true,
      width: 1500,
      height: 1500,
    })
    // superRefine 의 custom issue 는 safeParse 실패로 처리됨
    expect(result.success).toBe(false)
  })

  it('CreateResourceSchema id/timestamps 없이도 파싱', () => {
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = baseResource
    const result = CreateResourceSchema.safeParse(rest)
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────
// Project 스키마
// ─────────────────────────────────────────────

describe('ProjectSchema', () => {
  it('정상 Project 파싱', () => {
    const result = ProjectSchema.safeParse({
      id: 'cltest1234567890123456',
      ownerId: 'cltest1234567890123456',
      formatId: 'cltest1234567890123456',
      title: '내 스토리보드',
      status: 'drafting',
      settings: { autoSave: true, language: 'ko' },
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })

  it('title 빈 문자열 거부', () => {
    const result = ProjectSchema.safeParse({
      id: 'cltest1234567890123456',
      ownerId: 'cltest1234567890123456',
      formatId: 'cltest1234567890123456',
      title: '',
      status: 'drafting',
      settings: {},
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// ContestSeason 날짜 검증
// ─────────────────────────────────────────────

describe('ContestSeasonSchema', () => {
  it('closesAt 이 opensAt 이전이면 거부', () => {
    const result = ContestSeasonSchema.safeParse({
      id: 'cltest1234567890123456',
      name: '2026 공모전',
      opensAt: new Date('2026-06-01'),
      closesAt: new Date('2026-05-01'), // 이전 날짜
      rules: '규칙...',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it('정상 ContestSeason 파싱', () => {
    const result = ContestSeasonSchema.safeParse({
      id: 'cltest1234567890123456',
      name: '2026 공모전',
      opensAt: new Date('2026-04-01'),
      closesAt: new Date('2026-06-01'),
      rules: '공모전 규칙',
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(true)
  })
})

// ─────────────────────────────────────────────
// Showcase mode 검증
// ─────────────────────────────────────────────

describe('ShowcaseSchema', () => {
  it('mode=contest 인데 contestId 없으면 실패', () => {
    const result = ShowcaseSchema.safeParse({
      id: 'cltest1234567890123456',
      projectId: 'cltest1234567890123456',
      ownerId: 'cltest1234567890123456',
      mode: 'contest',
      // contestId 없음
      likes: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// AuditLog target 형식 검증
// ─────────────────────────────────────────────

describe('AuditLogSchema', () => {
  it('target 형식 위반 거부', () => {
    const result = AuditLogSchema.safeParse({
      id: 'cltest1234567890123456',
      actorId: 'cltest1234567890123456',
      action: 'resource.status_changed',
      target: 'invalid-format', // entity:id 형식 아님
      payload: {},
      at: new Date(),
    })
    expect(result.success).toBe(false)
  })

  it('정상 AuditLog 파싱', () => {
    const result = AuditLogSchema.safeParse({
      id: 'cltest1234567890123456',
      actorId: 'cltest1234567890123456',
      action: 'resource.status_changed',
      target: 'resource:cltest1234567890123456',
      payload: { from: 'draft', to: 'published' },
      at: new Date(),
    })
    expect(result.success).toBe(true)
  })
})

// 누락된 import 확인을 위한 더미 사용
const _schemas = [
  TemplateSchema,
  PageSchema,
  SceneDocSchema,
  SceneSchema,
  LineSchema,
  PublishJobSchema,
  SubscriptionSchema,
]
expect(_schemas).toBeDefined()
