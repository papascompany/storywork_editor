/**
 * llm-tagger.test.ts — 미매칭 자산 AI 2차 태깅 (M2-03b / AI-ACT-02)
 *
 * 검증 항목:
 *  1. env 하드 게이트 — STORYWORK_LLM 미설정 시 호출 없이 null
 *  2. 캐시 우선 — 캐시 적중 시 LLM 미호출 (CI $0·결정론)
 *  3. sanitize — 사전 어휘 밖 action/view/bodyType 차단, confidence 상한
 *  4. selectTaggingTargets — skip(적재 제외) 자산은 대상에서 제외
 *  5. 프롬프트 — 사전 어휘를 강제 목록으로 포함
 */

import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { FilenameTagResult } from '../src/filename-tagger.js'
import {
  buildTagPrompt,
  knownActionSet,
  sanitizeSuggestion,
  selectTaggingTargets,
  tagWithLlm,
} from '../src/llm-tagger.js'

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function makeResult(over: Partial<FilenameTagResult>): FilenameTagResult {
  return {
    action: undefined,
    bodyType: undefined,
    view: undefined,
    mood: undefined,
    styleVariants: [],
    tags: [],
    confidence: 0,
    matched: false,
    skipped: false,
    ...over,
  }
}

const ORIGINAL_ENV = { ...process.env }

beforeEach(() => {
  delete process.env['STORYWORK_LLM']
  delete process.env['STORYWORK_LLM_CACHE']
  delete process.env['AI_GATEWAY_API_KEY']
  delete process.env['ANTHROPIC_API_KEY']
  // 캐시 쓰기가 레포(process.cwd()/__tests__/__tag-cache__)를 오염시키지 않도록
  // 항상 임시 디렉터리로 격리한다 (개별 테스트가 필요 시 덮어씀)
  process.env['STORYWORK_LLM_CACHE_DIR'] = mkdtempSync(join(tmpdir(), 'tagcache-default-'))
})

afterEach(() => {
  process.env = { ...ORIGINAL_ENV }
})

// ─────────────────────────────────────────────
// 1. env 하드 게이트
// ─────────────────────────────────────────────

describe('tagWithLlm — env 하드 게이트 (비용 보호)', () => {
  it('STORYWORK_LLM 미설정이면 invoke 를 호출하지 않고 null', async () => {
    const invoke = vi.fn()
    const r = await tagWithLlm('mystery_pose_01.png', undefined, { _invoke: invoke })
    expect(r).toBeNull()
    expect(invoke).not.toHaveBeenCalled()
  })

  it('STORYWORK_LLM=1 이어도 키·invoke 둘 다 없으면 null (조용한 폴백)', async () => {
    process.env['STORYWORK_LLM'] = '1'
    const r = await tagWithLlm('mystery_pose_01.png', undefined)
    expect(r).toBeNull()
  })

  it('STORYWORK_LLM=1 + invoke 주입 시 태깅 수행', async () => {
    process.env['STORYWORK_LLM'] = '1'
    const invoke = vi.fn().mockResolvedValue({ action: 'standing', confidence: 0.5 })
    const r = await tagWithLlm('unknown_asset_77.png', undefined, { _invoke: invoke })
    expect(invoke).toHaveBeenCalledOnce()
    expect(r?.action).toBe('standing')
  })
})

// ─────────────────────────────────────────────
// 2. 캐시 우선
// ─────────────────────────────────────────────

describe('tagWithLlm — 캐시 우선 (결정론·CI $0)', () => {
  it('캐시 적중 시 LLM 미호출 + 캐시값 반환 (STORYWORK_LLM 꺼져 있어도)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tagcache-'))
    mkdirSync(dir, { recursive: true })
    // inputHash 는 sha256("<modelId>|<subfolder>/<filename>").slice(0,16)
    const { createHash } = await import('node:crypto')
    const hash = createHash('sha256')
      .update('claude-sonnet-4-6|/cached_asset.png')
      .digest('hex')
      .slice(0, 16)
    writeFileSync(
      join(dir, `${hash}.json`),
      JSON.stringify({ action: 'jumping', confidence: 0.55 }),
      'utf-8',
    )

    process.env['STORYWORK_LLM_CACHE'] = '1'
    process.env['STORYWORK_LLM_CACHE_DIR'] = dir

    const invoke = vi.fn()
    const r = await tagWithLlm('cached_asset.png', undefined, { _invoke: invoke })
    expect(r?.action).toBe('jumping')
    expect(invoke).not.toHaveBeenCalled()
  })
})

// ─────────────────────────────────────────────
// 3. sanitize — 어휘 밖 값 차단
// ─────────────────────────────────────────────

describe('sanitizeSuggestion', () => {
  const known = new Set(['standing', 'jumping'])

  it('사전에 없는 action 은 제거', () => {
    const r = sanitizeSuggestion({ action: 'moonwalking', confidence: 0.5 }, known)
    expect(r.action).toBeUndefined()
  })

  it('사전에 있는 action 은 유지', () => {
    const r = sanitizeSuggestion({ action: 'jumping', confidence: 0.5 }, known)
    expect(r.action).toBe('jumping')
  })

  it('confidence 는 0.6 상한 (사전 매칭보다 항상 낮게)', () => {
    const r = sanitizeSuggestion({ action: 'standing', confidence: 0.99 }, known)
    expect(r.confidence).toBeLessThanOrEqual(0.6)
  })

  it('규약 밖 view/bodyType 제거', () => {
    const r = sanitizeSuggestion({ view: 'diagonal', bodyType: 'robot', confidence: 0.4 }, known)
    expect(r.view).toBeUndefined()
    expect(r.bodyType).toBeUndefined()
  })

  it('규약 내 view/bodyType 유지', () => {
    const r = sanitizeSuggestion(
      { view: 'three-quarter', bodyType: 'child', confidence: 0.4 },
      known,
    )
    expect(r.view).toBe('three-quarter')
    expect(r.bodyType).toBe('child')
  })
})

// ─────────────────────────────────────────────
// 4. 대상 선정 — skip 자산 제외
// ─────────────────────────────────────────────

describe('selectTaggingTargets — skip 과 미매칭 구분', () => {
  it('적재 제외(skipped) 자산은 LLM 태깅 대상이 아니다', () => {
    const items = [
      { name: 'a', result: makeResult({ matched: false, skipped: true }) },
      { name: 'b', result: makeResult({ matched: false, skipped: false }) },
      { name: 'c', result: makeResult({ matched: true }) },
    ]
    const targets = selectTaggingTargets(items)
    expect(targets.map((t) => t.name)).toEqual(['b'])
  })

  it('현행 자산군에는 대상이 0건 (사전 매칭률 100%)', () => {
    // 전부 매칭되거나 skip 인 상태 = 실측된 현재 상황
    const items = [
      { result: makeResult({ matched: true }) },
      { result: makeResult({ matched: false, skipped: true }) },
    ]
    expect(selectTaggingTargets(items)).toHaveLength(0)
  })
})

// ─────────────────────────────────────────────
// 5. 프롬프트 + 어휘 집합
// ─────────────────────────────────────────────

describe('buildTagPrompt / knownActionSet', () => {
  it('모델이 다르면 캐시 키가 달라진다 (stale 제안 재사용 방지)', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'tagcache-model-'))
    const { createHash } = await import('node:crypto')
    const hashA = createHash('sha256').update('model-a|/x.png').digest('hex').slice(0, 16)
    writeFileSync(
      join(dir, `${hashA}.json`),
      JSON.stringify({ action: 'standing', confidence: 0.5 }),
    )
    process.env['STORYWORK_LLM_CACHE'] = '1'
    process.env['STORYWORK_LLM_CACHE_DIR'] = dir

    // 같은 모델 → 캐시 적중
    expect((await tagWithLlm('x.png', undefined, { modelId: 'model-a' }))?.action).toBe('standing')
    // 다른 모델 → 캐시 미적중 → (LLM 비활성이므로) null
    expect(await tagWithLlm('x.png', undefined, { modelId: 'model-b' })).toBeNull()
  })

  it('사전 action 집합이 로드되고 standing 을 포함', () => {
    const set = knownActionSet()
    expect(set.size).toBeGreaterThan(50)
    expect(set.has('standing')).toBe(true)
  })

  it('프롬프트에 파일명과 허용 action 목록이 포함', () => {
    const p = buildTagPrompt('foo_bar.png', '동물', ['standing', 'walking'])
    expect(p).toContain('foo_bar.png')
    expect(p).toContain('동물')
    expect(p).toContain('standing, walking')
  })
})
