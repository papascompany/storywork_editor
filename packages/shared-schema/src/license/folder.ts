import { z } from 'zod'

// ─────────────────────────────────────────────
// FolderLicense — data/poses/raw/LICENSE.json 검증 스키마
// ─────────────────────────────────────────────

const LicenseDetailSchema = z.object({
  id: z.string().min(1),
  holder: z.string().min(1),
  terms: z.string().min(1),
  source: z.string().optional(),
  commercialUse: z.boolean(),
  redistribution: z.string().optional(),
  attributionRequired: z.boolean(),
  note: z.string().optional(),
})
export type LicenseDetail = z.infer<typeof LicenseDetailSchema>

const AssetDefaultSchema = z.object({
  kind: z.string().min(1),
  format: z.string().min(1),
  ownerType: z.string().min(1),
  defaultStatus: z.string().min(1),
  tagsBootstrap: z.array(z.string()).optional(),
})
export type AssetDefault = z.infer<typeof AssetDefaultSchema>

const SubfolderRuleSchema = z.object({
  categoryTag: z.string().optional(),
  include: z.boolean(),
  reason: z.string().optional(),
})
export type SubfolderRule = z.infer<typeof SubfolderRuleSchema>

const IngestConfigSchema = z.object({
  recursive: z.boolean().default(false),
  ignorePatterns: z.array(z.string()).optional(),
  subfolderRules: z.record(z.string(), SubfolderRuleSchema).optional(),
})
export type IngestConfig = z.infer<typeof IngestConfigSchema>

/// data/poses/raw/LICENSE.json 전체 스키마
export const FolderLicenseSchema = z.object({
  $schema: z.string().optional(),
  v: z.literal(1),
  scope: z.literal('folder-default'),
  appliesTo: z.array(z.string()).min(1),
  license: LicenseDetailSchema,
  asset: AssetDefaultSchema,
  ingest: IngestConfigSchema.optional(),
  _comment: z.array(z.string()).optional(),
})
export type FolderLicense = z.infer<typeof FolderLicenseSchema>

/// LICENSE.json 파일 내용을 파싱하고 타입 반환
export function parseFolderLicense(raw: unknown): FolderLicense {
  return FolderLicenseSchema.parse(raw)
}
