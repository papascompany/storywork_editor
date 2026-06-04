/**
 * packages/pdf-engine/src/render/page-renderer.ts
 *
 * RenderCommand[] → pdf-lib PDFPage 벡터 렌더링
 *
 * 좌표계:
 *   - fabricJson / PageJsonV1: mm, 원점 좌상단 (↓ y 증가)
 *   - pdf-lib: pt, 원점 좌하단 (↑ y 증가)
 *   - 변환: x_pt = x_mm * MM_TO_PT
 *           y_pt = pageHeight_pt - (y_mm + height_mm) * MM_TO_PT
 *
 * bleed:
 *   - 실제 페이지 크기 = (widthMm + 2*bleedMm) × (heightMm + 2*bleedMm)
 *   - TrimBox: bleedMm pt 부터 contentMm 까지 (PDF 메타)
 *   - BleedBox: 전체 페이지 크기
 *
 * ADR-0008: 벡터 우선. needsRaster=true 이미지는 현재 warning 추가 후 스킵.
 */

import type { PDFDocument, PDFPage } from 'pdf-lib'
import { StandardFonts, rgb, degrees, type PDFFont, type PDFImage } from 'pdf-lib'

import type {
  RenderCommand,
  RectCommand,
  ImageCommand,
  TextCommand,
  BubbleCommand,
  GroupCommand,
} from '../adapter/fabric-to-pdf.js'
import { MM_TO_PT } from '../types.js'

// ─── 내부 타입 ───────────────────────────────────────────────────────────────

export interface PageRenderContext {
  doc: PDFDocument
  /** 기본 폰트 (표준, 항상 존재) */
  defaultFont: PDFFont
  /** 임베드 폰트 (Pretendard ttf, 없으면 null → 한글 깨짐 가능) */
  embedFont: PDFFont | null
  /** 이미지 캐시 URL → PDFImage */
  imageCache: Map<string, PDFImage>
  /** bleed 포함 전체 페이지 높이 pt (y-flip 계산용) */
  pageHeightPt: number
  /** bleed offset pt (컨텐츠 원점 보정) */
  bleedPt: number
  warnings: string[]
}

export interface PageDimensions {
  widthMm: number
  heightMm: number
  bleedMm: number
  safeMm: number
  dpi: number
}

// ─── 좌표 변환 ───────────────────────────────────────────────────────────────

/**
 * fabricJson mm 좌표 → PDF point 좌표 (y-flip + bleed offset 포함)
 * x_pt, y_pt 은 drawXxx() 에 전달되는 좌하단 기준 좌표
 */
function toPoint(
  xMm: number,
  yMm: number,
  heightMm: number,
  ctx: PageRenderContext,
): { x: number; y: number } {
  const x = xMm * MM_TO_PT + ctx.bleedPt
  // PDF 좌표계: y=0은 하단. fabric y=0은 상단.
  // y_pdf = (pageHeight - bleedTop) - (y_fabric + height_fabric) * MM_TO_PT + bleedBottom
  // 단순화: pageHeightPt = (contentH + 2*bleed)*MM_TO_PT
  const y = ctx.pageHeightPt - (yMm + heightMm) * MM_TO_PT - ctx.bleedPt
  return { x, y }
}

// ─── 이미지 fetch & 임베드 ──────────────────────────────────────────────────

async function fetchImageBytes(url: string): Promise<Uint8Array | null> {
  try {
    const res = await fetch(url)
    if (!res.ok) return null
    const buf = await res.arrayBuffer()
    return new Uint8Array(buf)
  } catch {
    return null
  }
}

async function getOrEmbedImage(
  url: string,
  doc: PDFDocument,
  ctx: PageRenderContext,
): Promise<PDFImage | null> {
  const cached = ctx.imageCache.get(url)
  if (cached !== undefined) return cached

  const bytes = await fetchImageBytes(url)
  if (!bytes) {
    ctx.warnings.push(`[page-renderer] 이미지 fetch 실패: ${url}`)
    return null
  }

  try {
    // PNG or JPG 자동 감지
    let image: PDFImage
    if (bytes[0] === 0x89 && bytes[1] === 0x50) {
      // PNG magic
      image = await doc.embedPng(bytes)
    } else {
      image = await doc.embedJpg(bytes)
    }
    ctx.imageCache.set(url, image)
    return image
  } catch (e) {
    ctx.warnings.push(`[page-renderer] 이미지 임베드 실패 (${url}): ${String(e)}`)
    return null
  }
}

// ─── 렌더 함수들 ─────────────────────────────────────────────────────────────

function renderRect(page: PDFPage, cmd: RectCommand, ctx: PageRenderContext): void {
  const { x, y } = toPoint(cmd.x, cmd.y, cmd.height, ctx)
  const w = cmd.width * MM_TO_PT
  const h = cmd.height * MM_TO_PT

  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: rgb(cmd.fill.r / 255, cmd.fill.g / 255, cmd.fill.b / 255),
    opacity: cmd.opacity,
    rotate: degrees(cmd.rotation),
  })
}

async function renderImage(
  page: PDFPage,
  cmd: ImageCommand,
  doc: PDFDocument,
  ctx: PageRenderContext,
): Promise<void> {
  if (cmd.needsRaster) {
    ctx.warnings.push(`[page-renderer] 래스터 폴백 필요한 이미지 스킵 (ADR-0008): ${cmd.url}`)
    return
  }

  const image = await getOrEmbedImage(cmd.url, doc, ctx)
  if (!image) return

  const { x, y } = toPoint(cmd.x, cmd.y, cmd.height, ctx)
  const w = cmd.width * MM_TO_PT
  const h = cmd.height * MM_TO_PT

  page.drawImage(image, {
    x,
    y,
    width: w,
    height: h,
    opacity: cmd.opacity,
    rotate: degrees(cmd.rotation),
  })
}

function renderText(page: PDFPage, cmd: TextCommand, ctx: PageRenderContext): void {
  if (!cmd.text) return

  const font = ctx.embedFont ?? ctx.defaultFont
  // TextCommand 의 y는 상단 기준. PDF 렌더는 기준선(baseline) 기준.
  // height 대신 fontSize/MM_TO_PT 로 텍스트 높이 근사
  const textHeightMm = cmd.fontSize / MM_TO_PT
  const { x, y } = toPoint(cmd.x, cmd.y, textHeightMm, ctx)
  const sizePt = cmd.fontSize // fabricJson 에서 fontSize는 이미 pt 단위

  // 색상 파싱 (#rrggbb)
  let r = 0,
    g = 0,
    b = 0
  const hex = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(cmd.color)
  if (hex && hex[1] !== undefined && hex[2] !== undefined && hex[3] !== undefined) {
    r = parseInt(hex[1], 16) / 255
    g = parseInt(hex[2], 16) / 255
    b = parseInt(hex[3], 16) / 255
  }

  try {
    page.drawText(cmd.text, {
      x,
      y,
      size: sizePt,
      font,
      color: rgb(r, g, b),
      opacity: cmd.opacity,
      rotate: degrees(cmd.rotation),
    })
  } catch (e) {
    // 한글 텍스트 + StandardFonts 조합 시 실패 가능
    ctx.warnings.push(`[page-renderer] 텍스트 렌더 실패: "${cmd.text.slice(0, 20)}" — ${String(e)}`)
  }
}

function renderBubble(page: PDFPage, cmd: BubbleCommand, ctx: PageRenderContext): void {
  // 말풍선: 현재는 사각형 + 테두리로 근사
  // 향후: 꼬리 있는 bezier path 로 정밀 구현
  const { x, y } = toPoint(cmd.x, cmd.y, cmd.height, ctx)
  const w = cmd.width * MM_TO_PT
  const h = cmd.height * MM_TO_PT

  page.drawRectangle({
    x,
    y,
    width: w,
    height: h,
    color: rgb(cmd.fill.r / 255, cmd.fill.g / 255, cmd.fill.b / 255),
    borderColor: rgb(cmd.stroke.r / 255, cmd.stroke.g / 255, cmd.stroke.b / 255),
    borderWidth: cmd.strokeWidth,
    opacity: cmd.opacity,
    rotate: degrees(cmd.rotation),
  })
}

// ─── 그룹 렌더 ──────────────────────────────────────────────────────────────

async function renderGroup(
  page: PDFPage,
  cmd: GroupCommand,
  doc: PDFDocument,
  ctx: PageRenderContext,
): Promise<void> {
  // 그룹 오프셋을 컨텍스트에 추가 — 단순 구현: 자식 좌표는 이미 글로벌 좌표 가정
  for (const child of cmd.children) {
    await renderCommand(page, child, doc, ctx)
  }
}

// ─── 단일 커맨드 디스패치 ────────────────────────────────────────────────────

async function renderCommand(
  page: PDFPage,
  cmd: RenderCommand,
  doc: PDFDocument,
  ctx: PageRenderContext,
): Promise<void> {
  switch (cmd.kind) {
    case 'rect':
      renderRect(page, cmd, ctx)
      break
    case 'image':
      await renderImage(page, cmd, doc, ctx)
      break
    case 'text':
      renderText(page, cmd, ctx)
      break
    case 'bubble':
      renderBubble(page, cmd, ctx)
      break
    case 'group':
      await renderGroup(page, cmd, doc, ctx)
      break
    case 'skip':
      // 이미 adapter에서 warning 추가됨
      break
  }
}

// ─── 공개 함수 ──────────────────────────────────────────────────────────────

export interface RenderPageOptions {
  dims: PageDimensions
  commands: RenderCommand[]
  ctx: PageRenderContext
  showGuides?: boolean
}

/**
 * PDFDocument 에 페이지 하나 추가 후 렌더링
 *
 * @returns 추가된 PDFPage
 */
export async function renderPage(opts: RenderPageOptions): Promise<PDFPage> {
  const { dims, commands, ctx, showGuides } = opts
  const { widthMm, heightMm, bleedMm } = dims

  // 실제 페이지 크기 = content + 2 * bleed
  const totalWidthPt = (widthMm + 2 * bleedMm) * MM_TO_PT
  const totalHeightPt = (heightMm + 2 * bleedMm) * MM_TO_PT

  const page = ctx.doc.addPage([totalWidthPt, totalHeightPt])

  // TrimBox / BleedBox 메타
  const bleedPt = bleedMm * MM_TO_PT
  // TrimBox: 인쇄 재단선 (bleed 제거 후 실제 책 크기)
  page.setTrimBox(bleedPt, bleedPt, widthMm * MM_TO_PT, heightMm * MM_TO_PT)
  // BleedBox: 전체 인쇄 범위 (bleed 포함)
  page.setBleedBox(0, 0, totalWidthPt, totalHeightPt)

  // 가이드 라인 (옵션)
  if (showGuides) {
    drawGuides(page, dims, ctx)
  }

  // 커맨드 렌더
  for (const cmd of commands) {
    await renderCommand(page, cmd, ctx.doc, ctx)
  }

  return page
}

/** bleed / safe area 가이드 라인 시각화 */
function drawGuides(page: PDFPage, dims: PageDimensions, ctx: PageRenderContext): void {
  const { widthMm, heightMm, bleedMm, safeMm } = dims
  const bleedPt = bleedMm * MM_TO_PT
  const safePt = safeMm * MM_TO_PT
  const totalWidthPt = (widthMm + 2 * bleedMm) * MM_TO_PT
  const totalHeightPt = (heightMm + 2 * bleedMm) * MM_TO_PT

  // bleed 가이드 (빨강, 점선 불가 → 얇은 선)
  page.drawRectangle({
    x: bleedPt,
    y: bleedPt,
    width: widthMm * MM_TO_PT,
    height: heightMm * MM_TO_PT,
    borderColor: rgb(1, 0, 0),
    borderWidth: 0.5,
    opacity: 0.5,
  })

  // safe area 가이드 (파랑)
  page.drawRectangle({
    x: bleedPt + safePt,
    y: bleedPt + safePt,
    width: (widthMm - 2 * safeMm) * MM_TO_PT,
    height: (heightMm - 2 * safeMm) * MM_TO_PT,
    borderColor: rgb(0, 0, 1),
    borderWidth: 0.5,
    opacity: 0.5,
  })

  // 사용되지 않는 변수 경고 억제
  void ctx
  void totalWidthPt
  void totalHeightPt
}

/**
 * PageRenderContext 초기화 (buildPdf 에서 1회 생성, 전 페이지 공유)
 */
export async function createRenderContext(
  doc: PDFDocument,
  bleedMm: number,
  heightMm: number,
  embedFontBytes: Uint8Array | null,
): Promise<PageRenderContext> {
  const defaultFont = await doc.embedFont(StandardFonts.Helvetica)

  let embedFont: PDFFont | null = null
  if (embedFontBytes) {
    try {
      embedFont = await doc.embedFont(embedFontBytes, { subset: true })
    } catch {
      embedFont = null
    }
  }

  return {
    doc,
    defaultFont,
    embedFont,
    imageCache: new Map(),
    pageHeightPt: (heightMm + 2 * bleedMm) * MM_TO_PT,
    bleedPt: bleedMm * MM_TO_PT,
    warnings: [],
  }
}
