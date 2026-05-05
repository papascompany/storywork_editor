// ─────────────────────────────────────────────
// png.test.ts — PNG 내보내기 + 비주얼 회귀 5장 골든 테스트
//
// 전략:
// 1. 각 골든 JSON 을 loadJson 으로 로드
// 2. exportPng 로 PNG Blob 생성
// 3. Golden PNG 파일이 없으면 최초 1회 자동 생성(캡처 모드)
// 4. 있으면 pixelmatch 로 비교 (threshold 0.1, tolerance ±2px)
//
// VISUAL_REGRESSION_UPDATE=1 환경변수 설정 시 골든 파일 갱신
// ─────────────────────────────────────────────

import fs from 'node:fs'
import path from 'node:path'

import { StoryCanvas } from '@storywork/editor-core'
import type { PageJsonV1 } from '@storywork/schema/editor'
import pixelmatch from 'pixelmatch'
import { PNG } from 'pngjs'
// pixelmatch is CJS
import { describe, expect, it } from 'vitest'

import { exportPng } from '../src/index.js'

// ─── 헬퍼 ────────────────────────────────────

const GOLDEN_DIR = path.resolve(import.meta.dirname, 'golden')
const UPDATE_GOLDENS = process.env['VISUAL_REGRESSION_UPDATE'] === '1'

// pixel diff tolerance
const THRESHOLD = 0.1 // 색상 차이 허용 비율 (0=엄격, 1=관대)
const MAX_DIFF_RATIO = 0.02 // 전체 픽셀의 2% 이내 차이 허용

interface GoldenCase {
  name: string
  jsonFile: string
  pngFile: string
}

const GOLDEN_CASES: GoldenCase[] = [
  {
    name: 'empty-page',
    jsonFile: 'empty-page.json',
    pngFile: 'empty-page.png',
  },
  {
    name: 'single-rect',
    jsonFile: 'single-rect.json',
    pngFile: 'single-rect.png',
  },
  {
    name: 'grouped',
    jsonFile: 'grouped.json',
    pngFile: 'grouped.png',
  },
  {
    name: 'locked',
    jsonFile: 'locked.json',
    pngFile: 'locked.png',
  },
  {
    name: 'multi-color',
    jsonFile: 'multi-color.json',
    pngFile: 'multi-color.png',
  },
]

function readGoldenJson(filename: string): PageJsonV1 {
  const raw = fs.readFileSync(path.join(GOLDEN_DIR, filename), 'utf-8')
  return JSON.parse(raw) as PageJsonV1
}

async function blobToBuffer(blob: Blob): Promise<Buffer> {
  const ab = await blob.arrayBuffer()
  return Buffer.from(ab)
}

function parsePng(buffer: Buffer): PNG {
  return PNG.sync.read(buffer)
}

function compareWithGolden(
  actualBuffer: Buffer,
  goldenPath: string,
  name: string,
): { diffPixels: number; totalPixels: number } {
  const goldenBuffer = fs.readFileSync(goldenPath)
  const actual = parsePng(actualBuffer)
  const golden = parsePng(goldenBuffer)

  // 크기가 다르면 즉시 실패
  if (actual.width !== golden.width || actual.height !== golden.height) {
    throw new Error(
      `[${name}] PNG 크기 불일치: actual=${actual.width}x${actual.height}, golden=${golden.width}x${golden.height}`,
    )
  }

  const totalPixels = actual.width * actual.height
  const diffData = new Uint8Array(totalPixels * 4)

  const diffPixels = pixelmatch(actual.data, golden.data, diffData, actual.width, actual.height, {
    threshold: THRESHOLD,
    includeAA: true,
  })

  return { diffPixels, totalPixels }
}

// ─── 단위 테스트: API 동작 검증 ──────────────

describe('exportPng — API', () => {
  it('빈 캔버스에서 Blob 을 반환한다', async () => {
    const canvas = new StoryCanvas({ format: { id: 'test', widthMm: 100, heightMm: 100, dpi: 96 } })
    const result = await exportPng(canvas, { scale: 1 })

    expect(result.blob).toBeInstanceOf(Blob)
    expect(result.mimeType).toBe('image/png')
    expect(result.scale).toBe(1)
    expect(result.width).toBeGreaterThan(0)
    expect(result.height).toBeGreaterThan(0)

    canvas.dispose()
  })

  it('scale=2 이면 width/height 가 2배이다', async () => {
    const canvas = new StoryCanvas({ format: { id: 'test', widthMm: 100, heightMm: 100, dpi: 96 } })

    const r1 = await exportPng(canvas, { scale: 1 })
    const r2 = await exportPng(canvas, { scale: 2 })

    expect(r2.width).toBe(r1.width * 2)
    expect(r2.height).toBe(r1.height * 2)

    canvas.dispose()
  })

  it('format=image/jpeg 을 지정하면 mimeType 이 image/jpeg 이다', async () => {
    const canvas = new StoryCanvas({ format: { id: 'test', widthMm: 50, heightMm: 50, dpi: 96 } })
    const result = await exportPng(canvas, { format: 'image/jpeg', scale: 1 })

    expect(result.mimeType).toBe('image/jpeg')

    canvas.dispose()
  })

  it('scale <= 0 이면 Error 를 던진다', async () => {
    const canvas = new StoryCanvas({ format: { id: 'test', widthMm: 50, heightMm: 50, dpi: 96 } })

    await expect(exportPng(canvas, { scale: 0 })).rejects.toThrow('scale')
    await expect(exportPng(canvas, { scale: -1 })).rejects.toThrow('scale')

    canvas.dispose()
  })

  it('quality 범위 밖이면 Error 를 던진다', async () => {
    const canvas = new StoryCanvas({ format: { id: 'test', widthMm: 50, heightMm: 50, dpi: 96 } })

    await expect(exportPng(canvas, { quality: 1.5 })).rejects.toThrow('quality')
    await expect(exportPng(canvas, { quality: -0.1 })).rejects.toThrow('quality')

    canvas.dispose()
  })

  it('bleed: true 를 지정해도 에러 없이 동작한다 (경고 + 무시)', async () => {
    const canvas = new StoryCanvas({ format: { id: 'test', widthMm: 50, heightMm: 50, dpi: 96 } })
    const result = await exportPng(canvas, { bleed: true, scale: 1 })

    expect(result.blob).toBeInstanceOf(Blob)

    canvas.dispose()
  })
})

// ─── 비주얼 회귀 테스트 (5 골든) ────────────

describe('exportPng — 비주얼 회귀 골든 5장', () => {
  for (const { name, jsonFile, pngFile } of GOLDEN_CASES) {
    it(`골든: ${name}`, async () => {
      const pageJson = readGoldenJson(jsonFile)
      const canvas = new StoryCanvas({ format: pageJson.format })

      await canvas.loadJson(pageJson)

      // scale=1 로 결정론적 출력 (크기를 예측 가능하게)
      const result = await exportPng(canvas, {
        scale: 1,
        background: 'white',
        format: 'image/png',
      })

      const actualBuffer = await blobToBuffer(result.blob)
      const goldenPath = path.join(GOLDEN_DIR, pngFile)

      if (!fs.existsSync(goldenPath) || UPDATE_GOLDENS) {
        // 골든 파일 생성/갱신 모드
        fs.writeFileSync(goldenPath, actualBuffer)
        console.info(`[visual-regression] 골든 저장: ${pngFile} (${result.width}×${result.height})`)
      } else {
        // 비교 모드
        const { diffPixels, totalPixels } = compareWithGolden(actualBuffer, goldenPath, name)
        const diffRatio = diffPixels / totalPixels

        expect(diffRatio).toBeLessThanOrEqual(MAX_DIFF_RATIO)

        if (diffPixels > 0) {
          console.info(
            `[visual-regression] ${name}: diffPixels=${diffPixels}/${totalPixels} (${(diffRatio * 100).toFixed(3)}%)`,
          )
        }
      }

      canvas.dispose()
    })
  }
})
