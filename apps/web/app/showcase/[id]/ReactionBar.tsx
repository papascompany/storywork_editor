'use client'

/**
 * ReactionBar — like / heart / wow 반응 버튼
 *
 * 클릭 시 POST /api/showcase/[id]/reactions 호출.
 * 미로그인 → alert 또는 /login 유도.
 */
import * as React from 'react'

const REACTIONS = [
  { kind: 'like', emoji: '👍', label: '좋아요' },
  { kind: 'heart', emoji: '❤️', label: '하트' },
  { kind: 'wow', emoji: '😲', label: '감탄' },
] as const

interface ReactionBarProps {
  showcaseId: string
  reactionCounts: Record<string, number>
  currentUserId: string | null
  userReactions: string[]
}

export function ReactionBar({
  showcaseId,
  reactionCounts: initialCounts,
  currentUserId,
  userReactions: initialUserReactions,
}: ReactionBarProps) {
  const [counts, setCounts] = React.useState<Record<string, number>>(initialCounts)
  const [userReactions, setUserReactions] = React.useState<Set<string>>(
    new Set(initialUserReactions),
  )
  const [pending, setPending] = React.useState<string | null>(null)

  const handleReaction = async (kind: string) => {
    if (!currentUserId) {
      window.location.href = `/login?next=/showcase/${showcaseId}`
      return
    }

    if (pending) return
    setPending(kind)

    const isRemoving = userReactions.has(kind)

    // 낙관적 업데이트
    setCounts((prev) => ({
      ...prev,
      [kind]: (prev[kind] ?? 0) + (isRemoving ? -1 : 1),
    }))
    setUserReactions((prev) => {
      const next = new Set(prev)
      if (isRemoving) {
        next.delete(kind)
      } else {
        next.add(kind)
      }
      return next
    })

    try {
      const method = isRemoving ? 'DELETE' : 'POST'
      const res = await fetch(`/api/showcase/${showcaseId}/reactions`, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind }),
      })

      if (!res.ok) {
        // 롤백
        setCounts((prev) => ({
          ...prev,
          [kind]: (prev[kind] ?? 0) + (isRemoving ? 1 : -1),
        }))
        setUserReactions((prev) => {
          const next = new Set(prev)
          if (isRemoving) {
            next.add(kind)
          } else {
            next.delete(kind)
          }
          return next
        })
      }
    } catch {
      // 롤백
      setCounts((prev) => ({
        ...prev,
        [kind]: (prev[kind] ?? 0) + (isRemoving ? 1 : -1),
      }))
    } finally {
      setPending(null)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        gap: '12px',
        flexWrap: 'wrap',
      }}
      role="group"
      aria-label="작품 반응"
    >
      {REACTIONS.map(({ kind, emoji, label }) => {
        const isActive = userReactions.has(kind)
        const count = counts[kind] ?? 0

        return (
          <button
            key={kind}
            onClick={() => void handleReaction(kind)}
            disabled={pending === kind}
            aria-pressed={isActive}
            aria-label={`${label} (${count})`}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: isActive ? '1.5px solid var(--mkt-ink)' : '1px solid var(--mkt-hairline)',
              backgroundColor: isActive ? 'var(--mkt-surface-soft)' : 'transparent',
              cursor: pending ? 'wait' : 'pointer',
              opacity: pending === kind ? 0.6 : 1,
              transition: 'all 120ms ease',
              fontWeight: isActive ? 600 : 400,
              color: 'var(--mkt-ink)',
            }}
          >
            <span aria-hidden="true">{emoji}</span>
            <span>{count > 0 ? count : label}</span>
          </button>
        )
      })}
    </div>
  )
}
