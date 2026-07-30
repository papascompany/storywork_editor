/**
 * conti-sheet.ts — 콘티 시트 합성기 (CONTI-02)
 *
 * SceneDoc 분석 결과를 2×4 컷 그리드의 콘티 시트 fabricJson 으로 서버측 합성한다.
 * buildPageFabricJson(compose.ts) 선례를 따르는 순수 함수 — 같은 입력 + 같은 seed
 * → 같은 출력 (ADR-0007).
 *
 * 좌표 계약: pdf-engine adapter(fabric-to-pdf.ts)가 직접 소비하므로
 * fabric.left/top/width/height 를 **mm** 로 기록한다 (compose.ts 의 leftMm 규약과
 * 다름 — 콘티 시트는 편집기 라운드트립 없이 publish 에서 곧장 PDF 로 간다).
 *
 * 레이어 표현 (pdf-engine 무수정 통과):
 *   - 컷 프레임: kind 'bubble' (rect + 테두리 렌더)
 *   - 포즈 썸네일: kind 'pose' (image — PNG 마스터 URL, WebP 는 pdf-lib 미지원)
 *   - 라벨/대사/지문: kind 'text'
 */

import type { FabricLayer, LayoutFormat, PageFabricJson } from './types.js'

// ─────────────────────────────────────────────
// 입력 타입
// ─────────────────────────────────────────────

export interface ContiCutLine {
  speaker?: string | null
  text: string
}

export interface ContiCut {
  /** 1-based 컷 번호 */
  cutNo: number
  /** Scene.index (0-based) */
  sceneIndex: number
  /** 지문 — Scene.summary */
  summary: string
  /** 대사 목록 */
  lines: ContiCutLine[]
  /**
   * 샷사이즈 라벨 (WS/MS/CU 등). 현재 SceneMeta.cameraAngle 은 DB 에 영속화되지
   * 않으므로(CONTI-01 게이트) 옵셔널 — CONTI-01 이후 라우트에서 채워 넣는다.
   */
  shotLabel?: string
  /** 포즈 썸네일 URL (PNG 마스터 — pdf-lib 는 WebP 임베드 불가) */
  poseThumbUrl?: string
  /** 이 컷이 배치된 본문 페이지 번호 (1-based, 알 수 없으면 생략) */
  pageNo?: number
}

export interface ContiSheetOptions {
  format: LayoutFormat
  /** 결정론 시드 (기본: 0) */
  seed?: number
  /** 헤더에 표기할 작품 제목 */
  title?: string
}

// ─────────────────────────────────────────────
// 그리드 상수 — conti-2x4 템플릿(default-templates.ts)과 동일 레이아웃
// ─────────────────────────────────────────────

export const CONTI_GRID = {
  cols: 2,
  rows: 4,
  /** 시트당 컷 수 */
  perSheet: 8,
  /** 외곽 여백 = safeMm + CONTI_GRID.marginPadMm */
  marginPadMm: 2,
  headerHeightMm: 8,
  gutterMm: 3,
  cellPadMm: 2,
} as const

// 폰트 크기(pt) — pdf-engine 텍스트 렌더는 fontSize 를 pt 로 소비
const FONT_HEADER_PT = 9
const FONT_LABEL_PT = 7
const FONT_BODY_PT = 6

const MM_PER_PT = 25.4 / 72

const COLOR_FRAME = '#333333'
const COLOR_LABEL = '#333333'
const COLOR_DIALOGUE = '#000000'
const COLOR_DIRECTION = '#666666'

// ─────────────────────────────────────────────
// 텍스트 래핑 (결정론 근사 — CJK 전각 1.0em, ASCII 0.55em)
// ─────────────────────────────────────────────

function charWidthMm(ch: string, fontSizePt: number): number {
  const isAscii = /[ -~]/.test(ch)
  return fontSizePt * MM_PER_PT * (isAscii ? 0.55 : 1.0)
}

/**
 * 문자 단위 그리디 래핑. maxLines 초과분은 마지막 줄 말줄임(…) 처리.
 */
export function wrapTextMm(
  text: string,
  fontSizePt: number,
  maxWidthMm: number,
  maxLines: number,
): string[] {
  if (maxLines <= 0 || maxWidthMm <= 0) return []
  const chars = [...text.replace(/\s+/g, ' ').trim()]
  const lines: string[] = []
  let current = ''
  let currentW = 0
  let truncated = false

  for (const ch of chars) {
    const w = charWidthMm(ch, fontSizePt)
    if (currentW + w > maxWidthMm && current.length > 0) {
      if (lines.length + 1 >= maxLines) {
        // 마지막 허용 줄이 찼는데 글자가 남음 → 말줄임 처리 후 종료
        truncated = true
        break
      }
      lines.push(current)
      current = ch === ' ' ? '' : ch
      currentW = ch === ' ' ? 0 : w
    } else {
      current += ch
      currentW += w
    }
  }

  if (current.length > 0) lines.push(current)
  if (truncated) {
    const last = lines[lines.length - 1]
    if (last !== undefined) {
      lines[lines.length - 1] = `${last.slice(0, Math.max(1, last.length - 1))}…`
    }
  }
  return lines
}

// ─────────────────────────────────────────────
// CONTI-01 훅 — cameraAngle → 샷사이즈 라벨
// ─────────────────────────────────────────────

export function cameraAngleToShotLabel(angle?: string): string | undefined {
  switch (angle) {
    case 'closeup':
      return 'CU'
    case 'medium':
      return 'MS'
    case 'wide':
      return 'WS'
    case 'bird-eye':
      return 'BEV'
    case 'low-angle':
      return 'LA'
    default:
      return undefined
  }
}

// ─────────────────────────────────────────────
// 레이어 빌더
// ─────────────────────────────────────────────

function textLayer(
  id: string,
  leftMm: number,
  topMm: number,
  widthMm: number,
  text: string,
  fontSizePt: number,
  color: string,
  zIndex: number,
): FabricLayer {
  return {
    id,
    kind: 'text',
    data: { locked: true, visible: true, meta: { conti: true } },
    fabric: {
      type: 'textbox',
      left: leftMm,
      top: topMm,
      width: widthMm,
      height: fontSizePt * MM_PER_PT * 1.3,
      scaleX: 1,
      scaleY: 1,
      angle: 0,
      opacity: 1,
      text,
      fontSize: fontSizePt,
      fontFamily: 'Pretendard',
      fill: color,
      zIndex,
    },
  }
}

// ─────────────────────────────────────────────
// 공개 API — composeContiSheets()
// ─────────────────────────────────────────────

/**
 * 컷 목록 → 콘티 시트 fabricJson 배열 (시트당 8컷, 2×4 그리드).
 *
 * @param cuts 컷 목록 (Scene 순서)
 * @param opts format + seed + title
 */
export function composeContiSheets(cuts: ContiCut[], opts: ContiSheetOptions): PageFabricJson[] {
  if (cuts.length === 0) return []

  const seed = opts.seed ?? 0
  const { format } = opts
  const { cols, rows, perSheet, marginPadMm, headerHeightMm, gutterMm, cellPadMm } = CONTI_GRID

  const margin = format.safeMm + marginPadMm
  const gridW = format.widthMm - margin * 2
  const gridH = format.heightMm - margin * 2 - headerHeightMm
  const cellW = (gridW - gutterMm * (cols - 1)) / cols
  const cellH = (gridH - gutterMm * (rows - 1)) / rows

  const sheetCount = Math.ceil(cuts.length / perSheet)
  const sheets: PageFabricJson[] = []

  for (let s = 0; s < sheetCount; s++) {
    const sheetCuts = cuts.slice(s * perSheet, (s + 1) * perSheet)
    const layers: FabricLayer[] = []

    // 헤더
    const headerText = opts.title
      ? `${opts.title} — 콘티 ${s + 1}/${sheetCount}`
      : `콘티 시트 ${s + 1}/${sheetCount}`
    layers.push(
      textLayer(
        `conti-${seed}-s${s}-header`,
        margin,
        margin,
        gridW,
        headerText,
        FONT_HEADER_PT,
        COLOR_LABEL,
        1,
      ),
    )

    for (let i = 0; i < sheetCuts.length; i++) {
      const cut = sheetCuts[i]
      if (!cut) continue

      const col = i % cols
      const row = Math.floor(i / cols)
      const cellX = margin + col * (cellW + gutterMm)
      const cellY = margin + headerHeightMm + row * (cellH + gutterMm)
      const idBase = `conti-${seed}-s${s}-c${cut.cutNo}`

      // 컷 프레임 (bubble kind → rect + 테두리)
      layers.push({
        id: `${idBase}-frame`,
        kind: 'bubble',
        data: {
          locked: true,
          visible: true,
          meta: { conti: true, bubbleType: 'narration', sceneIndex: cut.sceneIndex },
        },
        fabric: {
          type: 'rect',
          left: cellX,
          top: cellY,
          width: cellW,
          height: cellH,
          scaleX: 1,
          scaleY: 1,
          angle: 0,
          opacity: 1,
          fill: '#FFFFFF',
          stroke: COLOR_FRAME,
          strokeWidth: 0.8,
          zIndex: 0,
        },
      })

      // 컷 라벨: "#1 · CU · p.3"
      const labelParts = [`#${cut.cutNo}`]
      if (cut.shotLabel) labelParts.push(cut.shotLabel)
      if (cut.pageNo !== undefined) labelParts.push(`p.${cut.pageNo}`)
      const labelH = FONT_LABEL_PT * MM_PER_PT * 1.4
      layers.push(
        textLayer(
          `${idBase}-label`,
          cellX + cellPadMm,
          cellY + cellPadMm,
          cellW - cellPadMm * 2,
          labelParts.join(' · '),
          FONT_LABEL_PT,
          COLOR_LABEL,
          2,
        ),
      )

      // 콘텐츠 영역 (라벨 아래)
      const contentY = cellY + cellPadMm + labelH + 1
      const contentH = cellH - cellPadMm * 2 - labelH - 1

      // 포즈 썸네일 (왼쪽) — URL 없으면 생략
      const thumbSize = Math.min(contentH, cellW * 0.4)
      let textX = cellX + cellPadMm
      let textW = cellW - cellPadMm * 2
      if (cut.poseThumbUrl) {
        layers.push({
          id: `${idBase}-pose`,
          kind: 'pose',
          data: {
            locked: true,
            visible: true,
            meta: { conti: true, fileUrl: cut.poseThumbUrl, sceneIndex: cut.sceneIndex },
          },
          fabric: {
            type: 'image',
            left: cellX + cellPadMm,
            top: contentY,
            width: thumbSize,
            height: thumbSize,
            scaleX: 1,
            scaleY: 1,
            angle: 0,
            opacity: 1,
            src: cut.poseThumbUrl,
            zIndex: 1,
          },
        })
        textX = cellX + cellPadMm + thumbSize + cellPadMm
        textW = cellW - cellPadMm * 3 - thumbSize
      }

      // 텍스트 예산: 대사 우선, 지문은 마지막 1~2줄.
      // 주의: pdf-lib drawText 의 \n 멀티라인은 페이지 기본 lineHeight(fontSize 무관)로
      // 렌더되어 줄 간격이 틀어진다 → 래핑 줄마다 개별 text 레이어로 배출한다.
      const lineHMm = FONT_BODY_PT * MM_PER_PT * 1.45
      const maxTotalLines = Math.max(1, Math.floor(contentH / lineHMm))
      const directionBudget = cut.summary ? Math.min(2, maxTotalLines) : 0
      let dialogueBudget = maxTotalLines - directionBudget

      let cursorY = contentY
      let z = 3
      for (let li = 0; li < cut.lines.length && dialogueBudget > 0; li++) {
        const line = cut.lines[li]
        if (!line) continue
        const prefix = line.speaker ? `${line.speaker}: ` : ''
        const wrapped = wrapTextMm(
          `${prefix}${line.text}`,
          FONT_BODY_PT,
          textW,
          Math.min(2, dialogueBudget),
        )
        for (let wi = 0; wi < wrapped.length; wi++) {
          const wline = wrapped[wi]
          if (wline === undefined) continue
          layers.push(
            textLayer(
              `${idBase}-line${li}-w${wi}`,
              textX,
              cursorY,
              textW,
              wline,
              FONT_BODY_PT,
              COLOR_DIALOGUE,
              z++,
            ),
          )
          cursorY += lineHMm
        }
        dialogueBudget -= wrapped.length
      }

      // 지문 (△ prefix, 회색)
      if (cut.summary && directionBudget > 0) {
        const wrapped = wrapTextMm(`△ ${cut.summary}`, FONT_BODY_PT, textW, directionBudget)
        for (let wi = 0; wi < wrapped.length; wi++) {
          const wline = wrapped[wi]
          if (wline === undefined) continue
          layers.push(
            textLayer(
              `${idBase}-direction-w${wi}`,
              textX,
              cursorY,
              textW,
              wline,
              FONT_BODY_PT,
              COLOR_DIRECTION,
              z++,
            ),
          )
          cursorY += lineHMm
        }
      }
    }

    // zIndex 오름차순 정렬 (결정론 — compose.ts 와 동일 규칙)
    layers.sort((a, b) => {
      const za = typeof a.fabric['zIndex'] === 'number' ? a.fabric['zIndex'] : 0
      const zb = typeof b.fabric['zIndex'] === 'number' ? b.fabric['zIndex'] : 0
      return za - zb || a.id.localeCompare(b.id)
    })

    sheets.push({
      v: 1,
      format: {
        id: format.id,
        widthMm: format.widthMm,
        heightMm: format.heightMm,
        dpi: format.dpi,
      },
      layers,
      _aiMeta: {
        generatedBy: 'ai-layout',
        seed,
        schemaVersion: 1,
        templateId: 'conti-2x4',
        sceneIndices: sheetCuts.map((c) => c.sceneIndex),
      },
    })
  }

  return sheets
}
