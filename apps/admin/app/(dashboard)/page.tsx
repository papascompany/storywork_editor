/**
 * (dashboard)/page.tsx — 대시보드 홈
 *
 * 인증 + admin role + 2FA 검증 후 접근 가능.
 * 주요 섹션으로 빠르게 이동하는 링크 카드 구성.
 */
import { Layers } from 'lucide-react'
import Link from 'next/link'

import { requireRole } from '../../src/lib/auth'

export default async function DashboardPage() {
  const user = await requireRole()

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--color-text)]">대시보드</h1>
        <p className="mt-1 text-sm text-[var(--color-text-muted)]">
          {user.email}{' '}
          <span className="inline-flex items-center rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-700)]">
            {user.role}
          </span>
        </p>
      </div>

      {/* 빠른 이동 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link
          href="/formats"
          className="flex items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5 transition-colors hover:bg-[var(--color-surface-muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        >
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-brand-100)]">
            <Layers className="size-5 text-[var(--color-brand-700)]" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text)]">판형 관리</p>
            <p className="text-xs text-[var(--color-text-muted)]">인쇄 판형 등록 및 편집</p>
          </div>
        </Link>

        {/* 리소스 — M3-04 이후 활성화 */}
        <div className="flex cursor-not-allowed items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] p-5 opacity-50">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]">
            <span className="text-lg" aria-hidden="true">
              🖼
            </span>
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text)]">리소스 관리</p>
            <p className="text-xs text-[var(--color-text-muted)]">M3-04 예정</p>
          </div>
        </div>

        {/* 템플릿 — M3-05 이후 활성화 */}
        <div className="flex cursor-not-allowed items-center gap-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] p-5 opacity-50">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)]">
            <span className="text-lg" aria-hidden="true">
              📐
            </span>
          </div>
          <div>
            <p className="font-semibold text-[var(--color-text)]">템플릿 관리</p>
            <p className="text-xs text-[var(--color-text-muted)]">M3-05 예정</p>
          </div>
        </div>
      </div>
    </div>
  )
}
