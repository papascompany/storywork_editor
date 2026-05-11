// ─────────────────────────────────────────────
// bubble-tracking.ts — 말풍선 꼬리 자동 화자 추적
//
// attachBubbleTracker():
//   canvas.on('object:moving' | 'object:scaling') 에 hook 등록
//   → target 포즈의 mouth 키포인트 좌표 계산
//   → bubble 꼬리 실시간 재계산
//
// 설계 원칙:
//   - bound 핸들러 패턴 (FOLLOWUP-16): dispose 시 정확한 참조로 off()
//   - _disposed 가드: dispose 후 호출 시 silent return
//   - React/DOM 의존 없음
// ─────────────────────────────────────────────

import { getBubbleMeta, updateBubbleTailPolygon } from './bubble-object.js'
import type { Point } from './bubble-tail.js'
import { computeTailPoints } from './bubble-tail.js'

/**
 * 포즈 키포인트 (0..1 정규화)
 */
export type Keypoint = {
  name: string
  x: number
  y: number
  weight?: number
  inferred?: boolean
}

/**
 * fabric 캔버스 (타입 추론 없이 any 처리 — fabric 런타임 동적 import)
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricCanvas = any
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type FabricObject = any

/**
 * 포즈 객체에서 mouth 키포인트의 캔버스 절대 좌표를 계산한다.
 *
 * 포즈 객체 메타 구조:
 *   obj.data.meta.keypoints: Keypoint[]  (0..1 정규화, 포즈 bbox 기준)
 *
 * 좌표 변환:
 *   absoluteX = obj.left + obj.width * obj.scaleX * kp.x
 *   absoluteY = obj.top  + obj.height * obj.scaleY * kp.y
 *
 * NOTE: 회전이 있는 경우 회전 행렬을 적용해야 하지만
 *       MVP에서는 회전 없는 경우만 처리한다.
 *
 * @param poseObj 포즈 fabric 객체
 * @returns mouth 좌표 (없으면 center)
 */
export function getMouthPosition(poseObj: FabricObject): Point {
  const data = poseObj.data as { meta?: { keypoints?: Keypoint[] } } | undefined

  const keypoints = data?.meta?.keypoints ?? []

  // mouth → head → center 우선순위
  const kp =
    keypoints.find((k) => k.name === 'mouth') ??
    keypoints.find((k) => k.name === 'head') ??
    keypoints.find((k) => k.name === 'center') ??
    null

  const objLeft: number = poseObj.left ?? 0
  const objTop: number = poseObj.top ?? 0
  const objW: number = (poseObj.width ?? 100) * (poseObj.scaleX ?? 1)
  const objH: number = (poseObj.height ?? 100) * (poseObj.scaleY ?? 1)

  if (!kp) {
    // 키포인트 없음 → 객체 중심
    return {
      x: objLeft + objW / 2,
      y: objTop + objH / 2,
    }
  }

  // 정규화(0..1) → 절대 좌표
  const angle: number = poseObj.angle ?? 0

  if (angle === 0) {
    // 회전 없음 (MVP)
    return {
      x: objLeft + objW * kp.x,
      y: objTop + objH * kp.y,
    }
  }

  // 회전 있음 — 회전 행렬 적용
  return _rotatedPoint(objLeft, objTop, objW, objH, kp.x, kp.y, angle)
}

/**
 * 회전 적용 키포인트 → 절대 좌표 변환
 * @internal
 */
function _rotatedPoint(
  left: number,
  top: number,
  w: number,
  h: number,
  kpX: number,
  kpY: number,
  angleDeg: number,
): Point {
  const rad = (angleDeg * Math.PI) / 180
  const cosA = Math.cos(rad)
  const sinA = Math.sin(rad)

  // 객체 center (회전 기준)
  const cx = left + w / 2
  const cy = top + h / 2

  // 키포인트의 object-local 좌표 (중심 기준)
  const localX = w * kpX - w / 2
  const localY = h * kpY - h / 2

  // 회전 행렬 적용
  return {
    x: cx + localX * cosA - localY * sinA,
    y: cy + localX * sinA + localY * cosA,
  }
}

/**
 * 캔버스의 모든 포즈 객체 중 bubble 에 가장 가까운 포즈를 찾는다.
 *
 * @param canvas   fabric.Canvas
 * @param bubble   말풍선 Group
 * @returns 가장 가까운 포즈 객체 (없으면 null)
 */
export function detectSpeaker(canvas: FabricCanvas, bubble: FabricObject): FabricObject | null {
  const objects: FabricObject[] = canvas.getObjects ? canvas.getObjects() : []

  // 포즈 객체만 필터
  const poses = objects.filter((obj: FabricObject) => {
    const data = obj.data as { kind?: string } | undefined
    return data?.kind === 'pose'
  })

  if (poses.length === 0) return null

  // bubble 중심
  const bubbleLeft: number = bubble.left ?? 0
  const bubbleTop: number = bubble.top ?? 0
  const bubbleW: number = (bubble.width ?? 180) * (bubble.scaleX ?? 1)
  const bubbleH: number = (bubble.height ?? 90) * (bubble.scaleY ?? 1)
  const bCx = bubbleLeft + bubbleW / 2
  const bCy = bubbleTop + bubbleH / 2

  let nearest: FabricObject | null = null
  let minDist = Infinity

  for (const pose of poses) {
    const mouth = getMouthPosition(pose)
    const dx = mouth.x - bCx
    const dy = mouth.y - bCy
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < minDist) {
      minDist = dist
      nearest = pose
    }
  }

  return nearest
}

/**
 * BubbleTracker cleanup 함수
 */
export type BubbleTrackerCleanup = () => void

/**
 * attachBubbleTracker — 말풍선의 꼬리를 화자 포즈에 실시간으로 추적한다.
 *
 * canvas 의 object:moving / object:scaling 이벤트를 listen 해
 * target 포즈가 이동하면 bubble 의 꼬리를 재계산한다.
 *
 * 패턴:
 * - bound 핸들러 (FOLLOWUP-16) — dispose 시 정확한 참조로 off()
 * - _disposed 가드
 *
 * @param canvas  fabric.Canvas
 * @param bubble  말풍선 Group
 * @returns cleanup 함수 (사용 측에서 반드시 호출)
 */
export function attachBubbleTracker(
  canvas: FabricCanvas,
  bubble: FabricObject,
): BubbleTrackerCleanup {
  let _disposed = false

  // ── bound handler: object 이동/리사이즈 ────────────────────────────
  const onObjectTransform = (e: { target?: FabricObject }): void => {
    if (_disposed) return
    const movedObj = e.target
    if (!movedObj) return

    const meta = getBubbleMeta(bubble)
    if (!meta) return
    if (!meta.targetId) return

    // 이동한 객체가 이 bubble 의 target 포즈인지 확인
    const movedId = (movedObj.data as { id?: string } | undefined)?.id
    if (movedId !== meta.targetId) return

    // 새 mouth 좌표 계산
    const mouth = getMouthPosition(movedObj)
    _recomputeTail(canvas, bubble, mouth)
  }

  // ── bound handler: bubble 자체 이동 시에도 꼬리 재계산 ────────────
  const onBubbleMoving = (e: { target?: FabricObject }): void => {
    if (_disposed) return
    if (e.target !== bubble) return

    const meta = getBubbleMeta(bubble)
    if (!meta || !meta.targetId) return

    // target 포즈 찾기
    const objects: FabricObject[] = canvas.getObjects ? canvas.getObjects() : []
    const targetPose = objects.find((obj: FabricObject) => {
      const d = obj.data as { id?: string } | undefined
      return d?.id === meta.targetId
    })

    if (!targetPose) return

    const mouth = getMouthPosition(targetPose)
    _recomputeTail(canvas, bubble, mouth)
  }

  // ── 이벤트 등록 ───────────────────────────────────────────────────
  canvas.on('object:moving', onObjectTransform)
  canvas.on('object:scaling', onObjectTransform)
  canvas.on('object:rotating', onObjectTransform)
  canvas.on('object:moving', onBubbleMoving)

  // ── cleanup ───────────────────────────────────────────────────────
  return () => {
    _disposed = true
    canvas.off('object:moving', onObjectTransform)
    canvas.off('object:scaling', onObjectTransform)
    canvas.off('object:rotating', onObjectTransform)
    canvas.off('object:moving', onBubbleMoving)
  }
}

/**
 * bubble 의 꼬리를 mouth 좌표로 재계산하고 렌더 요청.
 * @internal
 */
function _recomputeTail(canvas: FabricCanvas, bubble: FabricObject, mouthPoint: Point): void {
  const meta = getBubbleMeta(bubble)
  if (!meta) return

  // bubble BBox (Group local → 절대)
  const bLeft: number = bubble.left ?? 0
  const bTop: number = bubble.top ?? 0
  const bW: number = (bubble.width ?? 180) * (bubble.scaleX ?? 1)
  const bH: number = (bubble.height ?? 90) * (bubble.scaleY ?? 1)

  const absBbox = { left: bLeft, top: bTop, width: bW, height: bH }
  const rawTail = computeTailPoints(absBbox, mouthPoint, meta.tailOpts)

  // Group local 좌표로 변환
  const localTail = {
    base1: { x: rawTail.base1.x - bLeft, y: rawTail.base1.y - bTop },
    base2: { x: rawTail.base2.x - bLeft, y: rawTail.base2.y - bTop },
    tip: { x: rawTail.tip.x - bLeft, y: rawTail.tip.y - bTop },
  }

  updateBubbleTailPolygon(bubble, localTail)
  bubble.setCoords?.()

  if (typeof canvas.requestRenderAll === 'function') {
    canvas.requestRenderAll()
  }
}

/**
 * bubble 의 targetId 를 새 포즈 ID 로 변경하고 즉시 꼬리를 재계산한다.
 *
 * @param canvas     fabric.Canvas
 * @param bubble     말풍선 Group
 * @param newTargetId 새 화자 포즈 ID (null = 자유 말풍선)
 */
export function rebindBubbleTarget(
  canvas: FabricCanvas,
  bubble: FabricObject,
  newTargetId: string | null,
): void {
  const meta = getBubbleMeta(bubble)
  if (!meta) return

  meta.targetId = newTargetId

  if (!newTargetId) return

  // 새 target 포즈 찾아 즉시 꼬리 재계산
  const objects: FabricObject[] = canvas.getObjects ? canvas.getObjects() : []
  const targetPose = objects.find((obj: FabricObject) => {
    const d = obj.data as { id?: string } | undefined
    return d?.id === newTargetId
  })

  if (!targetPose) return

  const mouth = getMouthPosition(targetPose)
  _recomputeTail(canvas, bubble, mouth)
}
