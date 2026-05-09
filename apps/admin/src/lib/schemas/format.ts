/**
 * apps/admin/src/lib/schemas/format.ts
 *
 * Format (인쇄 판형) Zod 스키마 — admin 전용 입력 스키마.
 * shared-schema 의 FormatSchema 는 DB 레코드 전체(id/timestamps 포함)를 다루므로
 * admin 폼 입력에 맞는 별도 스키마를 정의한다.
 */
import { z } from 'zod'

export const formatInputSchema = z.object({
  name: z.string().min(2).max(50),
  widthMm: z.number().int().min(50).max(500),
  heightMm: z.number().int().min(50).max(500),
  dpi: z.union([z.literal(72), z.literal(150), z.literal(300), z.literal(600)]),
  bleedMm: z.number().min(0).max(10).default(3),
  safeMm: z.number().min(0).max(20).default(5),
  /** 그리드 정의 — 자유 JSON, 후속 단계에서 슬롯 가이드용 */
  gridDef: z
    .object({
      cols: z.number().int().min(1).max(12).optional(),
      rows: z.number().int().min(1).max(12).optional(),
      gutterMm: z.number().min(0).max(20).optional(),
    })
    .default({}),
})

export type FormatInput = z.input<typeof formatInputSchema>
export type FormatOutput = z.output<typeof formatInputSchema>

// PATCH 용 — 모든 필드 optional
export const formatPatchSchema = formatInputSchema.partial()
export type FormatPatch = z.input<typeof formatPatchSchema>

// ─── 4종 프리셋 ──────────────────────────────────────────────────────────────

export interface FormatPreset {
  id: string
  name: string
  description: string
  values: FormatOutput
}

export const FORMAT_PRESETS: FormatPreset[] = [
  {
    id: 'b5-novel',
    name: 'B5 (단행본)',
    description: '일반 만화/소설',
    values: {
      name: 'B5 단행본',
      widthMm: 130,
      heightMm: 200,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
    },
  },
  {
    id: 'a5-artbook',
    name: 'A5 (작품집)',
    description: '작품집/매거진',
    values: {
      name: 'A5 작품집',
      widthMm: 148,
      heightMm: 210,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
    },
  },
  {
    id: 'square',
    name: '정사각 1:1',
    description: '인스타 카드뉴스',
    values: {
      name: '정사각 1:1',
      widthMm: 150,
      heightMm: 150,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
    },
  },
  {
    id: 'mobile-story',
    name: '세로형 (모바일)',
    description: '모바일 스토리',
    values: {
      name: '세로형 모바일',
      widthMm: 90,
      heightMm: 150,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
    },
  },
]
