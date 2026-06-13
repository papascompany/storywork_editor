'use client'

/**
 * components/mypage/ContestSubmitCard.tsx
 *
 * 공모전 출품 모드에서 노출되는 작품 카드 (BOARD-05).
 * 일반 ProjectCard 와 달리 /editor 로 이동하지 않고, "이 작품 출품" 버튼으로
 * POST /api/contest/[seasonId]/submit 를 호출한다.
 *
 * 상태: idle → submitting → done(이동) | duplicate | error
 */
import { useRouter } from 'next/navigation'
import * as React from 'react'

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

interface ContestSubmitCardProps {
  contestId: string
  /** 출품 가능 여부 (시즌 진행 중 + 미동결). false 면 버튼 비활성 */
  open: boolean
  id: string
  title: string
  thumbnail: string | null
  pageCount: number
}

type SubmitState = 'idle' | 'submitting' | 'done' | 'duplicate' | 'error'

export function ContestSubmitCard({
  contestId,
  open,
  id,
  title,
  thumbnail,
  pageCount,
}: ContestSubmitCardProps) {
  const router = useRouter()
  const [state, setState] = React.useState<SubmitState>('idle')
  const [message, setMessage] = React.useState<string | null>(null)

  const placeholderColor = getPlaceholderColor(title)
  const disabled =
    !open || pageCount === 0 || state === 'submitting' || state === 'done' || state === 'duplicate'

  async function handleSubmit() {
    if (disabled) return
    setState('submitting')
    setMessage(null)
    try {
      const res = await fetch(`/api/contest/${contestId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId: id }),
      })
      const data: { error?: string; showcaseId?: string } = await res.json().catch(() => ({}))

      if (res.status === 201) {
        setState('done')
        router.push(`/contest/${contestId}`)
        return
      }
      if (res.status === 409) {
        setState('duplicate')
        setMessage('이미 출품한 작품입니다.')
        return
      }
      setState('error')
      setMessage(data.error ?? '출품에 실패했습니다.')
    } catch {
      setState('error')
      setMessage('네트워크 오류로 출품에 실패했습니다.')
    }
  }

  const buttonLabel =
    state === 'submitting'
      ? '출품 중…'
      : state === 'done'
        ? '출품 완료'
        : state === 'duplicate'
          ? '출품됨'
          : pageCount === 0
            ? '페이지 없음'
            : !open
              ? '출품 마감'
              : '이 작품 출품'

  return (
    <article
      style={{
        backgroundColor: 'var(--mkt-canvas)',
        border: '1px solid var(--mkt-hairline)',
        borderRadius: 'var(--mkt-rounded-md)',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* 썸네일 — 4:3 */}
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

      {/* 메타 + 액션 */}
      <div
        style={{ padding: '10px 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}
      >
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 480,
            letterSpacing: '-0.10px',
            color: 'var(--mkt-ink)',
            margin: 0,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </p>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '12px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.45,
            margin: 0,
          }}
        >
          {pageCount}페이지
        </p>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={disabled}
          aria-label={`${title} 출품`}
          style={{
            marginTop: '2px',
            height: '36px',
            border: 'none',
            borderRadius: 'var(--mkt-rounded-md)',
            backgroundColor: disabled ? 'var(--mkt-hairline-soft)' : 'var(--mkt-ink)',
            color: disabled ? 'var(--mkt-ink)' : 'var(--mkt-canvas)',
            opacity: disabled && state !== 'done' && state !== 'duplicate' ? 0.6 : 1,
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            fontWeight: 540,
            cursor: disabled ? 'default' : 'pointer',
            transition: 'opacity 150ms ease',
          }}
        >
          {buttonLabel}
        </button>

        {message && (
          <p
            role={state === 'error' ? 'alert' : 'status'}
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '12px',
              color: state === 'error' ? 'var(--mkt-sale, #c0392b)' : 'var(--mkt-ink)',
              opacity: 0.7,
              margin: 0,
            }}
          >
            {message}
          </p>
        )}
      </div>
    </article>
  )
}
