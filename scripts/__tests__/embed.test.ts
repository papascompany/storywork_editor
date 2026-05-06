/**
 * M2-04 — embed.ts 단위 테스트
 * mock provider (env 없음) 기준 동작 검증
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'

import {
  detectProvider,
  l2Normalize,
  embedText,
  embedImage,
  combine,
  toVectorLiteral,
} from '../lib/embed.js'

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function saveEnv(keys: string[]): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {}
  for (const k of keys) saved[k] = process.env[k]
  return saved
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const [k, v] of Object.entries(saved)) {
    if (v === undefined) {
      delete process.env[k]
    } else {
      process.env[k] = v
    }
  }
}

// ─────────────────────────────────────────────
// 1. detectProvider
// ─────────────────────────────────────────────

describe('detectProvider', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = saveEnv(['VOYAGE_API_KEY', 'OPENAI_API_KEY'])
    delete process.env['VOYAGE_API_KEY']
    delete process.env['OPENAI_API_KEY']
  })

  afterEach(() => restoreEnv(saved))

  it('키 없으면 mock', () => {
    expect(detectProvider()).toBe('mock')
  })

  it('OPENAI_API_KEY 있으면 openai', () => {
    process.env['OPENAI_API_KEY'] = 'sk-test'
    expect(detectProvider()).toBe('openai')
  })

  it('VOYAGE_API_KEY 가 우선', () => {
    process.env['VOYAGE_API_KEY'] = 'voyage-test'
    process.env['OPENAI_API_KEY'] = 'sk-test'
    expect(detectProvider()).toBe('voyage')
  })
})

// ─────────────────────────────────────────────
// 2. l2Normalize
// ─────────────────────────────────────────────

describe('l2Normalize', () => {
  it('정규화 후 norm ≈ 1', () => {
    const v = [3, 4]
    const n = l2Normalize(v)
    const norm = Math.sqrt(n.reduce((s, x) => s + x * x, 0))
    expect(norm).toBeCloseTo(1, 10)
  })

  it('이미 단위벡터면 그대로', () => {
    const v = [1, 0, 0]
    expect(l2Normalize(v)).toEqual([1, 0, 0])
  })

  it('영벡터는 그대로 0', () => {
    const v = [0, 0, 0]
    const n = l2Normalize(v)
    expect(n.every((x) => x === 0)).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 3. mock embedText
// ─────────────────────────────────────────────

describe('embedText (mock)', () => {
  it('1024 차원 반환', async () => {
    const v = await embedText('서있는 여자 정면', 'mock')
    expect(v).toHaveLength(1024)
  })

  it('결정론적 — 같은 입력 → 같은 출력', async () => {
    const a = await embedText('서있는 여자 정면', 'mock')
    const b = await embedText('서있는 여자 정면', 'mock')
    expect(a).toEqual(b)
  })

  it('다른 입력 → 다른 출력', async () => {
    const a = await embedText('서있는 여자 정면', 'mock')
    const b = await embedText('앉아있는 남자 측면', 'mock')
    expect(a).not.toEqual(b)
  })

  it('L2 norm ≈ 1', async () => {
    const v = await embedText('점프하는 아이', 'mock')
    const norm = Math.sqrt(v.reduce((s, x) => s + x * x, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it('모든 값이 number', async () => {
    const v = await embedText('standing female front', 'mock')
    expect(v.every((x) => typeof x === 'number' && !isNaN(x))).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 4. mock embedImage
// ─────────────────────────────────────────────

describe('embedImage (mock)', () => {
  const sampleBuf = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0x01, 0x02, 0x03])

  it('1024 차원 반환', async () => {
    const v = await embedImage(sampleBuf, 'mock')
    expect(v).toHaveLength(1024)
  })

  it('결정론적', async () => {
    const a = await embedImage(sampleBuf, 'mock')
    const b = await embedImage(sampleBuf, 'mock')
    expect(a).toEqual(b)
  })

  it('다른 버퍼 → 다른 출력', async () => {
    const buf2 = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
    const a = await embedImage(sampleBuf, 'mock')
    const b = await embedImage(buf2, 'mock')
    expect(a).not.toEqual(b)
  })

  it('텍스트 임베딩과 다름 (별도 해시 공간)', async () => {
    const t = await embedText('png image data', 'mock')
    const i = await embedImage(sampleBuf, 'mock')
    expect(t).not.toEqual(i)
  })
})

// ─────────────────────────────────────────────
// 5. combine
// ─────────────────────────────────────────────

describe('combine', () => {
  it('weight=0 → a 그대로 반환 (재정규화 후)', async () => {
    const a = await embedText('text', 'mock')
    const b = await embedText('image', 'mock')
    const c = combine(a, b, 0)
    // weight=0 → b의 기여 없음 → a 와 방향 동일
    const dotAC = a.reduce((s, v, i) => s + v * (c[i] ?? 0), 0)
    expect(dotAC).toBeCloseTo(1, 5)
  })

  it('weight=0.5 → norm ≈ 1', async () => {
    const a = await embedText('standing', 'mock')
    const b = await embedImage(Buffer.from([1, 2, 3]), 'mock')
    const c = combine(a, b, 0.5)
    const norm = Math.sqrt(c.reduce((s, x) => s + x * x, 0))
    expect(norm).toBeCloseTo(1, 5)
  })

  it('차원 불일치 시 throw', () => {
    expect(() => combine([1, 2], [1, 2, 3])).toThrow('벡터 차원 불일치')
  })

  it('1024 차원 유지', async () => {
    const a = await embedText('a', 'mock')
    const b = await embedImage(Buffer.from('b'), 'mock')
    const c = combine(a, b)
    expect(c).toHaveLength(1024)
  })
})

// ─────────────────────────────────────────────
// 6. toVectorLiteral
// ─────────────────────────────────────────────

describe('toVectorLiteral', () => {
  it('[0.1, 0.2, 0.3] → "[0.1,0.2,0.3]"', () => {
    expect(toVectorLiteral([0.1, 0.2, 0.3])).toBe('[0.1,0.2,0.3]')
  })

  it('1024 dim 벡터를 올바른 리터럴로', async () => {
    const v = await embedText('test', 'mock')
    const lit = toVectorLiteral(v)
    expect(lit).toMatch(/^\[.+\]$/)
    expect(lit.split(',')).toHaveLength(1024)
  })
})

// ─────────────────────────────────────────────
// 7. env 없으면 mock fallback (DoD-8)
// ─────────────────────────────────────────────

describe('graceful fallback without env', () => {
  let saved: Record<string, string | undefined>

  beforeEach(() => {
    saved = saveEnv(['VOYAGE_API_KEY', 'OPENAI_API_KEY'])
    delete process.env['VOYAGE_API_KEY']
    delete process.env['OPENAI_API_KEY']
  })

  afterEach(() => restoreEnv(saved))

  it('env 없이 embedText 호출해도 throw 없음', async () => {
    await expect(embedText('서있는 여자', 'mock')).resolves.toHaveLength(1024)
  })

  it('detectProvider() → mock', () => {
    expect(detectProvider()).toBe('mock')
  })
})
