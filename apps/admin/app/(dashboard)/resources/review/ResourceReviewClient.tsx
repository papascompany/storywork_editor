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
      style={{
        padding: '12px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        opacity: isFocused ? 1 : 0.85,
        transition: 'opacity 150ms ease',
      }}
    >
      {/* 썸네일 */}
      {item.thumbUrl ? (
        <div
          className="relative w-full aspect-square overflow-hidden"
          style={{
            borderRadius: 'var(--nike-admin-rounded-md)',
            backgroundColor: 'var(--nike-soft-cloud)',
          }}
        >
          <Image
            src={item.thumbUrl}
            alt={item.slug}
            fill
            sizes="(max-width: 768px) 50vw, 256px"
            className="object-contain"
          />
        </div>
      ) : (
        <div
          className="w-full aspect-square flex items-center justify-center"
          style={{
            borderRadius: 'var(--nike-admin-rounded-md)',
            backgroundColor: 'var(--nike-soft-cloud)',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            color: 'var(--nike-ink)',
            opacity: 0.4,
          }}
        >
          이미지 없음
        </div>
      )}

      {/* 정보 */}
      <div className="flex flex-col gap-1">
        <p
          className="truncate"
          style={{
            fontFamily: 'var(--nike-font-mono)',
            fontSize: '12px',
            fontWeight: 400,
            color: 'var(--nike-ink)',
          }}
        >
          {item.slug}
        </p>
        <div className="flex flex-wrap gap-1">
          <span
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '2px 8px',
              borderRadius: 'var(--nike-rounded-full)',
              backgroundColor: 'var(--nike-card-lilac)',
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '11px',
              color: 'var(--nike-ink)',
            }}
          >
            {(KIND_LABELS as Record<string, string>)[item.kind] ?? item.kind}
          </span>
          {action && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 'var(--nike-rounded-full)',
                backgroundColor: 'var(--nike-soft-cloud)',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '11px',
                color: 'var(--nike-ink)',
                opacity: 0.7,
              }}
            >
              {action}
            </span>
          )}
          {bodyType && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 'var(--nike-rounded-full)',
                backgroundColor: 'var(--nike-soft-cloud)',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '11px',
                color: 'var(--nike-ink)',
                opacity: 0.7,
              }}
            >
              {bodyType}
            </span>
          )}
          {item.lowDpi && (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 'var(--nike-rounded-full)',
                backgroundColor: 'var(--nike-card-coral)',
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '11px',
                color: 'var(--nike-ink)',
              }}
            >
              저해상도
            </span>
          )}
        </div>
        <p
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-ink)',
            opacity: 0.4,
          }}
        >
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
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '17px',
              fontWeight: 540,
              letterSpacing: '-0.26px',
              color: 'var(--nike-ink)',
            }}
          >
            검수 대기 항목이 없습니다
          </p>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--nike-ink)',
              opacity: 0.55,
            }}
          >
            모든 리소스가 처리되었습니다.
          </p>
          <Link
            href="/resources/upload"
            className="nike-btn-primary"
            style={{ marginTop: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}
          >
            신규 업로드 →
          </Link>
        </div>
      }
    />
  )
}
