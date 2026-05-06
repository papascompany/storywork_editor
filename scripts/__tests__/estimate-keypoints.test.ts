/**
 * M2-02 — estimateKeypoints 단위 테스트
 *
 * ADR-0011b 기준:
 *   - head / mouth / center 3점 추정
 *   - 모든 좌표 0..1 정규화
 *   - 모든 추정 포인트 inferred=true
 *   - confidence < 0.5 → null 반환
 */

import path from 'node:path'

import type { Sharp } from 'sharp'
import { describe, it, expect, beforeAll } from 'vitest'

import type { EstimatedKeypoints } from '../lib/estimate-keypoints.js'
import { estimateKeypoints } from '../lib/estimate-keypoints.js'

// ─────────────────────────────────────────────
// 테스트용 PNG 버퍼 생성 헬퍼 (sharp 사용)
// ─────────────────────────────────────────────

type SharpConstructor = (input?: Buffer | string | { create: object }) => Sharp

let sharpFn: SharpConstructor

beforeAll(async () => {
  sharpFn = (await import('sharp')).default as unknown as SharpConstructor
})

/** 단색 RGBA PNG 버퍼 생성 */
async function makePng(
  w: number,
  h: number,
  alpha: number,
  r = 128,
  g = 128,
  b = 128,
): Promise<Buffer> {
  return sharpFn({
    create: {
      width: w,
      height: h,
      channels: 4,
      background: { r, g, b, alpha: alpha / 255 },
    },
  } as unknown as Buffer)
    .png()
    .toBuffer()
}

/**
 * 특정 영역만 알파를 가진 PNG 버퍼 생성
 * 배경은 투명(alpha=0), 지정 영역만 불투명(alpha=255)
 */
async function makePngWithRegion(
  totalW: number,
  totalH: number,
  regionX: number,
  regionY: number,
  regionW: number,
  regionH: number,
): Promise<Buffer> {
  // 전체 투명 버퍼 생성 후 특정 영역 오버레이
  const transparent = await sharpFn({
    create: {
      width: totalW,
      height: totalH,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  } as unknown as Buffer)
    .png()
    .toBuffer()

  const region = await sharpFn({
    create: {
      width: regionW,
      height: regionH,
      channels: 4,
      background: { r: 128, g: 128, b: 128, alpha: 1 },
    },
  } as unknown as Buffer)
    .png()
    .toBuffer()

  return sharpFn(transparent)
    .composite([{ input: region, left: regionX, top: regionY }])
    .png()
    .toBuffer()
}

/** 결과가 null이 아님을 단언하고 반환하는 헬퍼 */
function assertResult(result: EstimatedKeypoints | null): EstimatedKeypoints {
  expect(result).not.toBeNull()
  if (result === null) throw new Error('estimateKeypoints returned null')
  return result
}

// ─────────────────────────────────────────────
// 1. 완전 투명 PNG → null 반환
// ─────────────────────────────────────────────

describe('estimateKeypoints — 완전 투명', () => {
  it('alpha=0 (완전 투명) → null 반환', async () => {
    const buf = await makePng(100, 100, 0)
    const result = await estimateKeypoints(buf)
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────
// 2. 완전 불투명 PNG → confidence 낮음 → null
// ─────────────────────────────────────────────

describe('estimateKeypoints — 완전 불투명', () => {
  it('alpha=255 (알파 전체 불투명, 배경 없음) → confidence < 0.5 → null', async () => {
    const buf = await makePng(100, 100, 255)
    const result = await estimateKeypoints(buf)
    // fillRatio > MAX_FILL_RATIO → confidence=0.3 → null
    expect(result).toBeNull()
  })
})

// ─────────────────────────────────────────────
// 3. 정상 케이스 — 중앙에 세로로 긴 사각형 객체 (사람 실루엣 근사)
// ─────────────────────────────────────────────

describe('estimateKeypoints — 정상 세로형 객체', () => {
  let buf: Buffer

  // 100×100 캔버스, x=35~65, y=10~90 의 세로형 사각형 (사람 비례)
  beforeAll(async () => {
    buf = await makePngWithRegion(100, 100, 35, 10, 30, 80)
  })

  it('3점이 모두 포함된 결과를 반환한다', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head).toBeDefined()
    expect(result.mouth).toBeDefined()
    expect(result.center).toBeDefined()
  })

  it('모든 좌표가 0..1 범위', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    for (const pt of [result.head, result.mouth, result.center]) {
      expect(pt.x).toBeGreaterThanOrEqual(0)
      expect(pt.x).toBeLessThanOrEqual(1)
      expect(pt.y).toBeGreaterThanOrEqual(0)
      expect(pt.y).toBeLessThanOrEqual(1)
    }
  })

  it('모든 추정 포인트는 inferred=true', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head.inferred).toBe(true)
    expect(result.mouth.inferred).toBe(true)
    expect(result.center.inferred).toBe(true)
  })

  it('head.name, mouth.name, center.name 이 올바른 문자열', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head.name).toBe('head')
    expect(result.mouth.name).toBe('mouth')
    expect(result.center.name).toBe('center')
  })

  it('head.y < center.y (머리가 중심보다 위)', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head.y).toBeLessThan(result.center.y)
  })

  it('head.y <= mouth.y (머리가 입보다 위 또는 같음)', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head.y).toBeLessThanOrEqual(result.mouth.y)
  })

  it('mouth.y < center.y (입이 중심보다 위)', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.mouth.y).toBeLessThan(result.center.y)
  })

  it('confidence 가 0.5 이상', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.confidence).toBeGreaterThanOrEqual(0.5)
  })

  it('bbox 가 올바르게 계산됨 (객체 영역에 해당)', async () => {
    const result = assertResult(await estimateKeypoints(buf))
    const { bbox } = result
    // bbox.x ~ bbox.x+bbox.w 가 전체 이미지의 합리적 범위
    expect(bbox.x).toBeGreaterThanOrEqual(0)
    expect(bbox.y).toBeGreaterThanOrEqual(0)
    expect(bbox.w).toBeGreaterThan(0)
    expect(bbox.h).toBeGreaterThan(0)
    expect(bbox.x + bbox.w).toBeLessThanOrEqual(1)
    expect(bbox.y + bbox.h).toBeLessThanOrEqual(1)
  })
})

// ─────────────────────────────────────────────
// 4. 우상단 소형 객체 → bbox 우상단에 위치
// ─────────────────────────────────────────────

describe('estimateKeypoints — 우상단 소형 객체 (50×50 내 우상단 20×20)', () => {
  it('bbox 가 우상단에 위치한다', async () => {
    // 50×50 캔버스, 우상단 20×20 영역(x=30, y=0)에 객체
    const buf = await makePngWithRegion(50, 50, 30, 0, 20, 20)
    const result = assertResult(await estimateKeypoints(buf))
    // bbox 중심 x 는 0.5 이상 (우측)
    expect(result.bbox.x + result.bbox.w / 2).toBeGreaterThan(0.5)
    // bbox 중심 y 는 0.5 미만 (상단)
    expect(result.bbox.y + result.bbox.h / 2).toBeLessThan(0.5)
  })
})

// ─────────────────────────────────────────────
// 5. 실제 자산 — 01_서기_01.png
// ─────────────────────────────────────────────

describe('estimateKeypoints — 실제 자산 01_서기_01.png', () => {
  const samplePath = path.resolve(process.cwd(), 'data/poses/raw/01_서기_01.png')

  it('결과가 null 이 아니다', async () => {
    const fs = await import('node:fs')
    if (!fs.existsSync(samplePath)) {
      // CI 환경 등에서 자산이 없으면 스킵
      return
    }
    const buf = fs.readFileSync(samplePath)
    const result = await estimateKeypoints(buf)
    expect(result).not.toBeNull()
  })

  it('head.y < center.y (서기 자세 — 머리가 위)', async () => {
    const fs = await import('node:fs')
    if (!fs.existsSync(samplePath)) {
      return
    }
    const buf = fs.readFileSync(samplePath)
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head.y).toBeLessThan(result.center.y)
  })

  it('anchorPoint 근사값 — center.y 보다 아래 (발 근처)', async () => {
    const fs = await import('node:fs')
    if (!fs.existsSync(samplePath)) {
      return
    }
    const buf = fs.readFileSync(samplePath)
    const result = assertResult(await estimateKeypoints(buf))
    // anchorPoint: bbox.y + bbox.h * 0.95 (발 근처)
    const expectedAnchorY = result.bbox.y + result.bbox.h * 0.95
    expect(expectedAnchorY).toBeGreaterThan(result.center.y)
  })
})

// ─────────────────────────────────────────────
// 6. weight 범위 검증
// ─────────────────────────────────────────────

describe('estimateKeypoints — weight 범위', () => {
  it('head.weight = 0.9, mouth.weight = 0.7, center.weight = 0.8', async () => {
    const buf = await makePngWithRegion(100, 100, 20, 10, 60, 80)
    const result = assertResult(await estimateKeypoints(buf))
    expect(result.head.weight).toBe(0.9)
    expect(result.mouth.weight).toBe(0.7)
    expect(result.center.weight).toBe(0.8)
  })
})
