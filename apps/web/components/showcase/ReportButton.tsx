'use client'

/**
 * ReportButton — Showcase/Comment 신고 버튼 + 사유 선택 모달 (BOARD-07)
 *
 * - 로그인 필수: isAuthenticated=false 면 클릭 시 로그인 유도
 * - POST /api/reports { targetType, targetId, reason, detail }
 * - 멱등: 이미 신고했어도 동일하게 "접수됨" 처리
 */

import { REPORT_REASON_LABELS, type ReportReason, type ReportTargetType } from '@storywork/schema'
import { Flag } from 'lucide-react'
import * as React from 'react'

const REASONS = Object.entries(REPORT_REASON_LABELS) as [ReportReason, string][]

interface ReportButtonProps {
  targetType: ReportTargetType
  targetId: string
  isAuthenticated: boolean
  /** 'icon' = 댓글용 작은 아이콘, 'text' = 작품용 텍스트 버튼 */
  variant?: 'icon' | 'text'
  label?: string
}

export function ReportButton({
  targetType,
  targetId,
  isAuthenticated,
  variant = 'text',
  label = '신고',
}: ReportButtonProps) {
  const [open, setOpen] = React.useState(false)
  const [reason, setReason] = React.useState<ReportReason | ''>('')
  const [detail, setDetail] = React.useState('')
  const [submitting, setSubmitting] = React.useState(false)
  const [done, setDone] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  function handleOpen() {
    if (!isAuthenticated) {
      const next = encodeURIComponent(window.location.pathname)
      window.location.href = `/login?next=${next}`
      return
    }
    setReason('')
    setDetail('')
    setDone(false)
    setError(null)
    setOpen(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!reason) return
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetType, targetId, reason, detail: detail.trim() || undefined }),
      })
      if (res.ok) {
        setDone(true)
        return
      }
      if (res.status === 401) {
        const next = encodeURIComponent(window.location.pathname)
        window.location.href = `/login?next=${next}`
        return
      }
      const data = (await res.json().catch(() => ({}))) as { error?: string }
      setError(data.error ?? '신고 접수에 실패했습니다.')
    } catch {
      setError('네트워크 오류가 발생했습니다.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={handleOpen}
          aria-label="이 댓글 신고"
          title="신고"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '3px',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
            fontSize: '12px',
            padding: '2px 4px',
          }}
        >
          <Flag size={13} aria-hidden="true" />
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '5px',
            background: 'none',
            border: '1px solid var(--mkt-hairline)',
            borderRadius: '999px',
            cursor: 'pointer',
            color: 'var(--mkt-ink)',
            opacity: 0.65,
            fontSize: '13px',
            fontFamily: 'var(--mkt-font-sans)',
            padding: '6px 14px',
          }}
        >
          <Flag size={14} aria-hidden="true" />
          {label}
        </button>
      )}

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="신고하기"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px',
          }}
        >
          <div
            aria-hidden="true"
            onClick={() => !submitting && setOpen(false)}
            style={{ position: 'absolute', inset: 0, backgroundColor: 'rgba(43,38,32,0.5)' }}
          />
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '420px',
              backgroundColor: 'var(--mkt-canvas)',
              borderRadius: '16px',
              padding: '28px 24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '14px',
            }}
          >
            {done ? (
              <>
                <h2
                  style={{
                    fontFamily: 'var(--mkt-font-display)',
                    fontSize: '20px',
                    fontWeight: 500,
                    color: 'var(--mkt-ink)',
                  }}
                >
                  신고가 접수되었습니다
                </h2>
                <p style={{ fontSize: '14px', color: 'var(--mkt-ink)', opacity: 0.65 }}>
                  검토 후 조치하겠습니다. 소중한 제보 감사합니다.
                </p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  style={{
                    height: '44px',
                    border: 'none',
                    borderRadius: '999px',
                    backgroundColor: 'var(--mkt-ink)',
                    color: 'var(--mkt-canvas)',
                    fontSize: '14px',
                    fontWeight: 500,
                    cursor: 'pointer',
                    marginTop: '4px',
                  }}
                >
                  닫기
                </button>
              </>
            ) : (
              <form
                onSubmit={handleSubmit}
                style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}
              >
                <h2
                  style={{
                    fontFamily: 'var(--mkt-font-display)',
                    fontSize: '20px',
                    fontWeight: 500,
                    color: 'var(--mkt-ink)',
                  }}
                >
                  신고하기
                </h2>
                <p
                  style={{
                    fontSize: '13px',
                    color: 'var(--mkt-ink)',
                    opacity: 0.6,
                    marginTop: '-6px',
                  }}
                >
                  신고 사유를 선택해주세요.
                </p>

                <div
                  role="radiogroup"
                  aria-label="신고 사유"
                  style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
                >
                  {REASONS.map(([value, text]) => (
                    <label
                      key={value}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '9px 12px',
                        borderRadius: '10px',
                        border:
                          reason === value
                            ? '1.5px solid var(--mkt-ink)'
                            : '1px solid var(--mkt-hairline)',
                        cursor: 'pointer',
                        fontSize: '14px',
                        color: 'var(--mkt-ink)',
                      }}
                    >
                      <input
                        type="radio"
                        name="report-reason"
                        value={value}
                        checked={reason === value}
                        onChange={() => setReason(value)}
                        style={{ accentColor: 'var(--mkt-ink)' }}
                      />
                      {text}
                    </label>
                  ))}
                </div>

                <textarea
                  value={detail}
                  onChange={(e) => setDetail(e.target.value)}
                  placeholder="상세 내용 (선택, 1000자 이내)"
                  maxLength={1000}
                  rows={3}
                  style={{
                    width: '100%',
                    borderRadius: '10px',
                    border: '1px solid var(--mkt-hairline)',
                    padding: '10px 12px',
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '14px',
                    color: 'var(--mkt-ink)',
                    resize: 'vertical',
                    boxSizing: 'border-box',
                  }}
                />

                {error && (
                  <p role="alert" style={{ fontSize: '13px', color: 'var(--mkt-sale, #d30005)' }}>
                    {error}
                  </p>
                )}

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    disabled={submitting}
                    style={{
                      flex: 1,
                      height: '44px',
                      border: '1px solid var(--mkt-hairline)',
                      borderRadius: '999px',
                      background: 'none',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--mkt-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    disabled={!reason || submitting}
                    style={{
                      flex: 1,
                      height: '44px',
                      border: 'none',
                      borderRadius: '999px',
                      backgroundColor: 'var(--mkt-ink)',
                      color: 'var(--mkt-canvas)',
                      fontSize: '14px',
                      fontWeight: 500,
                      cursor: !reason || submitting ? 'not-allowed' : 'pointer',
                      opacity: !reason || submitting ? 0.5 : 1,
                    }}
                  >
                    {submitting ? '접수 중...' : '신고 제출'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
