'use client'

/**
 * ContactForm — 클라이언트 폼
 *
 * react-hook-form + Zod 검증.
 * 제출 → POST /api/inquiries → 성공 시 완료 메시지.
 */
import { zodResolver } from '@hookform/resolvers/zod'
import type { CreateInquiry } from '@storywork/schema'
import { CreateInquirySchema } from '@storywork/schema'
import * as React from 'react'
import { useForm } from 'react-hook-form'

interface ContactFormProps {
  prefillEmail: string | null
  userId: string | null
}

export function ContactForm({ prefillEmail, userId }: ContactFormProps) {
  const [submitted, setSubmitted] = React.useState(false)
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CreateInquiry>({
    resolver: zodResolver(CreateInquirySchema),
    defaultValues: {
      email: prefillEmail ?? '',
      subject: '',
      body: '',
    },
  })

  const onSubmit = async (data: CreateInquiry) => {
    setServerError(null)
    try {
      const res = await fetch('/api/inquiries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, userId }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setServerError(json.error ?? '오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
        return
      }
      setSubmitted(true)
    } catch {
      setServerError('네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.')
    }
  }

  if (submitted) {
    return (
      <div
        style={{
          textAlign: 'center',
          padding: '60px 0',
        }}
      >
        <div
          style={{
            fontSize: '40px',
            marginBottom: '20px',
          }}
          aria-hidden="true"
        >
          ✓
        </div>
        <h2
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: '22px',
            fontWeight: 600,
            color: 'var(--mkt-ink)',
            marginBottom: '12px',
          }}
        >
          문의가 접수되었습니다
        </h2>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            color: 'var(--mkt-ink)',
            opacity: 0.6,
            lineHeight: 1.6,
          }}
        >
          영업일 기준 1~2일 내에 입력하신 이메일로 답변드리겠습니다.
        </p>
      </div>
    )
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '24px',
  }

  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--mkt-font-sans)',
    fontSize: '13px',
    fontWeight: 500,
    color: 'var(--mkt-ink)',
  }

  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--mkt-font-sans)',
    fontSize: '15px',
    color: 'var(--mkt-ink)',
    backgroundColor: 'var(--mkt-canvas)',
    border: '1px solid var(--mkt-hairline)',
    borderRadius: '8px',
    padding: '10px 14px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  }

  const errorStyle: React.CSSProperties = {
    fontFamily: 'var(--mkt-font-sans)',
    fontSize: '12px',
    color: '#d30005',
    marginTop: '2px',
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      {/* 이메일 */}
      <div style={fieldStyle}>
        <label htmlFor="contact-email" style={labelStyle}>
          이메일 <span style={{ color: '#d30005' }}>*</span>
        </label>
        <input
          id="contact-email"
          type="email"
          autoComplete="email"
          placeholder="answer@example.com"
          style={{
            ...inputStyle,
            backgroundColor: prefillEmail ? 'var(--mkt-surface-soft)' : 'var(--mkt-canvas)',
          }}
          readOnly={!!prefillEmail}
          {...register('email')}
          aria-describedby={errors.email ? 'contact-email-error' : undefined}
          aria-invalid={!!errors.email}
        />
        {errors.email && (
          <span id="contact-email-error" style={errorStyle} role="alert">
            {errors.email.message}
          </span>
        )}
      </div>

      {/* 제목 */}
      <div style={fieldStyle}>
        <label htmlFor="contact-subject" style={labelStyle}>
          제목 <span style={{ color: '#d30005' }}>*</span>
        </label>
        <input
          id="contact-subject"
          type="text"
          placeholder="문의 제목을 간략히 입력해주세요"
          style={inputStyle}
          {...register('subject')}
          aria-describedby={errors.subject ? 'contact-subject-error' : undefined}
          aria-invalid={!!errors.subject}
        />
        {errors.subject && (
          <span id="contact-subject-error" style={errorStyle} role="alert">
            {errors.subject.message}
          </span>
        )}
      </div>

      {/* 본문 */}
      <div style={fieldStyle}>
        <label htmlFor="contact-body" style={labelStyle}>
          문의 내용 <span style={{ color: '#d30005' }}>*</span>
        </label>
        <textarea
          id="contact-body"
          placeholder="문의 내용을 자세히 작성해주세요 (최소 10자)"
          style={{
            ...inputStyle,
            resize: 'vertical',
            minHeight: '160px',
          }}
          {...register('body')}
          aria-describedby={errors.body ? 'contact-body-error' : undefined}
          aria-invalid={!!errors.body}
        />
        {errors.body && (
          <span id="contact-body-error" style={errorStyle} role="alert">
            {errors.body.message}
          </span>
        )}
      </div>

      {/* 서버 오류 */}
      {serverError && (
        <div
          role="alert"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: '#d30005',
            backgroundColor: '#fff5f5',
            border: '1px solid #ffcccc',
            borderRadius: '6px',
            padding: '10px 14px',
            marginBottom: '20px',
          }}
        >
          {serverError}
        </div>
      )}

      {/* 제출 */}
      <button
        type="submit"
        disabled={isSubmitting}
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '15px',
          fontWeight: 600,
          color: 'var(--mkt-canvas)',
          backgroundColor: 'var(--mkt-ink)',
          border: 'none',
          borderRadius: '8px',
          padding: '12px 32px',
          cursor: isSubmitting ? 'wait' : 'pointer',
          opacity: isSubmitting ? 0.6 : 1,
          transition: 'opacity 120ms ease',
          width: '100%',
        }}
      >
        {isSubmitting ? '전송 중...' : '문의 보내기'}
      </button>

      <p
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '12px',
          color: 'var(--mkt-ink)',
          opacity: 0.4,
          marginTop: '12px',
          textAlign: 'center',
        }}
      >
        제출 시 개인정보처리방침에 동의하는 것으로 간주됩니다.
      </p>
    </form>
  )
}
