import { describe, expect, it, vi } from 'vitest'

import { detectSpeaker, getMouthPosition } from '../src/bubble-tracking.js'
import type { Keypoint } from '../src/bubble-tracking.js'

// ─── 테스트 헬퍼 ─────────────────────────────────────────────────────────────

function makePose(opts: {
  id: string
  left: number
  top: number
  width: number
  height: number
  scaleX?: number
  scaleY?: number
  angle?: number
  keypoints?: Keypoint[]
}) {
  return {
    data: {
      id: opts.id,
      kind: 'pose',
      meta: {
        keypoints: opts.keypoints ?? [
          { name: 'head', x: 0.5, y: 0.15 },
          { name: 'mouth', x: 0.5, y: 0.25 },
          { name: 'center', x: 0.5, y: 0.5 },
        ],
      },
    },
    left: opts.left,
    top: opts.top,
    width: opts.width,
    height: opts.height,
    scaleX: opts.scaleX ?? 1,
    scaleY: opts.scaleY ?? 1,
    angle: opts.angle ?? 0,
  }
}

function makeBubble(opts: { left: number; top: number; width: number; height: number }) {
  return {
    data: { kind: 'speech-bubble', id: 'bubble-1' },
    _bubbleMeta: { shape: 'rounded-rect', targetId: null, tailOpts: {} },
    left: opts.left,
    top: opts.top,
    width: opts.width,
    height: opts.height,
    scaleX: 1,
    scaleY: 1,
  }
}

function makeCanvas(objects: unknown[]) {
  return {
    getObjects: () => objects,
    on: vi.fn(),
    off: vi.fn(),
    requestRenderAll: vi.fn(),
  }
}

// ─── 테스트 ───────────────────────────────────────────────────────────────────

describe('getMouthPosition', () => {
  it('mouth 키포인트가 있으면 그 좌표를 반환한다', () => {
    const pose = makePose({
      id: 'p1',
      left: 100,
      top: 50,
      width: 200,
      height: 300,
      keypoints: [
        { name: 'mouth', x: 0.5, y: 0.3 },
        { name: 'center', x: 0.5, y: 0.5 },
      ],
    })

    const pos = getMouthPosition(pose)
    // x = 100 + 200*0.5 = 200
    // y = 50 + 300*0.3 = 140
    expect(pos.x).toBeCloseTo(200, 2)
    expect(pos.y).toBeCloseTo(140, 2)
  })

  it('mouth 없으면 head 사용', () => {
    const pose = makePose({
      id: 'p2',
      left: 0,
      top: 0,
      width: 100,
      height: 200,
      keypoints: [
        { name: 'head', x: 0.5, y: 0.1 },
        { name: 'center', x: 0.5, y: 0.5 },
      ],
    })

    const pos = getMouthPosition(pose)
    expect(pos.y).toBeCloseTo(20, 2) // 0 + 200*0.1
  })

  it('키포인트 없으면 객체 중심 반환', () => {
    const pose = makePose({
      id: 'p3',
      left: 100,
      top: 200,
      width: 100,
      height: 100,
      keypoints: [],
    })

    const pos = getMouthPosition(pose)
    // center = (100 + 50, 200 + 50) = (150, 250)
    expect(pos.x).toBeCloseTo(150, 2)
    expect(pos.y).toBeCloseTo(250, 2)
  })

  it('scaleX/scaleY 가 반영된다', () => {
    const pose = makePose({
      id: 'p4',
      left: 0,
      top: 0,
      width: 100,
      height: 100,
      scaleX: 2,
      scaleY: 2,
      keypoints: [{ name: 'mouth', x: 0.5, y: 0.25 }],
    })

    const pos = getMouthPosition(pose)
    // w*scaleX = 200, h*scaleY = 200
    // x = 0 + 200*0.5 = 100, y = 0 + 200*0.25 = 50
    expect(pos.x).toBeCloseTo(100, 2)
    expect(pos.y).toBeCloseTo(50, 2)
  })
})

describe('detectSpeaker', () => {
  it('가장 가까운 포즈를 반환한다', () => {
    // bubble 중심: (200, 100)
    const bubble = makeBubble({ left: 140, top: 75, width: 120, height: 50 })

    // pose1: 멀리 있음
    const pose1 = makePose({
      id: 'pose-far',
      left: 400,
      top: 300,
      width: 100,
      height: 200,
      keypoints: [{ name: 'mouth', x: 0.5, y: 0.25 }],
    })

    // pose2: 가까이 있음 — mouth 가 (170, 100) 근처
    const pose2 = makePose({
      id: 'pose-near',
      left: 120,
      top: 50,
      width: 100,
      height: 200,
      keypoints: [{ name: 'mouth', x: 0.5, y: 0.25 }],
    })

    const canvas = makeCanvas([pose1, pose2])
    const result = detectSpeaker(canvas, bubble)

    expect(result).toBe(pose2)
  })

  it('포즈가 없으면 null 반환', () => {
    const bubble = makeBubble({ left: 100, top: 100, width: 180, height: 90 })
    // 포즈가 아닌 객체만 있는 캔버스
    const nonPose = { data: { kind: 'background' }, left: 0, top: 0 }
    const canvas = makeCanvas([nonPose])

    const result = detectSpeaker(canvas, bubble)
    expect(result).toBeNull()
  })

  it('빈 캔버스에서 null 반환', () => {
    const bubble = makeBubble({ left: 100, top: 100, width: 180, height: 90 })
    const canvas = makeCanvas([])
    expect(detectSpeaker(canvas, bubble)).toBeNull()
  })

  it('포즈가 1개면 그것을 반환한다', () => {
    const bubble = makeBubble({ left: 100, top: 100, width: 180, height: 90 })
    const pose = makePose({ id: 'only-pose', left: 50, top: 50, width: 100, height: 200 })
    const canvas = makeCanvas([pose])

    const result = detectSpeaker(canvas, bubble)
    expect(result).toBe(pose)
  })
})
