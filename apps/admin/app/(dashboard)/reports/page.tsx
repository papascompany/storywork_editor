/**
 * /admin/reports — 신고 처리 큐 (BOARD-07)
 *
 * pending 우선. status 필터 + 숨김/기각 처리.
 */
import { requireRole } from '../../../src/lib/auth'

import { ReportsQueueClient } from './ReportsQueueClient'

export const dynamic = 'force-dynamic'

export default async function AdminReportsPage() {
  await requireRole('curator')
  return (
    <div className="p-6 lg:p-10">
      <header className="mb-6">
        <h1 className="nike-heading-xl">신고 처리</h1>
        <p className="nike-caption-md mt-1">
          작품/댓글 신고를 검토하고 숨김 또는 기각합니다. 같은 대상의 미처리 신고는 함께 정리됩니다.
        </p>
      </header>
      <ReportsQueueClient />
    </div>
  )
}
