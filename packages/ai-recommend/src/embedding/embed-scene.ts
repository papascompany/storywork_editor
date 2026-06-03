/**
 * embed-scene.ts — 장면 메타 → 임베딩 벡터 변환 (M4-02)
 *
 * 장면의 감정/카메라/분위기/장소 등을 텍스트로 변환 후 임베딩 생성.
 * voyage/openai 키 없으면 mock(deterministic hash) fallback.
 *
 * M2-04 의 embed.ts 패턴 재사용.
 */

import crypto from 'node:crypto'

import type { SceneMeta } from '@storywork/ai-script'

// ─────────────────────────────────────────────
// provider 감지
// ─────────────────────────────────────────────

type EmbeddingProvider = 'voyage' | 'openai' | 'mock'

function detectProvider(): EmbeddingProvider {
  if (process.env['VOYAGE_API_KEY']) return 'voyage'
  if (process.env['OPENAI_API_KEY']) return 'openai'
  return 'mock'
}

// ─────────────────────────────────────────────
// 장면 메타 → 텍스트 변환
// ─────────────────────────────────────────────

/**
 * SceneMeta + 추가 컨텍스트를 검색 쿼리 텍스트로 변환.
 *
 * 임베딩 공간에서 포즈 태그와 유사도를 높이기 위해
 * action/emotion 중심 표현으로 구성한다.
 */
export function sceneMetaToText(meta: SceneMeta, additionalKeywords?: string[]): string {
  const parts: string[] = []

  // 감정 (가장 강한 시그널)
  if (meta.emotion) parts.push(meta.emotion)

  // 분위기
  if (meta.mood) parts.push(meta.mood)

  // 카메라 앵글
  if (meta.cameraAngle) {
    const angleMap: Record<string, string> = {
      closeup: 'closeup face expression',
      wide: 'wide shot full body',
      'bird-eye': 'top down view',
      'low-angle': 'low angle upward',
      medium: 'medium shot',
    }
    parts.push(angleMap[meta.cameraAngle] ?? meta.cameraAngle)
  }

  // 장소
  if (meta.location) parts.push(meta.location)

  // 시간대
  if (meta.timeOfDay) parts.push(meta.timeOfDay)

  // 페이싱 (동작 강도 힌트)
  if (meta.pacing === 'fast') parts.push('dynamic action movement')
  if (meta.pacing === 'slow') parts.push('still quiet pose')

  // 소품 힌트
  if (meta.props && meta.props.length > 0) {
    parts.push(...meta.props.slice(0, 3))
  }

  // 추가 키워드
  if (additionalKeywords && additionalKeywords.length > 0) {
    parts.push(...additionalKeywords)
  }

  return parts.join(' ').trim() || 'standing neutral pose'
}

// ─────────────────────────────────────────────
// mock 임베딩 (deterministic hash 기반)
// ─────────────────────────────────────────────

function l2Normalize(vec: number[]): number[] {
  const norm = Math.sqrt(vec.reduce((s, v) => s + v * v, 0))
  if (norm === 0) return vec.map(() => 0)
  return vec.map((v) => v / norm)
}

function mockEmbed(text: string, dims = 1024): number[] {
  const raw = crypto.createHash('sha256').update(text, 'utf8').digest()
  const vec: number[] = []
  let round = 0
  while (vec.length < dims) {
    const h = crypto
      .createHash('sha256')
      .update(raw)
      .update(Buffer.from([round % 256]))
      .digest()
    for (const byte of h) {
      if (vec.length < dims) vec.push((byte - 128) / 128)
    }
    round++
  }
  return l2Normalize(vec)
}

// ─────────────────────────────────────────────
// HTTP POST (voyage / openai)
// ─────────────────────────────────────────────

async function fetchEmbedding(text: string, provider: 'voyage' | 'openai'): Promise<number[]> {
  const https = await import('node:https')

  interface ApiResponse {
    data: Array<{ embedding: number[] }>
  }

  function httpPost(
    hostname: string,
    path: string,
    headers: Record<string, string>,
    body: string,
  ): Promise<ApiResponse> {
    return new Promise((resolve, reject) => {
      const bodyBuf = Buffer.from(body, 'utf8')
      const req = https.default.request(
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
            try {
              resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')) as ApiResponse)
            } catch (e) {
              reject(e)
            }
          })
        },
      )
      req.on('error', reject)
      req.write(bodyBuf)
      req.end()
    })
  }

  if (provider === 'voyage') {
    const key = process.env['VOYAGE_API_KEY'] ?? ''
    const resp = await httpPost(
      'api.voyageai.com',
      '/v1/embeddings',
      { Authorization: `Bearer ${key}` },
      JSON.stringify({ model: 'voyage-3', input: [text] }),
    )
    const raw = resp.data[0]?.embedding
    if (!raw?.length) throw new Error('Voyage 응답 비어있음')
    return l2Normalize(raw)
  }

  // openai
  const key = process.env['OPENAI_API_KEY'] ?? ''
  const resp = await httpPost(
    'api.openai.com',
    '/v1/embeddings',
    { Authorization: `Bearer ${key}` },
    JSON.stringify({ model: 'text-embedding-3-small', input: text, dimensions: 1024 }),
  )
  const raw = resp.data[0]?.embedding
  if (!raw?.length) throw new Error('OpenAI 응답 비어있음')
  return l2Normalize(raw)
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * SceneMeta 를 임베딩 벡터로 변환한다.
 * pgvector 리터럴 문자열("[0.1,0.2,...]") 반환.
 *
 * @param meta               장면 메타
 * @param additionalKeywords 추가 키워드 (포즈 action 힌트 등)
 * @returns                  pgvector 리터럴 문자열
 */
export async function embedSceneMeta(
  meta: SceneMeta,
  additionalKeywords?: string[],
): Promise<string> {
  const text = sceneMetaToText(meta, additionalKeywords)
  const provider = detectProvider()

  let vec: number[]
  if (provider === 'mock') {
    vec = mockEmbed(text)
  } else {
    try {
      vec = await fetchEmbedding(text, provider)
    } catch {
      // graceful fallback to mock
      vec = mockEmbed(text)
    }
  }

  return `[${vec.join(',')}]`
}

/** 동기 mock 임베딩 (테스트용, 결정론 보장) */
export function embedSceneMetaSync(meta: SceneMeta, additionalKeywords?: string[]): string {
  const text = sceneMetaToText(meta, additionalKeywords)
  const vec = mockEmbed(text)
  return `[${vec.join(',')}]`
}
