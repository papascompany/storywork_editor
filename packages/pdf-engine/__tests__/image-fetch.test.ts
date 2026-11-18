/**
 * __tests__/image-fetch.test.ts — PDF 이미지 로더 SSRF 방어 (M9-03)
 */
import { afterEach, describe, expect, it, vi } from 'vitest'

import { buildPdf } from '../src/build.js'
import {
  defaultImageFetchPolicy,
  fetchImageBytes,
  isAllowedImageUrl,
} from '../src/render/image-fetch.js'
import type { ImageFetchPolicy } from '../src/render/image-fetch.js'
import type { PdfBuildInput } from '../src/types.js'

const STORAGE = 'https://proj.supabase.co'
const POLICY: ImageFetchPolicy = {
  allowedOrigins: [STORAGE],
  timeoutMs: 1000,
  maxBytes: 1024,
}
// 1x1 투명 PNG
const PNG_B64 =
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
const PNG_DATA_URL = `data:image/png;base64,${PNG_B64}`

afterEach(() => {
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('isAllowedImageUrl', () => {
  it.each([
    [`${STORAGE}/storage/v1/object/public/poses/a.png`, true],
    [PNG_DATA_URL, true],
    ['data:image/jpeg;base64,AAAA', true],
    ['http://169.254.169.254/latest/meta-data/', false],
    ['http://localhost:3000/api/cron/x', false],
    ['https://127.0.0.1/a.png', false],
    ['https://evil.example.com/a.png', false],
    [`http://proj.supabase.co/a.png`, false], // https 만
    [`https://user@proj.supabase.co/a.png`, false], // userinfo 거부
    ['https://proj.supabase.co.evil.com/a.png', false], // 접미사 속임
    ['data:image/svg+xml;base64,PHN2Zz4=', false], // SVG 는 PDF 임베드 대상 아님
    ['file:///etc/passwd', false],
    ['/poses/a.png', false],
    ['', false],
  ])('%s → %s', (url, expected) => {
    expect(isAllowedImageUrl(url, POLICY)).toBe(expected)
  })
})

describe('defaultImageFetchPolicy', () => {
  it('Supabase URL env + 추가 origin env 에서 origin 만 뽑는다', () => {
    const p = defaultImageFetchPolicy({
      NEXT_PUBLIC_SUPABASE_URL: 'https://proj.supabase.co/',
      SUPABASE_URL: 'https://proj.supabase.co',
      PDF_IMAGE_ALLOWED_ORIGINS: ' https://cdn.storywork.app/x , not a url',
    })
    expect(p.allowedOrigins).toEqual(['https://proj.supabase.co', 'https://cdn.storywork.app'])
  })

  it('env 가 없으면 원격 출처는 하나도 허용하지 않는다(data: 이미지만)', () => {
    expect(defaultImageFetchPolicy({}).allowedOrigins).toEqual([])
  })
})

describe('fetchImageBytes', () => {
  it('허용되지 않은 URL 은 네트워크 요청 자체를 하지 않는다', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const r = await fetchImageBytes('http://169.254.169.254/latest/meta-data/', POLICY)
    expect(r.bytes).toBeNull()
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('data: PNG 는 fetch 없이 디코드', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const r = await fetchImageBytes(PNG_DATA_URL, POLICY)
    expect(r.bytes?.[0]).toBe(0x89)
    expect(fetchSpy).not.toHaveBeenCalled()
  })

  it('data: 이미지가 상한을 넘으면 거부', async () => {
    const big = `data:image/png;base64,${'A'.repeat(4096)}`
    expect((await fetchImageBytes(big, POLICY)).bytes).toBeNull()
  })

  it('리다이렉트를 따라가지 않고 시간 제한 signal 을 건다', async () => {
    const fetchSpy = vi.fn(async () => new Response(new Uint8Array([1, 2, 3])))
    vi.stubGlobal('fetch', fetchSpy)
    await fetchImageBytes(`${STORAGE}/a.png`, POLICY)
    const init = fetchSpy.mock.calls[0]?.[1] as RequestInit
    expect(init.redirect).toBe('error')
    expect(init.signal).toBeInstanceOf(AbortSignal)
  })

  it('content-length 가 상한을 넘으면 본문을 읽지 않고 거부', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response('x', { headers: { 'content-length': '999999' } })),
    )
    expect((await fetchImageBytes(`${STORAGE}/a.png`, POLICY)).bytes).toBeNull()
  })

  it('content-length 없이 스트림이 상한을 넘어도 중단', async () => {
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        controller.enqueue(new Uint8Array(512)) // 끝없이 흘러나오는 응답
      },
    })
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => new Response(stream)),
    )
    expect((await fetchImageBytes(`${STORAGE}/a.png`, POLICY)).bytes).toBeNull()
  })
})

describe('buildPdf — fabricJson 의 내부 주소 이미지', () => {
  it('요청하지 않고 warning 만 남긴다 · 허용 data 이미지는 임베드', async () => {
    const fetchSpy = vi.fn()
    vi.stubGlobal('fetch', fetchSpy)
    const layer = (id: string, fileUrl: string) => ({
      id,
      kind: 'pose',
      data: { meta: { fileUrl } },
      fabric: {
        left: 10,
        top: 10,
        width: 40,
        height: 40,
        scaleX: 1,
        scaleY: 1,
        angle: 0,
        opacity: 1,
      },
    })
    const input: PdfBuildInput = {
      projectId: 'p',
      title: 't',
      format: { widthMm: 130, heightMm: 200, dpi: 300, bleedMm: 3, safeMm: 5 },
      pages: [
        {
          pageIndex: 0,
          fabricJson: {
            v: 1,
            format: { id: 'b5', widthMm: 130, heightMm: 200, dpi: 300 },
            layers: [
              layer('ssrf', 'http://169.254.169.254/latest/meta-data/iam/'),
              layer('ok', PNG_DATA_URL),
            ],
          },
        },
      ],
    }
    const result = await buildPdf(input, { embedFonts: false, imagePolicy: POLICY })
    expect(fetchSpy).not.toHaveBeenCalled()
    const ssrfWarnings = result.warnings.filter((w) => w.includes('169.254.169.254'))
    expect(ssrfWarnings).toHaveLength(1) // prefetch 실패 후 페이지 렌더에서 재요청·중복 경고 없음
    expect(ssrfWarnings[0]).toContain('허용되지 않은 이미지 출처')
    expect(result.warnings.some((w) => w.includes('data:image'))).toBe(false)
  })
})
