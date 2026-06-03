/**
 * /mypage/inquiries — 본인 문의 내역
 *
 * 로그인 필수. 미인증 → /login 리다이렉트.
 */
import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import * as React from 'react'

import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'
import { getCurrentUser } from '@/lib/users'

export const metadata: Metadata = {
  title: '내 문의 내역',
  description: '1:1 문의 내역 및 답변을 확인하세요',
}

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  OPEN: '답변 대기',
  REPLIED: '답변 완료',
  CLOSED: '종료',
}

const STATUS_COLOR: Record<string, string> = {
  OPEN: '#e8a000',
  REPLIED: '#1a7a3b',
  CLOSED: '#888',
}

function formatDate(date: Date) {
  return date.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export default async function MyInquiriesPage() {
  const supabase = await createWebServerClient()
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser()

  if (!authUser) {
    redirect('/login?next=/mypage/inquiries')
  }

  const dbUser = await getCurrentUser({ id: authUser.id, email: authUser.email })
  if (!dbUser) {
    redirect('/login?next=/mypage/inquiries')
  }

  const inquiries = await prisma.inquiry.findMany({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      subject: true,
      status: true,
      createdAt: true,
      repliedAt: true,
    },
  })

  return (
    <div
      style={{
        maxWidth: '720px',
        margin: '0 auto',
        padding: '48px 24px 80px',
        fontFamily: 'var(--mkt-font-sans)',
      }}
    >
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '32px',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div>
          <Link
            href="/mypage"
            style={{
              fontSize: '13px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
              textDecoration: 'none',
              display: 'block',
              marginBottom: '8px',
            }}
          >
            ← 마이페이지
          </Link>
          <h1
            style={{
              fontFamily: 'var(--mkt-font-display)',
              fontSize: '24px',
              fontWeight: 600,
              color: 'var(--mkt-ink)',
              margin: 0,
            }}
          >
            내 문의 내역
          </h1>
        </div>

        <Link
          href="/contact"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--mkt-canvas)',
            backgroundColor: 'var(--mkt-ink)',
            textDecoration: 'none',
            padding: '8px 18px',
            borderRadius: '6px',
            flexShrink: 0,
          }}
        >
          새 문의
        </Link>
      </div>

      {/* 빈 상태 */}
      {inquiries.length === 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
          }}
        >
          <div style={{ fontSize: '36px', marginBottom: '16px' }} aria-hidden="true">
            ?
          </div>
          <p style={{ fontSize: '15px' }}>아직 문의 내역이 없습니다.</p>
          <Link
            href="/contact"
            style={{
              display: 'inline-block',
              marginTop: '20px',
              fontSize: '14px',
              color: 'var(--mkt-ink)',
              textDecoration: 'underline',
            }}
          >
            첫 문의 남기기
          </Link>
        </div>
      )}

      {/* 문의 목록 */}
      {inquiries.length > 0 && (
        <div
          style={{
            border: '1px solid var(--mkt-hairline)',
            borderRadius: '8px',
            overflow: 'hidden',
          }}
        >
          {inquiries.map((inquiry, idx) => (
            <div
              key={inquiry.id}
              style={{
                padding: '16px 20px',
                borderBottom:
                  idx < inquiries.length - 1 ? '1px solid var(--mkt-hairline-soft)' : 'none',
                backgroundColor: 'var(--mkt-canvas)',
              }}
            >
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                <span
                  style={{
                    flex: 1,
                    fontSize: '15px',
                    fontWeight: 400,
                    color: 'var(--mkt-ink)',
                    minWidth: 0,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inquiry.subject}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
                  <span
                    style={{
                      fontSize: '12px',
                      fontWeight: 500,
                      color: STATUS_COLOR[inquiry.status] ?? '#888',
                      backgroundColor:
                        inquiry.status === 'OPEN'
                          ? '#fff8e8'
                          : inquiry.status === 'REPLIED'
                            ? '#f0faf4'
                            : '#f5f5f5',
                      padding: '3px 8px',
                      borderRadius: '4px',
                    }}
                  >
                    {STATUS_LABEL[inquiry.status] ?? inquiry.status}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mkt-font-mono)',
                      fontSize: '12px',
                      color: 'var(--mkt-ink)',
                      opacity: 0.4,
                    }}
                  >
                    {formatDate(inquiry.createdAt)}
                  </span>
                </div>
              </div>

              {inquiry.repliedAt && (
                <p
                  style={{
                    fontSize: '12px',
                    color: 'var(--mkt-ink)',
                    opacity: 0.45,
                    marginTop: '4px',
                    margin: '4px 0 0',
                  }}
                >
                  답변: {formatDate(inquiry.repliedAt)}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
