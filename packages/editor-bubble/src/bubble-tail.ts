// ─────────────────────────────────────────────
// bubble-tail.ts — 말풍선 꼬리 계산 로직
//
// computeTailPoints: 말풍선 BBox 와 target 좌표를 받아
// 꼬리 삼각형 3점(base1, base2, tip)을 반환한다.
//
// React/fabric 의존 없음 — 순수 좌표 계산.
// ─────────────────────────────────────────────

/**
 * 2D 좌표
 */
export type Point = {
  x: number
  y: number
}

/**
 * 말풍선 BBox (좌상단 기준, 절대 좌표)
 */
export type BubbleBBox = {
  left: number
  top: number
  width: number
  height: number
}

/**
 * 꼬리 삼각형 3점
 *
 * - base1, base2: 말풍선 변 위의 두 점 (꼬리 밑변)
 * - tip         : 화자 입 방향 끝점
 */
export type TailPoints = {
  base1: Point
  base2: Point
  tip: Point
}

/**
 * 꼬리 계산 옵션
 */
export type TailOptions = {
  /** 꼬리 길이 (px). 기본값: bbox 짧은 변의 40% */
  tailLength?: number
  /** 꼬리 밑변 너비 (px). 기본값: bbox 짧은 변의 22% */
  baseWidth?: number
  /**
   * 꼬리 tip 이 target 에서 얼마나 떨어지는지 (0~1).
   * 0 = target 에 딱 붙음, 1 = 꼬리 길이만큼 띄움.
   * 기본값: 0.0 (tip 이 target 에 닿음)
   */
  tipOffset?: number
}

/**
 * 말풍선 꼬리의 삼각형 3좌표를 계산한다.
 *
 * 알고리즘:
 * 1. bubble bbox 와 target 의 위치를 비교해 가장 가까운 변을 선택
 * 2. 해당 변의 수직 방향에서 baseWidth 만큼 벌린 base1/base2 생성
 * 3. target 방향으로 tailLength 만큼 연장한 tip 생성
 *
 * @param bbox   말풍선 BBox (절대 좌표)
 * @param target 꼬리가 향할 절대 좌표 (화자 mouth 등)
 * @param opts   꼬리 크기 옵션
 */
export function computeTailPoints(
  bbox: BubbleBBox,
  target: Point,
  opts: TailOptions = {},
): TailPoints {
  const shortSide = Math.min(bbox.width, bbox.height)
  const tailLength = opts.tailLength ?? shortSide * 0.4
  const baseWidth = opts.baseWidth ?? shortSide * 0.22

  // 말풍선 중심
  const cx = bbox.left + bbox.width / 2
  const cy = bbox.top + bbox.height / 2

  // 벡터: 중심 → target
  const dx = target.x - cx
  const dy = target.y - cy

  // ── 가장 가까운 변 선택 ─────────────────────────────────────────
  // target 이 bbox 의 어느 쪽 사분면에 있는지 판단
  const side = _nearestSide(bbox, target)

  // 해당 변 위의 anchor 점 (꼬리 중심)
  const anchor = _sideAnchor(bbox, side, target)

  // ── 변의 수직 방향 (꼬리 밑변 두 점을 분산할 방향) ─────────────
  const perpDir = _perpendicularDir(side)

  // base1, base2
  const half = baseWidth / 2
  const base1: Point = {
    x: anchor.x + perpDir.x * half,
    y: anchor.y + perpDir.y * half,
  }
  const base2: Point = {
    x: anchor.x - perpDir.x * half,
    y: anchor.y - perpDir.y * half,
  }

  // ── tip: anchor 에서 target 방향으로 tailLength 만큼 이동 ──────
  // target 과의 거리
  const dist = Math.sqrt(dx * dx + dy * dy)
  const normX = dist > 0 ? dx / dist : 0
  const normY = dist > 0 ? dy / dist : 1

  const tipOffset = opts.tipOffset ?? 0
  const tipDist = tailLength + tipOffset * tailLength

  // tip 은 anchor 에서 target 방향으로 tipDist 만큼
  const tip: Point = {
    x: anchor.x + normX * tipDist,
    y: anchor.y + normY * tipDist,
  }

  return { base1, base2, tip }
}

// ─── 내부 헬퍼 ───────────────────────────────────────────────────────────────

type Side = 'top' | 'right' | 'bottom' | 'left'

/**
 * target 이 bbox 기준 어느 변에 가장 가까운지 판단.
 */
function _nearestSide(bbox: BubbleBBox, target: Point): Side {
  const { left, top, width, height } = bbox

  // target 이 bbox 안에 있는 경우는 아래쪽(기본) 반환
  if (target.x >= left && target.x <= left + width && target.y >= top && target.y <= top + height) {
    return 'bottom'
  }

  const cx = left + width / 2
  const cy = top + height / 2
  const dx = target.x - cx
  const dy = target.y - cy

  // 4사분면으로 판단
  const absDx = Math.abs(dx)
  const absDy = Math.abs(dy)

  // x 방향이 더 강한지 y 방향이 더 강한지
  const aspectW = width / 2
  const aspectH = height / 2

  // bbox 비율로 정규화한 방향으로 변 판단
  const normDx = absDx / aspectW
  const normDy = absDy / aspectH

  if (normDx > normDy) {
    return dx > 0 ? 'right' : 'left'
  } else {
    return dy > 0 ? 'bottom' : 'top'
  }
}

/**
 * side 에 해당하는 변 위의 anchor 점 (target 방향 투영).
 */
function _sideAnchor(bbox: BubbleBBox, side: Side, target: Point): Point {
  const { left, top, width, height } = bbox

  switch (side) {
    case 'top': {
      // 변: y = top, x = [left, left+width]
      const clampedX = Math.max(left + width * 0.2, Math.min(left + width * 0.8, target.x))
      return { x: clampedX, y: top }
    }
    case 'bottom': {
      const clampedX = Math.max(left + width * 0.2, Math.min(left + width * 0.8, target.x))
      return { x: clampedX, y: top + height }
    }
    case 'left': {
      const clampedY = Math.max(top + height * 0.2, Math.min(top + height * 0.8, target.y))
      return { x: left, y: clampedY }
    }
    case 'right': {
      const clampedY = Math.max(top + height * 0.2, Math.min(top + height * 0.8, target.y))
      return { x: left + width, y: clampedY }
    }
  }
}

/**
 * side 변에 수직인 단위 벡터 (꼬리 밑변 확장 방향).
 */
function _perpendicularDir(side: Side): Point {
  switch (side) {
    case 'top':
    case 'bottom':
      return { x: 1, y: 0 } // 가로 변 → 수직은 x 방향
    case 'left':
    case 'right':
      return { x: 0, y: 1 } // 세로 변 → 수직은 y 방향
  }
}

/**
 * TailPoints 를 canvas 절대 좌표에서 bubble-local 좌표로 변환.
 *
 * fabric.Group 내부의 polygon 은 Group 의 (left, top) 기준 좌표를 사용한다.
 * bubble 의 fabric 객체가 (groupLeft, groupTop) 에 위치할 때 사용.
 *
 * @param tail       절대 좌표 tail
 * @param groupLeft  bubble Group 의 canvas left
 * @param groupTop   bubble Group 의 canvas top
 */
export function tailPointsToLocal(
  tail: TailPoints,
  groupLeft: number,
  groupTop: number,
): TailPoints {
  return {
    base1: { x: tail.base1.x - groupLeft, y: tail.base1.y - groupTop },
    base2: { x: tail.base2.x - groupLeft, y: tail.base2.y - groupTop },
    tip: { x: tail.tip.x - groupLeft, y: tail.tip.y - groupTop },
  }
}
