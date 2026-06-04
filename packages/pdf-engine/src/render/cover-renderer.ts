/**
 * packages/pdf-engine/src/render/cover-renderer.ts
 *
 * 표지 페이지 렌더러
 *
 * - 배경 톤 6종 (DESIGN-nike SSOT): cream/mint/lilac/pink/navy/white
 * - title (크게) + subtitle + author 배치
 * - 폰트 크기: 판형 폭에 비례 (B5 130mm → 48pt, A5 148mm → 40pt)
 * - 표지도 bleed 포함 전체 크기로 생성 (TrimBox/BleedBox 동일)
 */

import { rgb, degrees, type PDFDocument, type PDFPage } from 'pdf-lib'

import type { CoverInput, CoverTone, PdfFormat } from '../types.js'
import { MM_TO_PT } from '../types.js'

import type { PageRenderContext } from './page-renderer.js'

// ─── 배경 톤 매핑 (DESIGN-nike SSOT) ──────────────────────────────────────────

type RGB = { r: number; g: number; b: number }

const COVER_TONE_RGB: Record<CoverTone, RGB> = {
  cream: { r: 0xf5, g: 0xf0, b: 0xe8 },
  mint: { r: 0xd4, g: 0xed, b: 0xe8 },
  lilac: { r: 0xe8, g: 0xd4, b: 0xed },
  pink: { r: 0xed, g: 0xd4, b: 0xdc },
  navy: { r: 0x1a, g: 0x2b, b: 0x4a },
  white: { r: 0xff, g: 0xff, b: 0xff },
}

/** 배경 톤에 따른 텍스트 색 (navy 배경은 흰글씨, 나머지는 검정) */
function textColorForTone(tone: CoverTone): RGB {
  return tone === 'navy' ? { r: 0xff, g: 0xff, b: 0xff } : { r: 0x1a, g: 0x1a, b: 0x1a }
}

// ─── 폰트 크기 계산 ──────────────────────────────────────────────────────────

/**
 * 판형 폭 기준 title 폰트 크기 계산
 * - 130mm(B5) → 48pt
 * - 148mm(A5) → 40pt
 * - 선형 보간
 */
function titleFontSize(widthMm: number): number {
  // 범위: 80mm ~ 200mm → 24pt ~ 64pt
  const minW = 80,
    maxW = 200
  const minPt = 24,
    maxPt = 64
  const t = Math.max(0, Math.min(1, (widthMm - minW) / (maxW - minW)))
  return Math.round(minPt + t * (maxPt - minPt))
}

// ─── 공개 함수 ──────────────────────────────────────────────────────────────

/**
 * PDFDocument 에 표지 페이지 추가
 *
 * @returns 추가된 PDFPage
 */
export async function renderCoverPage(
  doc: PDFDocument,
  format: PdfFormat,
  cover: CoverInput,
  ctx: PageRenderContext,
): Promise<PDFPage> {
  const { widthMm, heightMm, bleedMm } = format
  const tone = cover.backgroundTone ?? 'cream'
  const bg = COVER_TONE_RGB[tone]
  const textColor = textColorForTone(tone)

  const totalWidthPt = (widthMm + 2 * bleedMm) * MM_TO_PT
  const totalHeightPt = (heightMm + 2 * bleedMm) * MM_TO_PT
  const bleedPt = bleedMm * MM_TO_PT

  const page = doc.addPage([totalWidthPt, totalHeightPt])

  // TrimBox / BleedBox
  page.setTrimBox(bleedPt, bleedPt, widthMm * MM_TO_PT, heightMm * MM_TO_PT)
  page.setBleedBox(0, 0, totalWidthPt, totalHeightPt)

  // 배경 칠
  page.drawRectangle({
    x: 0,
    y: 0,
    width: totalWidthPt,
    height: totalHeightPt,
    color: rgb(bg.r / 255, bg.g / 255, bg.b / 255),
  })

  // 커버 이미지 (옵션)
  if (cover.coverImageUrl) {
    await renderCoverImage(doc, page, cover.coverImageUrl, format, bleedPt, ctx)
  }

  const font = ctx.embedFont ?? ctx.defaultFont
  const tc = rgb(textColor.r / 255, textColor.g / 255, textColor.b / 255)

  // title
  if (cover.title) {
    const titlePt = titleFontSize(widthMm)
    const titleText = cover.title
    const xTitle = bleedPt + 10 * MM_TO_PT
    const yTitle = bleedPt + heightMm * 0.55 * MM_TO_PT

    try {
      page.drawText(titleText, {
        x: xTitle,
        y: yTitle,
        size: titlePt,
        font,
        color: tc,
        maxWidth: (widthMm - 20) * MM_TO_PT,
        lineHeight: titlePt * 1.3,
        rotate: degrees(0),
      })
    } catch {
      // 한글 폴백 실패 무시
    }
  }

  // subtitle
  if (cover.subtitle) {
    const subtitlePt = Math.round(titleFontSize(widthMm) * 0.5)
    const xSub = bleedPt + 10 * MM_TO_PT
    const ySub = bleedPt + heightMm * 0.45 * MM_TO_PT

    try {
      page.drawText(cover.subtitle, {
        x: xSub,
        y: ySub,
        size: subtitlePt,
        font,
        color: tc,
        maxWidth: (widthMm - 20) * MM_TO_PT,
        lineHeight: subtitlePt * 1.4,
      })
    } catch {
      // 폴백 무시
    }
  }

  // author
  if (cover.authorName) {
    const authorPt = Math.round(titleFontSize(widthMm) * 0.35)
    const xAuthor = bleedPt + 10 * MM_TO_PT
    const yAuthor = bleedPt + 20 * MM_TO_PT

    try {
      page.drawText(cover.authorName, {
        x: xAuthor,
        y: yAuthor,
        size: authorPt,
        font,
        color: tc,
      })
    } catch {
      // 폴백 무시
    }
  }

  return page
}

// ─── 내부 헬퍼 ──────────────────────────────────────────────────────────────

async function renderCoverImage(
  doc: PDFDocument,
  page: PDFPage,
  url: string,
  format: PdfFormat,
  bleedPt: number,
  ctx: PageRenderContext,
): Promise<void> {
  try {
    const cached = ctx.imageCache.get(url)
    let image = cached

    if (image === undefined) {
      const res = await fetch(url)
      if (!res.ok) return
      const buf = await res.arrayBuffer()
      const bytes = new Uint8Array(buf)
      if (bytes[0] === 0x89 && bytes[1] === 0x50) {
        image = await doc.embedPng(bytes)
      } else {
        image = await doc.embedJpg(bytes)
      }
      ctx.imageCache.set(url, image)
    }

    if (!image) return

    // 상단 60% 영역 차지
    const imgH = format.heightMm * 0.6 * MM_TO_PT
    const imgW = format.widthMm * MM_TO_PT
    const imgY = bleedPt + format.heightMm * 0.4 * MM_TO_PT

    page.drawImage(image, {
      x: bleedPt,
      y: imgY,
      width: imgW,
      height: imgH,
    })
  } catch {
    ctx.warnings.push(`[cover-renderer] 표지 이미지 렌더 실패: ${url}`)
  }
}
