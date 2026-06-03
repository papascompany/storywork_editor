/**
 * f1-score.test.ts — 골든셋 20 F1 측정
 *
 * 지표:
 *  - 형식 감지 정확도 (format accuracy)
 *  - 장면 수 precision/recall/F1 (sceneCount 기준)
 *  - 캐릭터 감지 F1 (expectedCharacters 기준)
 *
 * 목표:
 *  - 룰-only F1 ≥ 0.6 (CI 통과 기준)
 *  - LLM 활성 F1 ≥ 0.8 (로컬 STORYWORK_LLM=1 수동 확인)
 *
 * 비용 보호: STORYWORK_LLM 환경변수 미설정 시 룰-only
 */

import { readFile, readdir } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { analyze } from '../src/analyze.js'
import type { ScriptInputFormat } from '../src/types.js'

// ─────────────────────────────────────────────
// 골든셋 로더
// ─────────────────────────────────────────────

interface GoldenExpected {
  format: ScriptInputFormat
  expectedSceneCount: number
  expectedCharacters: string[]
  expectedBoundaries: number[]
  expectedEmotions: string[]
}

interface GoldenCase {
  id: string
  genre: string
  text: string
  expected: GoldenExpected
}

async function loadGoldenCases(): Promise<GoldenCase[]> {
  const goldenDir = join(import.meta.dirname, 'golden')
  const genres = await readdir(goldenDir)
  const cases: GoldenCase[] = []

  for (const genre of genres) {
    const genreDir = join(goldenDir, genre)
    const files = (await readdir(genreDir)).filter((f) => f.endsWith('.txt'))

    for (const txtFile of files) {
      const base = txtFile.replace('.txt', '')
      const textPath = join(genreDir, txtFile)
      const expectedPath = join(genreDir, `${base}.expected.json`)

      try {
        const text = await readFile(textPath, 'utf-8')
        const expectedRaw = await readFile(expectedPath, 'utf-8')
        const expected = JSON.parse(expectedRaw) as GoldenExpected

        cases.push({ id: `${genre}/${base}`, genre, text, expected })
      } catch {
        // 파일 누락 시 skip
      }
    }
  }

  return cases
}

// ─────────────────────────────────────────────
// F1 계산 헬퍼
// ─────────────────────────────────────────────

function f1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

/** 장면 수 기반 scene count F1 — 예측/실제 장면 수 비교 */
function sceneCountF1(predicted: number, expected: number): number {
  if (expected === 0 && predicted === 0) return 1.0
  if (expected === 0 || predicted === 0) return 0.0
  const precision = Math.min(predicted, expected) / predicted
  const recall = Math.min(predicted, expected) / expected
  return f1(precision, recall)
}

/** 캐릭터 이름 집합 F1 */
function characterF1(predicted: string[], expected: string[]): number {
  if (expected.length === 0 && predicted.length === 0) return 1.0
  if (expected.length === 0) return predicted.length === 0 ? 1.0 : 0.5 // 허용적
  const predSet = new Set(predicted)
  const expSet = new Set(expected)
  const tp = expected.filter((c) => predSet.has(c)).length
  const precision = tp / Math.max(predicted.length, 1)
  const recall = tp / expSet.size
  return f1(precision, recall)
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('골든셋 F1 평가 (룰-only)', () => {
  it('골든셋 20건 로드 확인', async () => {
    const cases = await loadGoldenCases()
    expect(cases.length).toBeGreaterThanOrEqual(20)
  })

  it('형식 감지 정확도 ≥ 0.7', async () => {
    const cases = await loadGoldenCases()
    let correct = 0

    for (const gc of cases) {
      const result = await analyze(gc.text, { format: 'auto', llmEnabled: false })
      if (result.format === gc.expected.format) correct++
    }

    const accuracy = correct / cases.length
    console.warn(`[F1] format accuracy: ${correct}/${cases.length} = ${accuracy.toFixed(3)}`)
    expect(accuracy).toBeGreaterThanOrEqual(0.7)
  })

  it('장면 수 F1 ≥ 0.6 (전체 평균)', async () => {
    const cases = await loadGoldenCases()
    let totalF1 = 0

    for (const gc of cases) {
      const result = await analyze(gc.text, {
        format: gc.expected.format === 'auto' ? 'auto' : gc.expected.format,
        llmEnabled: false,
      })
      const f1Score = sceneCountF1(result.scenes.length, gc.expected.expectedSceneCount)
      totalF1 += f1Score
    }

    const avgF1 = totalF1 / cases.length
    console.warn(`[F1] scene count F1 avg: ${avgF1.toFixed(3)}`)
    expect(avgF1).toBeGreaterThanOrEqual(0.6)
  })

  it('캐릭터 감지 F1 ≥ 0.5 (screenplay 케이스)', async () => {
    const cases = await loadGoldenCases()
    const screenplayCases = cases.filter((c) => c.expected.format === 'screenplay')
    if (screenplayCases.length === 0) return

    let totalF1 = 0
    for (const gc of screenplayCases) {
      const result = await analyze(gc.text, { format: 'screenplay', llmEnabled: false })
      const predictedNames = result.characters.map((c) => c.name)
      totalF1 += characterF1(predictedNames, gc.expected.expectedCharacters)
    }

    const avgF1 = totalF1 / screenplayCases.length
    console.warn(`[F1] character F1 (screenplay) avg: ${avgF1.toFixed(3)}`)
    expect(avgF1).toBeGreaterThanOrEqual(0.5)
  })

  it('각 골든 케이스: 형식별 분석 최소 1 scene 반환', async () => {
    const cases = await loadGoldenCases()
    const failures: string[] = []

    for (const gc of cases) {
      // empty text 케이스 제외
      if (gc.text.trim().length < 5) continue

      const result = await analyze(gc.text, {
        format: gc.expected.format === 'auto' ? 'auto' : gc.expected.format,
        llmEnabled: false,
      })
      if (result.scenes.length === 0) {
        failures.push(gc.id)
      }
    }

    if (failures.length > 0) {
      console.warn('[F1] scenes=0 케이스:', failures)
    }
    expect(failures.length).toBe(0)
  })
})
