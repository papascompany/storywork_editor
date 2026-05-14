'use client'

/**
 * apps/web/app/(auth)/forgot-password/page.tsx
 *
 * 비밀번호 재설정 이메일 발송 페이지.
 * - 이메일 입력 → resetPasswordForEmail 호출
 * - 성공 시 안내 메시지 표시
 * - 마케팅 디자인 토큰(--mkt-*) 적용
 */
import Link from 'next/link'
import { type CSSProperties, type FocusEvent, type FormEvent, useState } from 'react'

import { createWebBrowserClient } from '@/lib/supabase/client'

const INPUT_STYLE: CSSProperties = {
  backgroundColor: 'var(--mkt-canvas)',
  border: '1px solid var(--mkt-hairline)',
  borderRadius: 'var(--mkt-rounded-md)',
  padding: '12px 14px',
  fontFamily: 'var(--mkt-font-sans)',
  fontSize: '16px',
  fontWeight: 320,
  color: 'var(--mkt-ink)',
  outline: 'none',
  width: '100%',
  transition: 'border-color 150ms ease',
  boxSizing: 'border-box',
}

function handleInputFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-ink)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
}

function handleInputBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-hairline)'
  e.currentTarget.style.boxShadow = 'none'
}

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccessMessage('')

    if (!email) {
      setError('이메일을 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const supabase = createWebBrowserClient()
      const redirectTo = `${window.location.origin}/auth/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      })

      if (resetError) {
        setError(`이메일 발송 실패: ${resetError.message}`)
        return
      }

      setSuccessMessage('재설정 이메일을 보냈습니다. 받은 편지함을 확인하세요.')
    } catch {
      setError('이메일 발송 중 오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: '420px' }}>
      {/* 카드 */}
      <div
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          borderRadius: 'var(--mkt-rounded-lg)',
          border: '1px solid var(--mkt-hairline)',
          padding: '40px 36px',
        }}
      >
        {/* 타이틀 */}
        <div style={{ marginBottom: '28px' }}>
          <h1
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'clamp(24px, 4vw, 32px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.64px',
              color: 'var(--mkt-ink)',
              margin: 0,
            }}
          >
            비밀번호 찾기
          </h1>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 330,
              lineHeight: 1.45,
              letterSpacing: '-0.14px',
              color: 'var(--mkt-ink)',
              opacity: 0.55,
              marginTop: '6px',
              marginBottom: 0,
            }}
          >
            가입 시 사용한 이메일로 재설정 링크를 보냅니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
          {/* 에러 메시지 */}
          {error && (
            <div
              role="alert"
              aria-live="assertive"
              style={{
                borderRadius: 'var(--mkt-rounded-md)',
                backgroundColor: 'var(--mkt-block-pink)',
                border: '1px solid #e0b0b0',
                padding: '10px 14px',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 330,
                color: '#8b2222',
              }}
            >
              {error}
            </div>
          )}

          {/* 성공 메시지 */}
          {successMessage && (
            <div
              role="status"
              aria-live="polite"
              style={{
                borderRadius: 'var(--mkt-rounded-md)',
                backgroundColor: 'var(--mkt-block-mint)',
                border: '1px solid #a7f3c0',
                padding: '10px 14px',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 330,
                color: '#166534',
              }}
            >
              {successMessage}
            </div>
          )}

          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="email"
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 480,
                letterSpacing: '-0.10px',
                color: 'var(--mkt-ink)',
              }}
            >
              이메일
            </label>
            <input
              id="email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading || Boolean(successMessage)}
              style={INPUT_STYLE}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
            />
          </div>

          {/* 발송 버튼 */}
          {!successMessage && (
            <button
              type="submit"
              disabled={loading}
              className="mkt-btn-primary"
              style={{
                width: '100%',
                marginTop: '4px',
                opacity: loading ? 0.6 : undefined,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? '발송 중...' : '재설정 이메일 보내기'}
            </button>
          )}
        </form>

        {/* 로그인으로 돌아가기 */}
        <p
          style={{
            textAlign: 'center',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            marginTop: 'var(--mkt-space-lg)',
            marginBottom: 0,
          }}
        >
          <Link
            href="/login"
            style={{
              color: 'var(--mkt-ink)',
              fontWeight: 540,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              opacity: 1,
            }}
          >
            로그인으로 돌아가기
          </Link>
        </p>
      </div>
    </div>
  )
}
