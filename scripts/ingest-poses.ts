/* eslint-disable no-console */
/**
 * M2-01/M2-02 — PNG 인입 파이프라인
 *
 * 실행 예:
 *   pnpm tsx scripts/ingest-poses.ts --dry-run
 *   pnpm tsx scripts/ingest-poses.ts --limit 5
 *   pnpm tsx scripts/ingest-poses.ts --reupload
 *   pnpm tsx scripts/ingest-poses.ts --limit 5 --reupload
 *   pnpm tsx scripts/ingest-poses.ts --no-keypoints          # 키포인트 추정 스킵
 *   pnpm tsx scripts/ingest-poses.ts --review-threshold 0.6  # confidence 임계값 조정
 */

import fs from 'node:fs'
import path from 'node:path'

import { PrismaClient } from '@prisma/client'
import type { FolderLicense, SubfolderRule } from '@storywork/schema/license'
import type { PoseSidecar } from '@storywork/schema/license'
import { parseFolderLicense } from '@storywork/schema/license'
import { parsePoseSidecar } from '@storywork/schema/license'
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { Command } from 'commander'
import pLimit from 'p-limit'
import pc from 'picocolors'

import { tagFromFilename } from '../packages/ai-recommend/src/filename-tagger.js'

import { embedText, embedImage, combine, toVectorLiteral } from './lib/embed.js'
import { estimateKeypoints } from './lib/estimate-keypoints.js'
// slugWithSuffix 는 단순 함수이므로 직접 정의
function slugWithSuffix(slug: string, index: number): string {
  return `${slug}-${index}`
}

// ─────────────────────────────────────────────
// Slug 정규화 (인라인 — tsx tsconfig paths 충돌 방지)
// packages/shared-utils/src/slug.ts 와 동일 로직
// ─────────────────────────────────────────────
const _CHOSEONG = [
  'g',
  'gg',
  'n',
  'd',
  'dd',
  'r',
  'm',
  'b',
  'bb',
  's',
  'ss',
  '',
  'j',
  'jj',
  'ch',
  'k',
  't',
  'p',
  'h',
]
const _JUNGSEONG = [
  'a',
  'ae',
  'ya',
  'yae',
  'eo',
  'e',
  'yeo',
  'ye',
  'o',
  'wa',
  'wae',
  'oe',
  'yo',
  'u',
  'weo',
  'we',
  'wi',
  'yu',
  'eu',
  'ui',
  'i',
]
const _JONGSEONG = [
  '',
  'g',
  'gg',
  'gs',
  'n',
  'nj',
  'nh',
  'r',
  'rg',
  'rm',
  'rb',
  'rs',
  'rt',
  'rp',
  'rh',
  'm',
  'b',
  'bs',
  's',
  'ss',
  'ng',
  'j',
  'ch',
  'k',
  't',
  'p',
  'h',
]

function _syllableToRoman(code: number): string {
  const offset = code - 0xac00
  if (offset < 0 || offset > 11171) return ''
  const jongIdx = offset % 28
  const jungIdx = Math.floor(offset / 28) % 21
  const choIdx = Math.floor(offset / 28 / 21)
  return (_CHOSEONG[choIdx] ?? '') + (_JUNGSEONG[jungIdx] ?? '') + (_JONGSEONG[jongIdx] ?? '')
}

function _koreanToRoman(str: string): string {
  // macOS 파일시스템이 NFD로 저장 → NFC로 정규화하여 완성형 음절로 변환
  const normalized = str.normalize('NFC')
  let result = ''
  const KO_START = 44032 // 0xac00
  const KO_END = 55203 // 0xd7a3
  const chars = Array.from(normalized)
  for (let i = 0; i < chars.length; i++) {
    const char = chars[i] ?? ''
    const code = char.codePointAt(0) ?? 0
    if (code >= KO_START && code <= KO_END) {
      result += _syllableToRoman(code)
    } else if (code >= 12593 && code <= 12686) {
      // 호환 자모 낱자 — 제거
      result += ''
    } else {
      result += char
    }
  }
  return result
}

function slugifyFilename(filename: string): string {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  const romanized = _koreanToRoman(withoutExt)
  const noBrackets = romanized.replace(/[()[\]{}（）]/g, '-')
  const lower = noBrackets.toLowerCase()
  const hyphened = lower.replace(/[^a-z0-9-]/g, '-')
  const deduped = hyphened.replace(/-{2,}/g, '-')
  return deduped.replace(/^-+|-+$/g, '')
}

// ─────────────────────────────────────────────
// 환경변수 로드 (tsx 실행 시 .env.local 에서 읽음)
// ─────────────────────────────────────────────

function loadEnv(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return

  const lines = fs.readFileSync(envPath, 'utf-8').split('\n')
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    // 값의 앞뒤 따옴표 제거 (single/double)
    let val = trimmed.slice(eqIdx + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

// ─────────────────────────────────────────────
// 타입 정의
// ─────────────────────────────────────────────

interface IngestOptions {
  dryRun: boolean
  limit: number | undefined
  format: 'png' | 'svg' | 'auto'
  src: string
  reupload: boolean
  concurrency: number
  /** 키포인트 추정 스킵 여부 (--no-keypoints 플래그) */
  noKeypoints: boolean
  /** confidence 임계값 (ADR-0011b 기본 0.5) */
  reviewThreshold: number
  /** 임베딩 생성 스킵 여부 (--no-embed 플래그 / 테스트용) */
  noEmbed: boolean
}

type FailureReason =
  | 'magic-bytes-invalid'
  | 'too-small'
  | 'no-license'
  | 'sidecar-invalid'
  | 'storage-error'
  | 'db-error'
  | 'unknown'

interface FailedAsset {
  filePath: string
  reason: FailureReason
  detail: string
}

interface IngestResult {
  succeeded: number
  failed: number
  skipped: number
  lowDpi: number
  withSidecar: number
  reviewQueued: number
  totalBytes: number
  elapsedMs: number
  failures: FailedAsset[]
}

// ─────────────────────────────────────────────
// 매직바이트 검증
// ─────────────────────────────────────────────

const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

export function validatePngMagicBytes(filePath: string): boolean {
  let fd: number | null = null
  try {
    fd = fs.openSync(filePath, 'r')
    const buf = Buffer.alloc(8)
    fs.readSync(fd, buf, 0, 8, 0)
    return buf.equals(PNG_MAGIC)
  } catch {
    return false
  } finally {
    if (fd !== null) fs.closeSync(fd)
  }
}

// ─────────────────────────────────────────────
// masterDpi 계산 (ADR-0011a)
// 기준: B5 최대 슬롯 257mm, lowDpi 임계 = 200dpi
// ─────────────────────────────────────────────

const FORMAT_MAX_MM = 257 // B5 긴변
const LOW_DPI_THRESHOLD = 200

export function calcMasterDpi(w: number, h: number): { masterDpi: number; lowDpi: boolean } {
  const minSide = Math.min(w, h)
  const masterDpi = Math.round((minSide / FORMAT_MAX_MM) * 25.4)
  return { masterDpi, lowDpi: masterDpi < LOW_DPI_THRESHOLD }
}

// ─────────────────────────────────────────────
// 파일 스캔 (재귀 + subfolderRules 적용)
// ─────────────────────────────────────────────

interface ScannedAsset {
  filePath: string
  relativePath: string
  subfolder: string | null
  categoryTags: string[]
}

export function scanAssets(
  srcDir: string,
  ignorePatterns: string[],
  subfolderRules: Record<string, SubfolderRule>,
): ScannedAsset[] {
  const results: ScannedAsset[] = []

  function shouldIgnore(filename: string): boolean {
    for (const pattern of ignorePatterns) {
      if (pattern.startsWith('*.')) {
        const ext = pattern.slice(1)
        if (filename.endsWith(ext)) return true
      } else {
        if (filename === pattern) return true
      }
    }
    return false
  }

  function walkDir(dir: string, subfolderName: string | null, categoryTags: string[]): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (shouldIgnore(entry.name)) continue
      if (entry.name === 'LICENSE.json') continue

      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        const rule = subfolderRules[entry.name]
        if (rule) {
          if (!rule.include) {
            // exclude 폴더 — 건너뜀
            continue
          }
          const folderTags = rule.categoryTag ? [rule.categoryTag] : []
          walkDir(fullPath, entry.name, folderTags)
        } else {
          // 룰 없는 폴더 — 루트 태그 상속으로 진입
          walkDir(fullPath, entry.name, categoryTags)
        }
        continue
      }

      if (!entry.isFile()) continue
      if (!entry.name.toLowerCase().endsWith('.png')) continue

      const relPath = path.relative(srcDir, fullPath)
      results.push({
        filePath: fullPath,
        relativePath: relPath,
        subfolder: subfolderName,
        categoryTags,
      })
    }
  }

  walkDir(srcDir, null, [])
  return results
}

// ─────────────────────────────────────────────
// Supabase Storage 버킷 초기화
// ─────────────────────────────────────────────

async function ensureBucket(supabase: SupabaseClient, bucketName: string): Promise<void> {
  const { data: existing } = await supabase.storage.getBucket(bucketName)
  if (existing) return

  const { error } = await supabase.storage.createBucket(bucketName, {
    public: true,
    fileSizeLimit: 10 * 1024 * 1024, // 10MB
  })
  if (error) throw new Error(`버킷 생성 실패: ${error.message}`)
}

// ─────────────────────────────────────────────
// Storage 업로드 헬퍼
// ─────────────────────────────────────────────

async function uploadToStorage(
  supabase: SupabaseClient,
  bucket: string,
  storagePath: string,
  data: Buffer,
  contentType: string,
  upsert = false,
): Promise<string> {
  const { error } = await supabase.storage.from(bucket).upload(storagePath, data, {
    contentType,
    upsert,
  })
  if (error) throw new Error(`Storage 업로드 실패 [${storagePath}]: ${error.message}`)

  const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(storagePath)
  return urlData.publicUrl
}

// ─────────────────────────────────────────────
// 단일 자산 처리
// ─────────────────────────────────────────────

interface ProcessResult {
  status: 'success' | 'skip' | 'fail'
  reason?: FailureReason
  detail?: string
  slug?: string
  lowDpi?: boolean
  hasSidecar?: boolean
  bytesUploaded?: number
  /** true 이면 confidence 낮아 review 큐로 보내진 자산 */
  reviewQueued?: boolean
}

async function processAsset(
  asset: ScannedAsset,
  folderLicense: FolderLicense,
  supabase: SupabaseClient,
  prisma: PrismaClient,
  opts: IngestOptions,
  usedSlugs: Set<string>,
): Promise<ProcessResult> {
  // sharp import (동적 — 서버 전용)
  const sharp = (await import('sharp')).default

  const { filePath, relativePath, categoryTags } = asset
  const originalFilename = path.basename(filePath)

  // (a) 매직바이트 검증
  if (!validatePngMagicBytes(filePath)) {
    return {
      status: 'fail',
      reason: 'magic-bytes-invalid',
      detail: `PNG 매직바이트 불일치: ${relativePath}`,
    }
  }

  // (b) sharp 재인코딩 + 메타데이터 제거 + sRGB 강제
  let masterBuf: Buffer
  let width: number
  let height: number
  try {
    const img = sharp(filePath).withMetadata({ icc: undefined })
    const meta = await sharp(filePath).metadata()
    width = meta.width ?? 0
    height = meta.height ?? 0

    // 256px 미만 거부
    if (width < 256 || height < 256) {
      return {
        status: 'fail',
        reason: 'too-small',
        detail: `해상도 부족 (${width}×${height}, 최소 256px): ${relativePath}`,
      }
    }

    masterBuf = await img.toColorspace('srgb').png({ compressionLevel: 9 }).toBuffer()
  } catch (err) {
    return {
      status: 'fail',
      reason: 'unknown',
      detail: `sharp 처리 실패: ${String(err)}`,
    }
  }

  // (c) masterDpi 계산
  const { masterDpi, lowDpi } = calcMasterDpi(width, height)

  // (d) WebP 파생본 + 256 썸네일 생성
  let webp1xBuf: Buffer
  let webp2xBuf: Buffer
  let thumbBuf: Buffer
  try {
    webp1xBuf = await sharp(masterBuf).webp({ quality: 85 }).toBuffer()

    // 2x: 원본이 이미 충분히 크면 그대로, 아니면 upscale 없이 동일
    const targetW2x = Math.min(width * 2, 2048)
    webp2xBuf = await sharp(masterBuf)
      .resize(targetW2x, null, { fit: 'inside', withoutEnlargement: false })
      .webp({ quality: 90 })
      .toBuffer()

    thumbBuf = await sharp(masterBuf)
      .resize(256, 256, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 6 })
      .toBuffer()
  } catch (err) {
    return {
      status: 'fail',
      reason: 'unknown',
      detail: `파생본 생성 실패: ${String(err)}`,
    }
  }

  // (e) 사이드카 로드 (선택)
  const sidecarPath = filePath.replace(/\.png$/i, '.kp.json')
  let sidecar: PoseSidecar | null = null
  let hasSidecar = false
  if (fs.existsSync(sidecarPath)) {
    try {
      const raw = JSON.parse(fs.readFileSync(sidecarPath, 'utf-8')) as unknown
      sidecar = parsePoseSidecar(raw)
      hasSidecar = true
    } catch (err) {
      return {
        status: 'fail',
        reason: 'sidecar-invalid',
        detail: `사이드카 파싱 오류: ${String(err)}`,
      }
    }
  }

  // (f) 라이선스 결정
  const license = sidecar?.license
    ? {
        id: sidecar.license.id,
        holder: sidecar.license.holder,
        terms: sidecar.license.terms,
      }
    : folderLicense.license

  if (!license) {
    return {
      status: 'fail',
      reason: 'no-license',
      detail: `라이선스 없음: ${relativePath}`,
    }
  }

  const licenseSource: 'folder-default' | 'sidecar' | 'override' = hasSidecar
    ? 'sidecar'
    : 'folder-default'

  // (g) slug 생성
  let slug = slugifyFilename(originalFilename)
  if (!slug) slug = `pose-${Date.now()}`

  // 충돌 해소
  let slugCandidate = slug
  let suffixIdx = 1
  while (usedSlugs.has(slugCandidate)) {
    slugCandidate = slugWithSuffix(slug, suffixIdx++)
  }
  slug = slugCandidate
  usedSlugs.add(slug)

  // (h) 1차 태깅 — M2-03a: filename-tagger 본격 사전 사용
  const tagResult = tagFromFilename(originalFilename, asset.subfolder ?? undefined)
  const tags = [...new Set([...categoryTags, ...tagResult.tags])]
  if (lowDpi) tags.push('lowDpi')

  // M2-03b hook: Claude API 2차 태깅 진입점
  // tagResult.matched && tagResult.confidence >= 0.7 이면 API skip
  // → skipClaudeApi = tagResult.matched && tagResult.confidence >= 0.7
  // M2-03b 에서 이 조건을 확인해 Claude API 호출 분기

  // (i) 키포인트 추정 (M2-02 — ADR-0011b)
  // 사이드카 보유 시 사이드카 키포인트 우선, 없으면 알파 채널 분석으로 3점 자동 추정
  let kpResult: Awaited<ReturnType<typeof estimateKeypoints>> = null
  let inferredStatus: 'draft' | 'review' = 'draft'

  if (hasSidecar && sidecar?.keypoints && sidecar.keypoints.length > 0) {
    // 사이드카 키포인트 사용 — estimateKeypoints 불필요
    kpResult = null // 사이드카 경로는 아래 poseMeta 에서 직접 사용
  } else if (!opts.noKeypoints) {
    kpResult = await estimateKeypoints(masterBuf, opts.reviewThreshold)
    if (!kpResult) {
      // confidence < 0.5 또는 추정 실패 → review 큐
      inferredStatus = 'review'
      console.warn(
        pc.yellow(
          `  [review-queue] 키포인트 추정 실패 (confidence 낮음): ${path.basename(filePath)}`,
        ),
      )
    }
  }

  // bbox 와 anchorPoint 결정
  const inferredBbox = kpResult
    ? kpResult.bbox
    : hasSidecar && sidecar?.bbox
      ? sidecar.bbox
      : { x: 0, y: 0, w: 1, h: 1 }

  const anchorPoint = {
    x: inferredBbox.x + inferredBbox.w / 2,
    y: inferredBbox.y + inferredBbox.h * 0.95,
  }

  // 키포인트 배열 구성
  type KpEntry = { name: string; x: number; y: number; weight?: number; inferred?: boolean }
  let keypoints: KpEntry[]

  if (hasSidecar && sidecar?.keypoints && sidecar.keypoints.length > 0) {
    keypoints = sidecar.keypoints
  } else if (kpResult) {
    keypoints = [kpResult.head, kpResult.mouth, kpResult.center]
  } else {
    keypoints = []
  }

  const poseMeta = {
    bodyType: tagResult.bodyType ?? 'unknown',
    view: tagResult.view ?? 'front',
    action: tagResult.action ?? 'unknown',
    mood: tagResult.mood,
    bbox: inferredBbox,
    anchorPoint,
    flippable: sidecar?.flippable ?? true,
    keypoints,
    styleVariants: tagResult.styleVariants,
  }

  // keypoints 가 없는 경우 review 큐 (사이드카/추정 모두 실패)
  if (keypoints.length === 0 && !opts.noKeypoints) {
    inferredStatus = 'review'
  }

  // dry-run 이면 여기까지
  if (opts.dryRun) {
    return {
      status: 'success',
      slug,
      lowDpi,
      hasSidecar,
      bytesUploaded: 0,
      reviewQueued: inferredStatus === 'review',
    }
  }

  // (j) 이미 적재 여부 확인 (slug 기반)
  if (!opts.reupload) {
    const existing = await prisma.resource.findUnique({ where: { slug } })
    if (existing) {
      return { status: 'skip', slug, lowDpi, hasSidecar }
    }
  }

  // (i) Supabase Storage 업로드
  let fileUrl: string
  let variants: { webp1x?: string; webp2x?: string; thumb?: string }
  const bucket = 'poses'
  try {
    fileUrl = await uploadToStorage(
      supabase,
      bucket,
      `${slug}/master.png`,
      masterBuf,
      'image/png',
      opts.reupload,
    )
    const webp1xUrl = await uploadToStorage(
      supabase,
      bucket,
      `${slug}/v1.webp`,
      webp1xBuf,
      'image/webp',
      opts.reupload,
    )
    const webp2xUrl = await uploadToStorage(
      supabase,
      bucket,
      `${slug}/v2.webp`,
      webp2xBuf,
      'image/webp',
      opts.reupload,
    )
    const thumbUrl = await uploadToStorage(
      supabase,
      bucket,
      `${slug}/thumb.png`,
      thumbBuf,
      'image/png',
      opts.reupload,
    )
    variants = { webp1x: webp1xUrl, webp2x: webp2xUrl, thumb: thumbUrl }
  } catch (err) {
    return {
      status: 'fail',
      reason: 'storage-error',
      detail: `Storage 업로드 실패: ${String(err)}`,
    }
  }

  // (k) 임베딩 생성 (--no-embed 미설정 시)
  let embeddingTextVec: string | null = null
  let embeddingVisVec: string | null = null
  let embeddingCombinedVec: string | null = null

  if (!opts.noEmbed) {
    try {
      const tagText = `${tags.join(' ')} ${poseMeta.action} ${poseMeta.view} ${poseMeta.bodyType}`
      const textVec = await embedText(tagText)
      const visVec = await embedImage(thumbBuf)
      const combinedVec = combine(textVec, visVec)
      embeddingTextVec = toVectorLiteral(textVec)
      embeddingVisVec = toVectorLiteral(visVec)
      embeddingCombinedVec = toVectorLiteral(combinedVec)
    } catch (err) {
      // 임베딩 실패는 치명적이지 않음 — 경고 후 null 유지
      console.warn(
        pc.yellow(`  [embed-warn] 임베딩 생성 실패 (${path.basename(filePath)}): ${String(err)}`),
      )
    }
  }

  // (j) DB upsert
  try {
    await prisma.resource.upsert({
      where: { slug },
      create: {
        slug,
        originalFilename,
        kind: 'pose',
        format: 'png',
        ownerType: 'system',
        fileUrl,
        thumbUrl: variants.thumb ?? null,
        variants: variants as object,
        width,
        height,
        masterDpi,
        lowDpi,
        meta: poseMeta as object,
        tags,
        tagsBootstrap: tagResult.tags,
        license: license as object,
        licenseSource,
        status: inferredStatus,
      },
      update: opts.reupload
        ? {
            fileUrl,
            thumbUrl: variants.thumb ?? null,
            variants: variants as object,
            width,
            height,
            masterDpi,
            lowDpi,
            meta: poseMeta as object,
            tags,
            tagsBootstrap: tagResult.tags,
            license: license as object,
            licenseSource,
            status: inferredStatus,
          }
        : {},
    })
  } catch (err) {
    return {
      status: 'fail',
      reason: 'db-error',
      detail: `DB upsert 실패: ${String(err)}`,
    }
  }

  // (k-2) vector 컬럼 raw SQL UPDATE (Prisma Unsupported 타입 — $executeRaw 필요)
  if (embeddingCombinedVec || embeddingTextVec || embeddingVisVec) {
    try {
      // DB에서 id 조회
      const rec = await prisma.resource.findUnique({ where: { slug }, select: { id: true } })
      if (rec) {
        await prisma.$executeRaw`
          UPDATE "Resource"
          SET
            "embedding"     = ${embeddingCombinedVec}::vector,
            "embeddingText" = ${embeddingTextVec}::vector,
            "embeddingVis"  = ${embeddingVisVec}::vector
          WHERE "id" = ${rec.id}
        `
      }
    } catch (err) {
      // vector 업데이트 실패도 비치명적 — 경고만
      console.warn(
        pc.yellow(
          `  [embed-warn] vector 컬럼 업데이트 실패 (${path.basename(filePath)}): ${String(err)}`,
        ),
      )
    }
  }

  const bytesUploaded = masterBuf.length + webp1xBuf.length + webp2xBuf.length + thumbBuf.length

  return {
    status: 'success',
    slug,
    lowDpi,
    hasSidecar,
    bytesUploaded,
    reviewQueued: inferredStatus === 'review',
  }
}

// ─────────────────────────────────────────────
// 리포트 출력
// ─────────────────────────────────────────────

function printReport(result: IngestResult, opts: IngestOptions): void {
  const divider = '─'.repeat(60)
  console.log('\n' + divider)
  console.log(pc.bold(pc.cyan('  PNG 인입 파이프라인 — 결과 리포트')))
  if (opts.dryRun) console.log(pc.yellow('  [DRY RUN — 실제 적재 없음]'))
  console.log(divider)

  console.log(`  성공:       ${pc.green(String(result.succeeded))}`)
  console.log(`  실패:       ${pc.red(String(result.failed))}`)
  console.log(`  스킵:       ${pc.gray(String(result.skipped))}`)
  console.log(`  lowDpi:     ${pc.yellow(String(result.lowDpi))} 개`)
  console.log(`  사이드카:   ${result.withSidecar} 개`)
  console.log(`  검수큐(review): ${pc.magenta(String(result.reviewQueued))} 개  ← confidence 낮음`)

  const mb = (result.totalBytes / 1024 / 1024).toFixed(1)
  console.log(`  업로드:  ${mb} MB`)

  const sec = (result.elapsedMs / 1000).toFixed(1)
  console.log(`  처리시간: ${sec}s`)

  if (result.failures.length > 0) {
    console.log('\n' + pc.red('  실패 목록:'))
    const byReason = new Map<FailureReason, FailedAsset[]>()
    for (const f of result.failures) {
      const arr = byReason.get(f.reason) ?? []
      arr.push(f)
      byReason.set(f.reason, arr)
    }
    for (const [reason, assets] of byReason.entries()) {
      console.log(`  [${reason}] ${assets.length}개:`)
      for (const a of assets.slice(0, 5)) {
        console.log(`    - ${path.basename(a.filePath)}: ${a.detail}`)
      }
      if (assets.length > 5) {
        console.log(`    ... 외 ${assets.length - 5}개`)
      }
    }
  }

  console.log(divider + '\n')
}

// ─────────────────────────────────────────────
// 메인 실행
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  loadEnv()

  const program = new Command()
  program
    .name('ingest-poses')
    .description('PNG 포즈 자산 인입 파이프라인')
    .option('--dry-run', '실제 적재 없이 검증/리포트만', false)
    .option('--limit <n>', '처음 N개만 처리', (v) => parseInt(v, 10))
    .option('--format <fmt>', 'png|svg|auto (default: auto)', 'auto')
    .option('--src <path>', '소스 디렉토리', 'data/poses/raw')
    .option('--reupload', '이미 적재된 자산 강제 재업로드', false)
    .option('--concurrency <n>', '동시 처리 수 (default: 5)', (v) => parseInt(v, 10), 5)
    .option('--no-keypoints', '키포인트 자동 추정 스킵 (속도 비교/디버그용)')
    .option('--no-embed', '임베딩 생성 스킵 (테스트/디버그용)')
    .option(
      '--review-threshold <n>',
      'confidence 임계값 (기본 0.5 / ADR-0011b)',
      (v) => parseFloat(v),
      0.5,
    )
    .parse(process.argv)

  const rawOpts = program.opts() as {
    dryRun: boolean
    limit?: number
    format: string
    src: string
    reupload: boolean
    concurrency: number
    keypoints: boolean // commander: --no-keypoints → keypoints=false
    embed: boolean // commander: --no-embed → embed=false
    reviewThreshold: number
  }

  const opts: IngestOptions = {
    dryRun: rawOpts.dryRun,
    limit: rawOpts.limit,
    format: (rawOpts.format as IngestOptions['format']) ?? 'auto',
    src: rawOpts.src,
    reupload: rawOpts.reupload,
    concurrency: rawOpts.concurrency,
    noKeypoints: rawOpts.keypoints === false,
    noEmbed: rawOpts.embed === false,
    reviewThreshold: rawOpts.reviewThreshold,
  }

  const srcDir = path.resolve(process.cwd(), opts.src)
  if (!fs.existsSync(srcDir)) {
    console.error(pc.red(`소스 디렉토리 없음: ${srcDir}`))
    process.exit(1)
  }

  // LICENSE.json 로드
  const licensePath = path.join(srcDir, 'LICENSE.json')
  if (!fs.existsSync(licensePath)) {
    console.error(pc.red('LICENSE.json 없음 — 적재 거부'))
    process.exit(1)
  }
  const folderLicense = parseFolderLicense(
    JSON.parse(fs.readFileSync(licensePath, 'utf-8')) as unknown,
  )
  console.log(pc.green('LICENSE.json 로드 완료'), pc.gray(folderLicense.license.id))

  // 환경변수 확인
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL']
  const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY']
  const dbUrl = process.env['DATABASE_URL']

  if (!supabaseUrl || !serviceKey) {
    console.error(pc.red('NEXT_PUBLIC_SUPABASE_URL 또는 SUPABASE_SERVICE_ROLE_KEY 누락'))
    if (!opts.dryRun) process.exit(1)
  }
  if (!dbUrl) {
    console.error(pc.red('DATABASE_URL 누락'))
    if (!opts.dryRun) process.exit(1)
  }

  // 클라이언트 초기화 (dry-run 시 null)
  const supabase =
    !opts.dryRun && supabaseUrl && serviceKey
      ? createClient(supabaseUrl, serviceKey)
      : (null as unknown as SupabaseClient)

  const prisma = new PrismaClient()

  // 버킷 확인/생성
  if (!opts.dryRun && supabase) {
    try {
      await ensureBucket(supabase, 'poses')
      console.log(pc.green('Storage 버킷 "poses" 준비 완료'))
    } catch (err) {
      console.error(pc.red(`버킷 초기화 실패: ${String(err)}`))
      process.exit(1)
    }
  }

  // 파일 스캔
  const ingestCfg = folderLicense.ingest
  const ignorePatterns = ingestCfg?.ignorePatterns ?? ['Thumbs.db', '.DS_Store', '*.tmp']
  const subfolderRules = ingestCfg?.subfolderRules ?? {}

  const assets = scanAssets(srcDir, ignorePatterns, subfolderRules)
  const limited = opts.limit !== undefined ? assets.slice(0, opts.limit) : assets

  console.log(pc.bold(`\n스캔 완료: ${assets.length}개 발견, ${limited.length}개 처리 예정`))

  // 기존 slug 사전 로드 (충돌 방지)
  const usedSlugs = new Set<string>()
  if (!opts.dryRun) {
    const existing = await prisma.resource.findMany({ select: { slug: true } })
    for (const r of existing) usedSlugs.add(r.slug)
  }

  // 병렬 처리 (rate limit)
  const limit = pLimit(opts.concurrency)
  const failures: FailedAsset[] = []
  let succeeded = 0
  let failed = 0
  let skipped = 0
  let lowDpiCount = 0
  let withSidecar = 0
  let reviewQueuedCount = 0
  let totalBytes = 0

  const startMs = Date.now()
  let processed = 0

  const tasks = limited.map((asset) =>
    limit(async () => {
      const res = await processAsset(asset, folderLicense, supabase, prisma, opts, usedSlugs)
      processed++

      if (processed % 50 === 0 || processed === limited.length) {
        const pct = Math.round((processed / limited.length) * 100)
        process.stdout.write(`\r  처리 중: ${processed}/${limited.length} (${pct}%)   `)
      }

      if (res.status === 'success') {
        succeeded++
        if (res.lowDpi) lowDpiCount++
        if (res.hasSidecar) withSidecar++
        if (res.reviewQueued) reviewQueuedCount++
        totalBytes += res.bytesUploaded ?? 0
      } else if (res.status === 'skip') {
        skipped++
      } else {
        failed++
        failures.push({
          filePath: asset.filePath,
          reason: res.reason ?? 'unknown',
          detail: res.detail ?? '',
        })
      }
    }),
  )

  await Promise.all(tasks)
  process.stdout.write('\n')

  const elapsedMs = Date.now() - startMs

  const result: IngestResult = {
    succeeded,
    failed,
    skipped,
    lowDpi: lowDpiCount,
    withSidecar,
    reviewQueued: reviewQueuedCount,
    totalBytes,
    elapsedMs,
    failures,
  }

  printReport(result, opts)

  await prisma.$disconnect()
}

// 직접 실행 시에만 main() 호출 (테스트 import 시 실행 방지)
// tsx 는 import.meta.url === process.argv[1] URL 비교로 판단
const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] !== undefined &&
  (process.argv[1].endsWith('ingest-poses.ts') || process.argv[1].endsWith('ingest-poses.js'))

if (isMain) {
  main().catch((err: unknown) => {
    console.error(pc.red('치명적 오류:'), String(err))
    process.exit(1)
  })
}
