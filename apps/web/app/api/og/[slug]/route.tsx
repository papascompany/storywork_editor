/**
 * /api/og/[slug] — OG 이미지 동적 생성
 *
 * Edge runtime, next/og ImageResponse 사용.
 * 1200×630 OG 표준 사이즈.
 *
 * 디자인:
 *  - 상단: 검정 marquee strip ("AI 스토리보드 편집기 · 1,270+ 포즈 · POD 출판")
 *  - 좌측 60%: 헤드라인 + sub + pill 배지
 *  - 우측 40%: 페이지별 파스텔 컬러블록
 *  - 하단: URL
 *
 * 색상 매핑 (DESIGN.md 토큰):
 *  landing   → block-lime   #dceeb1
 *  intro     → block-lilac  #c5b0f4
 *  features  → block-cream  #f4ecd6
 *  derbyman  → block-coral  #f3c9b6
 */

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

/* ── 색상 토큰 (DESIGN.md) ────────────────────────────────────────────── */
const C = {
  ink: '#000000',
  canvas: '#ffffff',
  inverseCanvas: '#000000',
  inverseInk: '#ffffff',
  surfaceSoft: '#f7f7f5',
  hairline: '#e6e6e6',
  lime: '#dceeb1',
  lilac: '#c5b0f4',
  cream: '#f4ecd6',
  coral: '#f3c9b6',
  mint: '#c8e6cd',
  navy: '#1f1d3d',
} as const

/* ── OG 템플릿 정의 ──────────────────────────────────────────────────── */
interface OgTemplate {
  headline: string
  sub: string
  colorBlock: string
  /** 컬러블록 위 텍스트 색 */
  blockTextColor: string
  badge: string
  /** 우측 컬러블록 안의 장식 텍스트 */
  blockAccent: string
}

const TEMPLATES: Record<string, OgTemplate> = {
  landing: {
    headline: '대본만 쓰세요.\nAI가 페이지를\n그립니다.',
    sub: '1,270+ 포즈 라이브러리 + AI 자동 배치 + POD 인쇄까지.',
    colorBlock: C.lime,
    blockTextColor: C.ink,
    badge: '스토리워크',
    blockAccent: '✦ AI\n자동\n배치',
  },
  intro: {
    headline: '스토리는 머릿속에 있어요.\n화면에 옮기는 게\n어려울 뿐.',
    sub: '그림 실력 없어도 됩니다. 대본만 쓰세요.',
    colorBlock: C.lilac,
    blockTextColor: C.ink,
    badge: '서비스 소개',
    blockAccent: '1,270+\n포즈\n라이브러리',
  },
  features: {
    headline: '콘티에 필요한 것만,\n전부.',
    sub: 'AI 자동 배치 · 포즈 라이브러리 · PDF 출판 · 모바일 편집기.',
    colorBlock: C.cream,
    blockTextColor: C.ink,
    badge: '기능 소개',
    blockAccent: '편집기\n기능\n6가지',
  },
  derbyman: {
    headline: '더미맨,\n회사원에서\n콘티 작가가 되다',
    sub: '주말 취미로 시작한 짧은 만화. 대본 한 페이지가 4컷 콘티가 되기까지 5분.',
    colorBlock: C.coral,
    blockTextColor: C.ink,
    badge: '크리에이터 스토리',
    blockAccent: '4컷\n콘티\n5분',
  },
  default: {
    headline: '대본만 쓰세요.\nAI가 페이지를\n그립니다.',
    sub: '1,270+ 포즈 라이브러리 + AI 자동 배치 + POD 인쇄.',
    colorBlock: C.lime,
    blockTextColor: C.ink,
    badge: '스토리워크',
    blockAccent: '✦ AI\n자동\n배치',
  },
}

/* ── 폰트 fetch 헬퍼 ─────────────────────────────────────────────────── */
// Noto Sans KR — Google Fonts static woff2 (한글 지원, Edge fetch 가능)
// weight=400 (본문), 700 (굵은 헤드라인)
const NOTO_KR_BASE =
  'https://fonts.gstatic.com/s/notosanskr/v36/PbyxFmXiEBPT4ITbgNA5Cgm203Tq4JJWq209pU0DPdWuqxJFA4GNDCBYtw.woff2'
const NOTO_KR_BOLD =
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

/* ── OG 카드 컴포넌트 (JSX, ImageResponse 전용) ──────────────────────── */
function OgCard({ t, slug }: { t: OgTemplate; slug: string }) {
  const baseUrl = 'storywork-editor-web.vercel.app'
  const pagePath = slug === 'landing' ? '' : slug === 'derbyman' ? '/showcase/derbyman' : `/${slug}`

  return (
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
      {/* 상단 marquee strip */}
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
        <span
          style={{
            color: C.inverseInk,
            fontSize: 14,
            letterSpacing: '0.05em',
          }}
        >
          AI 스토리보드 편집기 · 1,270+ 포즈 · POD 출판 · 콘티 전용 편집기
        </span>
      </div>

      {/* 바디: 좌측 텍스트 + 우측 컬러블록 */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'row',
        }}
      >
        {/* 좌측 60%: 헤드라인 영역 */}
        <div
          style={{
            flex: '0 0 60%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            padding: '48px 48px 36px 56px',
          }}
        >
          {/* 상단: 배지 + 헤드라인 + sub */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* 배지 */}
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: C.surfaceSoft,
                borderRadius: 50,
                paddingTop: 6,
                paddingBottom: 6,
                paddingLeft: 16,
                paddingRight: 16,
                width: 'fit-content',
              }}
            >
              <span
                style={{
                  fontSize: 14,
                  color: C.ink,
                  letterSpacing: '0.08em',
                }}
              >
                STORYWORK · {t.badge.toUpperCase()}
              </span>
            </div>

            {/* 헤드라인 */}
            <div
              style={{
                fontSize: 56,
                fontWeight: 700,
                color: C.ink,
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                whiteSpace: 'pre-line',
              }}
            >
              {t.headline}
            </div>

            {/* 서브 텍스트 */}
            <div
              style={{
                fontSize: 20,
                color: C.ink,
                opacity: 0.6,
                lineHeight: 1.45,
                maxWidth: 500,
              }}
            >
              {t.sub}
            </div>
          </div>

          {/* 하단: URL */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <div
              style={{
                fontSize: 16,
                color: C.ink,
                opacity: 0.35,
                letterSpacing: '0.02em',
              }}
            >
              {baseUrl}
              {pagePath}
            </div>
          </div>
        </div>

        {/* 우측 40%: 컬러블록 */}
        <div
          style={{
            flex: '0 0 40%',
            backgroundColor: t.colorBlock,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            padding: 48,
          }}
        >
          {/* 큰 장식 텍스트 */}
          <div
            style={{
              fontSize: 72,
              fontWeight: 700,
              color: t.blockTextColor,
              opacity: 0.85,
              lineHeight: 1.0,
              textAlign: 'center',
              whiteSpace: 'pre-line',
            }}
          >
            {t.blockAccent}
          </div>
        </div>
      </div>

      {/* 하단 border */}
      <div
        style={{
          height: 3,
          backgroundColor: C.ink,
          flexShrink: 0,
        }}
      />
    </div>
  )
}

/* ── Route Handler ───────────────────────────────────────────────────── */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ slug: string }> },
): Promise<Response> {
  const { slug } = await ctx.params
  const resolved = TEMPLATES[slug] ?? TEMPLATES['default']
  // TEMPLATES['default'] 는 항상 정의되어 있으므로 안전
  const t: OgTemplate = resolved as OgTemplate

  // 폰트 로드 (실패 시 시스템 폰트 폴백)
  const [fontBase, fontBold] = await Promise.all([loadFont(NOTO_KR_BASE), loadFont(NOTO_KR_BOLD)])

  // ImageResponse options — fonts 타입은 런타임에서 허용되나 TS 정의가 버전마다 다름
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const options: any = {
    width: 1200,
    height: 630,
  }

  const fonts = []
  if (fontBase) fonts.push({ name: 'Noto Sans KR', data: fontBase, weight: 400, style: 'normal' })
  if (fontBold) fonts.push({ name: 'Noto Sans KR', data: fontBold, weight: 700, style: 'normal' })
  if (fonts.length > 0) options.fonts = fonts

  return new ImageResponse(<OgCard t={t} slug={slug} />, options)
}
