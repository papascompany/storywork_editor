/**
 * enhance.test.ts — enhanceWithLLM 단위 테스트 (mock LLM 응답)
 *
 * LLM 실제 호출 없이 캐시 경로와 mergeEnhancement 로직을 검증한다.
 * - vi.mock('ai') 로 generateObject mocking
 * - 캐시 읽기/쓰기 검증
 * - graceful fallback 검증
 * - 결정론 보장 검증
 */

import { createHash } from 'node:crypto'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// ─────────────────────────────────────────────
// 헬퍼 — 테스트용 AnalyzeResult 생성
// ─────────────────────────────────────────────

function makeBaseResult() {
  return {
    format: 'novel' as const,
    scenes: [
      {
        index: 0,
        slug: 'scene-01',
        summary: '철수와 영희가 만난다',
        meta: {},
        lines: [{ index: 0, text: '철수가 걸어왔다.', speaker: undefined, offset: 0 }],
        characters: ['철수', '영희'],
        confidence: 0.5,
      },
    ],
    characters: [
      { name: '철수', mentionCount: 3 },
      { name: '영희', mentionCount: 2 },
    ],
    seed: 0,
    modelVersion: 'rule-only',
  }
}

// ─────────────────────────────────────────────
// 캐시 경로 계산 (enhance.ts 와 동일한 로직)
// ─────────────────────────────────────────────

function cacheDir() {
  // enhance.ts 의 CACHE_DIR 와 같은 위치
  return join(import.meta.dirname, '__llm-cache__')
}

function cacheKey(raw: string, seed: number): string {
  return createHash('sha256').update(`${seed}:${raw}`).digest('hex').slice(0, 16)
}

// ─────────────────────────────────────────────
// 테스트
// ─────────────────────────────────────────────

describe('enhanceWithLLM — 캐시 경로', () => {
  const TEST_RAW = '철수가 걸어왔다. 영희가 손을 흔들었다.'
  const TEST_SEED = 9999
  const TEST_CACHE_FILE = join(cacheDir(), `${cacheKey(TEST_RAW, TEST_SEED)}-${TEST_SEED}.json`)

  const mockEnhancement = {
    scenes: [
      {
        index: 0,
        location: '거리',
        cameraAngle: 'medium' as const,
        mood: 'calm',
        emotion: 'happy',
        pacing: 'normal' as const,
      },
    ],
    characters: [{ name: '철수', suggestedBodyType: 'M' as const }],
    confidence: 0.85,
  }

  beforeEach(async () => {
    // 캐시 디렉토리 보장
    await mkdir(cacheDir(), { recursive: true })
    // 테스트 캐시 파일 미리 작성 (캐시 히트 시나리오)
    await writeFile(TEST_CACHE_FILE, JSON.stringify(mockEnhancement), 'utf-8')
  })

  afterEach(async () => {
    // 테스트 캐시 파일 정리
    try {
      await rm(TEST_CACHE_FILE, { force: true })
    } catch {
      // 무시
    }
  })

  it('STORYWORK_LLM_CACHE=1 + 캐시 파일 존재 시 LLM 미호출 + 캐시 결과 반환', async () => {
    // LLM 모듈 mock (호출 여부 감지용)
    vi.mock('ai', () => ({
      generateObject: vi.fn().mockRejectedValue(new Error('LLM 호출 금지: 캐시 사용해야 함')),
    }))

    const originalEnv = process.env['STORYWORK_LLM_CACHE']
    process.env['STORYWORK_LLM_CACHE'] = '1'

    try {
      const { enhanceWithLLM } = await import('../src/llm/enhance.js')
      const base = makeBaseResult()
      const result = await enhanceWithLLM(TEST_RAW, base, { seed: TEST_SEED })

      // 캐시에서 location 보강됐는지 확인
      expect(result.scenes[0]?.meta.location).toBe('거리')
      expect(result.scenes[0]?.meta.cameraAngle).toBe('medium')
      expect(result.scenes[0]?.meta.mood).toBe('calm')
      expect(result.modelVersion).toBe('claude-sonnet-4-6')

      // 캐릭터 bodyType 보강
      expect(result.characters[0]?.suggestedBodyType).toBe('M')
    } finally {
      process.env['STORYWORK_LLM_CACHE'] = originalEnv ?? ''
      vi.restoreAllMocks()
    }
  })

  it('캐시 히트 시 동일 입력 + seed → 동일 출력 (결정론)', async () => {
    const originalEnv = process.env['STORYWORK_LLM_CACHE']
    process.env['STORYWORK_LLM_CACHE'] = '1'

    try {
      const { enhanceWithLLM } = await import('../src/llm/enhance.js')
      const base = makeBaseResult()

      const r1 = await enhanceWithLLM(TEST_RAW, base, { seed: TEST_SEED })
      const r2 = await enhanceWithLLM(TEST_RAW, base, { seed: TEST_SEED })

      expect(r1.scenes[0]?.meta.location).toBe(r2.scenes[0]?.meta.location)
      expect(r1.scenes[0]?.meta.mood).toBe(r2.scenes[0]?.meta.mood)
      expect(r1.characters[0]?.suggestedBodyType).toBe(r2.characters[0]?.suggestedBodyType)
    } finally {
      process.env['STORYWORK_LLM_CACHE'] = originalEnv ?? ''
    }
  })

  it('캐시 미존재 + LLM API key 없음 → throw (analyze.ts 가 캐치해 fallback)', async () => {
    // 캐시 파일 제거 (미스 시나리오)
    await rm(TEST_CACHE_FILE, { force: true })

    const originalEnv = process.env['STORYWORK_LLM_CACHE']
    const originalKey = process.env['ANTHROPIC_API_KEY']
    const originalGwKey = process.env['AI_GATEWAY_API_KEY']

    process.env['STORYWORK_LLM_CACHE'] = '1'
    process.env['ANTHROPIC_API_KEY'] = ''
    process.env['AI_GATEWAY_API_KEY'] = ''

    try {
      const { enhanceWithLLM } = await import('../src/llm/enhance.js')
      const base = makeBaseResult()
      // API key 없으면 LLM 호출이 throw 해야 함
      await expect(enhanceWithLLM(TEST_RAW, base, { seed: 12345 })).rejects.toThrow()
    } finally {
      process.env['STORYWORK_LLM_CACHE'] = originalEnv ?? ''
      process.env['ANTHROPIC_API_KEY'] = originalKey ?? ''
      process.env['AI_GATEWAY_API_KEY'] = originalGwKey ?? ''
    }
  })
})

describe('analyze() — LLM fallback (graceful)', () => {
  it('LLM 활성이지만 key 없으면 룰-only 결과 반환', async () => {
    const originalLlm = process.env['STORYWORK_LLM']
    const originalKey = process.env['ANTHROPIC_API_KEY']
    const originalGwKey = process.env['AI_GATEWAY_API_KEY']

    process.env['STORYWORK_LLM'] = '1'
    process.env['ANTHROPIC_API_KEY'] = ''
    process.env['AI_GATEWAY_API_KEY'] = ''

    try {
      // 동적 import 로 환경변수 변경 후 모듈 로드
      const { analyze } = await import('../src/analyze.js')
      const result = await analyze('철수: 안녕하세요.\n영희: 반갑습니다.', {
        llmEnabled: true,
        seed: 0,
      })

      // fallback 이므로 scenes 는 있어야 함
      expect(result.scenes.length).toBeGreaterThanOrEqual(1)
      // fallback 시 modelVersion 은 rule-only
      expect(result.modelVersion).toBe('rule-only')
    } finally {
      process.env['STORYWORK_LLM'] = originalLlm ?? ''
      process.env['ANTHROPIC_API_KEY'] = originalKey ?? ''
      process.env['AI_GATEWAY_API_KEY'] = originalGwKey ?? ''
    }
  })
})
