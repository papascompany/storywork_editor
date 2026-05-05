'use client'

import { Button, Card, CardDescription, CardHeader, CardTitle, useTheme } from '@storywork/ui'
import { FileText, Moon, Palette, Sparkles, Sun } from 'lucide-react'
import Link from 'next/link'

export default function HomePage() {
  const { resolvedTheme, toggleTheme } = useTheme()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 px-4 py-16">
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

      {/* Hero */}
      <section className="flex flex-col items-center gap-4 text-center">
        <div className="flex items-center gap-2 rounded-full border border-[var(--color-brand-200)] bg-[var(--color-brand-50)] px-3 py-1 dark:border-[var(--color-brand-800)] dark:bg-[var(--color-brand-950)]">
          <Sparkles className="size-3.5 text-[var(--color-brand-500)]" aria-hidden="true" />
          <span className="text-xs font-medium text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]">
            M0 부트스트랩 완료
          </span>
        </div>

        <h1 className="text-4xl font-bold tracking-tight text-[var(--color-text)] sm:text-5xl">
          Story<span className="text-[var(--color-brand-500)]">Work</span>
        </h1>

        <p className="max-w-md text-lg text-[var(--color-text-muted)]">
          AI 스토리보드 편집기 — 대본에서 POD 출판까지
        </p>

        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button size="md" asChild>
            <Link href="/editor">편집기 시작하기</Link>
          </Button>
          <Button variant="outline" size="md">
            더 알아보기
          </Button>
        </div>
      </section>

      {/* 기능 카드 그리드 */}
      <section
        className="grid w-full max-w-3xl grid-cols-1 gap-4 sm:grid-cols-3"
        aria-label="주요 기능"
      >
        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]">
              <FileText className="size-5 text-[var(--color-brand-500)]" aria-hidden="true" />
            </div>
            <CardTitle className="text-base">AI 대본 분석</CardTitle>
            <CardDescription>대본을 붙여넣으면 장면 분할 + 포즈/배경 자동 배치</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-pose-50, #fdf2f8)] dark:bg-[var(--color-pose-950, #500724)]">
              <Palette
                className="size-5 text-[var(--color-pose-500, #ec4899)]"
                aria-hidden="true"
              />
            </div>
            <CardTitle className="text-base">포즈 라이브러리</CardTitle>
            <CardDescription>1,000+ PNG 포즈 시맨틱 검색 + 편집기 드래그</CardDescription>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader>
            <div className="mb-1 flex size-10 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-pdf-50, #fff7ed)] dark:bg-[var(--color-pdf-950, #431407)]">
              <FileText
                className="size-5 text-[var(--color-pdf-500, #f97316)]"
                aria-hidden="true"
              />
            </div>
            <CardTitle className="text-base">POD 출판</CardTitle>
            <CardDescription>인쇄소 규격 PDF 자동 생성 + 재단선 프리플라이트</CardDescription>
          </CardHeader>
        </Card>
      </section>

      {/* 상태 pill */}
      <div className="flex flex-wrap justify-center gap-2" aria-label="개발 현황">
        {[
          { label: 'M0 부트스트랩', status: 'done' },
          { label: 'M1 편집기 코어', status: 'active' },
          { label: 'M2 포즈 인덱싱', status: 'pending' },
          { label: 'M3 관리자 콘솔', status: 'pending' },
        ].map(({ label, status }) => (
          <span
            key={label}
            className={[
              'rounded-full px-3 py-1 text-xs font-medium',
              status === 'done'
                ? 'bg-[var(--color-success-500,#22c55e)]/10 text-[var(--color-success-600,#16a34a)] dark:text-[var(--color-success-400,#4ade80)]'
                : status === 'active'
                  ? 'bg-[var(--color-brand-500)]/10 text-[var(--color-brand-600)] dark:text-[var(--color-brand-400)]'
                  : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
            ].join(' ')}
          >
            {label}
          </span>
        ))}
      </div>
    </main>
  )
}

// Vercel deploy trigger: 2026-05-05T04:59:53Z
