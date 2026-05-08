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

import { createAdminBrowserClient } from '../../src/lib/supabase/client'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const nextPath = searchParams.get('next') ?? '/'

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
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

      // 로그인 성공 → 미들웨어가 TOTP 게이트로 리다이렉트
      router.push(nextPath)
      router.refresh()
    } catch {
      setError('로그인 중 오류가 발생했습니다. 다시 시도하세요.')
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

      {/* 로그인 카드 */}
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>관리자 로그인</CardTitle>
          <CardDescription>관리자 계정으로 로그인하세요</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* 에러 메시지 */}
            {error && (
              <div
                role="alert"
                className="rounded-[var(--radius-sm)] bg-[var(--color-error-50)] border border-[var(--color-error-200)] px-3 py-2 text-sm text-[var(--color-error-700)]"
              >
                {error}
              </div>
            )}

            <Input
              label="이메일"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="admin@storywork.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
            />
            <Input
              label="비밀번호"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <Button type="submit" size="md" className="w-full" disabled={loading}>
              {loading ? '로그인 중...' : '로그인'}
            </Button>
            <p className="text-center text-xs text-[var(--color-text-muted)]">
              관리자 계정이 없으신가요?{' '}
              <a
                href="mailto:yohan73@gmail.com"
                className="text-[var(--color-brand-500)] underline underline-offset-4 hover:text-[var(--color-brand-600)]"
              >
                문의하기
              </a>
            </p>
          </form>
        </CardContent>
      </Card>

      <p className="text-xs text-[var(--color-text-disabled)]">
        StoryWork 관리자 콘솔 — 권한 없는 접근 시 자동 차단됩니다.
      </p>
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center">
          <span className="text-[var(--color-text-muted)] text-sm">로딩 중...</span>
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
