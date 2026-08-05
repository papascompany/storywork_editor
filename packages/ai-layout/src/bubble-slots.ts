/**
 * bubble-slots.ts — 말풍선 슬롯 동적 생성 (LAYOUT-03)
 *
 * ## 왜 필요한가
 * 템플릿 프리셋의 말풍선 슬롯은 1~3개인데 실사용 대본의 장면당 대사는 5~10개다.
 * 초과분은 배치되지 못하고 **경고 없이 사라졌다**(AI-ACT-04 baseline: 대사 보존 52.2%).
 * 여기서는 부족한 만큼 safe area 안에 슬롯을 만들어 수용량을 끌어올린다.
 *
 * ## 생성 규칙 (전부 결정론 — 랜덤 없음)
 *  1. safe area 안쪽에 고정 격자(3열 × N행)로 후보 사각형을 만든다.
 *  2. 기존 말풍선 슬롯과 15% 넘게 겹치는 후보는 버린다(중복 배치 방지).
 *  3. 남은 후보를 **얼굴 가림 비용**(BUBBLE-02 `occlusionCost`) 오름차순으로 정렬하고,
 *     서로 5% 넘게 겹치지 않는 것부터 필요한 개수만큼 채택한다.
 *
 * 생성 슬롯은 `optional: true` — 대사가 모자라면 그냥 비고, safe area 검사도 통과한다
 * (격자 자체가 safe area 안쪽이라 기하학적으로도 침범하지 않는다).
 *
 * ## 페이지당 상한
 * 수용량을 무한히 늘리면 한 페이지가 대사로 뒤덮인다. `MAX_BUBBLES_PER_PAGE` 를 넘는
 * 대사는 슬롯을 더 만드는 대신 **페이지를 나눠서** 담는다(capacity.ts).
 */

import { occlusionCost } from './bubble-cost.js'
import type { NormRect } from './bubble-cost.js'
import type { LayoutFormat, LayoutSlot, LayoutTemplate } from './types.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 한 페이지가 담는 말풍선 상한 — 가독성 한계. 초과분은 페이지 분할로 처리 */
export const MAX_BUBBLES_PER_PAGE = 6

/** 생성 슬롯 ID 접두 — 템플릿 원본 슬롯과 구분 */
export const GENERATED_SLOT_PREFIX = 'gen-bubble-'

/** 후보 격자 비율 (판형 정규화) */
const SLOT_W_RATIO = 0.46
const SLOT_W_MAX = 0.44
const SLOT_H_RATIO = 0.18
const SLOT_H_MAX = 0.15
const ROW_GAP_RATIO = 0.25

/** 기존 슬롯과의 허용 겹침 비율 */
const EXISTING_OVERLAP_LIMIT = 0.15
/** 생성 슬롯끼리의 허용 겹침 비율 */
const GENERATED_OVERLAP_LIMIT = 0.05

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function isBubbleKind(slot: LayoutSlot): boolean {
  return slot.allowedKinds.includes('bubble') || slot.allowedKinds.includes('text')
}

/** 템플릿의 말풍선/텍스트 슬롯 */
export function bubbleSlotsOf(template: LayoutTemplate): LayoutSlot[] {
  return template.slots.filter(isBubbleKind)
}

/** 템플릿의 포즈 슬롯 */
export function poseSlotsOf(template: LayoutTemplate): LayoutSlot[] {
  return template.slots.filter((s) => s.allowedKinds.includes('pose'))
}

/** 반드시 채워야 하는 포즈 슬롯 (optional=false) */
export function requiredPoseSlotsOf(template: LayoutTemplate): LayoutSlot[] {
  return poseSlotsOf(template).filter((s) => !s.optional)
}

/** 포즈 슬롯 상단부 = 얼굴 영역 근사 (키포인트 없을 때의 휴리스틱) */
function headBox(slot: LayoutSlot): NormRect {
  return { x: slot.x + slot.w * 0.25, y: slot.y, w: slot.w * 0.5, h: slot.h * 0.35 }
}

function overlapRatio(a: NormRect, b: NormRect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  if (w <= 0 || h <= 0) return 0
  const area = a.w * a.h
  return area > 0 ? (w * h) / area : 0
}

// ─────────────────────────────────────────────
// 생성
// ─────────────────────────────────────────────

/**
 * safe area 안에서 말풍선 슬롯을 `count` 개까지 생성한다.
 * 자리가 모자라면 만들 수 있는 만큼만 반환한다(요청보다 적을 수 있음).
 */
export function generateBubbleSlots(
  template: LayoutTemplate,
  format: LayoutFormat,
  count: number,
): LayoutSlot[] {
  if (count <= 0) return []

  const existing = bubbleSlotsOf(template)
  const heads = poseSlotsOf(template).map(headBox)

  const safeX = format.safeMm / format.widthMm
  const safeY = format.safeMm / format.heightMm
  const inner: NormRect = { x: safeX, y: safeY, w: 1 - safeX * 2, h: 1 - safeY * 2 }
  if (inner.w <= 0 || inner.h <= 0) return []

  const w = Math.min(SLOT_W_MAX, inner.w * SLOT_W_RATIO)
  const h = Math.min(SLOT_H_MAX, inner.h * SLOT_H_RATIO)
  const gap = h * ROW_GAP_RATIO

  const cols = [inner.x, inner.x + (inner.w - w) / 2, inner.x + inner.w - w]
  const rows: number[] = []
  for (let r = 0; ; r++) {
    const y = inner.y + r * (h + gap)
    if (y + h > inner.y + inner.h + 1e-9) break
    rows.push(y)
  }

  // 후보 수집 — 기존 말풍선 슬롯과 크게 겹치면 탈락
  const candidates: Array<{ rect: NormRect; cost: number; row: number; col: number }> = []
  for (let r = 0; r < rows.length; r++) {
    const y = rows[r]
    if (y === undefined) continue
    for (let c = 0; c < cols.length; c++) {
      const x = cols[c]
      if (x === undefined) continue
      const rect: NormRect = { x, y, w, h }
      if (existing.some((s) => overlapRatio(rect, s) > EXISTING_OVERLAP_LIMIT)) continue
      candidates.push({ rect, cost: occlusionCost(rect, heads), row: r, col: c })
    }
  }

  // 얼굴 가림이 적은 순 → 위에서 아래 → 왼쪽에서 오른쪽 (결정론)
  candidates.sort((a, b) => a.cost - b.cost || a.row - b.row || a.col - b.col)

  const zIndex = existing.length > 0 ? Math.max(...existing.map((s) => s.zIndex)) : 2
  const picked: NormRect[] = []
  const out: LayoutSlot[] = []
  for (const cand of candidates) {
    if (out.length >= count) break
    if (picked.some((p) => overlapRatio(cand.rect, p) > GENERATED_OVERLAP_LIMIT)) continue
    picked.push(cand.rect)
    out.push({
      id: `${GENERATED_SLOT_PREFIX}${out.length + 1}`,
      allowedKinds: ['bubble', 'text'],
      x: cand.rect.x,
      y: cand.rect.y,
      w: cand.rect.w,
      h: cand.rect.h,
      zIndex,
      optional: true,
    })
  }
  return out
}

/**
 * 이 템플릿·판형에서 한 페이지가 담을 수 있는 최대 말풍선 수.
 * `withGeneratedBubbleSlots` 가 실제로 만들어내는 수와 일치한다 —
 * 페이지 분할(capacity.ts)이 이 값을 기준으로 계산하므로 어긋나면 대사가 유실된다.
 */
export function pageBubbleCapacity(template: LayoutTemplate, format: LayoutFormat): number {
  const existing = bubbleSlotsOf(template).length
  if (existing >= MAX_BUBBLES_PER_PAGE) return existing
  const generatable = generateBubbleSlots(template, format, MAX_BUBBLES_PER_PAGE - existing).length
  return existing + generatable
}

/**
 * 대사 `neededBubbles` 개를 담도록 템플릿에 말풍선 슬롯을 보강한 사본을 만든다.
 * 보강이 필요 없으면 원본을 그대로 반환한다(불필요한 사본 생성 회피).
 */
export function withGeneratedBubbleSlots(
  template: LayoutTemplate,
  format: LayoutFormat,
  neededBubbles: number,
): LayoutTemplate {
  const existing = bubbleSlotsOf(template).length
  const target = Math.min(neededBubbles, MAX_BUBBLES_PER_PAGE)
  const need = target - existing
  if (need <= 0) return template

  const generated = generateBubbleSlots(template, format, need)
  if (generated.length === 0) return template
  return { ...template, slots: [...template.slots, ...generated] }
}
