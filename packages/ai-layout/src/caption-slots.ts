/**
 * caption-slots.ts — 캡션(내레이션·지문) 박스 (SCRIPT-KO-04)
 *
 * ## 왜 필요한가
 * 종전에는 대본의 모든 라인이 말풍선 슬롯 하나씩을 차지했다. 그런데 실사용 대본에서
 * **화자 없는 라인이 다수**다(LAYOUT-03 실측: essay 96.2% · diary 90.7% · novel 56.5% ·
 * screenplay 27.2%). 서술 한 줄이 대사 한 줄과 같은 값을 치르니 페이지 수용량이 금세
 * 차고, 그때마다 페이지가 쪼개졌다(코퍼스 screenplay: 장면 10 → 페이지 17~20).
 *
 * 서술과 지문은 인물이 말하는 게 아니므로 꼬리 달린 말풍선이 아니라 **캡션 박스**로 간다.
 * 캡션은 연속된 여러 줄을 한 박스에 묶을 수 있어, 같은 자리로 훨씬 많은 글을 담는다.
 *
 * ## 기하
 * 말풍선과 **같은 격자**(`generateGridSlots`)를 쓴다. 자리 계산·얼굴 가림 비용·겹침 회피가
 * 이미 검증된 경로이고, 말풍선을 먼저 만든 뒤 캡션을 만들면 서로 침범하지 않는다.
 *
 * ## 묶음 규칙 (결정론)
 * 한 박스에 `CAPTION_LINES_PER_BOX` 줄까지, 누적 `CAPTION_CHARS_PER_BOX` 자까지 담는다.
 * 한 줄이 그 자체로 상한을 넘으면 그 줄만 담는다(버리지 않는다).
 * **수용량 계산과 실제 묶음이 같은 함수(`groupCaptionLines`)를 쓴다** — 어긋나면 글이 유실된다.
 */

import { CAPTION_SLOT_KIND, generateGridSlots } from './bubble-slots.js'
import type { LayoutFormat, LayoutSlot, LayoutTemplate } from './types.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 한 페이지가 담는 캡션 박스 상한 — 초과분은 페이지 분할로 처리 */
export const MAX_CAPTION_SLOTS_PER_PAGE = 3

/** 캡션 박스 하나가 묶는 최대 줄 수 */
export const CAPTION_LINES_PER_BOX = 3

/** 캡션 박스 하나가 담는 최대 글자 수 (박스 밖으로 넘치지 않게) */
export const CAPTION_CHARS_PER_BOX = 180

/** 생성 캡션 슬롯 ID 접두 */
export const GENERATED_CAPTION_PREFIX = 'gen-caption-'

/** 캡션 박스 안에서 줄을 잇는 구분자 */
export const CAPTION_LINE_SEPARATOR = '\n'

// ─────────────────────────────────────────────
// 슬롯
// ─────────────────────────────────────────────

/** 템플릿의 캡션 슬롯 */
export function captionSlotsOf(template: LayoutTemplate): LayoutSlot[] {
  return template.slots.filter((s) => s.allowedKinds.includes(CAPTION_SLOT_KIND))
}

/** safe area 안에서 캡션 슬롯을 `count` 개까지 생성한다 */
export function generateCaptionSlots(
  template: LayoutTemplate,
  format: LayoutFormat,
  count: number,
): LayoutSlot[] {
  return generateGridSlots(template, format, count, {
    idPrefix: GENERATED_CAPTION_PREFIX,
    allowedKinds: [CAPTION_SLOT_KIND, 'text'],
  })
}

/**
 * 이 템플릿·판형에서 한 페이지가 담을 수 있는 캡션 박스 수.
 * `withGeneratedCaptionSlots` 가 실제로 만들어내는 수와 일치한다.
 */
export function pageCaptionSlotCapacity(template: LayoutTemplate, format: LayoutFormat): number {
  const existing = captionSlotsOf(template).length
  if (existing >= MAX_CAPTION_SLOTS_PER_PAGE) return existing
  const generatable = generateCaptionSlots(
    template,
    format,
    MAX_CAPTION_SLOTS_PER_PAGE - existing,
  ).length
  return existing + generatable
}

/**
 * 캡션 박스 `neededBoxes` 개를 담도록 템플릿을 보강한 사본을 만든다.
 * 보강이 필요 없으면 원본을 그대로 반환한다.
 */
export function withGeneratedCaptionSlots(
  template: LayoutTemplate,
  format: LayoutFormat,
  neededBoxes: number,
): LayoutTemplate {
  const existing = captionSlotsOf(template).length
  const target = Math.min(neededBoxes, MAX_CAPTION_SLOTS_PER_PAGE)
  const need = target - existing
  if (need <= 0) return template

  const generated = generateCaptionSlots(template, format, need)
  if (generated.length === 0) return template
  return { ...template, slots: [...template.slots, ...generated] }
}

// ─────────────────────────────────────────────
// 묶음
// ─────────────────────────────────────────────

/**
 * 캡션 줄들을 박스 단위로 묶는다 (입력 순서 보존 · 결정론).
 * 반환된 각 배열이 캡션 박스 하나의 내용이다.
 */
export function groupCaptionLines(texts: readonly string[]): string[][] {
  const boxes: string[][] = []
  let current: string[] = []
  let chars = 0

  for (const text of texts) {
    const fits =
      current.length < CAPTION_LINES_PER_BOX && chars + text.length <= CAPTION_CHARS_PER_BOX
    if (current.length > 0 && !fits) {
      boxes.push(current)
      current = []
      chars = 0
    }
    current.push(text)
    chars += text.length
  }
  if (current.length > 0) boxes.push(current)

  return boxes
}

/** 이 줄들을 담는 데 필요한 캡션 박스 수 */
export function captionBoxesNeeded(texts: readonly string[]): number {
  return groupCaptionLines(texts).length
}

/** 캡션 박스 하나의 표시 텍스트 */
export function joinCaptionBox(lines: readonly string[]): string {
  return lines.join(CAPTION_LINE_SEPARATOR)
}
