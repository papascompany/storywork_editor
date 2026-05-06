/**
 * M2-02 — 알파 채널 기반 3점 키포인트 자동 추정
 *
 * ADR-0011b 정책:
 *   - 사이드카 미보유 자산에 한해 head / mouth / center 3점만 추정
 *   - 모든 추정 좌표는 0..1 정규화 (마스터 픽셀 기준)
 *   - 모든 추정 포인트에 inferred=true 마크
 *   - confidence < 0.5 → null 반환 (호출자가 review queue 처리)
 *
 * 외부 ML 라이브러리 미사용 — sharp + 알파 채널 분석만 사용 (가벼움 우선)
 */

// ─────────────────────────────────────────────
// 타입
// ─────────────────────────────────────────────

export interface KpPoint {
  name: 'head' | 'mouth' | 'center'
  x: number
  y: number
  weight: number
  inferred: true
}

export interface BBox {
  x: number
  y: number
  w: number
  h: number
}

export interface EstimatedKeypoints {
  head: KpPoint
  mouth: KpPoint
  center: KpPoint
  bbox: BBox
  confidence: number
}

// ─────────────────────────────────────────────
// 내부 상수
// ─────────────────────────────────────────────

/** 분석용 다운샘플 목표 크기 (긴 변 기준, 메모리 절감) */
const ANALYSIS_SIZE = 256

/** 알파 임계값: 이 값 초과 = "객체 픽셀" */
const ALPHA_THRESHOLD = 32

/** confidence 계산용 임계 */
const MIN_FILL_RATIO = 0.02 // 객체 픽셀 비율 최소 (너무 적으면 → 낮은 신뢰도)
const MAX_FILL_RATIO = 0.98 // 객체 픽셀 비율 최대 (알파 전부 불투명 → 낮은 신뢰도)
const HEAD_ZONE_RATIO = 0.25 // bbox 상단 이 비율만큼을 head 영역으로 정의

// ─────────────────────────────────────────────
// 메인 함수
// ─────────────────────────────────────────────

/**
 * PNG 버퍼에서 head/mouth/center 3점 키포인트를 추정한다.
 *
 * @param buf - sharp 재인코딩 완료된 PNG 버퍼 (RGBA 채널 보장)
 * @param confidenceThreshold - confidence 임계값 (기본 0.5 / ADR-0011b). 이 값 미만 시 null 반환.
 * @returns EstimatedKeypoints (모두 0..1 정규화) 또는 객체 픽셀 없음/confidence 임계값 미달 시 null
 */
export async function estimateKeypoints(
  buf: Buffer,
  confidenceThreshold = 0.5,
): Promise<EstimatedKeypoints | null> {
  const sharp = (await import('sharp')).default

  // ── 1. 원본 크기 파악 ──────────────────────────
  const meta = await sharp(buf).metadata()
  const origW = meta.width ?? 0
  const origH = meta.height ?? 0
  if (origW === 0 || origH === 0) return null

  // ── 2. 분석용 다운샘플 (긴 변을 ANALYSIS_SIZE 로 축소, 비율 유지) ──
  const scale = ANALYSIS_SIZE / Math.max(origW, origH)
  const anaW = Math.max(1, Math.round(origW * scale))
  const anaH = Math.max(1, Math.round(origH * scale))

  // RGBA raw 픽셀 추출
  const rawBuf = await sharp(buf).resize(anaW, anaH, { fit: 'fill' }).ensureAlpha().raw().toBuffer()

  // ── 3. 알파 채널에서 객체 픽셀 마스크 구성 ──────
  const totalPixels = anaW * anaH
  const isObject = new Uint8Array(totalPixels) // 1 = 객체 픽셀

  let objectCount = 0
  for (let i = 0; i < totalPixels; i++) {
    const alpha = rawBuf[i * 4 + 3] ?? 0
    if (alpha > ALPHA_THRESHOLD) {
      isObject[i] = 1
      objectCount++
    }
  }

  const fillRatio = objectCount / totalPixels

  // ── 4. bounding box 계산 ─────────────────────
  let minX = anaW
  let minY = anaH
  let maxX = 0
  let maxY = 0

  for (let y = 0; y < anaH; y++) {
    for (let x = 0; x < anaW; x++) {
      if (isObject[y * anaW + x]) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }

  // 객체 픽셀이 없는 경우
  if (objectCount === 0 || minX > maxX || minY > maxY) return null

  const bboxW = maxX - minX + 1
  const bboxH = maxY - minY + 1

  // ── 5. confidence 계산 ────────────────────────
  let confidence = 0.5 // 기본값

  // 객체 픽셀 비율 이상치 체크
  if (fillRatio < MIN_FILL_RATIO) {
    confidence = 0.2
  } else if (fillRatio > MAX_FILL_RATIO) {
    // 배경이 없는 이미지(알파 전체 불투명) → 낮은 신뢰도
    confidence = 0.3
  } else {
    // bbox 가로세로 비율이 합리적인지 (0.15 ~ 3.5 범위 → 사람 형태)
    const aspectRatio = bboxW / bboxH
    if (aspectRatio >= 0.15 && aspectRatio <= 3.5) {
      confidence = 0.65
    } else {
      confidence = 0.4
    }

    // 상단 head 영역에 픽셀이 충분히 있는지 확인 → +0.15
    const headZoneBottom = minY + Math.round(bboxH * HEAD_ZONE_RATIO)
    let headPixels = 0
    for (let y = minY; y <= headZoneBottom; y++) {
      for (let x = minX; x <= maxX; x++) {
        if (isObject[y * anaW + x]) headPixels++
      }
    }
    const headZoneArea = (headZoneBottom - minY + 1) * (maxX - minX + 1)
    const headFill = headZoneArea > 0 ? headPixels / headZoneArea : 0
    if (headFill > 0.1) {
      confidence = Math.min(1.0, confidence + 0.15)
    }
  }

  // confidence 임계값 미달 → null (ADR-0011b, 기본 0.5)
  if (confidence < confidenceThreshold) return null

  // ── 6. head 추정 ──────────────────────────────
  // bbox 상단 HEAD_ZONE_RATIO 영역 내 객체 픽셀의 가중 중심 (y가 작을수록 가중치 높음)
  let headSumX = 0
  let headSumY = 0
  let headSumW = 0

  const headZoneBottom = minY + Math.round(bboxH * HEAD_ZONE_RATIO)

  for (let y = minY; y <= headZoneBottom; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isObject[y * anaW + x]) {
        // 상단에 가까울수록 가중치 증가 (y=minY 가 최대 가중치)
        const w = 1.0 - (y - minY) / (headZoneBottom - minY + 1)
        headSumX += x * w
        headSumY += y * w
        headSumW += w
      }
    }
  }

  let headX: number
  let headY: number

  if (headSumW > 0) {
    headX = headSumX / headSumW
    headY = headSumY / headSumW
  } else {
    // fallback: bbox 상단 중앙
    headX = (minX + maxX) / 2
    headY = minY + bboxH * 0.1
  }

  // ── 7. center (몸 중심) 추정 ─────────────────
  // 객체 픽셀 전체의 무게 중심 (centroid) — bbox 중심보다 정확
  let sumX = 0
  let sumY = 0
  let sumCount = 0

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      if (isObject[y * anaW + x]) {
        sumX += x
        sumY += y
        sumCount++
      }
    }
  }

  const centerX = sumCount > 0 ? sumX / sumCount : (minX + maxX) / 2
  const centerY = sumCount > 0 ? sumY / sumCount : (minY + maxY) / 2

  // ── 8. mouth 추정 ────────────────────────────
  // head.y 와 center.y 사이의 0.3 지점 (head 아래 약간)
  // 폴백: head.y + bbox.h * 0.07
  const mouthX = headX // 입은 머리와 같은 x 중심
  const mouthY = headY + bboxH * 0.06

  // ── 9. 0..1 정규화 ────────────────────────────
  // 분석 이미지 좌표 → 원본 이미지 0..1 좌표로 변환
  function toNorm(px: number, dim: number): number {
    const orig = px / scale // 다운샘플 역변환
    return Math.max(0, Math.min(1, orig / dim))
  }

  const norm = {
    headX: toNorm(headX, origW),
    headY: toNorm(headY, origH),
    mouthX: toNorm(mouthX, origW),
    mouthY: toNorm(mouthY, origH),
    centerX: toNorm(centerX, origW),
    centerY: toNorm(centerY, origH),
    bboxX: toNorm(minX, origW),
    bboxY: toNorm(minY, origH),
    bboxW: toNorm(bboxW, origW),
    bboxH: toNorm(bboxH, origH),
  }

  // mouth.y 가 head.y 보다 작아지지 않도록 클램프
  if (norm.mouthY < norm.headY) {
    norm.mouthY = Math.min(1, norm.headY + 0.04)
  }

  // ── 10. 결과 조립 ─────────────────────────────
  return {
    head: {
      name: 'head',
      x: norm.headX,
      y: norm.headY,
      weight: 0.9,
      inferred: true,
    },
    mouth: {
      name: 'mouth',
      x: norm.mouthX,
      y: norm.mouthY,
      weight: 0.7,
      inferred: true,
    },
    center: {
      name: 'center',
      x: norm.centerX,
      y: norm.centerY,
      weight: 0.8,
      inferred: true,
    },
    bbox: {
      x: norm.bboxX,
      y: norm.bboxY,
      w: norm.bboxW,
      h: norm.bboxH,
    },
    confidence,
  }
}
