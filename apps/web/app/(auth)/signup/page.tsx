'use client'

/**
 * apps/web/app/(auth)/signup/page.tsx
 *
 * 일반 사용자 회원가입 페이지.
 * - 이메일 + 비밀번호(8자+) + 비밀번호 확인 + 약관 동의
 * - Google / Kakao OAuth 자리 (disabled — PR4/5 에서 활성화)
 * - 성공 시 /signup/check-email 로 이동
 * - 마케팅 디자인 토큰(--mkt-*) 적용
 */
import Link from 'next/link'
import { type CSSProperties, type FocusEvent, type FormEvent, useState } from 'react'

import { ConsentCheckbox } from '@/components/legal/ConsentCheckbox'
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

const LABEL_STYLE: CSSProperties = {
  fontFamily: 'var(--mkt-font-sans)',
  fontSize: '14px',
  fontWeight: 480,
  letterSpacing: '-0.10px',
  color: 'var(--mkt-ink)',
}

const CONSENT_LINK_STYLE: CSSProperties = {
  color: 'var(--mkt-ink)',
  fontWeight: 480,
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  opacity: 1,
}

function handleInputFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-ink)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
}

function handleInputBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-hairline)'
  e.currentTarget.style.boxShadow = 'none'
}

function OAuthDivider() {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--mkt-space-sm)',
        margin: '4px 0',
      }}
    >
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--mkt-hairline)' }} />
      <span
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '12px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.4,
          whiteSpace: 'nowrap',
        }}
      >
        또는
      </span>
      <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--mkt-hairline)' }} />
    </div>
  )
}

/** OAuth 버튼 — 현재 disabled (PR4/5 에서 활성화) */
function OAuthButtons() {
  function handleDisabledClick() {
    // TODO PR4/5: OAuth 활성화 시 signInWithOAuth({ provider: 'google' | 'kakao' }) 호출로 교체
    alert('OAuth 회원가입은 준비 중입니다.')
  }

  const buttonStyle: CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    width: '100%',
    padding: '11px 16px',
    borderRadius: 'var(--mkt-rounded-md)',
    border: '1px solid var(--mkt-hairline)',
    backgroundColor: 'var(--mkt-canvas)',
    fontFamily: 'var(--mkt-font-sans)',
    fontSize: '15px',
    fontWeight: 400,
    color: 'var(--mkt-ink)',
    cursor: 'not-allowed',
    opacity: 0.45,
    transition: 'opacity 150ms ease',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xs)' }}>
      <button
        type="button"
        disabled
        onClick={handleDisabledClick}
        aria-label="Google 로 시작하기 (준비 중)"
        style={buttonStyle}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <path
            d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
            fill="#4285F4"
          />
          <path
            d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
            fill="#34A853"
          />
          <path
            d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
            fill="#FBBC05"
          />
          <path
            d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z"
            fill="#EA4335"
          />
        </svg>
        Google 로 시작하기
        <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '4px' }}>(준비 중)</span>
      </button>

      <button
        type="button"
        disabled
        onClick={handleDisabledClick}
        aria-label="카카오로 시작하기 (준비 중)"
        style={buttonStyle}
      >
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect width="18" height="18" rx="4" fill="#FEE500" />
          <path
            d="M9 4.5C6.515 4.5 4.5 6.1 4.5 8.1c0 1.272.81 2.384 2.04 3.028l-.52 1.92c-.046.174.147.312.297.21L8.58 11.9c.138.012.276.018.42.018 2.485 0 4.5-1.6 4.5-3.6S11.485 4.5 9 4.5z"
            fill="#391B1B"
          />
        </svg>
        카카오로 시작하기
        <span style={{ fontSize: '11px', opacity: 0.6, marginLeft: '4px' }}>(준비 중)</span>
      </button>
    </div>
  )
}

export default function SignupPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  // PIPA: 이용약관 동의와 개인정보 수집·이용 동의는 각각 별도 [필수] (LEGAL-04)
  const [agreedTerms, setAgreedTerms] = useState(false)
  const [agreedPrivacy, setAgreedPrivacy] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const validate = (): string => {
    if (!email) return '이메일을 입력하세요.'
    if (password.length < 8) return '비밀번호는 8자 이상이어야 합니다.'
    if (password !== confirmPassword) return '비밀번호가 일치하지 않습니다.'
    if (!agreedTerms) return '이용약관에 동의해주세요.'
    if (!agreedPrivacy) return '개인정보 수집·이용에 동의해주세요.'
    return ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    const validationMessage = validate()
    if (validationMessage) {
      setError(validationMessage)
      return
    }

    setLoading(true)
    try {
      const supabase = createWebBrowserClient()
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      })

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('이미 가입된 이메일입니다. 로그인해 주세요.')
        } else {
          setError(`회원가입 실패: ${signUpError.message}`)
        }
        return
      }

      // 이메일 인증 안내 페이지로 이동
      window.location.href = '/signup/check-email'
    } catch {
      setError('회원가입 중 오류가 발생했습니다. 다시 시도하세요.')
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
            회원가입
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
            무료로 시작하세요.
          </p>
        </div>

        {/* 폼 */}
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

          {/* 이메일 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="email" style={LABEL_STYLE}>
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
              disabled={loading}
              style={INPUT_STYLE}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
            />
          </div>

          {/* 비밀번호 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="password" style={LABEL_STYLE}>
              비밀번호{' '}
              <span style={{ fontWeight: 330, opacity: 0.5, fontSize: '12px' }}>(8자 이상)</span>
            </label>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="new-password"
              placeholder="8자 이상 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={INPUT_STYLE}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
              minLength={8}
            />
          </div>

          {/* 비밀번호 확인 */}
          <div className="flex flex-col gap-1.5">
            <label htmlFor="confirm-password" style={LABEL_STYLE}>
              비밀번호 확인
            </label>
            <input
              id="confirm-password"
              type="password"
              name="confirm-password"
              autoComplete="new-password"
              placeholder="비밀번호를 다시 입력"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              disabled={loading}
              style={INPUT_STYLE}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
            />
          </div>

          {/* 약관·개인정보 동의 — PIPA 분리 동의 (LEGAL-04) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-sm)' }}>
            <ConsentCheckbox
              id="agree-terms"
              checked={agreedTerms}
              onChange={setAgreedTerms}
              disabled={loading}
              required
              error={!!error && !agreedTerms}
            >
              <Link href="/legal/terms" target="_blank" style={CONSENT_LINK_STYLE}>
                서비스 이용약관
              </Link>
              에 동의합니다.
            </ConsentCheckbox>

            <ConsentCheckbox
              id="agree-privacy"
              checked={agreedPrivacy}
              onChange={setAgreedPrivacy}
              disabled={loading}
              required
              error={!!error && !agreedPrivacy}
            >
              <Link href="/legal/privacy" target="_blank" style={CONSENT_LINK_STYLE}>
                개인정보 수집·이용
              </Link>
              에 동의합니다.
            </ConsentCheckbox>
          </div>

          {/* 가입 버튼 */}
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
            {loading ? '가입 중...' : '가입하기'}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ marginTop: 'var(--mkt-space-md)', marginBottom: 'var(--mkt-space-md)' }}>
          <OAuthDivider />
        </div>

        {/* OAuth 버튼 (disabled) */}
        <OAuthButtons />

        {/* 로그인 링크 */}
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
          이미 계정이 있으신가요?{' '}
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
            로그인
          </Link>
        </p>
      </div>
    </div>
  )
}
