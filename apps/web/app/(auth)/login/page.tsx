'use client'

/**
 * apps/web/app/(auth)/login/page.tsx
 *
 * 일반 사용자 로그인 페이지.
 * - 이메일 + 비밀번호 로그인
 * - Google / Kakao OAuth 자리 (disabled — PR4/5 에서 활성화)
 * - 마케팅 디자인 토큰(--mkt-*) 적용
 */
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type CSSProperties, type FocusEvent, type FormEvent, Suspense, useState } from 'react'

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
    // TODO PR4/5: OAuth 실 활성화 시 이 블록을 signInWithOAuth 호출로 교체
    alert('OAuth 로그인은 준비 중입니다.')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--mkt-space-xs)' }}>
      <button
        type="button"
        disabled
        onClick={handleDisabledClick}
        aria-label="Google 로 로그인 (준비 중)"
        style={{
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
        }}
      >
        {/* Google 아이콘 (단순 G) */}
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
        Google 로 로그인
        <span
          style={{
            fontSize: '11px',
            opacity: 0.6,
            marginLeft: '4px',
          }}
        >
          (준비 중)
        </span>
      </button>

      <button
        type="button"
        disabled
        onClick={handleDisabledClick}
        aria-label="카카오로 로그인 (준비 중)"
        style={{
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
        }}
      >
        {/* 카카오 아이콘 (단순 K) */}
        <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
          <rect width="18" height="18" rx="4" fill="#FEE500" />
          <path
            d="M9 4.5C6.515 4.5 4.5 6.1 4.5 8.1c0 1.272.81 2.384 2.04 3.028l-.52 1.92c-.046.174.147.312.297.21L8.58 11.9c.138.012.276.018.42.018 2.485 0 4.5-1.6 4.5-3.6S11.485 4.5 9 4.5z"
            fill="#391B1B"
          />
        </svg>
        카카오로 로그인
        <span
          style={{
            fontSize: '11px',
            opacity: 0.6,
            marginLeft: '4px',
          }}
        >
          (준비 중)
        </span>
      </button>
    </div>
  )
}

function LoginForm() {
  const searchParams = useSearchParams()
  // 안전한 next 만 허용 (외부 URL 차단)
  const requestedNext = searchParams.get('next') ?? '/'
  const nextPath =
    requestedNext.startsWith('/') && !requestedNext.startsWith('//') ? requestedNext : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요.')
      return
    }

    setLoading(true)
    try {
      const supabase = createWebBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

      if (authError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // 로그인 성공 → 목표 페이지로 이동
      // window.location.href 로 full page reload → 미들웨어가 새 쿠키를 받고 처리
      window.location.href = nextPath
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        width: '100%',
        maxWidth: '420px',
      }}
    >
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
            로그인
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
            StoryWork 계정으로 시작하세요.
          </p>
        </div>

        {/* 이메일+비밀번호 폼 */}
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
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <label htmlFor="password" style={LABEL_STYLE}>
                비밀번호
              </label>
              <Link
                href="/forgot-password"
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '13px',
                  fontWeight: 330,
                  color: 'var(--mkt-ink)',
                  opacity: 0.5,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                }}
              >
                비밀번호 잊으셨나요?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              style={INPUT_STYLE}
              onFocus={handleInputFocus}
              onBlur={handleInputBlur}
              required
            />
          </div>

          {/* 로그인 버튼 */}
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
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        {/* 구분선 */}
        <div style={{ marginTop: 'var(--mkt-space-md)', marginBottom: 'var(--mkt-space-md)' }}>
          <OAuthDivider />
        </div>

        {/* OAuth 버튼 (disabled) */}
        <OAuthButtons />

        {/* 회원가입 링크 */}
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
          계정이 없으신가요?{' '}
          <Link
            href="/signup"
            style={{
              color: 'var(--mkt-ink)',
              fontWeight: 540,
              textDecoration: 'underline',
              textUnderlineOffset: '3px',
              opacity: 1,
            }}
          >
            회원가입
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            color: 'var(--mkt-ink)',
            opacity: 0.5,
          }}
        >
          로딩 중...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
