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
        // 세션 무효화 → 로그인 페이지로
        setError(data.error ?? '인증 시도 횟수를 초과했습니다.')
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      if (!res.ok) {
        setError(data.error ?? '코드가 올바르지 않습니다.')
        return
      }

      // 성공 → 목적지로
      router.push(nextPath)
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
          <CardTitle>2단계 인증</CardTitle>
          <CardDescription>
            인증 앱의 6자리 코드를 입력하세요. 5회 실패 시 세션이 만료됩니다.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-sm)] bg-[var(--color-error-50)] border border-[var(--color-error-200)] px-3 py-2 text-sm text-[var(--color-error-700)]"
              >
                {error}
              </div>
            )}

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
              autoFocus
              disabled={loading}
            />

            <Button type="submit" size="md" className="w-full" disabled={loading}>
              {loading ? '확인 중...' : '인증'}
            </Button>

            <form action="/api/auth/logout" method="post">
              <Button
                type="submit"
                variant="ghost"
                size="sm"
                className="w-full text-[var(--color-text-muted)]"
              >
                다른 계정으로 로그인
              </Button>
            </form>
          </form>
        </CardContent>
      </Card>
    </main>
  )
}

export default function Verify2FAPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <span className="text-[var(--color-text-muted)] text-sm">로딩 중...</span>
        </div>
      }
    >
      <VerifyForm />
    </Suspense>
  )
}
