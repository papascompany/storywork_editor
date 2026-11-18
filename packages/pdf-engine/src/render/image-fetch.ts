/**
 * render/image-fetch.ts — PDF 빌드용 이미지 로더 (M9-03 SSRF 방어)
 *
 * 이미지 URL 은 사용자가 저장한 fabricJson(레이어 src/meta.fileUrl)에서 오므로 신뢰할 수 없다.
 * 서버에서 임의 URL 을 fetch 하면 내부망·메타데이터 엔드포인트로 요청을 보낼 수 있고(SSRF),
 * 크기·시간 제한이 없으면 거대한 응답으로 함수 메모리/시간을 고갈시킬 수 있다.
 *
 * 허용:
 *   - `data:image/png|jpeg;base64,...` — 편집기에서 드롭한 사용자 이미지(FileReader dataURL)
 *   - https URL 중 origin 이 허용 목록에 있는 것 — Supabase Storage(포즈·리소스 공개 URL)
 * 그 밖의 URL 은 요청하지 않는다. 리다이렉트는 따라가지 않는다(허용 목록 우회 방지).
 */

export interface ImageFetchPolicy {
  /** 허용 origin 목록 (예: 'https://xxxx.supabase.co'). 비면 data: 이미지만 허용 */
  allowedOrigins: string[]
  /** 요청 1건 제한 시간(ms) */
  timeoutMs: number
  /** 이미지 1건 최대 바이트 */
  maxBytes: number
}

export const DEFAULT_IMAGE_TIMEOUT_MS = 10_000
/** POD 인쇄용 마스터 PNG 를 넉넉히 수용하되 메모리 고갈은 막는 상한 */
export const DEFAULT_IMAGE_MAX_BYTES = 25 * 1024 * 1024

const DATA_IMAGE_RE = /^data:image\/(png|jpeg|jpg);base64,/i

function toOrigin(raw: string | undefined): string | null {
  if (!raw) return null
  try {
    const u = new URL(raw.trim())
    return u.protocol === 'https:' || u.protocol === 'http:' ? u.origin : null
  } catch {
    return null
  }
}

/**
 * env 에서 기본 정책을 만든다 — web(publish)·workers 모두 Supabase URL env 를 이미 필수로 갖는다.
 * 추가 허용 origin 은 PDF_IMAGE_ALLOWED_ORIGINS(쉼표 구분)로.
 */
export function defaultImageFetchPolicy(
  env: Record<string, string | undefined> = process.env,
): ImageFetchPolicy {
  const candidates = [
    env['NEXT_PUBLIC_SUPABASE_URL'],
    env['SUPABASE_URL'],
    ...(env['PDF_IMAGE_ALLOWED_ORIGINS'] ?? '').split(','),
  ]
  const allowedOrigins = [
    ...new Set(candidates.map(toOrigin).filter((o): o is string => o !== null)),
  ]
  return {
    allowedOrigins,
    timeoutMs: DEFAULT_IMAGE_TIMEOUT_MS,
    maxBytes: DEFAULT_IMAGE_MAX_BYTES,
  }
}

/** 요청해도 되는 URL 인가 (네트워크 접근 없이 판정) */
export function isAllowedImageUrl(url: string, policy: ImageFetchPolicy): boolean {
  if (DATA_IMAGE_RE.test(url)) return true
  let u: URL
  try {
    u = new URL(url)
  } catch {
    return false
  }
  // userinfo 포함 URL(https://allowed@evil) 은 사람 눈을 속이는 용도뿐이라 거부
  if (u.username || u.password) return false
  if (u.protocol !== 'https:') return false
  return policy.allowedOrigins.includes(u.origin)
}

function decodeDataImage(url: string, maxBytes: number): Uint8Array | null {
  const comma = url.indexOf(',')
  const b64 = url.slice(comma + 1)
  // base64 4글자 = 3바이트 — 디코드 전에 크기 상한 확인
  if (Math.floor((b64.length * 3) / 4) > maxBytes) return null
  const bytes = Buffer.from(b64, 'base64')
  return bytes.length > 0 ? new Uint8Array(bytes) : null
}

async function readCapped(res: Response, maxBytes: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get('content-length') ?? '')
  if (Number.isFinite(declared) && declared > maxBytes) return null
  if (!res.body) return null

  const reader = res.body.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    total += value.byteLength
    if (total > maxBytes) {
      await reader.cancel()
      return null
    }
    chunks.push(value)
  }
  const out = new Uint8Array(total)
  let offset = 0
  for (const c of chunks) {
    out.set(c, offset)
    offset += c.byteLength
  }
  return out
}

/**
 * 정책을 통과한 이미지만 가져온다. 거부·실패·초과는 모두 null (호출부가 warning 처리).
 * reason 은 warning 문구용.
 */
export async function fetchImageBytes(
  url: string,
  policy: ImageFetchPolicy,
): Promise<{ bytes: Uint8Array | null; reason?: string }> {
  if (!isAllowedImageUrl(url, policy)) {
    return { bytes: null, reason: '허용되지 않은 이미지 출처' }
  }
  if (DATA_IMAGE_RE.test(url)) {
    const bytes = decodeDataImage(url, policy.maxBytes)
    return bytes ? { bytes } : { bytes: null, reason: 'data URL 이미지가 비었거나 너무 큼' }
  }
  try {
    const res = await fetch(url, {
      redirect: 'error',
      signal: AbortSignal.timeout(policy.timeoutMs),
    })
    if (!res.ok) return { bytes: null, reason: `HTTP ${res.status}` }
    const bytes = await readCapped(res, policy.maxBytes)
    return bytes ? { bytes } : { bytes: null, reason: '이미지가 너무 큼' }
  } catch (e) {
    return { bytes: null, reason: String(e) }
  }
}
