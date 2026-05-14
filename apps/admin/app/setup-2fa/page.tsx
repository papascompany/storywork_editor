'use client'

import { Sparkles } from 'lucide-react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'

export default function Setup2FAPage() {
  const router = useRouter()
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null)
  const [secret, setSecret] = useState<string | null>(null)
  const [token, setToken] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    async function fetchSetup() {
      try {
        const res = await fetch('/api/auth/totp-setup-init')
        if (!res.ok) {
          setError('TOTP 설정을 불러오는데 실패했습니다.')
          return
        }
        const data = (await res.json()) as { qrDataUrl: string; secret: string }
        setQrDataUrl(data.qrDataUrl)
        setSecret(data.secret)
      } catch {
        setError('TOTP 설정을 불러오는데 실패했습니다.')
      } finally {
        setFetching(false)
      }
    }
    void fetchSetup()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!secret) {
      setError('시크릿이 로드되지 않았습니다. 페이지를 새로고침하세요.')
      return
    }

    if (!/^\d{6}$/.test(token.trim())) {
      setError('6자리 숫자를 입력하세요.')
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/totp-setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.trim(), secret }),
      })

      const data = (await res.json()) as { ok?: boolean; error?: string }

      if (!res.ok) {
        setError(data.error ?? '코드 확인에 실패했습니다.')
        return
      }

      router.push('/')
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
            2단계 인증 설정
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
            Google Authenticator 또는 Authy 앱으로 QR 코드를 스캔하세요.
          </p>
        </div>

        {fetching ? (
          <div
            className="flex h-40 items-center justify-center"
            style={{
              borderRadius: 'var(--mkt-rounded-md)',
              backgroundColor: 'var(--mkt-surface-soft)',
            }}
          >
            <span
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              QR 코드 생성 중...
            </span>
          </div>
        ) : (
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

            {/* QR 코드 */}
            {qrDataUrl && (
              <div className="flex flex-col items-center gap-3">
                <div
                  style={{
                    borderRadius: 'var(--mkt-rounded-md)',
                    border: '1px solid var(--mkt-hairline)',
                    padding: '12px',
                    backgroundColor: '#ffffff',
                  }}
                >
                  <Image src={qrDataUrl} alt="TOTP QR 코드" width={192} height={192} unoptimized />
                </div>
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '13px',
                    fontWeight: 330,
                    color: 'var(--mkt-ink)',
                    opacity: 0.5,
                    textAlign: 'center',
                  }}
                >
                  앱으로 스캔하거나, 코드를 직접 입력하세요.
                </p>
              </div>
            )}

            {/* 6자리 코드 입력 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="totp-code"
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
                id="totp-code"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                disabled={loading}
                style={{
                  backgroundColor: 'var(--mkt-canvas)',
                  border: '1px solid var(--mkt-hairline)',
                  borderRadius: 'var(--mkt-rounded-md)',
                  padding: '12px 14px',
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '20px',
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
              disabled={loading || !qrDataUrl}
              className="mkt-btn-primary"
              style={{
                width: '100%',
                marginTop: '8px',
                opacity: loading || !qrDataUrl ? 0.6 : undefined,
              }}
            >
              {loading ? '확인 중...' : '설정 완료'}
            </button>
          </form>
        )}
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
        StoryWork Admin Console — 2FA 설정 필수
      </p>
    </main>
  )
}
