'use client'

/**
 * ResourceReviewClient — ReviewQueue 기반 검수 UI
 */

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { ReviewQueue } from '../../../../src/components/review-queue/ReviewQueue'
import type { AdminRole } from '../../../../src/lib/auth'
import { KIND_LABELS } from '../ResourceListClient'

// ReviewQueue 에 넘기는 item 타입
export interface ReviewItem {
  id: string
  slug: string
  kind: string
  thumbUrl: string | null
  meta: Record<string, unknown>
  tags: string[]
  status: string
  lowDpi: boolean
  createdAt: string
}

interface ResourceReviewClientProps {
  initialItems: ReviewItem[]
  totalCount: number
  userRole: AdminRole
}

// ─── 검수 카드 ────────────────────────────────────────────────────────────────

function ReviewCard({ item, isFocused }: { item: ReviewItem; isFocused: boolean }) {
  const action = item.meta['action'] as string | undefined
  const bodyType = item.meta['bodyType'] as string | undefined

  return (
    <div
      className={`p-3 flex flex-col gap-2 transition-opacity ${isFocused ? 'opacity-100' : 'opacity-85'}`}
    >
      {/* 썸네일 */}
      {item.thumbUrl ? (
        <div className="relative w-full aspect-square rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] overflow-hidden">
          <Image
            src={item.thumbUrl}
            alt={item.slug}
            fill
            sizes="(max-width: 768px) 50vw, 256px"
            className="object-contain"
          />
        </div>
      ) : (
        <div className="w-full aspect-square flex items-center justify-center rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] text-sm text-[var(--color-text-muted)]">
          이미지 없음
        </div>
      )}

      {/* 정보 */}
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium text-[var(--color-text)] truncate">{item.slug}</p>
        <div className="flex flex-wrap gap-1">
          <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]">
            {(KIND_LABELS as Record<string, string>)[item.kind] ?? item.kind}
          </span>
          {action && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
              {action}
            </span>
          )}
          {bodyType && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]">
              {bodyType}
            </span>
          )}
          {item.lowDpi && (
            <span className="text-xs px-1.5 py-0.5 rounded-full bg-amber-100 text-amber-700">
              저해상도
            </span>
          )}
        </div>
        <p className="text-xs text-[var(--color-text-disabled)]">
          {new Date(item.createdAt).toLocaleDateString('ko-KR')}
        </p>
      </div>
    </div>
  )
}

// ─── ResourceReviewClient ─────────────────────────────────────────────────────

export function ResourceReviewClient({
  initialItems,
  totalCount,
  userRole: _userRole,
}: ResourceReviewClientProps) {
  const router = useRouter()
  const [items, setItems] = React.useState<ReviewItem[]>(initialItems)

  const handleApprove = async (item: ReviewItem) => {
    const res = await fetch(`/api/resources/${item.id}/publish`, { method: 'POST' })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? '게시 실패')
    }
    setItems((prev) => prev.filter((r) => r.id !== item.id))
  }

  const handleReject = async (item: ReviewItem, reason: string) => {
    const res = await fetch(`/api/resources/${item.id}/reject`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason }),
    })
    if (!res.ok) {
      const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      throw new Error(err.error?.message ?? '거절 실패')
    }
    setItems((prev) => prev.filter((r) => r.id !== item.id))
  }

  return (
    <ReviewQueue
      items={items}
      rowKey={(item) => item.id}
      renderCard={(item, opts) => <ReviewCard item={item} isFocused={opts.isFocused} />}
      totalCount={totalCount}
      onApprove={handleApprove}
      onReject={handleReject}
      extraActions={[
        {
          id: 'edit-keypoints',
          label: '키포인트 편집',
          key: 'e',
          handler: async (item) => {
            router.push(`/resources/${item.id}`)
          },
        },
      ]}
      emptyState={
        <div className="flex flex-col items-center gap-3">
          <p className="text-lg font-medium text-[var(--color-text)]">검수 대기 항목이 없습니다</p>
          <p className="text-sm text-[var(--color-text-muted)]">모든 리소스가 처리되었습니다.</p>
          <Link
            href="/resources/upload"
            className="mt-2 text-sm text-[var(--color-brand-500)] hover:text-[var(--color-brand-600)] underline focus-visible:outline-none"
          >
            신규 업로드 →
          </Link>
        </div>
      }
    />
  )
}
