/**
 * strip.ts — 웹툰 세로 스트립 분기 (MODE-03 / ADR-0017)
 *
 * ## 웹툰과 POD 는 분할 전략이 다르다
 * POD 는 고정 크기 지면에 "담기는가"로 계획하고, 넘치면 **페이지를 나눈다**.
 * 웹툰은 세로 길이가 사실상 무한이라 넘침의 답이 **스트립 연장**(세그먼트 추가)이다.
 * 산출 구조는 같은 `PageDraft[]` 를 쓰되(Page.index = 세그먼트 순서), 계획 규칙이 갈라진다:
 *
 *  - **합병 없음**: 1on1-talk·four-cut 합병은 "한 지면에 여러 컷"이라는 인쇄 문법이다.
 *    세로 스크롤에서는 컷이 세로로 이어지므로 **장면당 1세그먼트**가 웹툰 문법이다.
 *  - **수용량 초과 = 세그먼트 추가**: 기존 `planCapacityPages` 의 단일 장면 분할 경로를
 *    그대로 재사용한다 — "페이지 분할"이 웹툰에서는 곧 "스트립 연장"이다.
 *  - **스크롤 리듬(컷 간 여백)**: 인쇄의 safe/bleed 대신, 세그먼트 가장자리에 빈 띠를 둬
 *    스크롤할 때 컷 사이가 숨을 쉬게 한다.
 *
 * ## 리듬은 두 경로가 같은 값을 봐야 한다 (수용량 계약)
 * 기존 슬롯은 `withStripRhythm`(세로 인셋 사본)으로, 생성 격자·safe 검사는
 * `normalizeWebtoonFormat` 이 재해석한 `safeMm`(리듬 px)로 같은 인셋을 존중한다.
 * **수용량 계산(capacity.pageBudgetOf)과 실제 보강(compose)이 같은 리듬 템플릿을 써야
 * 한다** — 어긋나면 계획한 수용량과 실제 슬롯 수가 달라져 대사가 유실된다(LAYOUT-03 계약).
 *
 * ## `safeMm` 재해석 주의
 * 웹툰(px) 판형에서 `LayoutFormat.safeMm` 는 인쇄 안전영역이 아니라 **스크롤 리듬
 * 인셋(px)** 이다. DB Format 은 0 으로 저장되고(인쇄 필드), compose 진입 시
 * `normalizeWebtoonFormat` 이 계획용 값으로 채운다. bleed 는 웹툰에 개념이 없어 0.
 *
 * ## 게이트 (MODE-03 시점)
 * 이 분기는 편집기 px 캔버스(MODE-04)·이미지 export(MODE-05)가 배선되기 전까지
 * 프로덕션 진입점(full-pipeline)의 px 가드 뒤에 있다 — 테스트·측정으로만 도달한다.
 *
 * 결정론: 입력 순서와 산술만 사용. 랜덤·시각 의존 없음.
 */

import type { LayoutFormat, LayoutSlot, LayoutTemplate } from './types.js'

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 세그먼트 상·하단 스크롤 리듬 여백 (세그먼트 높이 비율) */
export const STRIP_RHYTHM_INSET = 0.06

// ─────────────────────────────────────────────
// 판형
// ─────────────────────────────────────────────

/** 웹툰(px) 판형인가 — unit 생략은 mm(하위호환) */
export function isWebtoonFormat(format: Pick<LayoutFormat, 'unit'>): boolean {
  return format.unit === 'px'
}

/**
 * px 판형을 스트립 계획용으로 정규화한다.
 *  - `safeMm` ← 리듬 인셋 px (`STRIP_RHYTHM_INSET × heightMm`) — 생성 격자(`generateGridSlots`
 *    의 inner)와 safe-area 검사가 인쇄 경로 수정 없이 리듬을 존중하게 된다
 *  - `bleedMm` ← 0 (웹툰에 재단 개념 없음)
 */
export function normalizeWebtoonFormat(format: LayoutFormat): LayoutFormat {
  if (!isWebtoonFormat(format)) return format
  return { ...format, safeMm: STRIP_RHYTHM_INSET * format.heightMm, bleedMm: 0 }
}

// ─────────────────────────────────────────────
// 스크롤 리듬 — 기존 슬롯 인셋
// ─────────────────────────────────────────────

function insetSlot(slot: LayoutSlot): LayoutSlot {
  const scale = 1 - STRIP_RHYTHM_INSET * 2
  return { ...slot, y: STRIP_RHYTHM_INSET + slot.y * scale, h: slot.h * scale }
}

/**
 * 템플릿에 스크롤 리듬을 적용한 사본 — 내용 슬롯을 세로로 인셋한다.
 * 배경(bg)은 세그먼트 전체를 덮는 것이 맞으므로 제외한다.
 * 슬롯 좌표가 0..1 정규화라 격자 생성·말풍선 비용함수 등 기존 배치 경로가 그대로 동작한다.
 */
export function withStripRhythm(template: LayoutTemplate): LayoutTemplate {
  return {
    ...template,
    slots: template.slots.map((s) => (s.allowedKinds.includes('bg') ? s : insetSlot(s))),
  }
}

/** 계획·배치가 공유하는 템플릿 변환 — 웹툰이면 리듬 사본, 아니면 원본 (수용량 계약의 단일점) */
export function planningTemplate(template: LayoutTemplate, format: LayoutFormat): LayoutTemplate {
  return isWebtoonFormat(format) ? withStripRhythm(template) : template
}
