/**
 * apps/web/app/api/_lib/embed-server.ts
 *
 * 서버 사이드 임베딩 생성 (Route Handler 전용).
 * scripts/lib/embed.ts 와 동일 로직을 웹 앱 내부에서 재구현.
 * 외부 패키지 의존 없이 node:crypto + node:https 사용.
 */

import crypto from 'node:crypto'
import https from 'node:https'

// ─────────────────────────────────────────────
// provider 선택
// ─────────────────────────────────────────────

type EmbeddingProvider = 'voyage' | 'openai' | 'mock'

function detectProvider(): EmbeddingProvider {
  if (process.env['VOYAGE_API_KEY']) return 'voyage'
  if (process.env['OPENAI_API_KEY']) return 'openai'
  return 'mock'
}

// ─────────────────────────────────────────────
// 유틸
// ─────────────────────────────────────────────

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return vec.map(() => 0)
  return vec.map((v) => v / norm)
}

function mockEmbedText(text: string): number[] {
  const raw = crypto.createHash('sha256').update(text, 'utf8').digest()
  const vec: number[] = []
  for (let round = 0; round < 32; round++) {
    const h = crypto
      .createHash('sha256')
      .update(raw)
      .update(Buffer.from([round]))
      .digest()
    for (const byte of h) vec.push((byte - 128) / 128)
  }
  return l2Normalize(vec.slice(0, 1024))
}

function toVectorLiteral(vec: number[]): string {
  return `[${vec.join(',')}]`
}

// ─────────────────────────────────────────────
// HTTP POST 헬퍼
// ─────────────────────────────────────────────

interface VoyageResponse {
  data: Array<{ embedding: number[] }>
}

interface OpenAIResponse {
  data: Array<{ embedding: number[] }>
}

function httpPost(
  hostname: string,
  path: string,
  headers: Record<string, string>,
  body: string,
): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const bodyBuf = Buffer.from(body, 'utf8')
    const req = https.request(
      {
        hostname,
        path,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': bodyBuf.length,
          ...headers,
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
// 검색 쿼리 임베딩 (텍스트 only)
// ─────────────────────────────────────────────

async function voyageText(text: string, key: string): Promise<number[]> {
  const resp = (await httpPost(
    'api.voyageai.com',
    '/v1/embeddings',
    { Authorization: `Bearer ${key}` },
    JSON.stringify({ model: 'voyage-3', input: [text] }),
  )) as VoyageResponse
  const raw = resp.data[0]?.embedding
  if (!raw?.length) throw new Error('Voyage 응답 비어있음')
  return l2Normalize(raw)
}

async function openaiText(text: string, key: string): Promise<number[]> {
  const resp = (await httpPost(
    'api.openai.com',
    '/v1/embeddings',
    { Authorization: `Bearer ${key}` },
    JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 1024 }),
  )) as OpenAIResponse
  const raw = resp.data[0]?.embedding
  if (!raw?.length) throw new Error('OpenAI 응답 비어있음')
  return l2Normalize(raw)
}

/**
 * 검색 쿼리를 pgvector 리터럴 문자열로 변환.
 * provider 가 없으면 mock fallback (의미 없는 벡터, 개발용).
 */
export async function embedSearchQuery(query: string): Promise<string> {
  const provider = detectProvider()
  let vec: number[]

  switch (provider) {
    case 'voyage': {
      const key = process.env['VOYAGE_API_KEY'] ?? ''
      vec = await voyageText(query, key)
      break
    }
    case 'openai': {
      const key = process.env['OPENAI_API_KEY'] ?? ''
      vec = await openaiText(query, key)
      break
    }
    default:
      vec = mockEmbedText(query)
  }

  return toVectorLiteral(vec)
}
