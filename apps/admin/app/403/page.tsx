import { Button } from '@storywork/ui'
import { ShieldX } from 'lucide-react'
import Link from 'next/link'

export default function ForbiddenPage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 bg-[var(--color-surface-muted)]">
      <div className="flex size-16 items-center justify-center rounded-full bg-[var(--color-error-100)]">
        <ShieldX className="size-8 text-[var(--color-error-600)]" aria-hidden="true" />
      </div>

      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">접근 권한 없음</h1>
        <p className="text-sm text-[var(--color-text-muted)] max-w-xs">
          이 페이지에 접근할 권한이 없습니다. 관리자 계정으로 로그인하거나 권한을 확인하세요.
        </p>
      </div>

      <div className="flex flex-col gap-2 w-full max-w-xs">
        <Button asChild size="md" className="w-full">
          <Link href="/login">로그인 페이지로</Link>
        </Button>
        <Button asChild variant="ghost" size="sm" className="w-full">
          <a href="mailto:yohan73@gmail.com">권한 요청하기</a>
        </Button>
      </div>

      <p className="text-xs text-[var(--color-text-disabled)]">HTTP 403 — Forbidden</p>
    </main>
  )
}
