'use client'

/**
 * CommentSection — 댓글 목록 + 작성 폼
 *
 * 미로그인 → 로그인 유도 메시지.
 * 제출 → POST /api/showcase/[id]/comments.
 * 낙관적 렌더링으로 즉시 표시.
 */
import * as React from 'react'

import { ReportButton } from '@/components/showcase/ReportButton'

export interface CommentData {
  id: string
  body: string
  authorName: string
  createdAt: string
}

interface CommentSectionProps {
  showcaseId: string
  initialComments: CommentData[]
  currentUserId: string | null
  currentUserEmail: string | null
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export function CommentSection({
  showcaseId,
  initialComments,
  currentUserId,
  currentUserEmail,
}: CommentSectionProps) {
  const [comments, setComments] = React.useState<CommentData[]>(initialComments)
  const [body, setBody] = React.useState('')
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const textareaRef = React.useRef<HTMLTextAreaElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = body.trim()
    if (!trimmed) {
      setError('댓글 내용을 입력해주세요.')
      return
    }
    if (trimmed.length > 1000) {
      setError('댓글은 1000자 이내로 입력해주세요.')
      return
    }

    setError(null)
    setIsSubmitting(true)

    // 낙관적 렌더링
    const optimisticComment: CommentData = {
      id: `opt-${Date.now()}`,
      body: trimmed,
      authorName: currentUserEmail ?? '나',
      createdAt: new Date().toISOString(),
    }
    setComments((prev) => [...prev, optimisticComment])
    setBody('')

    try {
      const res = await fetch(`/api/showcase/${showcaseId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ body: trimmed }),
      })

      if (!res.ok) {
        // 롤백
        setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
        const json = (await res.json()) as { error?: string }
        setError(json.error ?? '댓글 등록 중 오류가 발생했습니다.')
        setBody(trimmed)
      } else {
        const json = (await res.json()) as CommentData
        // 낙관적 항목을 실제로 교체
        setComments((prev) => prev.map((c) => (c.id === optimisticComment.id ? json : c)))
      }
    } catch {
      setComments((prev) => prev.filter((c) => c.id !== optimisticComment.id))
      setError('네트워크 오류가 발생했습니다.')
      setBody(trimmed)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <section aria-labelledby="comments-heading">
      <h2
        id="comments-heading"
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--mkt-ink)',
          marginBottom: '20px',
        }}
      >
        댓글 {comments.length > 0 ? `(${comments.length})` : ''}
      </h2>

      {/* 댓글 목록 */}
      {comments.length === 0 ? (
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            color: 'var(--mkt-ink)',
            opacity: 0.35,
            marginBottom: '24px',
          }}
        >
          첫 댓글을 남겨보세요.
        </p>
      ) : (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            marginBottom: '28px',
          }}
        >
          {comments.map((comment) => (
            <div
              key={comment.id}
              style={{
                padding: '14px 16px',
                backgroundColor: 'var(--mkt-surface-soft)',
                borderRadius: '8px',
                opacity: comment.id.startsWith('opt-') ? 0.6 : 1,
              }}
            >
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '6px',
                  flexWrap: 'wrap',
                  gap: '4px',
                }}
              >
                <span
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--mkt-ink)',
                  }}
                >
                  {comment.authorName}
                </span>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontFamily: 'var(--mkt-font-mono)',
                    fontSize: '11px',
                    color: 'var(--mkt-ink)',
                    opacity: 0.4,
                  }}
                >
                  {formatDate(comment.createdAt)}
                  {/* 내 댓글/낙관적 댓글이 아니면 신고 가능 */}
                  {!comment.id.startsWith('opt-') && (
                    <ReportButton
                      targetType="comment"
                      targetId={comment.id}
                      isAuthenticated={Boolean(currentUserId)}
                      variant="icon"
                    />
                  )}
                </span>
              </div>
              <p
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  lineHeight: 1.6,
                  color: 'var(--mkt-ink)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  margin: 0,
                }}
              >
                {comment.body}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* 댓글 작성 */}
      {currentUserId ? (
        <form onSubmit={handleSubmit} noValidate>
          <textarea
            ref={textareaRef}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="댓글을 작성해주세요..."
            maxLength={1000}
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              color: 'var(--mkt-ink)',
              backgroundColor: 'var(--mkt-canvas)',
              border: '1px solid var(--mkt-hairline)',
              borderRadius: '8px',
              padding: '12px 14px',
              width: '100%',
              boxSizing: 'border-box',
              resize: 'vertical',
              minHeight: '90px',
              outline: 'none',
            }}
            aria-label="댓글 내용"
            disabled={isSubmitting}
          />
          {error && (
            <p
              role="alert"
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '12px',
                color: '#d30005',
                marginTop: '4px',
              }}
            >
              {error}
            </p>
          )}
          <div
            style={{
              display: 'flex',
              justifyContent: 'flex-end',
              marginTop: '8px',
            }}
          >
            <button
              type="submit"
              disabled={isSubmitting || !body.trim()}
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--mkt-canvas)',
                backgroundColor: 'var(--mkt-ink)',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                cursor: isSubmitting || !body.trim() ? 'default' : 'pointer',
                opacity: isSubmitting || !body.trim() ? 0.5 : 1,
                transition: 'opacity 120ms ease',
              }}
            >
              {isSubmitting ? '등록 중...' : '댓글 등록'}
            </button>
          </div>
        </form>
      ) : (
        <div
          style={{
            padding: '16px',
            backgroundColor: 'var(--mkt-surface-soft)',
            borderRadius: '8px',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            color: 'var(--mkt-ink)',
            opacity: 0.7,
            textAlign: 'center',
          }}
        >
          댓글을 남기려면{' '}
          <a
            href={`/login?next=/showcase/${showcaseId}`}
            style={{ color: 'var(--mkt-ink)', fontWeight: 600, textDecoration: 'underline' }}
          >
            로그인
          </a>
          이 필요합니다.
        </div>
      )}
    </section>
  )
}
