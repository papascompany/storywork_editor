/**
 * f1-score-llm.test.ts — LLM 활성 골든셋 F1 측정
 *
 * 실행 조건: STORYWORK_LLM=1 + STORYWORK_LLM_CACHE=1
 * CI 에서는 항상 SKIP (STORYWORK_LLM=0 기본 → describe.skip 조건)
 *
 * 로컬 실행:
 *   STORYWORK_LLM=1 STORYWORK_LLM_CACHE=1 pnpm --filter @storywork/ai-script test f1-score-llm
 *
 * 목표: 전체 평균 장면 수 F1 ≥ 0.85
 * 결과: docs/m4-ai-pipeline/llm-f1-baseline.md 자동 생성
 *
 * 비용 보호:
 * - CI: STORYWORK_LLM=0 (기본) → 전체 skip
 * - 로컬: 최초 실행 후 캐시 commit → 이후 재실행은 LLM 미호출
 */

import { mkdir, readFile, readdir, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { analyze } from '../src/analyze.js'
import type { ScriptInputFormat } from '../src/types.js'

// ─────────────────────────────────────────────
// 조건부 실행 가드
// ─────────────────────────────────────────────

const LLM_ENABLED = process.env['STORYWORK_LLM'] === '1'
const LLM_CACHE = process.env['STORYWORK_LLM_CACHE'] === '1'
const SHOULD_RUN = LLM_ENABLED && LLM_CACHE

// ─────────────────────────────────────────────
// 골든셋 로더 (f1-score.test.ts 와 동일)
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
// F1 헬퍼
// ─────────────────────────────────────────────

function f1(precision: number, recall: number): number {
  if (precision + recall === 0) return 0
  return (2 * precision * recall) / (precision + recall)
}

function sceneCountF1(predicted: number, expected: number): number {
  if (expected === 0 && predicted === 0) return 1.0
  if (expected === 0 || predicted === 0) return 0.0
  const precision = Math.min(predicted, expected) / predicted
  const recall = Math.min(predicted, expected) / expected
  return f1(precision, recall)
}

function characterF1(predicted: string[], expected: string[]): number {
  if (expected.length === 0 && predicted.length === 0) return 1.0
  if (expected.length === 0) return predicted.length === 0 ? 1.0 : 0.5
  const predSet = new Set(predicted)
  const tp = expected.filter((c) => predSet.has(c)).length
  const precision = tp / Math.max(predicted.length, 1)
  const recall = tp / expected.length
  return f1(precision, recall)
}

// ─────────────────────────────────────────────
// 보고서 생성
// ─────────────────────────────────────────────

interface CaseResult {
  id: string
  genre: string
  expectedSceneCount: number
  predictedSceneCount: number
  sceneF1: number
  charF1: number
  modelVersion: string
  hasLlmMeta: boolean
}

async function writeReport(results: CaseResult[], avgF1: number, avgCharF1: number): Promise<void> {
  const docsDir = join(import.meta.dirname, '../../../docs/m4-ai-pipeline')
  await mkdir(docsDir, { recursive: true })

  const now = new Date().toISOString()
  const rows = results
    .map(
      (r) =>
        `| ${r.id} | ${r.expectedSceneCount} | ${r.predictedSceneCount} | ${r.sceneF1.toFixed(3)} | ${r.charF1.toFixed(3)} | ${r.hasLlmMeta ? 'Y' : 'N'} |`,
    )
    .join('\n')

  const report = `# LLM F1 Baseline — M4-01-03

> 자동 생성: ${now}
> 모델: claude-sonnet-4-6
> 캐시 활성: STORYWORK_LLM_CACHE=1

## 결과 요약

| 지표 | 값 | 목표 | 통과 |
|---|---|---|---|
| 장면 수 F1 (전체 평균) | ${avgF1.toFixed(3)} | ≥ 0.85 | ${avgF1 >= 0.85 ? 'PASS' : 'FAIL'} |
| 캐릭터 감지 F1 (전체 평균) | ${avgCharF1.toFixed(3)} | ≥ 0.5 | ${avgCharF1 >= 0.5 ? 'PASS' : 'FAIL'} |

## 케이스별 결과

| 케이스 | 예상 장면 | 예측 장면 | 장면 F1 | 캐릭터 F1 | LLM 메타 |
|---|---|---|---|---|---|
${rows}

## 비고

- LLM 보강: 장면 meta (location, cameraAngle, mood, emotion, pacing) 추가
- 장면 분할 자체는 룰-only 파서 담당, LLM 은 메타 추출만 수행
- 캐시 위치: \`packages/ai-script/__tests__/__llm-cache__/\`
- 재현: \`STORYWORK_LLM=1 STORYWORK_LLM_CACHE=1 pnpm --filter @storywork/ai-script test f1-score-llm\`
`

  await writeFile(join(docsDir, 'llm-f1-baseline.md'), report, 'utf-8')
  console.warn(`[LLM-F1] 보고서 생성: docs/m4-ai-pipeline/llm-f1-baseline.md`)
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe.skipIf(!SHOULD_RUN)('골든셋 F1 평가 (LLM 활성)', () => {
  it('LLM=1 + CACHE=1 환경 확인', () => {
    expect(LLM_ENABLED).toBe(true)
    expect(LLM_CACHE).toBe(true)
  })

  it('골든셋 20건 LLM 분석 + F1 ≥ 0.85', async () => {
    const cases = await loadGoldenCases()
    expect(cases.length).toBeGreaterThanOrEqual(20)

    const results: CaseResult[] = []
    let totalSceneF1 = 0
    let totalCharF1 = 0

    for (const gc of cases) {
      const result = await analyze(gc.text, {
        format: gc.expected.format === 'auto' ? 'auto' : gc.expected.format,
        seed: 0,
        llmEnabled: true,
        maxAlternatives: 0, // 비용 절감: alternatives 비활성
      })

      const sceneF1 = sceneCountF1(result.scenes.length, gc.expected.expectedSceneCount)
      const predictedNames = result.characters.map((c) => c.name)
      const charF1 = characterF1(predictedNames, gc.expected.expectedCharacters)

      // LLM 메타 보강 여부 확인 (최소 1개 장면에 location/mood 있으면 LLM 작동)
      const hasLlmMeta = result.scenes.some(
        (s) => s.meta.location !== undefined || s.meta.mood !== undefined,
      )

      totalSceneF1 += sceneF1
      totalCharF1 += charF1

      results.push({
        id: gc.id,
        genre: gc.genre,
        expectedSceneCount: gc.expected.expectedSceneCount,
        predictedSceneCount: result.scenes.length,
        sceneF1,
        charF1,
        modelVersion: result.modelVersion,
        hasLlmMeta,
      })

      console.warn(
        `[LLM-F1] ${gc.id}: scene F1=${sceneF1.toFixed(3)}, char F1=${charF1.toFixed(3)}, llmMeta=${hasLlmMeta}, model=${result.modelVersion}`,
      )
    }

    const avgSceneF1 = totalSceneF1 / cases.length
    const avgCharF1 = totalCharF1 / cases.length

    console.warn(`[LLM-F1] 장면 F1 평균: ${avgSceneF1.toFixed(3)} (목표: ≥ 0.85)`)
    console.warn(`[LLM-F1] 캐릭터 F1 평균: ${avgCharF1.toFixed(3)}`)

    // 보고서 생성
    await writeReport(results, avgSceneF1, avgCharF1)

    // 목표 검증
    expect(avgSceneF1).toBeGreaterThanOrEqual(0.85)
  }, 120_000) // LLM 호출 타임아웃 2분
})

// CI 에서 실행되는 smoke 테스트 (LLM 없이)
describe('LLM F1 스크립트 — CI smoke (룰-only)', () => {
  it('골든셋 로드 + 룰-only analyze 정상 동작', async () => {
    const cases = await loadGoldenCases()
    expect(cases.length).toBeGreaterThanOrEqual(20)

    // 첫 케이스만 룰-only 로 실행해 기본 동작 확인
    const first = cases[0]
    if (!first) return

    const result = await analyze(first.text, {
      format: first.expected.format,
      seed: 0,
      llmEnabled: false,
    })
    expect(result.scenes.length).toBeGreaterThanOrEqual(1)
    expect(result.modelVersion).toBe('rule-only')
  })
})
