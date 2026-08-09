/**
 * apps/admin/src/lib/schemas/format.ts
 *
 * Format (인쇄 판형) Zod 스키마 — admin 전용 입력 스키마.
 * shared-schema 의 FormatSchema 는 DB 레코드 전체(id/timestamps 포함)를 다루므로
 * admin 폼 입력에 맞는 별도 스키마를 정의한다.
 */
import { z } from 'zod'

/**
 * 표지 독립 치수(mm) — 비우면 판형 치수 상속.
 * number 위젯이 빈 입력 시 '' 를 보내므로 preprocess 로 '' → null 정규화.
 */
const coverDimensionMm = z
  .preprocess(
    (v) => (v === '' || v === undefined ? null : v),
    z.number().min(10).max(1500).nullable(),
  )
  .optional()

export const formatInputSchema = z.object({
  name: z.string().min(2).max(50),
  /**
   * 단위계 (MODE-02 / ADR-0017). mm=인쇄(POD), px=웹툰 화면.
   * unit='px' 이면 widthMm/heightMm 는 픽셀값(필드명은 레거시)이고 heightMm 는
   * 스트립 세그먼트 기본 높이다. 단위별 치수 범위는 아래 superRefine 에서 검증.
   */
  unit: z.enum(['mm', 'px']).default('mm'),
  widthMm: z.number().int().positive(),
  heightMm: z.number().int().positive(),
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
  // ── 표지(Cover) 설정 — 기본 정책 + 활성화 (편집기 소비는 phase 2) ──
  /** 표지 사용 유무(기본값) */
  coverEnabled: z.boolean().default(false),
  /** 표지 독립 폭(mm) — null/비우면 widthMm 사용 */
  coverWidthMm: coverDimensionMm,
  /** 표지 독립 높이(mm) — null/비우면 heightMm 사용 */
  coverHeightMm: coverDimensionMm,
  /** 판형 활성화/비활성화 — false 면 편집기 판형 선택에서 숨김(phase 2) */
  isActive: z.boolean().default(true),
})

/** 단위별 치수 허용 범위 — mm 는 인쇄 실물, px 는 웹툰 화면 규격 */
const DIMENSION_RANGE = {
  mm: { min: 50, max: 500, label: 'mm 판형은 50~500' },
  px: { min: 200, max: 8192, label: 'px 판형은 200~8192' },
} as const

/** 단위별 치수·인쇄 필드 검증을 붙인 최종 입력 스키마 (POST/PATCH 공용 규칙) */
function validateByUnit(
  data: { unit: 'mm' | 'px'; widthMm: number; heightMm: number; bleedMm: number; safeMm: number },
  ctx: z.RefinementCtx,
): void {
  const range = DIMENSION_RANGE[data.unit]
  for (const field of ['widthMm', 'heightMm'] as const) {
    const v = data[field]
    if (v < range.min || v > range.max) {
      ctx.addIssue({ code: 'custom', path: [field], message: range.label })
    }
  }
  // bleed/safe 는 인쇄 개념 — px(웹툰) 판형에 값이 있으면 인쇄 경로 오용의 씨앗이 된다
  if (data.unit === 'px' && (data.bleedMm !== 0 || data.safeMm !== 0)) {
    ctx.addIssue({
      code: 'custom',
      path: ['bleedMm'],
      message: 'px(웹툰) 판형은 재단/안전 여백이 없습니다 — 0 으로 두세요',
    })
  }
}

export const formatInputSchemaWithUnitCheck = formatInputSchema.superRefine(validateByUnit)

export type FormatInput = z.input<typeof formatInputSchema>
export type FormatOutput = z.output<typeof formatInputSchema>

// PATCH 용 — 모든 필드 optional.
// unit 은 제외한다: 단위계를 바꾸면 이 판형을 이미 참조하는 프로젝트의 치수 해석이
// 통째로 바뀐다(130mm ↔ 130px). 단위계는 생성 시에만 확정.
export const formatPatchSchema = formatInputSchema.omit({ unit: true }).partial()
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
      unit: 'mm',
      widthMm: 130,
      heightMm: 200,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
      coverEnabled: false,
      isActive: true,
    },
  },
  {
    id: 'a5-artbook',
    name: 'A5 (작품집)',
    description: '작품집/매거진',
    values: {
      name: 'A5 작품집',
      unit: 'mm',
      widthMm: 148,
      heightMm: 210,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
      coverEnabled: false,
      isActive: true,
    },
  },
  {
    id: 'square',
    name: '정사각 1:1',
    description: '인스타 카드뉴스',
    values: {
      name: '정사각 1:1',
      unit: 'mm',
      widthMm: 150,
      heightMm: 150,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
      coverEnabled: false,
      isActive: true,
    },
  },
  {
    id: 'mobile-story',
    name: '세로형 (모바일)',
    description: '모바일 스토리',
    values: {
      name: '세로형 모바일',
      unit: 'mm',
      widthMm: 90,
      heightMm: 150,
      dpi: 300,
      bleedMm: 3,
      safeMm: 5,
      gridDef: {},
      coverEnabled: false,
      isActive: true,
    },
  },
]
