/**
 * strip-quality.ts — 웹툰 스트립 배치 품질 (MODE-06 / ADR-0017)
 *
 * ## 왜 페이지 지표를 그대로 쓰지 않는가
 * `quality.ts` 는 **고정 크기 지면 한 장**을 채점 단위로 삼는다 — 인쇄물은 독자가 페이지를
 * 한 장씩 넘겨 보기 때문이다. 웹툰은 세그먼트 경계를 의식하지 않고 **화면 높이만큼씩 내려
 * 읽는다.** 그래서 같은 배치라도 판정이 달라진다:
 *
 *  - 세그먼트 하단에 몰린 인물 + 다음 세그먼트 상단 인물은 페이지 지표로는 "둘 다 치우침"이지만
 *    스크롤 화면에서는 한 화면 안에 위아래로 이어지는 자연스러운 컷 흐름이다
 *  - 반대로 세그먼트마다 그럴듯해도 이어 붙이면 **전경 없는 화면**(배경만 지나가는 스크롤 구간)이
 *    생길 수 있다
 *  - 세로 무게중심은 의미가 없다 — 화면이 계속 움직이므로 위/아래 치우침은 다음 순간 사라진다.
 *    남는 것은 **가로** 치우침뿐이다
 *
 * ## 측정 방식
 * 세그먼트를 간격 0 으로 이은 가상 스트립 위에 **폰 화면 비율의 창**을 반 화면씩 겹쳐
 * 미끄러뜨리고, 창마다 다섯 축을 잰 뒤 창 평균을 낸다("화면 스크롤당"). 반 화면 겹침은
 * 창 경계에 걸친 컷이 어느 한쪽에서는 온전히 보이게 하기 위함이다. 간격 0 은 이미지 내보내기
 * 기본값(MODE-05 `gapPx: 0`)과 같다 — 독자가 실제로 받는 이미지 기준이다.
 *
 * 축 구분(독립/의존)은 `quality.ts` 와 같은 원칙이다:
 *  - **독립** `balance`(가로 무게중심) · `density`(화면 점유) · `dialogueDensity`(화면당 텍스트 수)
 *  - **의존** `readingFlow`(대사 순서가 아래로 흐르는가) · `faceClearance`(얼굴 가림)
 *    — 배치기가 세그먼트 안에서 직접 최적화하므로 떨어지면 회귀 신호로만 읽는다
 *
 * ## 상수의 근거와 한계
 * 아래 범위는 실사용 데이터가 아니라 **가정**이다(FOLLOWUP-60 실사용 로그 전). 웹툰은 컷 사이
 * 여백이 문법이라 인쇄보다 점유 하한을 낮췄고, 한 화면에 읽히는 대사는 인쇄 한 쪽보다 적게
 * 잡았다. 값을 바꾸면 baseline 을 재생성해 비교 가능성을 유지할 것.
 *
 * 결정론: compose 결과만 보는 순수 함수.
 */

import type { NormRect } from './bubble-cost.js'
import { faceClearanceScore, unionArea } from './quality.js'
import { isWebtoonFormat } from './strip.js'
import type { ComposeResult, FabricLayer, LayoutFormat, PageDraft } from './types.js'

// ─────────────────────────────────────────────
// 상수 — 근거는 파일 머리 주석
// ─────────────────────────────────────────────

/** 화면 창의 세로/가로 비율 — 폰 세로 화면 16:9 를 보수적 기준으로 (19.5:9 기기는 창이 더 길다) */
export const STRIP_VIEWPORT_ASPECT = 16 / 9

/** 창 이동 폭 = 화면 높이 × 이 값 (0.5 = 반 화면씩 겹쳐 이동) */
export const STRIP_WINDOW_STRIDE = 0.5

/** 화면 점유율 적정 범위 — 웹툰은 컷 사이 여백이 문법이라 인쇄(0.25)보다 하한이 낮다 */
export const STRIP_DENSITY_MIN = 0.15
export const STRIP_DENSITY_MAX = 0.85

/** 화면당 텍스트(말풍선·캡션) 수 적정 범위 */
export const STRIP_TEXT_MIN = 1
export const STRIP_TEXT_MAX = 4

/** 가로 무게중심이 이만큼(화면 폭 비율) 치우치면 balance 0 */
const STRIP_BALANCE_TOLERANCE = 0.35

/** 다음 대사가 이전 대사보다 이만큼(세그먼트 높이 비율) 위에 있어야 역행으로 본다 */
const STRIP_FLOW_TOLERANCE = 0.02

// ─────────────────────────────────────────────
// 내부 타입
// ─────────────────────────────────────────────

/** 스트립 좌표(px)의 사각형 */
type StripRect = { x: number; y: number; w: number; h: number }

type StripText = {
  segment: number
  /** 대사 순서 — 없으면 -1 (캡션 등) */
  lineIndex: number
  cx: number
  cy: number
}

type Segment = {
  index: number
  top: number
  /** 배경 제외 레이어 — 시각 무게를 가진 것 */
  rects: StripRect[]
  texts: StripText[]
  faceClearance: number
}

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

function rangeScore(value: number, min: number, max: number, falloff: number): number {
  if (value >= min && value <= max) return 1
  const distance = value < min ? min - value : value - max
  return clamp01(1 - distance / falloff)
}

function mean(values: readonly number[]): number {
  if (values.length === 0) return 1
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

function isTextLayer(layer: FabricLayer): boolean {
  if (layer.kind === 'bubble') return true
  return (layer.data.meta as { kind?: string } | undefined)?.kind === 'caption'
}

/** 레이어의 판형 좌표(px)를 스트립 좌표로 */
function stripRect(layer: FabricLayer, top: number): StripRect | null {
  const w = num(layer.fabric['widthMm'])
  const h = num(layer.fabric['heightMm'])
  if (w <= 0 || h <= 0) return null
  return { x: num(layer.fabric['leftMm']), y: top + num(layer.fabric['topMm']), w, h }
}

function toSegments(pages: readonly PageDraft[], format: LayoutFormat): Segment[] {
  const segH = format.heightMm
  return pages.map((page, index) => {
    const top = index * segH
    const rects: StripRect[] = []
    const texts: StripText[] = []
    for (const layer of page.fabricJson.layers) {
      if (layer.kind === 'bg') continue
      const r = stripRect(layer, top)
      if (!r) continue
      rects.push(r)
      if (isTextLayer(layer)) {
        texts.push({
          segment: index,
          lineIndex: num((layer.data.meta as { lineIndex?: unknown } | undefined)?.lineIndex, -1),
          cx: r.x + r.w / 2,
          cy: r.y + r.h / 2,
        })
      }
    }
    return { index, top, rects, texts, faceClearance: faceClearanceScore(page, format) }
  })
}

/** 창 시작 y 목록 — 반 화면씩, 마지막 창은 스트립 끝에 맞춘다(끝부분이 덜 측정되지 않게) */
function windowTops(total: number, viewportH: number): number[] {
  if (total <= viewportH) return [0]
  const stride = viewportH * STRIP_WINDOW_STRIDE
  const tops: number[] = []
  for (let y = 0; y + viewportH < total; y += stride) tops.push(y)
  tops.push(total - viewportH)
  return tops
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

export interface StripWindowQuality {
  windowIndex: number
  /** 스트립 좌표(px)의 창 시작 y */
  top: number
  /** 창과 겹치는 세그먼트 인덱스 */
  segments: number[]
  /** 독립 축 — 가로 무게중심이 화면 중앙에 가까운가 */
  balance: number
  /** 독립 축 — 전경(배경 제외) 점유율이 적정 범위인가 (전경 없는 화면이면 0 에 가깝다) */
  density: number
  /** 독립 축 — 화면당 말풍선·캡션 수가 적정 범위인가 */
  dialogueDensity: number
  /** 의존 축 — 대사 순서대로 아래로 흐르는가 (세그먼트 경계를 넘어서도) */
  readingFlow: number
  /** 의존 축 — 창에 걸친 세그먼트 중 가장 나쁜 얼굴 가림 회피 점수 */
  faceClearance: number
  score: number
  /** 원값 — 리포트·디버깅용 */
  raw: { coverage: number; texts: number; centroidX: number | null }
}

export interface StripQualityResult {
  totalSegments: number
  totalWindows: number
  /** 화면 창 높이(px) */
  viewportHeight: number
  balance: number
  density: number
  dialogueDensity: number
  readingFlow: number
  faceClearance: number
  score: number
  /**
   * 전경 없는 화면 비율 — 배경 제외 점유율이 STRIP_DENSITY_MIN 의 절반 미만인 창.
   * 배경은 점유에서 빼므로 "빈 화면"이 아니라 **배경(+캡션)만 지나가는 화면**이다. 실서비스에선
   * 배경이 실제 이미지라 설정 컷처럼 보일 수 있다 — 결함 단정이 아니라 배치 정책 판단의 근거로 읽을 것
   */
  backgroundOnlyRatio: number
  windows: StripWindowQuality[]
}

/**
 * 웹툰 compose 결과를 화면 스크롤 단위로 채점한다.
 *
 * @throws Error px(웹툰) 판형이 아닐 때 — 인쇄 판형은 `measureQuality` 를 쓴다
 */
export function measureStripQuality(
  composed: ComposeResult,
  format: LayoutFormat,
): StripQualityResult {
  if (!isWebtoonFormat(format)) {
    throw new Error('[ai-layout] measureStripQuality: px(웹툰) 판형 전용입니다.')
  }
  const W = format.widthMm
  const segH = format.heightMm
  const viewportH = W * STRIP_VIEWPORT_ASPECT
  const segments = toSegments(composed.pages, format)
  const total = segments.length * segH

  if (segments.length === 0 || W <= 0 || segH <= 0) {
    return {
      totalSegments: 0,
      totalWindows: 0,
      viewportHeight: viewportH,
      balance: 1,
      density: 1,
      dialogueDensity: 1,
      readingFlow: 1,
      faceClearance: 1,
      score: 1,
      backgroundOnlyRatio: 0,
      windows: [],
    }
  }

  // 대사 순서 = (세그먼트, lineIndex). 캡션처럼 순서가 없는 텍스트는 흐름 판정에서 뺀다
  const ordered = segments
    .flatMap((s) => s.texts)
    .filter((t) => t.lineIndex >= 0)
    .sort((a, b) => a.segment - b.segment || a.lineIndex - b.lineIndex)

  const windows: StripWindowQuality[] = windowTops(total, viewportH).map((top, windowIndex) => {
    const bottom = top + viewportH
    const winH = Math.min(viewportH, total)
    const hit = segments.filter((s) => s.top < bottom && s.top + segH > top)

    // 창 안으로 자른 사각형(창 정규화 좌표) — 합집합 면적과 가로 무게중심
    const clipped: NormRect[] = []
    let areaSum = 0
    let cxSum = 0
    for (const s of hit) {
      for (const r of s.rects) {
        const y0 = Math.max(r.y, top)
        const y1 = Math.min(r.y + r.h, bottom)
        const x0 = Math.max(r.x, 0)
        const x1 = Math.min(r.x + r.w, W)
        if (y1 <= y0 || x1 <= x0) continue
        clipped.push({ x: x0 / W, y: (y0 - top) / winH, w: (x1 - x0) / W, h: (y1 - y0) / winH })
        const area = (x1 - x0) * (y1 - y0)
        areaSum += area
        cxSum += ((x0 + x1) / 2 / W) * area
      }
    }
    const coverage = unionArea(clipped)
    const centroidX = areaSum > 0 ? cxSum / areaSum : null
    // 전경 없는 화면은 균형을 논할 대상이 아니다 — 중립값(전경 부족은 density 가 벌한다)
    const balance =
      centroidX === null ? 1 : clamp01(1 - Math.abs(centroidX - 0.5) / STRIP_BALANCE_TOLERANCE)
    // 하한 쪽 감쇠폭 = 하한 자체 → 전경 점유 0 은 0점. 웹툰에서 인물·말풍선 없이 배경만 지나가는
    // 화면은 인쇄의 "허전한 쪽"보다 무겁게 본다(0.4 로 두면 전경 3.5% 화면이 71점 — 실측).
    // 과밀 쪽은 인쇄와 같은 0.4
    const density =
      coverage < STRIP_DENSITY_MIN
        ? clamp01(coverage / STRIP_DENSITY_MIN)
        : rangeScore(coverage, STRIP_DENSITY_MIN, STRIP_DENSITY_MAX, 0.4)

    // 화면당 텍스트 — 중심이 창 안에 있는 것만 센다(걸친 말풍선을 두 창에 이중 계산하지 않도록
    // 반 겹침 창에서는 어차피 두 번 보이지만, "그 화면에서 읽히는가"의 근사로 중심을 쓴다)
    const textCount = hit.flatMap((s) => s.texts).filter((t) => t.cy >= top && t.cy < bottom).length
    const dialogueDensity = rangeScore(textCount, STRIP_TEXT_MIN, STRIP_TEXT_MAX, 3)

    // 흐름 — 이전 대사가 이 창 안에 있는 연속 쌍만 본다
    let pairs = 0
    let inversions = 0
    for (let i = 0; i + 1 < ordered.length; i++) {
      const a = ordered[i]
      const b = ordered[i + 1]
      if (!a || !b || a.cy < top || a.cy >= bottom) continue
      pairs++
      if (b.cy < a.cy - STRIP_FLOW_TOLERANCE * segH) inversions++
    }
    const readingFlow = pairs === 0 ? 1 : clamp01(1 - inversions / pairs)

    const faceClearance = hit.length === 0 ? 1 : Math.min(...hit.map((s) => s.faceClearance))

    return {
      windowIndex,
      top,
      segments: hit.map((s) => s.index),
      balance,
      density,
      dialogueDensity,
      readingFlow,
      faceClearance,
      score: mean([balance, density, dialogueDensity, readingFlow, faceClearance]),
      raw: { coverage, texts: textCount, centroidX },
    }
  })

  return summarize(segments.length, viewportH, windows)
}

function summarize(
  totalSegments: number,
  viewportHeight: number,
  windows: StripWindowQuality[],
): StripQualityResult {
  return {
    totalSegments,
    totalWindows: windows.length,
    viewportHeight,
    balance: mean(windows.map((w) => w.balance)),
    density: mean(windows.map((w) => w.density)),
    dialogueDensity: mean(windows.map((w) => w.dialogueDensity)),
    readingFlow: mean(windows.map((w) => w.readingFlow)),
    faceClearance: mean(windows.map((w) => w.faceClearance)),
    score: mean(windows.map((w) => w.score)),
    backgroundOnlyRatio:
      windows.length === 0
        ? 0
        : windows.filter((w) => w.raw.coverage < STRIP_DENSITY_MIN / 2).length / windows.length,
    windows,
  }
}

/** 여러 에피소드(대본)의 스트립 품질을 창 단위로 합산 — 코퍼스 baseline 용 */
export function aggregateStripQuality(results: readonly StripQualityResult[]): StripQualityResult {
  const windows = results.flatMap((r) => r.windows)
  const totalSegments = results.reduce((sum, r) => sum + r.totalSegments, 0)
  return summarize(totalSegments, results[0]?.viewportHeight ?? 0, windows)
}

/** 점수가 낮은 화면 상위 N — "어디를 고칠까"의 출발점 */
export function worstWindows(result: StripQualityResult, limit = 10): StripWindowQuality[] {
  return [...result.windows].sort((a, b) => a.score - b.score || a.top - b.top).slice(0, limit)
}
