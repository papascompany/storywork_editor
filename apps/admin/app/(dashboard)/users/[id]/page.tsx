/**
 * /admin/users/[id] — 회원 상세 + 복원
 *
 * - 프로필 + 활동 통계
 * - 탈퇴 사용자인 경우 복원 버튼
 * - 복원 시 audit log 기록
 *
 * LEGAL-OPS-03
 */
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

function formatDate(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

async function restoreUser(userId: string, adminId: string) {
  'use server'
  await prisma.user.update({
    where: { id: userId },
    data: {
      deletedAt: null,
      deletionScheduledFor: null,
      deletionReason: null,
    },
  })
  await prisma.auditLog.create({
    data: {
      actorId: adminId,
      action: 'user.admin_restore',
      target: `user:${userId}`,
      payload: { restoredAt: new Date().toISOString() },
    },
  })
  redirect('/users')
}

export default async function AdminUserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requireRole('support')
  const { id } = await params

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      avatarUrl: true,
      marketingConsent: true,
      deletedAt: true,
      deletionScheduledFor: true,
      deletionReason: true,
      createdAt: true,
      updatedAt: true,
      _count: {
        select: {
          projects: true,
          inquiries: true,
          showcases: true,
          subscriptions: true,
        },
      },
    },
  })

  if (!user) {
    notFound()
  }

  const isDeleted = !!user.deletedAt
  const restoreAction = restoreUser.bind(null, user.id, admin.id)

  return (
    <div className="nike-main-inner">
      <div style={{ marginBottom: '24px' }}>
        <Link
          href="/users"
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-stone)',
            textDecoration: 'none',
          }}
        >
          &larr; 회원 목록으로
        </Link>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: '16px',
          marginBottom: '28px',
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: 'var(--nike-font-display)',
              fontSize: '22px',
              fontWeight: 500,
              color: 'var(--nike-ink)',
              marginBottom: '4px',
            }}
          >
            {user.name ?? user.email}
          </h1>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              color: 'var(--nike-stone)',
            }}
          >
            {user.email}
          </p>
        </div>

        {isDeleted && (
          <form action={restoreAction}>
            <button
              type="submit"
              style={{
                height: '40px',
                padding: '0 20px',
                border: '1px solid var(--nike-sale)',
                borderRadius: '6px',
                backgroundColor: 'transparent',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '13px',
                fontWeight: 500,
                color: 'var(--nike-sale)',
                cursor: 'pointer',
              }}
            >
              계정 복원
            </button>
          </form>
        )}
      </div>

      {/* 탈퇴 알림 */}
      {isDeleted && (
        <div
          style={{
            backgroundColor: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '8px',
            padding: '16px 20px',
            marginBottom: '24px',
          }}
        >
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              color: '#dc2626',
              fontWeight: 500,
            }}
          >
            탈퇴된 계정입니다.
          </p>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '12px',
              color: 'var(--nike-stone)',
              marginTop: '4px',
            }}
          >
            탈퇴일: {formatDate(user.deletedAt)} | 영구 삭제 예정:{' '}
            {formatDate(user.deletionScheduledFor)}
            {user.deletionReason ? ` | 사유: ${user.deletionReason}` : ''}
          </p>
        </div>
      )}

      {/* 프로필 정보 */}
      <div
        style={{
          border: '1px solid var(--nike-hairline-soft)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'var(--nike-canvas)',
          marginBottom: '20px',
        }}
      >
        <div
          style={{
            padding: '12px 20px',
            borderBottom: '1px solid var(--nike-hairline-soft)',
            backgroundColor: 'var(--nike-soft-cloud)',
          }}
        >
          <h2
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              fontWeight: 500,
              color: 'var(--nike-stone)',
              textTransform: 'uppercase',
              letterSpacing: '0.4px',
            }}
          >
            프로필
          </h2>
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr',
            gap: '0',
          }}
        >
          {[
            ['ID', user.id],
            ['이메일', user.email],
            ['이름', user.name ?? '—'],
            ['역할', user.role],
            ['마케팅 동의', user.marketingConsent ? '동의' : '거부'],
            ['가입일', formatDate(user.createdAt)],
            ['최근 수정', formatDate(user.updatedAt)],
          ].map(([label, value]) => (
            <React.Fragment key={label}>
              <div
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--nike-hairline-soft)',
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '12px',
                  fontWeight: 500,
                  color: 'var(--nike-stone)',
                }}
              >
                {label}
              </div>
              <div
                style={{
                  padding: '10px 20px',
                  borderBottom: '1px solid var(--nike-hairline-soft)',
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '13px',
                  color: 'var(--nike-ink)',
                  wordBreak: 'break-all',
                }}
              >
                {value}
              </div>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* 활동 통계 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
          gap: '12px',
        }}
      >
        {[
          { label: '작품', count: user._count.projects },
          { label: '문의', count: user._count.inquiries },
          { label: '쇼케이스', count: user._count.showcases },
          { label: '구독', count: user._count.subscriptions },
        ].map(({ label, count }) => (
          <div
            key={label}
            style={{
              border: '1px solid var(--nike-hairline-soft)',
              borderRadius: '8px',
              padding: '16px 20px',
              backgroundColor: 'var(--nike-canvas)',
            }}
          >
            <p
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '11px',
                color: 'var(--nike-stone)',
                textTransform: 'uppercase',
                letterSpacing: '0.4px',
                marginBottom: '4px',
              }}
            >
              {label}
            </p>
            <p
              style={{
                fontFamily: 'var(--nike-font-display)',
                fontSize: '24px',
                fontWeight: 500,
                color: 'var(--nike-ink)',
              }}
            >
              {count}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
