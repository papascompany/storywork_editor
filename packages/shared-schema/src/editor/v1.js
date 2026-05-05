import { z } from 'zod'
// ─────────────────────────────────────────────
// PageJsonV1 — fabricJson 직렬화 스키마
// erd.md §4 기준. 변경 시 migration 파일 동반 필수
// ─────────────────────────────────────────────
export const SCHEMA_VERSION = 1
export const LayerKindSchema = z.enum([
  'pose',
  'bg',
  'bubble',
  'prop',
  'text',
  'fx',
  'group',
  'decoration',
])
export const LayerDataSchema = z.object({
  resourceId: z.string().optional(),
  slotId: z.string().optional(),
  locked: z.boolean().optional(),
  visible: z.boolean().optional(),
  meta: z.record(z.string(), z.unknown()).optional(),
})
const LayerJsonSchemaBase = z.object({
  id: z.string().min(1),
  kind: LayerKindSchema,
  data: LayerDataSchema,
  fabric: z.record(z.string(), z.unknown()),
})
export const LayerJsonSchema = LayerJsonSchemaBase.extend({
  children: z.lazy(() => z.array(LayerJsonSchema)).optional(),
})
// ─────────────────────────────────────────────
// PageJsonV1
// ─────────────────────────────────────────────
export const PageFormatSchema = z.object({
  id: z.string().min(1),
  widthMm: z.number().positive(),
  heightMm: z.number().positive(),
  dpi: z.number().int().min(72).max(1200),
})
export const PageJsonV1Schema = z.object({
  /// 스키마 버전 — 항상 1
  v: z.literal(1),
  format: PageFormatSchema,
  layers: z.array(LayerJsonSchema),
})
/// 빈 페이지 초기값 생성 헬퍼
export function emptyPageJson(format) {
  return {
    v: 1,
    format,
    layers: [],
  }
}
/// fabricJson 필드에서 PageJsonV1 파싱 (런타임 검증)
export function parsePageJson(raw) {
  return PageJsonV1Schema.parse(raw)
}
/// v1 이 아닌 경우 마이그레이션 훅 슬롯
/// 실제 마이그레이터는 src/editor/migrations/ 에 위치
export function migratePageJson(raw) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const obj = raw
  if (obj && typeof obj === 'object' && obj.v === 1) {
    return PageJsonV1Schema.parse(obj)
  }
  // 향후 v2, v3 마이그레이터 체인 삽입 위치
  throw new Error(`Unsupported PageJson version: ${String(obj?.v)}`)
}
//# sourceMappingURL=v1.js.map
