/**
 * /api/og/work — 작품/공모전 공유용 동적 OG 이미지 (M8-04)
 *
 * 쿼리 파라미터 기반(edge-safe, DB 미접근):
 *   ?title=<제목>&kind=showcase|contest
 * generateMetadata 가 DB 에서 가져온 제목을 넘기므로 이 라우트는 edge runtime 유지.
 *
 * 1200×630 OG 표준. 기존 /api/og/[slug] 의 마케팅 톤과 일관된 디자인.
 */
import { ImageResponse } from 'next/og'

export const runtime = 'edge'

const C = {
  ink: '#2b2620',
  canvas: '#fffaf2',
  inverseCanvas: '#2b2620',
  inverseInk: '#fffaf2',
  coral: '#e0633c',
  lime: '#dceeb1',
  lilac: '#c5b0f4',
  cream: '#f4ecd6',
  mint: '#c8e6cd',
} as const

const KIND = {
  showcase: { label: '갤러리', block: C.mint, accent: '작품' },
  contest: { label: '공모전', block: C.lilac, accent: '출품' },
} as const

const NOTO_KR =
  'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm203Tq4JJWq209pU0DPdWuqxJFA4GNDCBYtw.woff2'

async function loadFont(url: string): Promise<ArrayBuffer | null> {
  try {
    const res = await fetch(url, { cache: 'force-cache' })
    if (!res.ok) return null
    return res.arrayBuffer()
  } catch {
    return null
  }
}

function clampTitle(raw: string): string {
  const t = raw.trim()
  if (t.length === 0) return '스토리워크'
  return t.length > 40 ? `${t.slice(0, 39)}…` : t
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url)
  const title = clampTitle(url.searchParams.get('title') ?? '')
  const kindKey = url.searchParams.get('kind') === 'contest' ? 'contest' : 'showcase'
  const kind = KIND[kindKey]

  const font = await loadFont(NOTO_KR)

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = { width: 1200, height: 630 }
  if (font) options.fonts = [{ name: 'Noto Sans KR', data: font, weight: 400, style: 'normal' }]

  return new ImageResponse(
    <div
      style={{
        width: 1200,
        height: 630,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: C.canvas,
        fontFamily: '"Noto Sans KR", sans-serif',
      }}
    >
      {/* 상단 strip */}
      <div
        style={{
          height: 44,
          backgroundColor: C.inverseCanvas,
          display: 'flex',
          alignItems: 'center',
          paddingLeft: 40,
          paddingRight: 40,
          flexShrink: 0,
        }}
      >
        <span style={{ color: C.inverseInk, fontSize: 14, letterSpacing: '0.05em' }}>
          스토리워크 · AI 스토리보드 편집기 · 1,270+ 포즈 · POD 출판
        </span>
      </div>

      {/* 바디 */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'row' }}>
        {/* 좌측 60% */}
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '52px 44px 40px 56px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {/* 배지 */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'flex-start',
                backgroundColor: C.coral,
                borderRadius: 50,
                paddingTop: 7,
                paddingBottom: 7,
                paddingLeft: 18,
                paddingRight: 18,
              }}
            >
              <span style={{ fontSize: 15, color: C.inverseInk, letterSpacing: '0.06em' }}>
                스토리워크 {kind.label}
              </span>
            </div>

            {/* 제목 */}
            <div
              style={{
                fontSize: 60,
                fontWeight: 400,
                color: C.ink,
                lineHeight: 1.12,
                letterSpacing: '-0.02em',
              }}
            >
              {title}
            </div>
          </div>

          {/* 하단 */}
          <div style={{ fontSize: 18, color: C.ink, opacity: 0.45 }}>
            storywork-editor-web.vercel.app
          </div>
        </div>

        {/* 우측 40% 컬러블록 */}
        <div
          style={{
            flex: '0 0 40%',
            backgroundColor: kind.block,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 48,
          }}
        >
          <div
            style={{
              fontSize: 96,
              fontWeight: 400,
              color: C.ink,
              opacity: 0.8,
              lineHeight: 1.0,
              textAlign: 'center',
            }}
          >
            {kind.accent}
          </div>
        </div>
      </div>

      {/* 하단 border */}
      <div style={{ height: 4, backgroundColor: C.coral, flexShrink: 0 }} />
    </div>,
    options,
  )
}
