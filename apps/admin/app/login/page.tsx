'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { type CSSProperties, type FocusEvent, type FormEvent, Suspense, useState } from 'react'

import { createAdminBrowserClient } from '../../src/lib/supabase/client'

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
}

function handleInputFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-ink)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
}

function handleInputBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-hairline)'
  e.currentTarget.style.boxShadow = 'none'
}

function LoginForm() {
  const searchParams = useSearchParams()
  // 안전한 next 만 허용 (외부 URL 차단 + 삭제된 2FA 페이지 차단)
  const requestedNext = searchParams.get('next') ?? '/'
  const STALE_PATHS = new Set(['/verify-2fa', '/setup-2fa'])
  const nextPath =
    requestedNext.startsWith('/') &&
    !requestedNext.startsWith('//') &&
    !STALE_PATHS.has(requestedNext)
      ? requestedNext
      : '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  // 비밀번호 찾기 모드
  const [forgotMode, setForgotMode] = useState(false)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotMessage, setForgotMessage] = useState('')
  const [forgotError, setForgotError] = useState('')

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (!email || !password) {
      setError('이메일과 비밀번호를 입력하세요.')
      return
    }

    setLoading(true)

    try {
      const supabase = createAdminBrowserClient()
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) {
        setError('이메일 또는 비밀번호가 올바르지 않습니다.')
        return
      }

      // 로그인 성공 → 대시보드로 이동
      // Supabase SSR cookie 가 set 되는 시점과 router.push 의 race condition 회피.
      // window.location.href 로 full page reload → 미들웨어가 새 cookie 받고 처리.
      window.location.href = nextPath
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  const handleForgotSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setForgotError('')
    setForgotMessage('')

    if (!forgotEmail) {
      setForgotError('이메일을 입력하세요.')
      return
    }

    setForgotLoading(true)
    try {
      const supabase = createAdminBrowserClient()
      const redirectTo = `${window.location.origin}/reset-password`
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo,
      })

      if (resetError) {
        setForgotError(`이메일 발송 실패: ${resetError.message}`)
        return
      }

      setForgotMessage('재설정 이메일을 보냈습니다. 받은 편지함을 확인하세요.')
    } catch {
      setForgotError('이메일 발송 중 오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--mkt-surface-soft)', fontFamily: 'var(--mkt-font-sans)' }}
    >
      {/* 카드 컨테이너 */}
      <div
        className="w-full max-w-md"
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          borderRadius: 'var(--mkt-rounded-lg)',
          border: '1px solid var(--mkt-hairline)',
          padding: '48px 40px',
        }}
      >
        {/* 로고 영역 */}
        <div className="mb-8 flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-6" aria-hidden="true" style={{ color: 'var(--mkt-ink)' }} />
            <span
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '18px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
              }}
            >
              StoryWork Admin
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--mkt-ink)',
            }}
          >
            {forgotMode ? '비밀번호 찾기' : '관리자 로그인'}
          </h1>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '16px',
              fontWeight: 330,
              lineHeight: 1.45,
              letterSpacing: '-0.14px',
              color: 'var(--mkt-ink)',
              opacity: 0.6,
              marginTop: '4px',
            }}
          >
            {forgotMode
              ? '가입 시 사용한 이메일로 재설정 링크를 보냅니다.'
              : '관리자 계정으로 콘솔에 접속합니다.'}
          </p>
        </div>

        {/* 비밀번호 찾기 폼 */}
        {forgotMode ? (
          <form onSubmit={handleForgotSubmit} className="flex flex-col gap-4" noValidate>
            {/* 에러 메시지 */}
            {forgotError && (
              <div
                role="alert"
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
                {forgotError}
              </div>
            )}

            {/* 성공 메시지 */}
            {forgotMessage && (
              <div
                role="status"
                style={{
                  borderRadius: 'var(--mkt-rounded-md)',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #a7f3c0',
                  padding: '10px 14px',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: '#166534',
                }}
              >
                {forgotMessage}
              </div>
            )}

            {/* 이메일 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="forgot-email"
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
                id="forgot-email"
                type="email"
                name="forgot-email"
                autoComplete="email"
                placeholder="admin@storywork.io"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                disabled={forgotLoading || Boolean(forgotMessage)}
                style={INPUT_STYLE}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            {/* 발송 버튼 */}
            {!forgotMessage && (
              <button
                type="submit"
                disabled={forgotLoading}
                className="mkt-btn-primary"
                style={{
                  width: '100%',
                  marginTop: '8px',
                  opacity: forgotLoading ? 0.6 : undefined,
                }}
              >
                {forgotLoading ? '발송 중...' : '재설정 이메일 보내기'}
              </button>
            )}

            {/* 로그인으로 돌아가기 */}
            <p
              style={{
                textAlign: 'center',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false)
                  setForgotEmail('')
                  setForgotError('')
                  setForgotMessage('')
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--mkt-ink)',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '13px',
                  fontWeight: 480,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  padding: 0,
                  opacity: 1,
                }}
              >
                로그인으로 돌아가기
              </button>
            </p>
          </form>
        ) : (
          /* 로그인 폼 */
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* 에러 메시지 */}
            {error && (
              <div
                role="alert"
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
                placeholder="admin@storywork.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                style={INPUT_STYLE}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            {/* 비밀번호 */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="password"
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '14px',
                    fontWeight: 480,
                    letterSpacing: '-0.10px',
                    color: 'var(--mkt-ink)',
                  }}
                >
                  비밀번호
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setForgotMode(true)
                    setForgotEmail(email)
                    setError('')
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '13px',
                    fontWeight: 330,
                    color: 'var(--mkt-ink)',
                    opacity: 0.5,
                    padding: 0,
                    textDecoration: 'underline',
                    textUnderlineOffset: '3px',
                  }}
                >
                  비밀번호 잊으셨나요?
                </button>
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
              />
            </div>

            {/* 로그인 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="mkt-btn-primary"
              style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.6 : undefined }}
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>

            {/* 문의 링크 */}
            <p
              style={{
                textAlign: 'center',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              계정이 없으신가요?{' '}
              <a
                href="mailto:yohan73@gmail.com"
                style={{
                  color: 'var(--mkt-ink)',
                  fontWeight: 480,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  opacity: 1,
                }}
              >
                문의하기
              </a>
            </p>
          </form>
        )}
      </div>

      {/* 사용자 페이지 링크 */}
      <div className="mt-6">
        <Link
          href="/"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.5,
            textDecoration: 'none',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '0.5'
          }}
        >
          ← 사용자 페이지로 돌아가기
        </Link>
      </div>

      <p
        style={{
          marginTop: '24px',
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--mkt-ink)',
          opacity: 0.3,
        }}
      >
        StoryWork Admin Console — 권한 없는 접근 시 자동 차단
      </p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div
          className="flex min-h-dvh items-center justify-center"
          style={{ backgroundColor: 'var(--mkt-surface-soft)' }}
        >
          <span
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
            }}
          >
            로딩 중...
          </span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
