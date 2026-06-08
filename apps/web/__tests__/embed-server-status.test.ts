/**
 * embed-server httpPost — HTTP status 처리 검증
 *
 * 임베딩 제공자(Voyage/OpenAI)가 4xx/5xx 를 반환할 때
 * "빈 응답" 으로 둔갑하지 않고 status 를 포함한 명확한 에러로 reject 되는지 확인.
 */
import { EventEmitter } from 'node:events'

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'

// node:https.request mock
const { mockRequest } = vi.hoisted(() => ({ mockRequest: vi.fn() }))
vi.mock('node:https', () => ({
  default: { request: mockRequest },
  request: mockRequest,
}))

import { embedSearchQuery } from '../app/api/_lib/embed-server'

/** statusCode + body 를 돌려주는 가짜 https.request 구현 */
function stubResponse(statusCode: number, body: string) {
  mockRequest.mockImplementation((_opts: unknown, cb: (res: unknown) => void) => {
    const res = new EventEmitter() as EventEmitter & { statusCode: number }
    res.statusCode = statusCode
    const req = new EventEmitter() as EventEmitter & {
      write: () => void
      end: () => void
    }
    req.write = () => {}
    req.end = () => {
      cb(res) // httpPost 가 res.on('data'/'end') 핸들러를 등록
      res.emit('data', Buffer.from(body, 'utf8'))
      res.emit('end')
    }
    return req
  })
}

describe('embed-server — HTTP status 처리', () => {
  const ORIG = process.env['VOYAGE_API_KEY']

  beforeEach(() => {
    vi.clearAllMocks()
    process.env['VOYAGE_API_KEY'] = 'test-voyage-key' // voyage provider 강제
  })

  afterEach(() => {
    if (ORIG === undefined) delete process.env['VOYAGE_API_KEY']
    else process.env['VOYAGE_API_KEY'] = ORIG
  })

  it('401 응답 → status 를 포함한 에러로 reject (빈 응답으로 둔갑 안 함)', async () => {
    stubResponse(401, JSON.stringify({ error: 'invalid api key' }))
    await expect(embedSearchQuery('서있는 여자')).rejects.toThrow(/401/)
  })

  it('500 응답 → status 포함 에러', async () => {
    stubResponse(500, 'upstream error')
    await expect(embedSearchQuery('테스트')).rejects.toThrow(/500/)
  })

  it('200 + 정상 임베딩 → pgvector 리터럴 반환', async () => {
    stubResponse(200, JSON.stringify({ data: [{ embedding: [0.1, 0.2, 0.3, 0.4] }] }))
    const vec = await embedSearchQuery('정상')
    expect(typeof vec).toBe('string')
    expect(vec.startsWith('[')).toBe(true)
  })
})
