'use client'

/**
 * InquiryReplyForm — 답변 작성 + 상태 변경 폼 (클라이언트)
 */
import { useRouter } from 'next/navigation'
import * as React from 'react'

interface InquiryReplyFormProps {
  inquiryId: string
  currentStatus: string
}

export function InquiryReplyForm({ inquiryId, currentStatus }: InquiryReplyFormProps) {
  const router = useRouter()
  const [reply, setReply] = React.useState('')
  const [status, setStatus] = React.useState(currentStatus)
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!reply.trim()) {
      setServerError('답변 내용을 입력해주세요.')
      return
    }

    setServerError(null)
    setIsSubmitting(true)

    try {
      const res = await fetch(`/api/admin/inquiries/${inquiryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adminReply: reply.trim(), status }),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setServerError(json.error ?? '오류가 발생했습니다.')
        return
      }

      setSuccess(true)
      router.refresh()
    } catch {
      setServerError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (success) {
    return (
      <div
        style={{
          padding: '20px',
          backgroundColor: '#e8fff2',
          borderRadius: '8px',
          fontFamily: 'var(--nike-font-text)',
          fontSize: '13px',
          color: '#1a7a3b',
        }}
      >
        답변이 저장되었습니다.
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--nike-font-text)',
    fontSize: '14px',
    color: 'var(--nike-ink)',
    backgroundColor: 'var(--nike-canvas)',
    border: '1px solid var(--nike-hairline-soft)',
    borderRadius: '6px',
    padding: '9px 12px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  }

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--nike-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '6px',
          }}
        >
          답변 내용
        </label>
        <textarea
          value={reply}
          onChange={(e) => setReply(e.target.value)}
          placeholder="고객에게 보낼 답변을 작성해주세요..."
          style={{ ...inputStyle, resize: 'vertical', minHeight: '160px' }}
          disabled={isSubmitting}
        />
      </div>

      {/* 상태 변경 */}
      <div style={{ marginBottom: '20px' }}>
        <label
          style={{
            display: 'block',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            fontWeight: 500,
            color: 'var(--nike-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '6px',
          }}
        >
          상태 변경
        </label>
        <select value={status} onChange={(e) => setStatus(e.target.value)} style={inputStyle}>
          <option value="OPEN">답변 대기 (OPEN)</option>
          <option value="REPLIED">답변 완료 (REPLIED)</option>
          <option value="CLOSED">종료 (CLOSED)</option>
        </select>
      </div>

      {serverError && (
        <div
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-sale)',
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: '#fff3f3',
            borderRadius: '4px',
          }}
          role="alert"
        >
          {serverError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--nike-canvas)',
            backgroundColor: 'var(--nike-ink)',
            border: 'none',
            borderRadius: '6px',
            padding: '9px 20px',
            cursor: isSubmitting ? 'wait' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? '저장 중...' : '답변 저장'}
        </button>
      </div>

      <p
        style={{
          fontFamily: 'var(--nike-font-text)',
          fontSize: '11px',
          color: 'var(--nike-stone)',
          marginTop: '12px',
          opacity: 0.6,
        }}
      >
        * 이메일 발송은 COMMS-01 구현 후 자동 처리됩니다. 현재는 DB 저장만 됩니다.
      </p>
    </form>
  )
}
