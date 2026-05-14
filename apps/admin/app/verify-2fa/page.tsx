'use client'

import { Sparkles } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'

function VerifyForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/'

  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!/^\d{6}$/.test(token.trim())) {
      setError('6자리 숫자를 입력하세요.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/totp-verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim() }),
      })

      const data = (await res.json()) as { ok?: boolean; error?: string }

      if (res.status === 429) {
        setError(data.error ?? '인증 시도 횟수를 초과했습니다.')
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      if (!res.ok) {
        setError(data.error ?? '코드가 올바르지 않습니다.')
        return
      }

      router.push(nextPath)
      router.refresh()
    } catch {
      setError('오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--mkt-surface-soft)', fontFamily: 'var(--mkt-font-sans)' }}
    >
      <div
        className="w-full max-w-md"
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          borderRadius: 'var(--mkt-rounded-lg)',
          border: '1px solid var(--mkt-hairline)',
          padding: '48px 40px',
        }}
      >
        {/* 로고 */}
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
              fontSize: 'clamp(24px, 3.5vw, 32px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--mkt-ink)',
            }}
          >
            2단계 인증
          </h1>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '16px',
              fontWeight: 330,
              lineHeight: 1.45,
              color: 'var(--mkt-ink)',
              opacity: 0.6,
              marginTop: '4px',
            }}
          >
            인증 앱의 6자리 코드를 입력하세요. 5회 실패 시 세션이 만료됩니다.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
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

          {/* 6자리 코드 입력 */}
          <div className="flex flex-col gap-1.5">
            <label
              htmlFor="totp-verify-code"
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 480,
                letterSpacing: '-0.10px',
                color: 'var(--mkt-ink)',
              }}
            >
              인증 코드
            </label>
            <input
              id="totp-verify-code"
              type="text"
              inputMode="numeric"
              pattern="\d{6}"
              maxLength={6}
              placeholder="123456"
              value={token}
              onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
              autoComplete="one-time-code"
              autoFocus
              disabled={loading}
              style={{
                backgroundColor: 'var(--mkt-canvas)',
                border: '1px solid var(--mkt-hairline)',
                borderRadius: 'var(--mkt-rounded-md)',
                padding: '12px 14px',
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '24px',
                fontWeight: 400,
                letterSpacing: '0.4em',
                color: 'var(--mkt-ink)',
                outline: 'none',
                width: '100%',
                textAlign: 'center',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = 'var(--mkt-ink)'
                e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = 'var(--mkt-hairline)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="mkt-btn-primary"
            style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.6 : undefined }}
          >
            {loading ? '확인 중...' : '인증'}
          </button>

          {/* 다른 계정으로 로그인 */}
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              style={{
                width: '100%',
                padding: '10px',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.5,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                textAlign: 'center',
              }}
            >
              다른 계정으로 로그인
            </button>
          </form>
        </form>
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
        StoryWork Admin Console — 2FA 인증
      </p>
    </main>
  )
}

export default function Verify2FAPage() {
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
      <VerifyForm />
    </Suspense>
  )
}
