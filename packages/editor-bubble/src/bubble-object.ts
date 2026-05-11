// ─────────────────────────────────────────────
// bubble-object.ts — 말풍선 fabric Group 생성
//
// createBubbleObject() → fabric.Group (body path + tail polygon + text)
//
// fabric v6 API 준수.
// React 의존 없음.
// ─────────────────────────────────────────────

import { buildBubbleBodyPath, shapeHasTail } from './bubble-shapes.js'
import type { BubbleShape } from './bubble-shapes.js'
import type { Point, TailOptions, TailPoints } from './bubble-tail.js'
import { computeTailPoints } from './bubble-tail.js'

/**
 * 말풍선 fabric 객체 생성 옵션
 */
export type CreateBubbleObjectOptions = {
  /** 말풍선 모양 */
  shape?: BubbleShape
  /** 캔버스 절대 좌표 left (px) */
  left?: number
  /** 캔버스 절대 좌표 top (px) */
  top?: number
  /** 너비 (px) */
  width?: number
  /** 높이 (px) */
  height?: number
  /** 말풍선 내부 텍스트 */
  text?: string
  /** 채우기 색상 */
  fill?: string
  /** 테두리 색상 */
  stroke?: string
  /** 테두리 굵기 (px) */
  strokeWidth?: number
  /** 텍스트 폰트 크기 (px) */
  fontSize?: number
  /** 텍스트 색상 */
  textFill?: string
  /** 화자 target 절대 좌표 (없으면 꼬리 생략 또는 기본 위치) */
  target?: Point
  /** 꼬리 옵션 */
  tailOpts?: TailOptions
}

/**
 * 말풍선 fabric 객체 내부 데이터
 * (fabric Group 의 data 프로퍼티에 저장)
 */
export type BubbleMeta = {
  shape: BubbleShape
  /** 화자 target 포즈 객체 ID (null = 자유 말풍선) */
  targetId: string | null
  tailOpts: TailOptions
}

/**
 * createBubbleObject — 말풍선 fabric.Group 을 생성한다.
 *
 * 구성:
 *   1. body: fabric.Path (말풍선 본체)
 *   2. tail: fabric.Polygon (꼬리 삼각형, caption/꼬리 없음 제외)
 *   3. label: fabric.Textbox (내부 텍스트)
 *
 * fabric 은 dynamic import (헤드리스 환경 대응).
 *
 * @returns [fabricGroup, meta]
 */
export async function createBubbleObject(
  opts: CreateBubbleObjectOptions = {},
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any> {
  const { Path, Polygon, Textbox, Group } = await import('fabric')

  const shape = opts.shape ?? 'rounded-rect'
  const left = opts.left ?? 100
  const top = opts.top ?? 100
  const width = opts.width ?? 180
  const height = opts.height ?? 90
  const text = opts.text ?? ''
  const fill = opts.fill ?? '#ffffff'
  const stroke = opts.stroke ?? '#333333'
  const strokeWidth = opts.strokeWidth ?? 2
  const fontSize = opts.fontSize ?? 18
  const textFill = opts.textFill ?? '#111111'

  // ── 1. 말풍선 본체 (Path) ────────────────────────────────────────
  const bodyPathStr = buildBubbleBodyPath(shape, width, height)

  const body = new Path(bodyPathStr, {
    left: 0,
    top: 0,
    fill,
    stroke,
    strokeWidth,
    selectable: false,
    evented: false,
    // Path 는 (0,0) 기준 — Group 으로 오프셋 처리
    originX: 'left',
    originY: 'top',
  })

  // ── 2. 꼬리 삼각형 (Polygon) ─────────────────────────────────────
  const hasTail = shapeHasTail(shape)

  let tailPolygon: InstanceType<typeof Polygon> | null = null
  let tailPoints: TailPoints | null = null

  if (hasTail) {
    const targetPoint = opts.target ?? {
      x: left + width / 2,
      y: top + height + 60, // 기본: 아래 60px
    }

    // computeTailPoints 는 절대 좌표 기준
    // Group 의 left/top 을 더해서 절대 좌표로 변환한 뒤 계산
    const absBbox = { left, top, width, height }
    const rawTail = computeTailPoints(absBbox, targetPoint, opts.tailOpts)

    // Group local 로 변환 (Group 의 (left, top) 을 빼기)
    tailPoints = {
      base1: { x: rawTail.base1.x - left, y: rawTail.base1.y - top },
      base2: { x: rawTail.base2.x - left, y: rawTail.base2.y - top },
      tip: { x: rawTail.tip.x - left, y: rawTail.tip.y - top },
    }

    const polyPoints = [tailPoints.base1, tailPoints.base2, tailPoints.tip]

    tailPolygon = new Polygon(polyPoints, {
      fill,
      stroke,
      strokeWidth,
      selectable: false,
      evented: false,
      originX: 'left',
      originY: 'top',
    })
  }

  // ── 3. 텍스트박스 ────────────────────────────────────────────────
  const padding = Math.min(width, height) * 0.1
  const innerW = width - padding * 2
  const innerH = height - padding * 2

  const label = new Textbox(text, {
    left: padding,
    top: padding,
    width: innerW,
    height: innerH,
    fontSize,
    fill: textFill,
    fontFamily:
      "var(--font-pretendard, 'Pretendard Variable', Pretendard, 'Noto Sans KR', system-ui, sans-serif)",
    textAlign: 'center',
    lineHeight: 1.3,
    splitByGrapheme: true,
    selectable: false,
    evented: true, // 더블클릭으로 편집 진입
    originX: 'left',
    originY: 'top',
    // 텍스트가 박스를 넘치지 않도록
    lockScalingFlip: true,
  })

  // ── 4. Group 조립 ────────────────────────────────────────────────
  const members = tailPolygon ? [tailPolygon, body, label] : [body, label]

  const group = new Group(members, {
    left,
    top,
    selectable: true,
    hasControls: true,
    // 그룹 전체 클릭 시 선택
    subTargetCheck: false,
  })

  // ── meta 첨부 ─────────────────────────────────────────────────────
  const meta: BubbleMeta = {
    shape,
    targetId: null, // 화자 바인딩은 attachBubbleTracker 에서
    tailOpts: opts.tailOpts ?? {},
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(group as any)._bubbleMeta = meta

  return group
}

/**
 * fabric 객체가 말풍선 Group 인지 확인
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isBubbleGroup(obj: any): boolean {
  return obj && typeof obj === 'object' && '_bubbleMeta' in obj
}

/**
 * 말풍선 Group 에서 BubbleMeta 추출
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getBubbleMeta(obj: any): BubbleMeta | null {
  if (!isBubbleGroup(obj)) return null
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (obj as any)._bubbleMeta as BubbleMeta
}

/**
 * 말풍선 그룹의 꼬리 polygon 좌표를 새 tailPoints 로 업데이트한다.
 * (bubble-tracking.ts 에서 호출)
 *
 * @param group     말풍선 Group
 * @param newTail   새 TailPoints (Group local 좌표)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function updateBubbleTailPolygon(group: any, newTail: TailPoints): void {
  if (!isBubbleGroup(group)) return

  // Group 의 첫 번째 item 이 Polygon 이면 꼬리
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const items: any[] = group.getObjects ? group.getObjects() : []
  const tail = items.find(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (item: any) => item.type === 'polygon' || item.constructor?.name === 'Polygon',
  )

  if (!tail) return

  tail.set({
    points: [newTail.base1, newTail.base2, newTail.tip],
  })
  // Polygon 의 point 변경 후 좌표 재계산 필요
  if (typeof tail.setCoords === 'function') {
    tail.setCoords()
  }
}
