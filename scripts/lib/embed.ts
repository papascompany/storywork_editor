/**
 * scripts/lib/embed.ts — 임베딩 생성 모듈 (M2-04)
 *
 * 지원 provider:
 *   - voyage  : VOYAGE_API_KEY 가 있으면 voyage-3 / voyage-multimodal-3 사용
 *   - openai  : OPENAI_API_KEY 가 있으면 text-embedding-3-small (dim=1024) 사용
 *   - mock    : API 키 없을 때 sha256 기반 결정론적 1024-dim vector (의미 X, 검색 가능)
 *
 * provider 선택 우선순위: voyage > openai > mock
 */

import crypto from 'node:crypto'
import https from 'node:https'

// ─────────────────────────────────────────────
// 공개 타입
// ─────────────────────────────────────────────

export type EmbeddingProvider = 'voyage' | 'openai' | 'mock'

/** 1024 차원, L2 정규화된 벡터 */
export type Embedding1024 = number[]

// ─────────────────────────────────────────────
// Provider 자동 감지
// ─────────────────────────────────────────────

export function detectProvider(): EmbeddingProvider {
  if (process.env['VOYAGE_API_KEY']) return 'voyage'
  if (process.env['OPENAI_API_KEY']) return 'openai'
  return 'mock'
}

// ─────────────────────────────────────────────
// 유틸: L2 정규화
// ─────────────────────────────────────────────

export function l2Normalize(vec: number[]): Embedding1024 {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return vec.map(() => 0)
  return vec.map((v) => v / norm)
}

// ─────────────────────────────────────────────
// Mock provider — sha256 → 1024 floats
// ─────────────────────────────────────────────

function mockEmbedText(text: string): Embedding1024 {
  // sha256 해시를 시드로 사용해 결정론적 1024-dim 벡터 생성
  const raw = crypto.createHash('sha256').update(text, 'utf8').digest()
  const vec: number[] = []
  // 32바이트 × 32반복 = 1024 floats (각 바이트를 -1..1 로 변환)
  for (let round = 0; round < 32; round++) {
    const seededHash = crypto
      .createHash('sha256')
      .update(raw)
      .update(Buffer.from([round]))
      .digest()
    for (const byte of seededHash) {
      vec.push((byte - 128) / 128)
    }
  }
  return l2Normalize(vec.slice(0, 1024))
}

function mockEmbedImage(buf: Buffer): Embedding1024 {
  // 이미지 버퍼의 sha256 을 텍스트로 사용
  const hash = crypto.createHash('sha256').update(buf).digest('hex')
  return mockEmbedText(`__img__${hash}`)
}

// ─────────────────────────────────────────────
// HTTP 헬퍼 (외부 의존성 없이 node:https 사용)
// ─────────────────────────────────────────────

interface HttpPostOptions {
  hostname: string
  path: string
  headers: Record<string, string>
  body: string
}

function httpPost(opts: HttpPostOptions): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(opts.body, 'utf8')
    const req = https.request(
      {
        hostname: opts.hostname,
        path: opts.path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyBuf.length,
          ...opts.headers,
        },
      },
      (res) => {
        const chunks: Buffer[] = []
        res.on('data', (c: Buffer) => chunks.push(c))
        res.on('end', () => {
          const text = Buffer.concat(chunks).toString('utf8')
          try {
            resolve(JSON.parse(text))
          } catch {
            reject(new Error(`JSON 파싱 실패: ${text.slice(0, 200)}`))
          }
        })
      },
    )
    req.on('error', reject)
    req.write(bodyBuf)
    req.end()
  })
}

// ─────────────────────────────────────────────
// Voyage provider
// ─────────────────────────────────────────────

interface VoyageEmbedResponse {
  data: Array<{ embedding: number[] }>
}

async function voyageEmbedText(text: string, apiKey: string): Promise<Embedding1024> {
  const resp = (await httpPost({
    hostname: 'api.voyageai.com',
    path: '/v1/embeddings',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: 'voyage-3', input: [text] }),
  })) as VoyageEmbedResponse

  const raw = resp.data[0]?.embedding
  if (!raw || raw.length === 0) throw new Error('Voyage text embedding 응답 비어있음')

  // voyage-3 는 1024dim 반환
  return l2Normalize(raw)
}

async function voyageEmbedImage(buf: Buffer, apiKey: string): Promise<Embedding1024> {
  // voyage-multimodal-3 는 base64 이미지 입력 지원
  const b64 = buf.toString('base64')
  const resp = (await httpPost({
    hostname: 'api.voyageai.com',
    path: '/v1/embeddings',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'voyage-multimodal-3',
      input: [{ content: [{ type: 'image_base64', data: b64 }] }],
    }),
  })) as VoyageEmbedResponse

  const raw = resp.data[0]?.embedding
  if (!raw || raw.length === 0) throw new Error('Voyage image embedding 응답 비어있음')
  return l2Normalize(raw)
}

// ─────────────────────────────────────────────
// OpenAI provider
// ─────────────────────────────────────────────

interface OpenAIEmbedResponse {
  data: Array<{ embedding: number[] }>
}

async function openaiEmbedText(text: string, apiKey: string): Promise<Embedding1024> {
  const resp = (await httpPost({
    hostname: 'api.openai.com',
    path: '/v1/embeddings',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'text-embedding-3-small',
      input: text,
      dimensions: 1024,
    }),
  })) as OpenAIEmbedResponse

  const raw = resp.data[0]?.embedding
  if (!raw || raw.length === 0) throw new Error('OpenAI embedding 응답 비어있음')
  return l2Normalize(raw)
}

// OpenAI 는 이미지 임베딩 전용 엔드포인트가 없으므로 이미지 파일명/해시를 텍스트로 대체
async function openaiEmbedImage(buf: Buffer, apiKey: string): Promise<Embedding1024> {
  const hash = crypto.createHash('sha256').update(buf).digest('hex').slice(0, 32)
  return openaiEmbedText(`image_visual_${hash}`, apiKey)
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * 텍스트 임베딩 생성
 * @param text  태그·액션·뷰·bodyType 합성 문자열 (한글+영문 혼용 OK)
 * @param provider  명시적 provider (생략 시 자동 감지)
 */
export async function embedText(
  text: string,
  provider?: EmbeddingProvider,
): Promise<Embedding1024> {
  const p = provider ?? detectProvider()
  switch (p) {
    case 'voyage': {
      const key = process.env['VOYAGE_API_KEY']
      if (!key) throw new Error('VOYAGE_API_KEY 누락')
      return voyageEmbedText(text, key)
    }
    case 'openai': {
      const key = process.env['OPENAI_API_KEY']
      if (!key) throw new Error('OPENAI_API_KEY 누락')
      return openaiEmbedText(text, key)
    }
    default:
      return Promise.resolve(mockEmbedText(text))
  }
}

/**
 * 이미지 임베딩 생성
 * @param buf  PNG/WebP 등 이미지 Buffer (256px 썸네일 권장)
 * @param provider  명시적 provider (생략 시 자동 감지)
 */
export async function embedImage(
  buf: Buffer,
  provider?: EmbeddingProvider,
): Promise<Embedding1024> {
  const p = provider ?? detectProvider()
  switch (p) {
    case 'voyage': {
      const key = process.env['VOYAGE_API_KEY']
      if (!key) throw new Error('VOYAGE_API_KEY 누락')
      return voyageEmbedImage(buf, key)
    }
    case 'openai': {
      const key = process.env['OPENAI_API_KEY']
      if (!key) throw new Error('OPENAI_API_KEY 누락')
      return openaiEmbedImage(buf, key)
    }
    default:
      return Promise.resolve(mockEmbedImage(buf))
  }
}

/**
 * 두 임베딩의 가중 결합 후 L2 재정규화
 * @param a      텍스트 임베딩 (weight=1-w)
 * @param b      시각 임베딩 (weight=w)
 * @param weight  b 의 가중치 (0..1, 기본 0.5)
 */
export function combine(a: Embedding1024, b: Embedding1024, weight = 0.5): Embedding1024 {
  if (a.length !== b.length) throw new Error(`벡터 차원 불일치: ${a.length} vs ${b.length}`)
  const wA = 1 - weight
  const wB = weight
  const combined = a.map((v, i) => wA * v + wB * (b[i] ?? 0))
  return l2Normalize(combined)
}

/**
 * 벡터를 pgvector 리터럴 문자열로 변환
 * ex) "[0.1, -0.2, ...]"
 */
export function toVectorLiteral(vec: Embedding1024): string {
  return `[${vec.join(',')}]`
}
