'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@storywork/ui'
import { Shield } from 'lucide-react'
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

  // 서버에서 새 TOTP 시크릿 + QR 코드 가져오기
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

      // 설정 완료 → 대시보드로 이동
      router.push('/')
      router.refresh()
    } catch {
      setError('오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 bg-[var(--color-surface-muted)]">
      {/* 로고 */}
      <div className="flex items-center gap-2">
        <div className="flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-500)]">
          <Shield className="size-5 text-white" aria-hidden="true" />
        </div>
        <span className="text-xl font-bold text-[var(--color-text)]">
          StoryWork{' '}
          <span className="text-[var(--color-text-muted)] font-normal text-base">Admin</span>
        </span>
      </div>

      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>2단계 인증 설정</CardTitle>
          <CardDescription>
            Google Authenticator 또는 Authy 앱으로 QR 코드를 스캔하세요.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {fetching ? (
            <div className="flex h-40 items-center justify-center">
              <span className="text-sm text-[var(--color-text-muted)]">QR 코드 생성 중...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {error && (
                <div
                  role="alert"
                  className="rounded-[var(--radius-sm)] bg-[var(--color-error-50)] border border-[var(--color-error-200)] px-3 py-2 text-sm text-[var(--color-error-700)]"
                >
                  {error}
                </div>
              )}

              {/* QR 코드 */}
              {qrDataUrl && (
                <div className="flex flex-col items-center gap-2">
                  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] p-2 bg-white">
                    <Image
                      src={qrDataUrl}
                      alt="TOTP QR 코드"
                      width={192}
                      height={192}
                      unoptimized
                    />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] text-center">
                    앱으로 스캔하거나, 코드를 직접 입력하세요.
                  </p>
                </div>
              )}

              {/* 6자리 코드 입력 */}
              <Input
                label="인증 코드"
                type="text"
                inputMode="numeric"
                pattern="\d{6}"
                maxLength={6}
                placeholder="123456"
                value={token}
                onChange={(e) => setToken(e.target.value.replace(/\D/g, ''))}
                autoComplete="one-time-code"
                disabled={loading}
              />

              <Button type="submit" size="md" className="w-full" disabled={loading || !qrDataUrl}>
                {loading ? '확인 중...' : '설정 완료'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  )
}
