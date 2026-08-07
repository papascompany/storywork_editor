/**
 * template-match.ts — Template 매칭 알고리즘 (M4-03 Step 2)
 *
 * templateHint + preferredTemplateIds → 최적 Template 선택
 *
 * 결정론: 동일 입력 → 동일 출력 (정렬 기반 점수, 랜덤 없음)
 */

import { bubbleSlotsOf, poseSlotsOf, requiredPoseSlotsOf } from './bubble-slots.js'
import type { LayoutTemplate, LayoutSlot, TemplateHint } from './types.js'

// ─────────────────────────────────────────────
// 5개 내장 프리셋 Template (M4-03)
// 실제 DB Template 없을 때 폴백으로 사용
// ─────────────────────────────────────────────

/**
 * 슬롯 x/y/w/h 는 0..1 정규화 (판형 기준).
 * zIndex: 0=배경, 1=포즈, 2=말풍선
 */
const PRESET_TEMPLATES: LayoutTemplate[] = [
  // ── 1대1 대화 ──────────────────────────────────────────────────────────────
  {
    id: 'preset-1on1-talk',
    name: '1대1 대화',
    slots: [
      { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
      {
        id: 'pose-left',
        allowedKinds: ['pose'],
        x: 0.02,
        y: 0.1,
        w: 0.44,
        h: 0.8,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'pose-right',
        allowedKinds: ['pose'],
        x: 0.54,
        y: 0.1,
        w: 0.44,
        h: 0.8,
        zIndex: 1,
        optional: true,
      },
      // 말풍선은 **인물 아래**에 둔다 (LAYOUT-04 실측 수정).
      // 종전 `bubble-left` 는 x0.48·y0.05 — 이름과 달리 우상단이었고, 그 자리가 정확히
      // `pose-right` 의 얼굴(x 0.65~0.87 · y 0.1~0.38)이라 **157 페이지 전부에서 얼굴을
      // 평균 51.8% 덮었다**. 포즈가 y0.1~0.9 를 차지하므로 상단에는 얼굴을 피할 폭이 없다.
      // 하단 좌우로 나란히 두면 얼굴 가림 0 이고 좌→우 읽기 순서와도 맞는다.
      {
        id: 'bubble-left',
        allowedKinds: ['bubble', 'text'],
        x: 0.04,
        y: 0.62,
        w: 0.44,
        h: 0.28,
        zIndex: 2,
        optional: true,
      },
      {
        id: 'bubble-right',
        allowedKinds: ['bubble', 'text'],
        x: 0.52,
        y: 0.62,
        w: 0.44,
        h: 0.28,
        zIndex: 2,
        optional: true,
      },
    ],
  },

  // ── 풀샷 단독 ──────────────────────────────────────────────────────────────
  {
    id: 'preset-full-shot-solo',
    name: '풀샷 단독',
    slots: [
      { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
      {
        id: 'pose-center',
        allowedKinds: ['pose'],
        x: 0.15,
        y: 0.05,
        w: 0.7,
        h: 0.9,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'bubble-top',
        allowedKinds: ['bubble', 'text'],
        x: 0.05,
        y: 0.02,
        w: 0.5,
        h: 0.2,
        zIndex: 2,
        optional: true,
      },
    ],
  },

  // ── 클로즈업 ───────────────────────────────────────────────────────────────
  {
    id: 'preset-closeup',
    name: '클로즈업',
    slots: [
      { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
      {
        id: 'pose-closeup',
        allowedKinds: ['pose'],
        x: 0.05,
        y: 0.02,
        w: 0.9,
        h: 0.75,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'bubble-1',
        allowedKinds: ['bubble', 'text'],
        x: 0.05,
        y: 0.75,
        w: 0.85,
        h: 0.22,
        zIndex: 2,
        optional: true,
      },
    ],
  },

  // ── 4컷 만화 ───────────────────────────────────────────────────────────────
  {
    id: 'preset-four-cut',
    name: '4컷 만화',
    slots: [
      {
        id: 'bg-top-left',
        allowedKinds: ['bg'],
        x: 0,
        y: 0,
        w: 0.49,
        h: 0.49,
        zIndex: 0,
        optional: true,
      },
      {
        id: 'bg-top-right',
        allowedKinds: ['bg'],
        x: 0.51,
        y: 0,
        w: 0.49,
        h: 0.49,
        zIndex: 0,
        optional: true,
      },
      {
        id: 'bg-bot-left',
        allowedKinds: ['bg'],
        x: 0,
        y: 0.51,
        w: 0.49,
        h: 0.49,
        zIndex: 0,
        optional: true,
      },
      {
        id: 'bg-bot-right',
        allowedKinds: ['bg'],
        x: 0.51,
        y: 0.51,
        w: 0.49,
        h: 0.49,
        zIndex: 0,
        optional: true,
      },
      {
        id: 'pose-top-left',
        allowedKinds: ['pose'],
        x: 0.02,
        y: 0.02,
        w: 0.45,
        h: 0.45,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'pose-top-right',
        allowedKinds: ['pose'],
        x: 0.53,
        y: 0.02,
        w: 0.45,
        h: 0.45,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'pose-bot-left',
        allowedKinds: ['pose'],
        x: 0.02,
        y: 0.53,
        w: 0.45,
        h: 0.45,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'pose-bot-right',
        allowedKinds: ['pose'],
        x: 0.53,
        y: 0.53,
        w: 0.45,
        h: 0.45,
        zIndex: 1,
        optional: false,
      },
      {
        id: 'bubble-1',
        allowedKinds: ['bubble', 'text'],
        x: 0.02,
        y: 0.02,
        w: 0.45,
        h: 0.2,
        zIndex: 2,
        optional: true,
      },
      {
        id: 'bubble-2',
        allowedKinds: ['bubble', 'text'],
        x: 0.53,
        y: 0.02,
        w: 0.45,
        h: 0.2,
        zIndex: 2,
        optional: true,
      },
      {
        id: 'bubble-3',
        allowedKinds: ['bubble', 'text'],
        x: 0.02,
        y: 0.53,
        w: 0.45,
        h: 0.2,
        zIndex: 2,
        optional: true,
      },
      {
        id: 'bubble-4',
        allowedKinds: ['bubble', 'text'],
        x: 0.53,
        y: 0.53,
        w: 0.45,
        h: 0.2,
        zIndex: 2,
        optional: true,
      },
    ],
  },

  // ── 풍경 단독 (wide, 배경 강조) ─────────────────────────────────────────────
  {
    id: 'preset-wide',
    name: '풍경 단독',
    slots: [
      { id: 'bg', allowedKinds: ['bg'], x: 0, y: 0, w: 1, h: 1, zIndex: 0, optional: false },
      {
        id: 'pose-small',
        allowedKinds: ['pose'],
        x: 0.35,
        y: 0.5,
        w: 0.3,
        h: 0.45,
        zIndex: 1,
        optional: true,
      },
      {
        id: 'bubble',
        allowedKinds: ['bubble', 'text'],
        x: 0.05,
        y: 0.05,
        w: 0.5,
        h: 0.2,
        zIndex: 2,
        optional: true,
      },
    ],
  },
]

// ─────────────────────────────────────────────
// hint → 기본 Template ID 매핑
// ─────────────────────────────────────────────

const HINT_TO_TEMPLATE_ID: Record<TemplateHint, string> = {
  '1on1-talk': 'preset-1on1-talk',
  'full-shot-solo': 'preset-full-shot-solo',
  closeup: 'preset-closeup',
  'four-cut': 'preset-four-cut',
  wide: 'preset-wide',
  default: 'preset-1on1-talk',
}

// ─────────────────────────────────────────────
// Template 매칭 점수 계산
// ─────────────────────────────────────────────

/**
 * 수용량 인식 매칭 옵션 (LAYOUT-03).
 *
 * AI-ACT-04 baseline 이 드러낸 두 결함을 이 옵션으로 막는다:
 *  - `empty-slot` 61건: 채울 캐릭터가 없는데 **필수** 포즈 슬롯이 있는 템플릿이 선택됨
 *  - `dialogue-loss`: 대사 수보다 말풍선 슬롯이 적은 템플릿이 선택됨
 */
export interface TemplateMatchOptions {
  /** 이 페이지가 담아야 하는 대사 수 — 말풍선 수용량 점수 */
  dialogueCount?: number
  /** 이 페이지가 반드시 보여줘야 하는 포즈 수 (멀티 장면이면 장면 수) */
  requiredPoseCount?: number
}

/** 말풍선 수용량 점수 — 충분하면 가산, 모자라면 부족분만큼 감산(하한 있음) */
const BUBBLE_CAPACITY_BONUS = 12
const BUBBLE_DEFICIT_PENALTY = 3

/**
 * Template 후보 점수 계산.
 * - hint 직접 매핑 → +100
 * - preferredTemplateIds 에 포함 → +150
 * - pose 슬롯 수 ≈ sceneCharCount → +10
 * - 말풍선 슬롯이 대사를 다 담으면 +12, 모자라면 부족분 × -3 (최대 -12) — LAYOUT-03
 */
export function scoreTemplate(
  template: LayoutTemplate,
  hint: TemplateHint,
  preferredIds: string[],
  sceneCharCount: number,
  opts: TemplateMatchOptions = {},
): number {
  let score = 0

  // hint 직접 매핑
  if (HINT_TO_TEMPLATE_ID[hint] === template.id) score += 100

  // 사용자 우선 ID — hint 직접 매핑(100)보다 높게 설정
  if (preferredIds.includes(template.id)) score += 150

  // pose 슬롯 수 매칭
  const poseSlotsCount = poseSlotsOf(template).length
  const diff = Math.abs(poseSlotsCount - sceneCharCount)
  score += Math.max(0, 10 - diff * 2)

  // 말풍선 수용량 (LAYOUT-03)
  if (opts.dialogueCount !== undefined) {
    const bubbleCount = bubbleSlotsOf(template).length
    score +=
      bubbleCount >= opts.dialogueCount
        ? BUBBLE_CAPACITY_BONUS
        : Math.max(
            -BUBBLE_CAPACITY_BONUS,
            -(opts.dialogueCount - bubbleCount) * BUBBLE_DEFICIT_PENALTY,
          )
  }

  return score
}

// ─────────────────────────────────────────────
// 공개 API — matchTemplate()
// ─────────────────────────────────────────────

export interface TemplateMatchResult {
  template: LayoutTemplate
  score: number
}

/**
 * templateHint + preferredTemplateIds + 장면 캐릭터 수 → 최적 Template 선택.
 *
 * 점수 계산 **전에** 구조적 실현 가능성으로 후보를 거른다 (LAYOUT-03):
 *  1. 필수 포즈 슬롯 수 ≤ 채울 수 있는 캐릭터 수 — 못 채우면 `[slot-empty]` 확정
 *  2. 포즈 슬롯 수 ≥ 페이지가 보여줘야 할 컷 수 — 모자라면 컷이 사라진다
 *
 * 두 조건을 다 만족하는 후보가 없으면 (1)만, 그래도 없으면 전체 풀로 완화한다.
 * 아무 후보도 없는 상태로 끝나지 않게 하려는 것 — 매칭은 항상 성공해야 한다.
 *
 * @param hint              페이지 분할 힌트
 * @param preferredIds      사용자 우선 Template ID 목록
 * @param sceneCharCount    이 페이지가 채울 수 있는 포즈 수 (장면 화자 수 또는 컷 수)
 * @param candidates        사용 가능한 Template 목록 (빈 배열이면 PRESET_TEMPLATES 사용)
 * @param opts              수용량 인식 옵션 (LAYOUT-03)
 * @returns                 매칭된 Template + 점수
 */
export function matchTemplate(
  hint: TemplateHint,
  preferredIds: string[],
  sceneCharCount: number,
  candidates: LayoutTemplate[],
  opts: TemplateMatchOptions = {},
): TemplateMatchResult {
  const pool = candidates.length > 0 ? candidates : PRESET_TEMPLATES

  const fillable = (t: LayoutTemplate): boolean => requiredPoseSlotsOf(t).length <= sceneCharCount
  const showsAllCuts = (t: LayoutTemplate): boolean =>
    poseSlotsOf(t).length >= (opts.requiredPoseCount ?? 0)

  const strict = pool.filter((t) => fillable(t) && showsAllCuts(t))
  const relaxed = strict.length > 0 ? strict : pool.filter(fillable)
  const feasible = relaxed.length > 0 ? relaxed : pool

  // 점수 계산 후 내림차순 정렬 (동점 시 id 알파벳 순으로 결정론 유지)
  const scored = feasible
    .map((t) => ({
      template: t,
      score: scoreTemplate(t, hint, preferredIds, sceneCharCount, opts),
    }))
    .sort((a, b) => b.score - a.score || a.template.id.localeCompare(b.template.id))

  const best = scored[0]
  if (!best) {
    // 안전 폴백 — 절대 null 반환 안 함 (PRESET_TEMPLATES 는 항상 5개 이상)
    const fallback = PRESET_TEMPLATES[0]
    if (!fallback) throw new Error('[ai-layout] PRESET_TEMPLATES 가 비어있습니다.')
    return { template: fallback, score: 0 }
  }
  return best
}

// ─────────────────────────────────────────────
// 프리셋 Export (테스트/디버깅용)
// ─────────────────────────────────────────────

export { PRESET_TEMPLATES, HINT_TO_TEMPLATE_ID }

/**
 * 슬롯에서 allowedKinds 별 슬롯 목록 추출 헬퍼
 */
export function filterSlotsByKind(slots: LayoutSlot[], kind: string): LayoutSlot[] {
  return slots.filter((s) => s.allowedKinds.includes(kind))
}
