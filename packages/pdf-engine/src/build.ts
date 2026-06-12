/**
 * packages/pdf-engine/src/build.ts
 *
 * buildPdf() — 메인 빌더
 *
 * 처리 흐름:
 *   1. PDFDocument.create()
 *   2. 공유 PageRenderContext 초기화 (폰트 임베드, 이미지 캐시)
 *   3. (선택) 표지 페이지 renderCoverPage()
 *   4. pages.forEach → fabricLayersToCommands() → renderPage()
 *   5. PDF 메타데이터 설정 (결정론: CreationDate = seed 기반 고정값)
 *   6. doc.save() → Uint8Array
 *   7. warnings 종합 반환
 *
 * ADR-0007 결정론:
 *   - CreationDate / ModificationDate = seed 기반 ISO (기본 2024-01-01 + seed ms)
 *   - useObjectStreams: false (object stream 은 ID 순서 비결정론 가능)
 *   - 이미지 fetch 는 동일 URL 이면 캐시 재사용 → 동일 순서 보장
 *
 * NFR:
 *   - 16p ≤ 6초 (서버 사이드, 콜드 스타트 제외)
 *   - 이미지 fetch Promise.all 병렬 (사전 프리페치)
 */

import { PDFDocument, type PDFImage } from 'pdf-lib'

import { fabricLayersToCommands } from './adapter/fabric-to-pdf.js'
import { loadPretendardFont } from './fonts.js'
import { renderCoverPage } from './render/cover-renderer.js'
import { createRenderContext, renderPage } from './render/page-renderer.js'
import type { PdfBuildInput, PdfBuildOptions, PdfBuildResult } from './types.js'
import { PDF_PRODUCER, SEED_EPOCH_MS } from './types.js'

// ─── 결정론 날짜 계산 ─────────────────────────────────────────────────────────

/**
 * seed → ISO 날짜 문자열 (결정론)
 * seed=0 → 2024-01-01T00:00:00.000Z
 */
function seedToIso(seed: number): string {
  return new Date(SEED_EPOCH_MS + seed).toISOString()
}

// ─── 이미지 URL 사전 수집 ─────────────────────────────────────────────────────

/** pages 전체에서 이미지 URL 목록 수집 (병렬 프리페치용) */
function collectImageUrls(input: PdfBuildInput): string[] {
  const urls = new Set<string>()
  for (const page of input.pages) {
    const { commands } = fabricLayersToCommands(
      (page.fabricJson as { layers?: unknown[] }).layers?.filter(Boolean) as Parameters<
        typeof fabricLayersToCommands
      >[0],
    )
    for (const cmd of commands) {
      if (cmd.kind === 'image' && cmd.url) urls.add(cmd.url)
    }
  }
  if (input.cover?.coverImageUrl) urls.add(input.cover.coverImageUrl)
  return [...urls]
}

// ─── 이미지 프리페치 ──────────────────────────────────────────────────────────

async function prefetchImages(
  urls: string[],
  doc: PDFDocument,
  cache: Map<string, PDFImage>,
): Promise<void> {
  await Promise.all(
    urls.map(async (url) => {
      if (cache.has(url)) return
      try {
        const res = await fetch(url)
        if (!res.ok) return
        const buf = await res.arrayBuffer()
        const bytes = new Uint8Array(buf)
        let image: PDFImage
        if (bytes[0] === 0x89 && bytes[1] === 0x50) {
          image = await doc.embedPng(bytes)
        } else {
          image = await doc.embedJpg(bytes)
        }
        cache.set(url, image)
      } catch {
        // 실패한 URL 은 renderPage 에서 warning 추가
      }
    }),
  )
}

// ─── fabricJson 에서 layers 추출 ─────────────────────────────────────────────

function extractLayers(fabricJson: object): Parameters<typeof fabricLayersToCommands>[0] {
  const json = fabricJson as Record<string, unknown>
  const layers = json['layers']
  if (!Array.isArray(layers)) return []
  return layers as Parameters<typeof fabricLayersToCommands>[0]
}

// ─── 메인 빌더 ───────────────────────────────────────────────────────────────

/**
 * POD PDF 빌더
 *
 * @param input  빌드 입력 (페이지 목록, 판형, 표지 등)
 * @param opts   빌드 옵션 (폰트 임베드, 가이드, 날짜 오버라이드)
 * @returns      PdfBuildResult (pdfBuffer, 메타데이터, warnings)
 */
export async function buildPdf(
  input: PdfBuildInput,
  opts: PdfBuildOptions = {},
): Promise<PdfBuildResult> {
  const { embedFonts = true, withCover = !!input.cover, showGuides = false, metadataDate } = opts

  const seed = input.seed ?? 0
  const creationDateStr = metadataDate ?? seedToIso(seed)
  const creationDate = new Date(creationDateStr)

  // 1. PDFDocument 생성
  const doc = await PDFDocument.create()

  // 2. 폰트 로드
  const fontBytes = embedFonts ? await loadPretendardFont() : null

  // 3. 공유 컨텍스트 초기화
  const ctx = await createRenderContext(doc, input.format.bleedMm, input.format.heightMm, fontBytes)

  // 4. 이미지 병렬 프리페치 (성능: 16p ≤ 6초)
  const imageUrls = collectImageUrls(input)
  if (imageUrls.length > 0) {
    await prefetchImages(imageUrls, doc, ctx.imageCache)
  }

  // 5. (선택) 표지 페이지
  if (withCover && input.cover) {
    await renderCoverPage(doc, input.format, input.cover, ctx)
  }

  // 6. 본문 페이지들 (index 순서 정렬)
  const sortedPages = [...input.pages].sort((a, b) => a.pageIndex - b.pageIndex)

  for (const pageInput of sortedPages) {
    const layers = extractLayers(pageInput.fabricJson)
    const { commands, warnings: adapterWarnings } = fabricLayersToCommands(layers)
    ctx.warnings.push(...adapterWarnings)

    await renderPage({
      // FOLLOWUP-COVER-03: 페이지별 치수 오버라이드(표지) — bleed/safe/dpi 는 format 상속
      dims: {
        widthMm: pageInput.dims?.widthMm ?? input.format.widthMm,
        heightMm: pageInput.dims?.heightMm ?? input.format.heightMm,
        bleedMm: input.format.bleedMm,
        safeMm: input.format.safeMm,
        dpi: input.format.dpi,
      },
      commands,
      ctx,
      showGuides,
    })
  }

  // 7. PDF 메타데이터 (ADR-0007 결정론: 날짜 고정)
  doc.setTitle(input.title)
  if (input.author) doc.setAuthor(input.author)
  doc.setProducer(PDF_PRODUCER)
  doc.setCreator(PDF_PRODUCER)
  doc.setCreationDate(creationDate)
  doc.setModificationDate(creationDate) // 결정론: 수정일 = 생성일

  // 8. 직렬화 (결정론: useObjectStreams=false)
  const pdfBuffer = await doc.save({ useObjectStreams: false })

  const allWarnings = [...ctx.warnings]

  return {
    pdfBuffer,
    pageCount: doc.getPageCount(),
    byteSize: pdfBuffer.byteLength,
    warnings: allWarnings,
    metadata: {
      title: input.title,
      author: input.author,
      producer: PDF_PRODUCER,
      creationDate: creationDateStr,
    },
  }
}
