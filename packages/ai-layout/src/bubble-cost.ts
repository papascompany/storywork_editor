/**
 * bubble-cost.ts — 말풍선 배치 비용함수 4항 정식화 (BUBBLE-02)
 *
 * research 2026-07-21 §4.3:
 *   cost = w1·(화자 mouth 근접 + 꼬리 각도) + w2·중요영역(얼굴 bbox) 가림 페널티
 *        + w3·읽기순서 단조성 위반 + w4·패널 경계 침범        ← 전부 결정론 룰
 *
 * 좌표계: 0..1 정규화 (판형 기준). 각 항은 [0,1] 로 정규화 후 가중 합산.
 * 결정론: 순열의 사전순 탐색 + 엄격 비교(<) — 같은 입력 → 같은 배치.
 *
 * MAGI(연구 전용— 코드 미사용)의 tail-aware 화자연결을 역함수로 삼은 패턴:
 * "꼬리가 화자를 가리키기 좋은 위치" = 배치 비용이 낮은 위치.
 */

import type { LayoutFormat, LayoutSlot } from './types.js'

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface NormPoint {
  x: number
  y: number
}

export interface NormRect {
  x: number
  y: number
  w: number
  h: number
}

/** 화자 앵커 — mouth 좌표와 얼굴 bbox (모두 판형 정규화 좌표) */
export interface SpeakerAnchor {
  characterName: string
  mouth: NormPoint
  faceBox: NormRect
}

/** 비용함수 가중치 (w1~w4) */
export interface BubbleCostWeights {
  /** w1 — 화자 mouth 근접 + 꼬리 각도 */
  proximity: number
  /** w2 — 얼굴 bbox 가림 페널티 */
  occlusion: number
  /** w3 — 읽기순서 단조성 위반 */
  readingOrder: number
  /** w4 — 패널 경계 침범 */
  boundary: number
}

export const DEFAULT_BUBBLE_COST_WEIGHTS: BubbleCostWeights = {
  proximity: 1.0,
  occlusion: 1.5,
  readingOrder: 0.8,
  boundary: 2.0,
}

export interface BubbleCostBreakdown {
  proximity: number
  occlusion: number
  boundary: number
  /** 가중 합 (읽기순서 항은 배치 전체에 대해 별도 합산) */
  total: number
}

// ─────────────────────────────────────────────
// 기하 헬퍼
// ─────────────────────────────────────────────

function rectCenter(r: NormRect): NormPoint {
  return { x: r.x + r.w / 2, y: r.y + r.h / 2 }
}

function overlapArea(a: NormRect, b: NormRect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  return w > 0 && h > 0 ? w * h : 0
}

function clamp01(v: number): number {
  return Math.min(1, Math.max(0, v))
}

// ─────────────────────────────────────────────
// 화자 앵커 생성
// ─────────────────────────────────────────────

/**
 * 포즈 슬롯에서 화자 앵커를 만든다.
 *
 * @param slot      포즈 슬롯 (정규화 rect)
 * @param name      캐릭터 이름
 * @param keypoints 사이드카 키포인트 (자산 내 0..1 좌표) — 있으면 슬롯 공간으로 투영,
 *                  없으면 슬롯 상단 중앙 휴리스틱 (마스터 3점 추정과 동일 철학)
 */
export function speakerAnchorFromPoseSlot(
  slot: NormRect,
  name: string,
  keypoints?: Array<{ name: string; x: number; y: number }>,
): SpeakerAnchor {
  const mouthKp = keypoints?.find((k) => k.name === 'mouth')
  const headKp = keypoints?.find((k) => k.name === 'head')

  const mouth: NormPoint = mouthKp
    ? { x: slot.x + mouthKp.x * slot.w, y: slot.y + mouthKp.y * slot.h }
    : { x: slot.x + slot.w / 2, y: slot.y + slot.h * 0.18 }

  const faceBox: NormRect = headKp
    ? {
        x: slot.x + headKp.x * slot.w - slot.w * 0.18,
        y: slot.y + headKp.y * slot.h - slot.h * 0.12,
        w: slot.w * 0.36,
        h: slot.h * 0.24,
      }
    : { x: slot.x + slot.w * 0.3, y: slot.y + slot.h * 0.02, w: slot.w * 0.4, h: slot.h * 0.3 }

  return { characterName: name, mouth, faceBox }
}

// ─────────────────────────────────────────────
// 항별 비용
// ─────────────────────────────────────────────

/**
 * w1 — 화자 근접 + 꼬리 각도.
 * 거리는 페이지 대각선으로 정규화. 꼬리는 말풍선 중심→mouth 벡터인데,
 * 말풍선이 mouth 보다 아래에 있으면(꼬리가 위를 향하면) 관행 위반 페널티.
 */
export function proximityCost(bubble: NormRect, anchor: SpeakerAnchor): number {
  const c = rectCenter(bubble)
  const dx = c.x - anchor.mouth.x
  const dy = c.y - anchor.mouth.y
  const dist = Math.sqrt(dx * dx + dy * dy) / Math.SQRT2
  const upwardTailPenalty = clamp01(dy) // 말풍선 중심이 mouth 아래일수록 페널티
  return clamp01(dist * 0.7 + upwardTailPenalty * 0.3)
}

/**
 * w2 — 얼굴 가림. 모든 캐릭터 얼굴 bbox 대비 "얼굴이 가려진 비율"의 최댓값.
 */
export function occlusionCost(bubble: NormRect, faces: readonly NormRect[]): number {
  let worst = 0
  for (const face of faces) {
    const faceArea = face.w * face.h
    if (faceArea <= 0) continue
    worst = Math.max(worst, overlapArea(bubble, face) / faceArea)
  }
  return clamp01(worst)
}

/**
 * w3 — 읽기순서 단조성 위반. 대사 순서대로 배치된 말풍선들이
 * 읽기순서(위→아래, 왼→오른쪽)를 역행하는 인접쌍 비율.
 */
export function readingOrderCost(slotsInLineOrder: readonly NormRect[]): number {
  if (slotsInLineOrder.length < 2) return 0
  let inversions = 0
  for (let i = 1; i < slotsInLineOrder.length; i++) {
    const prev = slotsInLineOrder[i - 1]
    const cur = slotsInLineOrder[i]
    if (!prev || !cur) continue
    const prevC = rectCenter(prev)
    const curC = rectCenter(cur)
    // 행 판정: 세로 중심 차가 작으면 같은 행 → x 로 비교, 아니면 y 로 비교
    const sameRow = Math.abs(curC.y - prevC.y) < Math.min(prev.h, cur.h) * 0.5
    const backwards = sameRow ? curC.x < prevC.x : curC.y < prevC.y
    if (backwards) inversions++
  }
  return inversions / (slotsInLineOrder.length - 1)
}

/**
 * w4 — 패널 경계 침범. 패널(기본: safe area 박스) 밖으로 넘친 면적 비율.
 */
export function boundaryCost(bubble: NormRect, format: LayoutFormat, panel?: NormRect): number {
  const safeX = format.safeMm / format.widthMm
  const safeY = format.safeMm / format.heightMm
  const p = panel ?? { x: safeX, y: safeY, w: 1 - safeX * 2, h: 1 - safeY * 2 }
  const area = bubble.w * bubble.h
  if (area <= 0) return 0
  const inside = overlapArea(bubble, p)
  return clamp01((area - inside) / area)
}

// ─────────────────────────────────────────────
// 슬롯 단위 비용 (읽기순서 제외 3항)
// ─────────────────────────────────────────────

export function bubbleSlotCost(
  bubble: NormRect,
  anchor: SpeakerAnchor | undefined,
  allFaces: readonly NormRect[],
  format: LayoutFormat,
  weights: BubbleCostWeights = DEFAULT_BUBBLE_COST_WEIGHTS,
  panel?: NormRect,
): BubbleCostBreakdown {
  const proximity = anchor ? proximityCost(bubble, anchor) : 0
  const occlusion = occlusionCost(bubble, allFaces)
  const boundary = boundaryCost(bubble, format, panel)
  return {
    proximity,
    occlusion,
    boundary,
    total:
      weights.proximity * proximity + weights.occlusion * occlusion + weights.boundary * boundary,
  }
}

// ─────────────────────────────────────────────
// 배치 최적화 — 대사 → 말풍선 슬롯 매핑
// ─────────────────────────────────────────────

export interface AssignBubblesInput {
  /** 대사 목록 (서사 순서). speaker 는 canonical 캐릭터명 */
  lines: ReadonlyArray<{ speaker?: string | null }>
  /** 말풍선 슬롯 후보 */
  slots: readonly LayoutSlot[]
  /** 캐릭터명 → 앵커 */
  anchors: ReadonlyMap<string, SpeakerAnchor>
  format: LayoutFormat
  weights?: BubbleCostWeights
  panel?: NormRect
}

export interface AssignBubblesResult {
  /** lineIndex → slot 배열 인덱스 (배치 불가/미배치 라인은 항목 없음) */
  slotIndexByLine: Map<number, number>
  totalCost: number
  perLine: Map<number, BubbleCostBreakdown>
}

/** 순열 전수 탐색 상한 — 슬롯 7개 초과 시 그리디 폴백 */
const EXHAUSTIVE_SLOT_LIMIT = 7

function* permutations(indices: number[], k: number): Generator<number[]> {
  if (k === 0) {
    yield []
    return
  }
  for (let i = 0; i < indices.length; i++) {
    const rest = [...indices.slice(0, i), ...indices.slice(i + 1)]
    const head = indices[i]
    if (head === undefined) continue
    for (const tail of permutations(rest, k - 1)) {
      yield [head, ...tail]
    }
  }
}

/**
 * 대사→말풍선 슬롯 배치를 4항 비용 최소화로 결정한다.
 *
 * 슬롯 ≤ EXHAUSTIVE_SLOT_LIMIT: 순열 전수 탐색(사전순, 엄격 비교 — 결정론).
 * 초과: 대사 순서대로 최소 슬롯-비용 그리디.
 */
export function assignBubblesByCost(input: AssignBubblesInput): AssignBubblesResult {
  const { lines, slots, anchors, format, panel } = input
  const weights = input.weights ?? DEFAULT_BUBBLE_COST_WEIGHTS
  const k = Math.min(lines.length, slots.length)
  const allFaces = [...anchors.values()].map((a) => a.faceBox)

  const emptyResult: AssignBubblesResult = {
    slotIndexByLine: new Map(),
    totalCost: 0,
    perLine: new Map(),
  }
  if (k === 0) return emptyResult

  // 라인별 × 슬롯별 3항 비용 사전 계산
  const slotCosts: BubbleCostBreakdown[][] = lines.slice(0, k).map((line) => {
    const anchor = line.speaker ? anchors.get(line.speaker) : undefined
    return slots.map((slot) => bubbleSlotCost(slot, anchor, allFaces, format, weights, panel))
  })

  const evaluate = (order: number[]): number => {
    let sum = 0
    for (let li = 0; li < order.length; li++) {
      const si = order[li]
      if (si === undefined) continue
      sum += slotCosts[li]?.[si]?.total ?? 0
    }
    const rects = order.map((si) => slots[si]).filter((s): s is LayoutSlot => s !== undefined)
    sum += weights.readingOrder * readingOrderCost(rects) * order.length
    return sum
  }

  let bestOrder: number[] | null = null
  let bestCost = Infinity

  if (slots.length <= EXHAUSTIVE_SLOT_LIMIT) {
    const slotIndices = slots.map((_, i) => i)
    for (const order of permutations(slotIndices, k)) {
      const cost = evaluate(order)
      if (cost < bestCost) {
        bestCost = cost
        bestOrder = order
      }
    }
  } else {
    // 그리디: 대사 순서대로 남은 슬롯 중 최소 비용
    const used = new Set<number>()
    const order: number[] = []
    for (let li = 0; li < k; li++) {
      let pick = -1
      let pickCost = Infinity
      for (let si = 0; si < slots.length; si++) {
        if (used.has(si)) continue
        const c = slotCosts[li]?.[si]?.total ?? 0
        if (c < pickCost) {
          pickCost = c
          pick = si
        }
      }
      if (pick >= 0) {
        used.add(pick)
        order.push(pick)
      }
    }
    bestOrder = order
    bestCost = evaluate(order)
  }

  if (!bestOrder) return emptyResult

  const slotIndexByLine = new Map<number, number>()
  const perLine = new Map<number, BubbleCostBreakdown>()
  for (let li = 0; li < bestOrder.length; li++) {
    const si = bestOrder[li]
    if (si === undefined) continue
    slotIndexByLine.set(li, si)
    const breakdown = slotCosts[li]?.[si]
    if (breakdown) perLine.set(li, breakdown)
  }

  return { slotIndexByLine, totalCost: bestCost, perLine }
}
