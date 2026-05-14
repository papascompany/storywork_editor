/**
 * components/mypage/ProjectCard.tsx
 *
 * 작품 카드 — 썸네일(없으면 색상 placeholder) + 제목 + 수정일 + 상태 뱃지.
 * 클릭 → /editor?projectId={id}
 */
import Link from 'next/link'
import * as React from 'react'

// 상태별 색상 토큰 매핑
const STATUS_LABEL: Record<string, string> = {
  drafting: '작업중',
  reviewing: '검토중',
  published: '출판됨',
  archived: '보관됨',
}

const STATUS_BG: Record<string, string> = {
  drafting: 'var(--mkt-block-cream)',
  reviewing: 'var(--mkt-block-lilac)',
  published: 'var(--mkt-block-mint)',
  archived: 'var(--mkt-hairline-soft)',
}

// 제목 첫 글자 기반 placeholder 색상 (파스텔 6색 순환)
const PLACEHOLDER_COLORS = [
  'var(--mkt-block-lime)',
  'var(--mkt-block-lilac)',
  'var(--mkt-block-cream)',
  'var(--mkt-block-pink)',
  'var(--mkt-block-mint)',
  'var(--mkt-block-coral)',
]

function getPlaceholderColor(title: string): string {
  const code = title.charCodeAt(0) || 0
  return PLACEHOLDER_COLORS[code % PLACEHOLDER_COLORS.length] ?? 'var(--mkt-block-cream)'
}

/** "x일 전" / "x시간 전" 포맷 */
function formatRelativeDate(date: Date): string {
  const now = Date.now()
  const diff = now - date.getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return '방금 전'
  if (minutes < 60) return `${minutes}분 전`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}시간 전`
  const days = Math.floor(hours / 24)
  if (days < 30) return `${days}일 전`
  const months = Math.floor(days / 30)
  if (months < 12) return `${months}달 전`
  return `${Math.floor(months / 12)}년 전`
}

export interface ProjectCardProps {
  id: string
  title: string
  status: string
  thumbnail: string | null
  updatedAt: Date
  pageCount: number
}

export function ProjectCard({
  id,
  title,
  status,
  thumbnail,
  updatedAt,
  pageCount,
}: ProjectCardProps) {
  const placeholderColor = getPlaceholderColor(title)
  const statusLabel = STATUS_LABEL[status] ?? status
  const statusBg = STATUS_BG[status] ?? 'var(--mkt-hairline-soft)'
  const relDate = formatRelativeDate(updatedAt)

  return (
    <Link
      href={`/editor?projectId=${id}`}
      style={{ textDecoration: 'none', display: 'block' }}
      aria-label={`${title} — ${statusLabel}, ${relDate} 수정`}
    >
      <article
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          border: '1px solid var(--mkt-hairline)',
          borderRadius: 'var(--mkt-rounded-md)',
          overflow: 'hidden',
          transition: 'box-shadow 150ms ease, transform 150ms ease',
          cursor: 'pointer',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.boxShadow = '0 4px 16px rgba(0,0,0,0.10)'
          el.style.transform = 'translateY(-2px)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.boxShadow = 'none'
          el.style.transform = 'translateY(0)'
        }}
      >
        {/* 썸네일 영역 — 4:3 비율 */}
        <div
          style={{
            aspectRatio: '4 / 3',
            backgroundColor: thumbnail ? 'transparent' : placeholderColor,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
          }}
        >
          {thumbnail ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              /* blob URL 이 아닌 Supabase CDN URL — next/image remotePatterns 에 등록됨.
                 단, aspect-ratio 컨테이너 내 object-fit 처리를 위해 <img> 사용.
                 ESLint 예외: Supabase Storage URL 은 remotePatterns 허용 도메인임. */
              src={thumbnail}
              alt=""
              aria-hidden="true"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              aria-hidden="true"
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '28px',
                fontWeight: 540,
                color: 'var(--mkt-ink)',
                opacity: 0.35,
                textTransform: 'uppercase',
                userSelect: 'none',
              }}
            >
              {title[0] ?? '?'}
            </span>
          )}
        </div>

        {/* 메타 정보 */}
        <div style={{ padding: '10px 12px 12px' }}>
          {/* 제목 */}
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 480,
              letterSpacing: '-0.10px',
              color: 'var(--mkt-ink)',
              margin: '0 0 6px',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {title}
          </p>

          {/* 수정일 + 페이지 수 */}
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '12px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.45,
              margin: '0 0 8px',
            }}
          >
            {relDate} · {pageCount}페이지
          </p>

          {/* 상태 뱃지 */}
          <span
            style={{
              display: 'inline-block',
              padding: '2px 8px',
              borderRadius: 'var(--mkt-rounded-pill)',
              backgroundColor: statusBg,
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '11px',
              fontWeight: 480,
              color: 'var(--mkt-ink)',
              opacity: 0.8,
              letterSpacing: '0.2px',
            }}
          >
            {statusLabel}
          </span>
        </div>
      </article>
    </Link>
  )
}

// ─── 새 작품 만들기 카드 ──────────────────────────────────────────────────────

export function NewProjectCard() {
  return (
    <Link
      href="/editor"
      style={{ textDecoration: 'none', display: 'block' }}
      aria-label="새 작품 만들기"
    >
      <article
        style={{
          border: '2px dashed var(--mkt-hairline)',
          borderRadius: 'var(--mkt-rounded-md)',
          overflow: 'hidden',
          transition: 'border-color 150ms ease, background-color 150ms ease',
          cursor: 'pointer',
          aspectRatio: '4 / 3',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 'var(--mkt-space-xs)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--mkt-ink)'
          el.style.backgroundColor = 'var(--mkt-surface-soft)'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLElement
          el.style.borderColor = 'var(--mkt-hairline)'
          el.style.backgroundColor = 'transparent'
        }}
      >
        <span
          aria-hidden="true"
          style={{
            fontSize: '28px',
            fontWeight: 300,
            color: 'var(--mkt-ink)',
            opacity: 0.3,
            lineHeight: 1,
          }}
        >
          +
        </span>
        <span
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            fontWeight: 480,
            color: 'var(--mkt-ink)',
            opacity: 0.45,
            letterSpacing: '-0.10px',
          }}
        >
          새 작품 만들기
        </span>
      </article>
    </Link>
  )
}
