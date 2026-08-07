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

/**
 * 캡션(내레이션/지문) 슬롯을 표시하는 allowedKinds 값 (SCRIPT-KO-04).
 * 캡션 슬롯도 텍스트를 담지만 **대사가 들어가서는 안 되므로** 말풍선 목록에서 제외한다.
 */
export const CAPTION_SLOT_KIND = 'caption'

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

function isTextLikeKind(slot: LayoutSlot): boolean {
  return (
    slot.allowedKinds.includes('bubble') ||
    slot.allowedKinds.includes('text') ||
    slot.allowedKinds.includes(CAPTION_SLOT_KIND)
  )
}

/**
 * 텍스트가 들어가는 모든 슬롯 (말풍선 + 캡션).
 * 새 슬롯을 생성할 때 **겹침을 피해야 할 대상**은 종류와 무관하게 이 전체다.
 */
export function textLikeSlotsOf(template: LayoutTemplate): LayoutSlot[] {
  return template.slots.filter(isTextLikeKind)
}

/** 템플릿의 말풍선/텍스트 슬롯 — 캡션 전용 슬롯은 제외한다 (대사가 들어갈 자리만) */
export function bubbleSlotsOf(template: LayoutTemplate): LayoutSlot[] {
  return template.slots.filter(
    (s) => isTextLikeKind(s) && !s.allowedKinds.includes(CAPTION_SLOT_KIND),
  )
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

/** 페이지 중심 (0.5, 0.5) 까지의 거리 — 생성 슬롯 동률 해소용 (LAYOUT-05) */
function centerDistance(rect: NormRect): number {
  const dx = rect.x + rect.w / 2 - 0.5
  const dy = rect.y + rect.h / 2 - 0.5
  return Math.sqrt(dx * dx + dy * dy)
}

/** 얼굴 회피 축소 후에도 유지해야 하는 최소 슬롯 폭 — 이보다 좁으면 텍스트를 못 담는다 */
const SLOT_W_MIN = 0.22

/**
 * 후보가 얼굴(headBox)과 겹치면, 세로줄이 겹치는 얼굴들의 x-구간을 뺀 **가장 넓은 빈 구간**으로
 * 가로 축소를 시도한다 (LAYOUT-05 — 3열 고정 격자의 상단 중앙 칸이 두 인물 얼굴의 안쪽
 * 가장자리를 7~15% 물던 잔여 가림 제거).
 *
 * 빈 구간이 `SLOT_W_MIN` 보다 좁으면 원본을 그대로 돌려준다 — 못 담을 만큼 좁히느니
 * 얼굴 가림 비용 정렬이 뒤로 미루게 둔다. 동폭 동률이면 왼쪽 구간(결정론).
 */
function shrinkAwayFromFaces(rect: NormRect, faces: readonly NormRect[]): NormRect {
  const blocking = faces.filter(
    (f) =>
      rect.y < f.y + f.h && f.y < rect.y + rect.h && rect.x < f.x + f.w && f.x < rect.x + rect.w,
  )
  if (blocking.length === 0) return rect

  // [x, x+w] 에서 얼굴 x-구간을 뺀 부분 구간들
  let intervals: Array<{ s: number; e: number }> = [{ s: rect.x, e: rect.x + rect.w }]
  for (const f of blocking) {
    const next: typeof intervals = []
    for (const iv of intervals) {
      if (f.x > iv.s) next.push({ s: iv.s, e: Math.min(iv.e, f.x) })
      if (f.x + f.w < iv.e) next.push({ s: Math.max(iv.s, f.x + f.w), e: iv.e })
    }
    intervals = next
  }

  let best: { s: number; e: number } | null = null
  for (const iv of intervals) {
    if (iv.e - iv.s < SLOT_W_MIN) continue
    if (!best || iv.e - iv.s > best.e - best.s) best = iv
  }
  if (!best) return rect
  return { x: best.s, y: rect.y, w: best.e - best.s, h: rect.h }
}

// ─────────────────────────────────────────────
// 생성
// ─────────────────────────────────────────────

/** 생성할 슬롯의 종류 명세 — 격자 로직은 말풍선·캡션이 공유한다 */
export interface GridSlotSpec {
  /** 생성 슬롯 ID 접두 */
  idPrefix: string
  /** 생성 슬롯의 allowedKinds */
  allowedKinds: string[]
}

const BUBBLE_SLOT_SPEC: GridSlotSpec = {
  idPrefix: GENERATED_SLOT_PREFIX,
  allowedKinds: ['bubble', 'text'],
}

/**
 * safe area 안에서 텍스트 슬롯을 `count` 개까지 생성한다.
 * 자리가 모자라면 만들 수 있는 만큼만 반환한다(요청보다 적을 수 있음).
 *
 * 이미 자리를 차지한 **모든** 텍스트류 슬롯(말풍선 + 캡션)을 피하므로,
 * 말풍선을 먼저 만들고 캡션을 나중에 만들면 서로 겹치지 않는다.
 */
export function generateGridSlots(
  template: LayoutTemplate,
  format: LayoutFormat,
  count: number,
  spec: GridSlotSpec = BUBBLE_SLOT_SPEC,
): LayoutSlot[] {
  if (count <= 0) return []

  const existing = textLikeSlotsOf(template)
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

  // 후보 수집 — 기존 말풍선 슬롯과 크게 겹치면 탈락.
  // 얼굴과 겹치는 후보는 얼굴을 비껴가게 가로로 축소해 본다(LAYOUT-05 — 잔여 얼굴 가림 제거).
  const candidates: Array<{ rect: NormRect; cost: number; row: number; col: number }> = []
  for (let r = 0; r < rows.length; r++) {
    const y = rows[r]
    if (y === undefined) continue
    for (let c = 0; c < cols.length; c++) {
      const x = cols[c]
      if (x === undefined) continue
      const rect = shrinkAwayFromFaces({ x, y, w, h }, heads)
      if (existing.some((s) => overlapRatio(rect, s) > EXISTING_OVERLAP_LIMIT)) continue
      candidates.push({ rect, cost: occlusionCost(rect, heads), row: r, col: c })
    }
  }

  // 두 채택 전략을 모두 시도한다 (LAYOUT-05, 결정론).
  //
  //  - 균형 우선: 얼굴 가림 → **페이지 중심 근접** → 행 → 열.
  //    요소가 1~3개뿐인 페이지(preset-wide 의 캡션 위주 서술 장면)에서 종전 "위에서 아래"
  //    채움은 그 1~3개를 전부 상단에 몰아 무게중심을 우상단으로 띄웠다 — LAYOUT-04 실측에서
  //    wide 61페이지 전원이 구도 균형 0점이었던 직접 원인.
  //  - 수용량 우선: 얼굴 가림 → 행 → 열 (종전 동작).
  //    3열 격자의 중앙 칸은 좌·우 칸과 상호 배타라, 중앙부터 채우면 행당 2개(좌+우)가
  //    1개(중앙)로 줄어든다 — 균형 우선만 썼더니 수용량 감소로 코퍼스 페이지가
  //    222→264(+19%)로 튀었다(실측).
  //
  // 판정 순서: ① 요청 수 충족 → ② **미래 자리 보존**(spare) → ③ 균형.
  // ②가 필요한 이유: 말풍선을 먼저 만들고 캡션을 나중에 만드는데, 균형 우선이 중앙 열을
  // 세로로 쭉 차지하면 좌·우 열 후보가 전부 겹침 탈락해 **다음 호출(캡션)의 자리가 죽는다**
  // — 1on1-talk 의 캡션 수용량이 대사 3~5 구간에서 1개씩 줄어 screenplay 지문이 페이지로
  // 격리됐다(51→94p 실측). 채택 후 살아남는 후보 수를 비교해 자리를 덜 죽이는 쪽을 고른다.
  // (이로써 구도 균형 축은 생성 슬롯의 동률 해소에 한해 배치기와 결합된다 — quality.ts 참조)
  const byBalance = [...candidates].sort(
    (a, b) =>
      a.cost - b.cost ||
      centerDistance(a.rect) - centerDistance(b.rect) ||
      a.row - b.row ||
      a.col - b.col,
  )
  const byCapacity = [...candidates].sort(
    (a, b) => a.cost - b.cost || a.row - b.row || a.col - b.col,
  )

  const zIndex = existing.length > 0 ? Math.max(...existing.map((s) => s.zIndex)) : 2

  const pick = (
    ordered: readonly (typeof candidates)[number][],
  ): { slots: LayoutSlot[]; spare: number } => {
    const picked: NormRect[] = []
    const slots: LayoutSlot[] = []
    for (const cand of ordered) {
      if (slots.length >= count) break
      if (picked.some((p) => overlapRatio(cand.rect, p) > GENERATED_OVERLAP_LIMIT)) continue
      picked.push(cand.rect)
      slots.push({
        id: `${spec.idPrefix}${slots.length + 1}`,
        allowedKinds: spec.allowedKinds,
        x: cand.rect.x,
        y: cand.rect.y,
        w: cand.rect.w,
        h: cand.rect.h,
        zIndex,
        optional: true,
      })
    }
    // 채택 후에도 쓸 수 있는 후보 수 — 다음 호출(캡션)의 여지. 캡션 상한(3) 이상은 동급이다
    const spare = candidates.filter(
      (cand) =>
        !picked.includes(cand.rect) &&
        picked.every((p) => overlapRatio(cand.rect, p) <= EXISTING_OVERLAP_LIMIT),
    ).length
    return { slots, spare: Math.min(spare, 3) }
  }

  const balanced = pick(byBalance)
  const capacious = pick(byCapacity)
  if (balanced.slots.length !== capacious.slots.length) {
    return balanced.slots.length > capacious.slots.length ? balanced.slots : capacious.slots
  }
  if (balanced.spare !== capacious.spare) {
    return balanced.spare > capacious.spare ? balanced.slots : capacious.slots
  }
  return balanced.slots
}

/** safe area 안에서 말풍선 슬롯을 `count` 개까지 생성한다 */
export function generateBubbleSlots(
  template: LayoutTemplate,
  format: LayoutFormat,
  count: number,
): LayoutSlot[] {
  return generateGridSlots(template, format, count, BUBBLE_SLOT_SPEC)
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
