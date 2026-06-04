/**
 * packages/pdf-engine/src/preflight/visualize.ts
 *
 * buildPreflightPdf() — 프리플라이트 결과 시각화 PDF 생성
 *
 * 생성 구조:
 *   페이지 1: 리포트 표지 (ok/fail 상태, 위반 수, 프로필명)
 *   페이지 2+: 위반이 있는 페이지별 오버레이
 *     - bleed 가이드 라인 (빨강)
 *     - safe area 가이드 라인 (파랑)
 *     - 위반 레이어 하이라이트 (붉은 박스)
 *   마지막 페이지: 위반 목록 (rule, severity, 메시지)
 */

import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib'

import { MM_TO_PT } from '../types.js'
import type { PdfBuildInput } from '../types.js'

import type { PreflightReport, PreflightViolation } from './types.js'

// ─── 색상 상수 ────────────────────────────────────────────────────────────────

const COLOR_ERROR = rgb(0.9, 0, 0) // 빨강
const COLOR_WARNING = rgb(1, 0.6, 0) // 주황
const COLOR_INFO = rgb(0, 0.4, 0.8) // 파랑
const COLOR_BLEED_GUIDE = rgb(1, 0, 0) // bleed 가이드 빨강
const COLOR_SAFE_GUIDE = rgb(0, 0, 1) // safe area 가이드 파랑
const COLOR_BG = rgb(1, 1, 1)
const COLOR_DARK = rgb(0.1, 0.1, 0.1)
const COLOR_GRAY = rgb(0.5, 0.5, 0.5)

// ─── 헬퍼 ─────────────────────────────────────────────────────────────────────

function severityColor(severity: PreflightViolation['severity']) {
  switch (severity) {
    case 'error':
      return COLOR_ERROR
    case 'warning':
      return COLOR_WARNING
    case 'info':
      return COLOR_INFO
  }
}

function truncate(text: string, maxLen: number): string {
  return text.length > maxLen ? text.slice(0, maxLen - 3) + '...' : text
}

/**
 * 한글 등 WinAnsi 인코딩 불가 문자를 ASCII 대체 문자로 변환
 * pdf-lib StandardFonts 는 WinAnsi(Latin-1 확장) 만 지원하므로
 * 시각화 PDF 에서는 한글 메시지를 ASCII 로 대체한다.
 */
function toAsciiSafe(text: string): string {
  // eslint-disable-next-line no-control-regex
  return text.replace(/[^\x00-\x7F]/g, '?')
}

// ─── 리포트 표지 페이지 ───────────────────────────────────────────────────────

async function addReportCoverPage(doc: PDFDocument, report: PreflightReport): Promise<void> {
  const page = doc.addPage([595, 842]) // A4 pt
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  // 배경
  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: COLOR_BG })

  // 상단 상태 배너
  const bannerColor = report.ok ? rgb(0, 0.6, 0) : COLOR_ERROR
  page.drawRectangle({ x: 0, y: 762, width: 595, height: 80, color: bannerColor })

  const statusText = report.ok ? 'PASS' : 'FAIL'
  page.drawText(statusText, {
    x: 40,
    y: 790,
    size: 32,
    font: fontBold,
    color: COLOR_BG,
  })

  // 프로필 이름
  page.drawText(`Profile: ${toAsciiSafe(report.profileName)}`, {
    x: 200,
    y: 800,
    size: 14,
    font,
    color: COLOR_BG,
  })

  // 통계
  const statsY = 700
  const statItems = [
    { label: 'Errors', count: report.errors.length, color: COLOR_ERROR },
    { label: 'Warnings', count: report.warnings.length, color: COLOR_WARNING },
    { label: 'Infos', count: report.infos.length, color: COLOR_INFO },
    { label: 'Pages', count: report.metadata.totalPages, color: COLOR_DARK },
  ]

  statItems.forEach((stat, i) => {
    const x = 40 + i * 130
    page.drawRectangle({ x, y: statsY - 40, width: 110, height: 60, color: rgb(0.95, 0.95, 0.95) })
    page.drawText(String(stat.count), {
      x: x + 10,
      y: statsY + 5,
      size: 24,
      font: fontBold,
      color: stat.color,
    })
    page.drawText(stat.label, { x: x + 10, y: statsY - 20, size: 10, font, color: COLOR_GRAY })
  })

  // 체크 날짜
  page.drawText(`Checked: ${report.metadata.checkedAt}`, {
    x: 40,
    y: statsY - 70,
    size: 9,
    font,
    color: COLOR_GRAY,
  })

  // "StoryWork Preflight"
  page.drawText('StoryWork Preflight Visualizer', {
    x: 40,
    y: 30,
    size: 9,
    font,
    color: COLOR_GRAY,
  })
}

// ─── 페이지 오버레이 ──────────────────────────────────────────────────────────

async function addPageOverlay(
  doc: PDFDocument,
  input: PdfBuildInput,
  pageIndex: number,
  violations: PreflightViolation[],
): Promise<void> {
  const { widthMm, heightMm, bleedMm, safeMm } = input.format
  const totalWidthPt = (widthMm + 2 * bleedMm) * MM_TO_PT
  const totalHeightPt = (heightMm + 2 * bleedMm) * MM_TO_PT
  const bleedPt = bleedMm * MM_TO_PT
  const safePt = safeMm * MM_TO_PT

  // 스케일: 오버레이 페이지를 A4 폭 안에 맞춤
  const maxWidth = 400
  const scale = Math.min(maxWidth / totalWidthPt, 500 / totalHeightPt)
  const scaledW = totalWidthPt * scale
  const scaledH = totalHeightPt * scale

  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: rgb(0.97, 0.97, 0.97) })

  // 페이지 제목
  page.drawText(`Page ${pageIndex + 1} — Overlay`, {
    x: 40,
    y: 800,
    size: 14,
    font: fontBold,
    color: COLOR_DARK,
  })

  // 캔버스 위치 (좌상단 기준)
  const canvasX = 40
  const canvasY = 842 - 80 - scaledH

  // 흰색 배경 (trim 영역)
  page.drawRectangle({
    x: canvasX + bleedPt * scale,
    y: canvasY + bleedPt * scale,
    width: widthMm * MM_TO_PT * scale,
    height: heightMm * MM_TO_PT * scale,
    color: COLOR_BG,
  })

  // bleed 가이드 (빨강 얇은 테두리)
  page.drawRectangle({
    x: canvasX + bleedPt * scale,
    y: canvasY + bleedPt * scale,
    width: widthMm * MM_TO_PT * scale,
    height: heightMm * MM_TO_PT * scale,
    borderColor: COLOR_BLEED_GUIDE,
    borderWidth: 1,
    opacity: 0.8,
  })

  // safe area 가이드 (파랑 점선 근사)
  page.drawRectangle({
    x: canvasX + (bleedPt + safePt) * scale,
    y: canvasY + (bleedPt + safePt) * scale,
    width: (widthMm * MM_TO_PT - 2 * safePt) * scale,
    height: (heightMm * MM_TO_PT - 2 * safePt) * scale,
    borderColor: COLOR_SAFE_GUIDE,
    borderWidth: 0.5,
    opacity: 0.6,
  })

  // 위반 레이어 하이라이트
  const fabricJson = input.pages[pageIndex]?.fabricJson as Record<string, unknown> | undefined
  const layers = fabricJson?.['layers']
  if (Array.isArray(layers)) {
    for (const violation of violations) {
      if (violation.layerId === undefined) continue
      const layer = layers.find((l) => (l as Record<string, unknown>)['id'] === violation.layerId)
      if (!layer) continue

      const fab = (layer as Record<string, unknown>)['fabric'] as
        | Record<string, unknown>
        | undefined
      if (!fab) continue
      const left = typeof fab['left'] === 'number' ? fab['left'] : 0
      const top = typeof fab['top'] === 'number' ? fab['top'] : 0
      const w = typeof fab['width'] === 'number' ? fab['width'] : 0
      const h = typeof fab['height'] === 'number' ? fab['height'] : 0
      const scaleX = typeof fab['scaleX'] === 'number' ? fab['scaleX'] : 1
      const scaleY = typeof fab['scaleY'] === 'number' ? fab['scaleY'] : 1

      const layerX = canvasX + (bleedPt + left * MM_TO_PT) * scale
      // PDF y-flip: canvas y=0 은 top, PDF y=0 은 bottom
      const layerY =
        canvasY + (bleedPt + (heightMm * MM_TO_PT - (top + h * scaleY) * MM_TO_PT)) * scale
      const layerW = w * scaleX * MM_TO_PT * scale
      const layerH = h * scaleY * MM_TO_PT * scale

      page.drawRectangle({
        x: layerX,
        y: layerY,
        width: layerW,
        height: layerH,
        borderColor: severityColor(violation.severity),
        borderWidth: 1.5,
        opacity: 0.7,
      })
    }
  }

  // 범례
  const legendY = canvasY - 20
  page.drawText('RED: bleed/trim  BLUE: safe area  Orange box: violation', {
    x: canvasX,
    y: legendY,
    size: 7,
    font,
    color: COLOR_GRAY,
  })

  // 위반 목록 (오른쪽)
  const listX = canvasX + scaledW + 20
  let listY = canvasY + scaledH
  page.drawText(`Violations (${violations.length})`, {
    x: listX,
    y: listY,
    size: 10,
    font: fontBold,
    color: COLOR_DARK,
  })
  listY -= 16

  for (const v of violations.slice(0, 10)) {
    const col = severityColor(v.severity)
    page.drawText(`[${v.severity.toUpperCase()}] ${toAsciiSafe(truncate(v.message, 60))}`, {
      x: listX,
      y: listY,
      size: 7,
      font,
      color: col,
      rotate: degrees(0),
    })
    listY -= 12
    if (listY < 60) break
  }
}

// ─── 위반 목록 페이지 ─────────────────────────────────────────────────────────

async function addViolationListPage(doc: PDFDocument, report: PreflightReport): Promise<void> {
  const allViolations = [...report.errors, ...report.warnings, ...report.infos]
  if (allViolations.length === 0) return

  const page = doc.addPage([595, 842])
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold)

  page.drawRectangle({ x: 0, y: 0, width: 595, height: 842, color: COLOR_BG })
  page.drawText('Violation Details', { x: 40, y: 800, size: 16, font: fontBold, color: COLOR_DARK })
  page.drawText(`Profile: ${toAsciiSafe(report.profileName)}`, {
    x: 40,
    y: 780,
    size: 10,
    font,
    color: COLOR_GRAY,
  })

  let y = 750
  for (const v of allViolations) {
    if (y < 60) break

    const col = severityColor(v.severity)
    const prefix = v.pageIndex !== undefined ? `[p${v.pageIndex + 1}] ` : ''
    page.drawText(`${v.severity.toUpperCase()} -- ${v.rule}`, {
      x: 40,
      y,
      size: 9,
      font: fontBold,
      color: col,
    })
    y -= 13
    page.drawText(`${toAsciiSafe(prefix)}${toAsciiSafe(truncate(v.message, 90))}`, {
      x: 50,
      y,
      size: 8,
      font,
      color: COLOR_DARK,
    })
    y -= 11
    if (v.suggestion) {
      page.drawText(`  Suggestion: ${toAsciiSafe(truncate(v.suggestion, 85))}`, {
        x: 50,
        y,
        size: 7,
        font,
        color: COLOR_GRAY,
      })
      y -= 10
    }
    y -= 5
    // 구분선
    page.drawLine({
      start: { x: 40, y },
      end: { x: 555, y },
      thickness: 0.3,
      color: rgb(0.9, 0.9, 0.9),
    })
    y -= 5
  }
}

// ─── 공개 API ─────────────────────────────────────────────────────────────────

/**
 * 프리플라이트 결과를 시각화하는 별도 PDF 생성
 *
 * @param input   원본 PdfBuildInput (페이지 레이아웃 정보)
 * @param report  preflight() 가 반환한 단일 PreflightReport
 * @returns       시각화 PDF 바이트
 */
export async function buildPreflightPdf(
  input: PdfBuildInput,
  report: PreflightReport,
): Promise<Uint8Array> {
  const doc = await PDFDocument.create()

  // 1. 리포트 표지
  await addReportCoverPage(doc, report)

  // 2. 위반이 있는 페이지별 오버레이
  const allViolations = [...report.errors, ...report.warnings, ...report.infos]
  const affectedPageIndices = new Set(
    allViolations.filter((v) => v.pageIndex !== undefined).map((v) => v.pageIndex as number),
  )

  for (const pageIndex of [...affectedPageIndices].sort((a, b) => a - b)) {
    const pageViolations = allViolations.filter((v) => v.pageIndex === pageIndex)
    await addPageOverlay(doc, input, pageIndex, pageViolations)
  }

  // 3. 위반 목록 페이지
  await addViolationListPage(doc, report)

  return doc.save({ useObjectStreams: false })
}
