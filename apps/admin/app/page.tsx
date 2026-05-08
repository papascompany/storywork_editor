import { requireRole } from '../src/lib/auth'

export default async function DashboardPage() {
  // 인증 + admin role + 2FA 검증. 실패 시 내부에서 리다이렉트.
  const user = await requireRole()

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 py-16 bg-[var(--color-surface-muted)]">
      <div className="w-full max-w-2xl">
        {/* 헤더 */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[var(--color-text)]">대시보드</h1>
            <p className="text-sm text-[var(--color-text-muted)] mt-1">
              {user.email}{' '}
              <span className="inline-flex items-center rounded-full bg-[var(--color-brand-100)] px-2 py-0.5 text-xs font-medium text-[var(--color-brand-700)]">
                {user.role}
              </span>
            </p>
          </div>
          <form action="/api/auth/logout" method="post">
            <button
              type="submit"
              className="rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-hover)] transition-colors"
            >
              로그아웃
            </button>
          </form>
        </div>

        {/* 플레이스홀더 */}
        <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] border-dashed bg-[var(--color-surface)] p-12 text-center">
          <p className="text-[var(--color-text-muted)] font-medium">M3-02부터 채워집니다</p>
          <p className="text-sm text-[var(--color-text-disabled)] mt-2">
            DataTable / EntityForm / ReviewQueue 공용 컴포넌트 + 판형·리소스 CRUD
          </p>
        </div>
      </div>
    </main>
  )
}
