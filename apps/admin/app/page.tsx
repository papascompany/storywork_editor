'use client'

import {
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  useTheme,
} from '@storywork/ui'
import { Shield, Moon, Sun } from 'lucide-react'
import { useState } from 'react'

export default function AdminHomePage() {
  const { resolvedTheme, toggleTheme } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [emailError, setEmailError] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.includes('@')) {
      setEmailError('올바른 이메일 주소를 입력하세요')
      return
    }
    setEmailError('')
    // M3 에서 실제 인증 구현
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 bg-[var(--color-surface-muted)]">
      {/* 다크모드 토글 */}
      <div className="fixed right-4 top-4">
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          aria-label={resolvedTheme === 'dark' ? '라이트 모드로 전환' : '다크 모드로 전환'}
        >
          {resolvedTheme === 'dark' ? <Sun className="size-5" /> : <Moon className="size-5" />}
        </Button>
      </div>

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
            <Input
              label="이메일"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="admin@storywork.io"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              variant={emailError ? 'error' : 'default'}
              errorText={emailError}
            />
            <Input
              label="비밀번호"
              type="password"
              name="password"
              autoComplete="current-password"
              placeholder="비밀번호 입력"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <Button type="submit" size="md" className="w-full">
              로그인
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

      <p className="text-xs text-[var(--color-text-disabled)]">M3에서 실제 인증 구현 예정</p>
    </main>
  )
}
