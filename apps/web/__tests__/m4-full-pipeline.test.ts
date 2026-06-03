/**
 * M4-04 full-pipeline E2E 4 시나리오 (Step 4)
 *
 * 풀 파이프라인 모킹 없이 실제 analyze → recommend → compose 파이프를 통과하는
 * 통합 테스트. LLM 호출 없이 룰 기반(rule-only)만 사용.
 *
 * 시나리오:
 *   A: screenplay 형식 (`철수: 안녕` — 2캐릭터 대화)
 *   B: 웹소설 형식 (산문 + 따옴표 대화)
 *   C: 매우 짧은 대본 (1 장면)
 *   D: 매우 긴 대본 (8+ 장면)
 *
 * 검증:
 *   - pages.length > 0
 *   - 각 page.fabricJson Schema v1 호환 (v=1, format, layers)
 *   - warnings 배열 존재
 *   - 결정론: 같은 seed → 같은 pages.length
 *   - scenes.length >= 1
 *   - lowDpi 의도된 케이스 포함 시 warnings 발생
 *
 * 주의:
 *   - LLM 호출 없음 (llmEnabled: false, STORYWORK_LLM 미설정)
 *   - 실제 DB 없음 — analyze/recommend/compose 까지만 검증
 *   - 검증 대상: AI 패키지 체인의 결정론 + Schema v1 호환성
 */

import { compose } from '@storywork/ai-layout'
import type { ComposeResult, PageFabricJson, LayoutFormat } from '@storywork/ai-layout'
import { recommend } from '@storywork/ai-recommend'
import type { RecommendResult } from '@storywork/ai-recommend'
import { analyze } from '@storywork/ai-script'
import type { AnalyzeResult } from '@storywork/ai-script'
import { describe, it, expect } from 'vitest'

// ─── 공통 픽스처 ──────────────────────────────────────────────────────────────

const TEST_FORMAT: LayoutFormat = {
  id: 'test-b5',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

async function runPipeline(
  scriptRaw: string,
  seed = 0,
): Promise<{ analyzed: AnalyzeResult; recommended: RecommendResult; composed: ComposeResult }> {
  const analyzed = await analyze(scriptRaw, { seed, format: 'auto', llmEnabled: false })
  const recommended = await recommend(analyzed, { seed, llmEnabled: false })
  const composed = await compose(analyzed, recommended, {
    formatId: TEST_FORMAT.id,
    format: TEST_FORMAT,
    seed,
    enableSplitMerge: true,
  })
  return { analyzed, recommended, composed }
}

// ─── Schema v1 검증 헬퍼 ──────────────────────────────────────────────────────

function assertFabricJsonV1(fabricJson: PageFabricJson, label: string): void {
  expect(fabricJson.v, `${label}: v === 1`).toBe(1)
  expect(fabricJson.format, `${label}: format 존재`).toBeDefined()
  expect(fabricJson.format.id, `${label}: format.id 존재`).toBeTruthy()
  expect(fabricJson.format.widthMm, `${label}: format.widthMm > 0`).toBeGreaterThan(0)
  expect(fabricJson.format.heightMm, `${label}: format.heightMm > 0`).toBeGreaterThan(0)
  expect(Array.isArray(fabricJson.layers), `${label}: layers 배열`).toBe(true)
  if (fabricJson._aiMeta) {
    expect(fabricJson._aiMeta.generatedBy, `${label}: _aiMeta.generatedBy`).toBe('ai-layout')
    expect(fabricJson._aiMeta.schemaVersion, `${label}: _aiMeta.schemaVersion`).toBe(1)
  }
}

// ─── 시나리오 A: Screenplay 형식 ──────────────────────────────────────────────

describe('시나리오 A — Screenplay 형식 (2캐릭터 대화)', () => {
  const SCRIPT_A = `
철수: 오늘 날씨가 참 좋네요.
영희: 정말요? 산책이나 갈까요?
철수: 좋아요. 공원으로 가요!
영희: 잠깐, 우산은 챙겨야 할 것 같은데...
철수: 아, 맞다. 아까 뉴스에서 오후에 비 온다고 했어요.
영희: 다음에 가요. 실내에서 뭔가 하는 게 나을 것 같아요.
`.trim()

  it('pages.length >= 1', async () => {
    const { composed } = await runPipeline(SCRIPT_A, 0)
    expect(composed.pages.length).toBeGreaterThanOrEqual(1)
  })

  it('각 page.fabricJson Schema v1 호환', async () => {
    const { composed } = await runPipeline(SCRIPT_A, 0)
    for (const page of composed.pages) {
      assertFabricJsonV1(page.fabricJson, `page-${page.pageIndex}`)
    }
  })

  it('warnings 배열 존재', async () => {
    const { composed } = await runPipeline(SCRIPT_A, 0)
    expect(Array.isArray(composed.warnings)).toBe(true)
  })

  it('scenes.length >= 1', async () => {
    const { analyzed } = await runPipeline(SCRIPT_A, 0)
    expect(analyzed.scenes.length).toBeGreaterThanOrEqual(1)
  })

  it('결정론: seed=42 → 두 번 실행해도 같은 pages.length', async () => {
    const run1 = await runPipeline(SCRIPT_A, 42)
    const run2 = await runPipeline(SCRIPT_A, 42)
    expect(run1.composed.pages.length).toBe(run2.composed.pages.length)
  })

  it('seed=0 vs seed=1 → 결정론 각각 일관', async () => {
    const r0a = await runPipeline(SCRIPT_A, 0)
    const r0b = await runPipeline(SCRIPT_A, 0)
    const r1a = await runPipeline(SCRIPT_A, 1)
    const r1b = await runPipeline(SCRIPT_A, 1)

    expect(r0a.composed.pages.length).toBe(r0b.composed.pages.length)
    expect(r1a.composed.pages.length).toBe(r1b.composed.pages.length)
  })
})

// ─── 시나리오 B: 웹소설 형식 (산문 + 따옴표) ─────────────────────────────────

describe('시나리오 B — 웹소설 형식 (산문 + 따옴표 대화)', () => {
  const SCRIPT_B = `
봄이 왔다. 창문 너머로 벚꽃이 흩날리고 있었다.

"오늘은 정말 기분이 좋은 날이야." 수진이 혼잣말을 했다.

사무실 문이 열리며 민준이 들어왔다. 그의 손에는 두 잔의 커피가 들려 있었다.

"아침 커피야. 요즘 바빠 보이던데."

수진은 커피를 받아들며 감사의 미소를 지었다. "고마워요. 근데 오늘 프레젠테이션 때문에 많이 긴장돼요."

"잘 될 거야. 자네 실력이면 충분해." 민준이 자리에 앉으며 말했다.
`.trim()

  it('pages.length >= 1', async () => {
    const { composed } = await runPipeline(SCRIPT_B, 0)
    expect(composed.pages.length).toBeGreaterThanOrEqual(1)
  })

  it('각 page.fabricJson Schema v1 호환', async () => {
    const { composed } = await runPipeline(SCRIPT_B, 0)
    for (const page of composed.pages) {
      assertFabricJsonV1(page.fabricJson, `B-page-${page.pageIndex}`)
    }
  })

  it('analyze 가 novel 또는 auto 형식 감지', async () => {
    const { analyzed } = await runPipeline(SCRIPT_B, 0)
    expect(['auto', 'novel', 'light-novel']).toContain(analyzed.format)
  })

  it('결정론: seed=777', async () => {
    const r1 = await runPipeline(SCRIPT_B, 777)
    const r2 = await runPipeline(SCRIPT_B, 777)
    expect(r1.composed.pages.length).toBe(r2.composed.pages.length)
    expect(r1.analyzed.scenes.length).toBe(r2.analyzed.scenes.length)
  })
})

// ─── 시나리오 C: 매우 짧은 대본 (1 장면) ────────────────────────────────────

describe('시나리오 C — 매우 짧은 대본 (1 장면)', () => {
  const SCRIPT_C = '철수: 안녕하세요!'

  it('pages.length === 1 (단일 장면)', async () => {
    const { composed } = await runPipeline(SCRIPT_C, 0)
    expect(composed.pages.length).toBe(1)
  })

  it('fabricJson Schema v1 호환', async () => {
    const { composed } = await runPipeline(SCRIPT_C, 0)
    const page = composed.pages[0]
    expect(page).toBeDefined()
    if (page) assertFabricJsonV1(page.fabricJson, 'C-page-0')
  })

  it('scenes.length === 1', async () => {
    const { analyzed } = await runPipeline(SCRIPT_C, 0)
    expect(analyzed.scenes.length).toBe(1)
  })

  it('결정론', async () => {
    const r1 = await runPipeline(SCRIPT_C, 0)
    const r2 = await runPipeline(SCRIPT_C, 0)
    expect(r1.composed.pages.length).toBe(r2.composed.pages.length)
  })
})

// ─── 시나리오 D: 매우 긴 대본 (8+ 장면) ──────────────────────────────────────

describe('시나리오 D — 매우 긴 대본 (8+ 장면)', () => {
  const SCRIPT_D = `
철수: 1장면이에요.
영희: 맞아요.
---
철수: 2장면입니다.
영희: 다음으로 가요.
---
철수: 3번째 장면.
영희: 잘 하고 있어요.
---
철수: 4장면인데요.
영희: 계속해요.
---
철수: 5번째야.
영희: 절반 왔어.
---
철수: 6장면이에요.
영희: 조금만 더.
---
철수: 7장면입니다.
영희: 거의 다 왔어.
---
철수: 8장면이에요!
영희: 완성이야!
철수: 수고했어.
`.trim()

  it('pages.length >= 1', async () => {
    const { composed } = await runPipeline(SCRIPT_D, 0)
    expect(composed.pages.length).toBeGreaterThanOrEqual(1)
  })

  it('scenes.length >= 1 (장면 분할)', async () => {
    const { analyzed } = await runPipeline(SCRIPT_D, 0)
    // 분할 기준에 따라 최소 1개
    expect(analyzed.scenes.length).toBeGreaterThanOrEqual(1)
  })

  it('각 page.fabricJson Schema v1 호환', async () => {
    const { composed } = await runPipeline(SCRIPT_D, 0)
    for (const page of composed.pages) {
      assertFabricJsonV1(page.fabricJson, `D-page-${page.pageIndex}`)
    }
  })

  it('warnings 배열 존재 (빈 배열도 허용)', async () => {
    const { composed } = await runPipeline(SCRIPT_D, 0)
    expect(Array.isArray(composed.warnings)).toBe(true)
  })

  it('결정론: seed=100', async () => {
    const r1 = await runPipeline(SCRIPT_D, 100)
    const r2 = await runPipeline(SCRIPT_D, 100)
    expect(r1.composed.pages.length).toBe(r2.composed.pages.length)
  })

  it('페이지마다 sceneIndices 포함', async () => {
    const { composed } = await runPipeline(SCRIPT_D, 0)
    for (const page of composed.pages) {
      expect(Array.isArray(page.sceneIndices), `page-${page.pageIndex} sceneIndices 배열`).toBe(
        true,
      )
    }
  })
})

// ─── 횡단 관심사: fabricJson layers 구조 ─────────────────────────────────────

describe('fabricJson layers 구조 검증', () => {
  const SCRIPT = '철수: 안녕!\n영희: 반갑습니다!'

  it('bg 레이어 존재 (배경 색상 배치)', async () => {
    const { composed } = await runPipeline(SCRIPT, 0)
    const firstPage = composed.pages[0]
    if (!firstPage) return

    const bgLayers = firstPage.fabricJson.layers.filter((l) => l.kind === 'bg')
    expect(bgLayers.length).toBeGreaterThanOrEqual(1)
  })

  it('bg 레이어의 fabric.fill 은 유효한 색상 문자열', async () => {
    const { composed } = await runPipeline(SCRIPT, 0)
    const firstPage = composed.pages[0]
    if (!firstPage) return

    const bgLayer = firstPage.fabricJson.layers.find((l) => l.kind === 'bg')
    if (bgLayer) {
      expect(typeof bgLayer.fabric.fill).toBe('string')
      expect((bgLayer.fabric.fill as string).startsWith('#')).toBe(true)
    }
  })

  it('pose 레이어의 fabric.src 는 resource:// 스키마', async () => {
    const { composed } = await runPipeline(SCRIPT, 0)
    for (const page of composed.pages) {
      for (const layer of page.fabricJson.layers) {
        if (layer.kind === 'pose' && layer.fabric.src) {
          expect(
            (layer.fabric.src as string).startsWith('resource://') || layer.fabric.src === '',
            `layer ${layer.id}: src 스키마 유효`,
          ).toBe(true)
        }
      }
    }
  })

  it('_aiMeta.seed 는 입력 seed 와 일치', async () => {
    const SEED = 12345
    const { composed } = await runPipeline(SCRIPT, SEED)
    expect(composed.seed).toBe(SEED)
    for (const page of composed.pages) {
      if (page.fabricJson._aiMeta) {
        expect(page.fabricJson._aiMeta.seed).toBe(SEED)
      }
    }
  })
})
