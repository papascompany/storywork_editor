/**
 * quality.ts — 배치 **품질** 지표 (LAYOUT-04)
 *
 * ## 왜 필요한가
 * 채택률(`adoption.ts`)은 "사용자가 반드시 고쳐야 하는 결함이 0인가"만 본다. LAYOUT-03 ·
 * SCRIPT-KO-04 를 거치며 그 값이 100% 로 **포화**됐다 — 더는 배치가 좋아졌는지 나빠졌는지
 * 구분하지 못한다. 결함이 없다는 것과 잘 그렸다는 것은 다른 말이다.
 *
 * 이 모듈은 결함이 아닌 **품질**을 잰다: 지면이 균형 있게 채워졌는가, 시선이 자연스럽게
 * 흐르는가, 한 페이지가 감당하는 대사가 적당한가.
 *
 * ## 독립 축과 의존 축을 구분하는 이유
 * 배치기(`bubble-cost.ts`)가 **최소화하도록 설계된 항**을 그대로 품질 지표로 쓰면,
 * "우리가 최적화한 것을 우리가 잘한다고 보고"하는 순환이 된다. 그런 축은 품질의 증거가 아니라
 * **회귀 감시**용이다. 그래서 둘을 나눠 보고한다:
 *
 *  - **독립 축** — 배치기가 목적함수로 삼지 않는 것. 품질 판단의 실제 근거
 *    · `balance`         시각 무게중심이 지면 중앙에 있는가
 *    · `density`         지면 점유율이 과밀/과소가 아닌가
 *    · `dialogueDensity` 페이지가 감당하는 대사 수가 적정 범위인가
 *  - **의존 축** — `assignBubblesByCost` 가 직접 최적화하는 것. 값이 높은 건 당연하고,
 *    **떨어지면 회귀**라는 신호로만 읽는다
 *    · `readingFlow`    읽기 순서(위→아래·좌→우) 역행이 없는가
 *    · `faceClearance`  말풍선이 얼굴을 덮지 않는가
 *
 * `score` 는 다섯 축의 산술평균이지만, **축 간 트레이드오프를 숨긴다** — 리포트는 항상
 * 축별 분해를 함께 낸다.
 *
 * ## 실사용 로그가 붙은 뒤
 * FOLLOWUP-60 이 들어오면 실측 채택률이 정본이 되고, 이 품질 축들은 그 선행지표로 상관을
 * 추적한다. 지표 정의를 바꿀 때는 baseline 을 재생성해 비교 가능성을 유지할 것.
 *
 * 결정론: compose 결과만 보는 순수 함수 — 같은 입력 → 같은 리포트.
 */

import { occlusionCost, readingOrderCost } from './bubble-cost.js'
import type { NormRect } from './bubble-cost.js'
import type { ComposeResult, FabricLayer, LayoutFormat, PageDraft } from './types.js'

// ─────────────────────────────────────────────
// 적정 범위 상수 — 값의 근거를 여기 한 곳에 모은다
// ─────────────────────────────────────────────

/** 지면 점유율 적정 범위. 아래면 허전하고, 위면 "다닥다닥" 해진다 */
export const DENSITY_MIN = 0.25
export const DENSITY_MAX = 0.85

/** 페이지당 대사 수 적정 범위 (말풍선 상한 6 = MAX_BUBBLES_PER_PAGE 와 정합) */
export const DIALOGUE_MIN = 2
export const DIALOGUE_MAX = 6

/** 무게중심이 이만큼(정규화 거리) 치우치면 balance 0 */
const BALANCE_TOLERANCE = 0.35

/** 포즈 슬롯 상단부 = 얼굴 영역 근사 (bubble-slots.headBox 와 같은 휴리스틱) */
const FACE_TOP_RATIO = 0.35
const FACE_SIDE_RATIO = 0.25

// ─────────────────────────────────────────────
// 레이어 → 정규화 사각형
// ─────────────────────────────────────────────

function num(v: unknown, fallback = 0): number {
  return typeof v === 'number' && Number.isFinite(v) ? v : fallback
}

/** 레이어의 mm 좌표를 판형 기준 0..1 사각형으로 */
function layerRect(layer: FabricLayer, format: LayoutFormat): NormRect | null {
  const w = num(layer.fabric['widthMm'])
  const h = num(layer.fabric['heightMm'])
  if (w <= 0 || h <= 0 || format.widthMm <= 0 || format.heightMm <= 0) return null
  return {
    x: num(layer.fabric['leftMm']) / format.widthMm,
    y: num(layer.fabric['topMm']) / format.heightMm,
    w: w / format.widthMm,
    h: h / format.heightMm,
  }
}

function isBubbleLayer(layer: FabricLayer): boolean {
  return layer.kind === 'bubble'
}

function isCaptionLayer(layer: FabricLayer): boolean {
  return (layer.data.meta as { kind?: string } | undefined)?.kind === 'caption'
}

/**
 * 시각 무게를 갖는 레이어 — 배경은 제외한다.
 * 배경은 지면 전체를 덮으므로 포함하면 모든 페이지의 무게중심이 정중앙으로 붙어 버린다.
 */
function weightedLayers(page: PageDraft): FabricLayer[] {
  return page.fabricJson.layers.filter((l) => l.kind !== 'bg')
}

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v
}

/** 값이 [min,max] 안이면 1, 밖이면 벗어난 거리에 비례해 0 으로 */
function rangeScore(value: number, min: number, max: number, falloff: number): number {
  if (value >= min && value <= max) return 1
  const distance = value < min ? min - value : value - max
  return clamp01(1 - distance / falloff)
}

// ─────────────────────────────────────────────
// 축별 계산
// ─────────────────────────────────────────────

/** 면적 가중 무게중심이 지면 중앙에 가까운 정도 (0..1) */
export function balanceScore(page: PageDraft, format: LayoutFormat): number {
  let areaSum = 0
  let cx = 0
  let cy = 0

  for (const layer of weightedLayers(page)) {
    const r = layerRect(layer, format)
    if (!r) continue
    const area = r.w * r.h
    if (area <= 0) continue
    areaSum += area
    cx += (r.x + r.w / 2) * area
    cy += (r.y + r.h / 2) * area
  }

  // 요소가 없는 페이지는 균형을 논할 대상이 아니다 — 중립값
  if (areaSum <= 0) return 1

  const dx = cx / areaSum - 0.5
  const dy = cy / areaSum - 0.5
  const distance = Math.sqrt(dx * dx + dy * dy)
  return clamp01(1 - distance / BALANCE_TOLERANCE)
}

/** 지면 점유율이 적정 범위에 있는 정도 (0..1) */
export function densityScore(page: PageDraft, format: LayoutFormat): number {
  let occupied = 0
  for (const layer of weightedLayers(page)) {
    const r = layerRect(layer, format)
    if (!r) continue
    occupied += Math.max(0, r.w) * Math.max(0, r.h)
  }
  // 겹침을 빼지 않은 근사값 — 1 을 넘을 수 있어 상한을 둔다
  return rangeScore(Math.min(occupied, 1.5), DENSITY_MIN, DENSITY_MAX, 0.4)
}

/** 페이지가 감당하는 대사 수가 적정 범위에 있는 정도 (0..1) */
export function dialogueDensityScore(page: PageDraft): number {
  const bubbles = page.fabricJson.layers.filter(isBubbleLayer).length
  return rangeScore(bubbles, DIALOGUE_MIN, DIALOGUE_MAX, 4)
}

/**
 * 대사 순서대로 이은 말풍선이 읽기 순서를 거스르지 않는 정도 (0..1).
 * 레이어 배열은 zIndex 로 정렬돼 있으므로 `meta.lineIndex` 로 대사 순서를 복원한다.
 */
export function readingFlowScore(page: PageDraft, format: LayoutFormat): number {
  const ordered = page.fabricJson.layers
    .filter(isBubbleLayer)
    .map((l) => ({
      lineIndex: num((l.data.meta as { lineIndex?: unknown } | undefined)?.lineIndex, -1),
      rect: layerRect(l, format),
    }))
    .filter((e): e is { lineIndex: number; rect: NormRect } => e.rect !== null)
    .sort((a, b) => a.lineIndex - b.lineIndex)

  if (ordered.length < 2) return 1
  return clamp01(1 - readingOrderCost(ordered.map((e) => e.rect)))
}

/** 말풍선·캡션이 인물 얼굴을 덮지 않는 정도 (0..1) */
export function faceClearanceScore(page: PageDraft, format: LayoutFormat): number {
  const faces: NormRect[] = []
  for (const layer of page.fabricJson.layers) {
    if (layer.kind !== 'pose') continue
    const r = layerRect(layer, format)
    if (!r) continue
    faces.push({
      x: r.x + r.w * FACE_SIDE_RATIO,
      y: r.y,
      w: r.w * (1 - FACE_SIDE_RATIO * 2),
      h: r.h * FACE_TOP_RATIO,
    })
  }
  if (faces.length === 0) return 1

  const texts = page.fabricJson.layers.filter((l) => isBubbleLayer(l) || isCaptionLayer(l))
  if (texts.length === 0) return 1

  let worst = 0
  for (const layer of texts) {
    const r = layerRect(layer, format)
    if (!r) continue
    worst = Math.max(worst, occlusionCost(r, faces))
  }
  return clamp01(1 - worst)
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

export interface PageQuality {
  pageIndex: number
  /** 독립 축 — 시각 무게중심이 지면 중앙에 있는가 */
  balance: number
  /** 독립 축 — 지면 점유율이 과밀/과소가 아닌가 */
  density: number
  /** 독립 축 — 페이지가 감당하는 대사 수가 적정 범위인가 */
  dialogueDensity: number
  /** 의존 축(회귀 감시) — 읽기 순서 역행이 없는가 */
  readingFlow: number
  /** 의존 축(회귀 감시) — 말풍선이 얼굴을 덮지 않는가 */
  faceClearance: number
  /** 다섯 축 산술평균 — 축별 분해와 함께 읽을 것 */
  score: number
}

export interface QualityResult {
  totalPages: number
  /** 페이지 평균 (축별) */
  balance: number
  density: number
  dialogueDensity: number
  readingFlow: number
  faceClearance: number
  /** 페이지 평균 종합 점수 */
  score: number
  pages: PageQuality[]
}

/** 축 이름 — 리포트가 순서를 고정해 쓰기 위한 목록 */
export const QUALITY_AXES = [
  'balance',
  'density',
  'dialogueDensity',
  'readingFlow',
  'faceClearance',
] as const
export type QualityAxis = (typeof QUALITY_AXES)[number]

/** 배치기가 직접 최적화하는 축 — 값이 높은 게 당연하므로 회귀 감시로만 읽는다 */
export const DEPENDENT_AXES: readonly QualityAxis[] = ['readingFlow', 'faceClearance']

function mean(values: readonly number[]): number {
  if (values.length === 0) return 1
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

/** 페이지 하나의 품질 */
export function measurePageQuality(page: PageDraft, format: LayoutFormat): PageQuality {
  const balance = balanceScore(page, format)
  const density = densityScore(page, format)
  const dialogueDensity = dialogueDensityScore(page)
  const readingFlow = readingFlowScore(page, format)
  const faceClearance = faceClearanceScore(page, format)

  return {
    pageIndex: page.pageIndex,
    balance,
    density,
    dialogueDensity,
    readingFlow,
    faceClearance,
    score: mean([balance, density, dialogueDensity, readingFlow, faceClearance]),
  }
}

/** compose 결과 전체의 품질 리포트 */
export function measureQuality(composed: ComposeResult, format: LayoutFormat): QualityResult {
  const pages = composed.pages.map((p) => measurePageQuality(p, format))
  return {
    totalPages: pages.length,
    balance: mean(pages.map((p) => p.balance)),
    density: mean(pages.map((p) => p.density)),
    dialogueDensity: mean(pages.map((p) => p.dialogueDensity)),
    readingFlow: mean(pages.map((p) => p.readingFlow)),
    faceClearance: mean(pages.map((p) => p.faceClearance)),
    score: mean(pages.map((p) => p.score)),
    pages,
  }
}

/** 여러 대본의 품질 리포트를 하나로 합산 (코퍼스 전체 baseline 용) */
export function aggregateQuality(results: readonly QualityResult[]): QualityResult {
  const pages = results.flatMap((r) => r.pages)
  return {
    totalPages: pages.length,
    balance: mean(pages.map((p) => p.balance)),
    density: mean(pages.map((p) => p.density)),
    dialogueDensity: mean(pages.map((p) => p.dialogueDensity)),
    readingFlow: mean(pages.map((p) => p.readingFlow)),
    faceClearance: mean(pages.map((p) => p.faceClearance)),
    score: mean(pages.map((p) => p.score)),
    pages,
  }
}

/** 점수가 낮은 페이지 상위 N — "무엇을 고칠까"의 출발점 */
export function worstPages(result: QualityResult, limit = 10): PageQuality[] {
  return [...result.pages]
    .sort((a, b) => a.score - b.score || a.pageIndex - b.pageIndex)
    .slice(0, limit)
}
