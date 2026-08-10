/**
 * strip/geometry.ts — 웹툰 세로 스트립 기하 (MODE-04b / ADR-0017)
 *
 * ## 왜 코어에 있나
 * 스트립 레이아웃(세그먼트 top 좌표·보이는 범위·활성 세그먼트)은 순수 산술이다.
 * React 에 두면 테스트가 렌더링에 묶이고, `editor-*` 는 React 의존이 금지돼 있다.
 * 여기서는 **숫자만** 다루고 DOM·fabric 을 모르게 유지한다.
 *
 * ## 왜 세그먼트별 캔버스인가 (단일 롱 캔버스 기각 근거)
 * 스트립 전체를 캔버스 하나로 만들면 세 가지가 동시에 깨진다:
 *  1. **오프스크린 컬링 무효화** — fabric `calcViewportBoundaries()` 는 캔버스 *엘리먼트*
 *     크기를 뷰포트로 역변환한다. 엘리먼트가 스트립 전체면 모든 객체가 "화면 안"이 돼
 *     `skipOffscreen` 이 한 번도 발동하지 않는다. 지금 구조가 공짜로 주는 이득을 버리는 셈.
 *  2. **캔버스 상한** — dpr=2 에서 세그먼트 7개(1280px)면 Safari 실효 상한 16384px 을 넘어
 *     예외 없이 빈 화면이 된다. 웹툰 1화는 30~60세그먼트다.
 *  3. **iOS 크래시 방어 계약 위반** — "fabric 내부 크기 = 뷰포트" 는 BUG-013 방어의 일부다.
 *
 * 그래서 세그먼트마다 캔버스를 두고, 화면 근처만 살려 둔다(가상화).
 */

// ─────────────────────────────────────────────
// 상수
// ─────────────────────────────────────────────

/** 세그먼트 사이 간격(px, zoom=1 기준) — 스크롤 시 컷 경계를 눈으로 끊어 준다 */
export const STRIP_GAP_PX = 24

/** 라이브(실제 캔버스) 창 밖으로 얼마나 더 살려 둘지 — 스크롤 중 흰 칸 방지 */
export const STRIP_OVERSCAN = 1

// ─────────────────────────────────────────────
// 레이아웃
// ─────────────────────────────────────────────

export interface StripSegment {
  /** 세그먼트 높이 (판형 px, zoom 미적용) */
  heightPx: number
}

export interface StripSlot {
  index: number
  /** 스크롤 컨테이너 기준 top (zoom 적용 후 CSS px) */
  top: number
  /** 표시 높이 (zoom 적용 후 CSS px) */
  height: number
}

export interface StripLayout {
  slots: StripSlot[]
  /** 스크롤 콘텐츠 전체 높이 (마지막 간격 제외) */
  totalHeight: number
}

/**
 * 세그먼트 목록 → 세로 스택 좌표.
 * 높이는 세그먼트마다 다를 수 있다(현재 compose 는 균일하지만 계약은 열어 둔다).
 */
export function stripLayout(
  segments: readonly StripSegment[],
  zoom: number,
  gap: number = STRIP_GAP_PX,
): StripLayout {
  const slots: StripSlot[] = []
  let cursor = 0

  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]
    if (!seg) continue
    const height = seg.heightPx * zoom
    slots.push({ index: i, top: cursor, height })
    cursor += height + gap
  }

  // 마지막 세그먼트 뒤의 간격은 콘텐츠 높이에 포함하지 않는다
  const totalHeight = slots.length > 0 ? cursor - gap : 0
  return { slots, totalHeight }
}

/**
 * 스크롤 위치에서 화면에 걸치는 세그먼트 범위 `[start, end]`(양끝 포함).
 * 세그먼트가 하나도 안 걸치면 `null`(빈 스트립).
 *
 * `overscan` 은 앞뒤로 더 살려 둘 개수 — 스크롤 도중 캔버스 생성 지연으로 빈 칸이 보이는 것을 막는다.
 */
export function visibleRange(
  layout: StripLayout,
  scrollTop: number,
  viewportHeight: number,
  overscan: number = STRIP_OVERSCAN,
): { start: number; end: number } | null {
  if (layout.slots.length === 0) return null

  const top = scrollTop
  const bottom = scrollTop + viewportHeight

  let first = -1
  let last = -1
  for (const slot of layout.slots) {
    const slotBottom = slot.top + slot.height
    if (slotBottom > top && slot.top < bottom) {
      if (first === -1) first = slot.index
      last = slot.index
    }
  }

  // 화면이 세그먼트 사이 간격에만 걸친 경우 — 가장 가까운 세그먼트를 잡는다
  if (first === -1) {
    const nearest = segmentAtScroll(layout, scrollTop + viewportHeight / 2)
    if (nearest === null) return null
    first = nearest
    last = nearest
  }

  return {
    start: Math.max(0, first - overscan),
    end: Math.min(layout.slots.length - 1, last + overscan),
  }
}

/**
 * 특정 스크롤 오프셋에 놓인 세그먼트 인덱스.
 * 간격 위라면 **직전 세그먼트**를 돌려준다(스크롤을 내리는 중이라는 뜻).
 */
export function segmentAtScroll(layout: StripLayout, offset: number): number | null {
  if (layout.slots.length === 0) return null

  let candidate = 0
  for (const slot of layout.slots) {
    if (offset < slot.top) break
    candidate = slot.index
  }
  return candidate
}

/**
 * 활성 세그먼트를 화면에 보이게 하는 스크롤 위치.
 * 이미 충분히 보이면 현재 스크롤을 유지한다(불필요한 점프 방지).
 */
export function scrollToSegment(
  layout: StripLayout,
  index: number,
  scrollTop: number,
  viewportHeight: number,
): number {
  const slot = layout.slots.find((s) => s.index === index)
  if (!slot) return scrollTop

  const visibleTop = scrollTop
  const visibleBottom = scrollTop + viewportHeight
  const fullyVisible = slot.top >= visibleTop && slot.top + slot.height <= visibleBottom
  if (fullyVisible) return scrollTop

  // 세그먼트를 화면 상단에 맞춘다(위쪽 간격 절반만 남겨 경계가 보이게)
  return Math.max(0, slot.top - STRIP_GAP_PX / 2)
}

/** 스트립 폭이 컨테이너에 꼭 맞는 줌 (확대는 하지 않음 — 1.0 상한) */
export function fitStripWidth(
  segmentWidthPx: number,
  containerWidth: number,
  padding = 32,
): number {
  if (segmentWidthPx <= 0) return 1
  const avail = containerWidth - padding * 2
  if (avail <= 0) return 0.1
  return Math.min(avail / segmentWidthPx, 1)
}
