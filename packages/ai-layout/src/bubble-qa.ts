/**
 * bubble-qa.ts — 말풍선 배치 자동 QA (BUBBLE-02)
 *
 * research 2026-07-21 §4.3: 배치 후 렌더 이미지를 말풍선 검출기로 재검출해
 * 기대 배치와 대조(누락/초과/이탈)하고 얼굴 가림을 확인한다.
 *
 * 검출기 어댑터 경계:
 *  - `BubbleDetector` 인터페이스만 정의 — 실제 구현은 comic-translate(Apache-2.0)
 *    검출기 가중치(ogkalu YOLOv8m, 가중치 Apache)를 **ONNX 변환 + onnxruntime** 으로
 *    구동해야 한다 (ultralytics 런타임은 AGPL — 직접 사용 금지, research §4.3).
 *  - onnxruntime-node 의존성 추가 + 가중치 다운로드는 휴먼게이트 — 이 모듈은
 *    순수 대조 로직만 담아 mock 검출기로 테스트한다 (M2-04 embed.ts mock 패턴).
 *
 * 결정론: IoU 내림차순 그리디 매칭, 동률은 (expected idx, detected idx) 사전순.
 */

import type { NormRect } from './bubble-cost.js'

// ─────────────────────────────────────────────
// 검출기 인터페이스 (ONNX 어댑터 교체 지점)
// ─────────────────────────────────────────────

export interface DetectedBubble {
  /** 정규화 bbox (0..1, 렌더 이미지 기준) */
  box: NormRect
  /** 검출 신뢰도 0..1 */
  score: number
}

export interface BubbleDetector {
  /** 렌더된 페이지 이미지(PNG bytes)에서 말풍선 bbox 를 검출 */
  detect(imagePng: Uint8Array): Promise<DetectedBubble[]>
}

// ─────────────────────────────────────────────
// QA 리포트
// ─────────────────────────────────────────────

export interface BubbleQaMatch {
  expectedIndex: number
  detectedIndex: number
  iou: number
}

export interface BubbleQaReport {
  /** 기대 슬롯과 IoU ≥ 임계값으로 매칭된 쌍 */
  matches: BubbleQaMatch[]
  /** 검출되지 않은 기대 슬롯 인덱스 (렌더 누락/이탈 의심) */
  missing: number[]
  /** 기대에 없는 검출 인덱스 (의도치 않은 말풍선/오검출) */
  extra: number[]
  /** 얼굴 가림 플래그: faceIndex → 가려진 비율 (임계값 초과분만) */
  faceOcclusions: Array<{ faceIndex: number; detectedIndex: number; coverage: number }>
  pass: boolean
}

export interface BubbleQaOptions {
  /** 매칭 최소 IoU (기본 0.3) */
  iouThreshold?: number
  /** 검출 최소 신뢰도 (기본 0.5) */
  minScore?: number
  /** 얼굴 가림 허용 비율 (기본 0.25) */
  occlusionThreshold?: number
}

// ─────────────────────────────────────────────
// 기하
// ─────────────────────────────────────────────

function iou(a: NormRect, b: NormRect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y)
  const inter = w > 0 && h > 0 ? w * h : 0
  const union = a.w * a.h + b.w * b.h - inter
  return union > 0 ? inter / union : 0
}

function coverage(bubble: NormRect, face: NormRect): number {
  const w = Math.min(bubble.x + bubble.w, face.x + face.w) - Math.max(bubble.x, face.x)
  const h = Math.min(bubble.y + bubble.h, face.y + face.h) - Math.max(bubble.y, face.y)
  const inter = w > 0 && h > 0 ? w * h : 0
  const faceArea = face.w * face.h
  return faceArea > 0 ? inter / faceArea : 0
}

// ─────────────────────────────────────────────
// 대조 평가 (순수 함수)
// ─────────────────────────────────────────────

/**
 * 기대 말풍선 배치 vs 검출 결과 대조.
 *
 * @param expected 기대 말풍선 rect 목록 (배치 결과)
 * @param detected 검출기 출력
 * @param faces    얼굴 bbox 목록 (가림 검사용)
 */
export function evaluateBubblePlacement(
  expected: readonly NormRect[],
  detected: readonly DetectedBubble[],
  faces: readonly NormRect[] = [],
  opts: BubbleQaOptions = {},
): BubbleQaReport {
  const iouThreshold = opts.iouThreshold ?? 0.3
  const minScore = opts.minScore ?? 0.5
  const occlusionThreshold = opts.occlusionThreshold ?? 0.25

  const valid = detected.map((d, i) => ({ ...d, index: i })).filter((d) => d.score >= minScore)

  // 모든 (expected, detected) IoU 계산 → 내림차순 그리디 매칭 (결정론 동률 처리)
  const pairs: BubbleQaMatch[] = []
  for (let e = 0; e < expected.length; e++) {
    const exp = expected[e]
    if (!exp) continue
    for (const d of valid) {
      const v = iou(exp, d.box)
      if (v >= iouThreshold) pairs.push({ expectedIndex: e, detectedIndex: d.index, iou: v })
    }
  }
  pairs.sort(
    (a, b) =>
      b.iou - a.iou || a.expectedIndex - b.expectedIndex || a.detectedIndex - b.detectedIndex,
  )

  const usedExpected = new Set<number>()
  const usedDetected = new Set<number>()
  const matches: BubbleQaMatch[] = []
  for (const p of pairs) {
    if (usedExpected.has(p.expectedIndex) || usedDetected.has(p.detectedIndex)) continue
    usedExpected.add(p.expectedIndex)
    usedDetected.add(p.detectedIndex)
    matches.push(p)
  }

  const missing = expected.map((_, e) => e).filter((e) => !usedExpected.has(e))
  const extra = valid.map((d) => d.index).filter((i) => !usedDetected.has(i))

  // 얼굴 가림: 검출된 말풍선이 얼굴을 임계값 이상 덮으면 플래그
  const faceOcclusions: BubbleQaReport['faceOcclusions'] = []
  for (let f = 0; f < faces.length; f++) {
    const face = faces[f]
    if (!face) continue
    for (const d of valid) {
      const cov = coverage(d.box, face)
      if (cov > occlusionThreshold) {
        faceOcclusions.push({ faceIndex: f, detectedIndex: d.index, coverage: cov })
      }
    }
  }

  return {
    matches,
    missing,
    extra,
    faceOcclusions,
    pass: missing.length === 0 && faceOcclusions.length === 0,
  }
}

/**
 * 검출기 호출 + 대조를 한 번에 수행하는 편의 함수.
 * 검출기(ONNX 어댑터)는 호출 측에서 주입한다.
 */
export async function runBubbleQa(
  imagePng: Uint8Array,
  expected: readonly NormRect[],
  detector: BubbleDetector,
  faces: readonly NormRect[] = [],
  opts: BubbleQaOptions = {},
): Promise<BubbleQaReport> {
  const detected = await detector.detect(imagePng)
  return evaluateBubblePlacement(expected, detected, faces, opts)
}
