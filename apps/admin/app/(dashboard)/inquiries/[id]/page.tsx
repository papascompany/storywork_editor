/**
 * /admin/inquiries/[id] — 문의 상세 + 답변 작성
 */
import { notFound } from 'next/navigation'
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'

import { InquiryReplyForm } from './InquiryReplyForm'

interface Props {
  params: Promise<{ id: string }>
}

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function InquiryDetailPage({ params }: Props) {
  await requireRole('support')
  const { id } = await params

  const inquiry = await prisma.inquiry.findUnique({
    where: { id },
    include: { user: { select: { email: true, name: true } } },
  })

  if (!inquiry) notFound()

  return (
    <div className="nike-main-inner" style={{ maxWidth: '720px' }}>
      <h1
        style={{
          fontFamily: 'var(--nike-font-display)',
          fontSize: '22px',
          fontWeight: 500,
          color: 'var(--nike-ink)',
          marginBottom: '8px',
        }}
      >
        문의 상세
      </h1>

      {/* 메타 */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          fontFamily: 'var(--nike-font-text)',
          fontSize: '12px',
          color: 'var(--nike-stone)',
          flexWrap: 'wrap',
        }}
      >
        <span>이메일: {inquiry.email}</span>
        {inquiry.user && <span>사용자: {inquiry.user.name ?? inquiry.user.email}</span>}
        <span>접수: {formatDate(inquiry.createdAt)}</span>
        <span
          style={{
            fontWeight: 600,
            color:
              inquiry.status === 'OPEN'
                ? '#e8a000'
                : inquiry.status === 'REPLIED'
                  ? '#1a7a3b'
                  : 'var(--nike-stone)',
          }}
        >
          {inquiry.status === 'OPEN'
            ? '답변 대기'
            : inquiry.status === 'REPLIED'
              ? '답변 완료'
              : '종료'}
        </span>
      </div>

      {/* 문의 내용 */}
      <div
        style={{
          backgroundColor: 'var(--nike-soft-cloud)',
          borderRadius: '8px',
          padding: '20px',
          marginBottom: '32px',
        }}
      >
        <div
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--nike-ink)',
            marginBottom: '12px',
          }}
        >
          제목: {inquiry.subject}
        </div>
        <div
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            lineHeight: 1.7,
            color: 'var(--nike-ink)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
          }}
        >
          {inquiry.body}
        </div>
      </div>

      {/* 기존 답변 */}
      {inquiry.adminReply && (
        <div
          style={{
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '8px',
            padding: '20px',
            marginBottom: '32px',
          }}
        >
          <div
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '12px',
              fontWeight: 500,
              color: 'var(--nike-stone)',
              marginBottom: '10px',
            }}
          >
            기존 답변 {inquiry.repliedAt ? `(${formatDate(inquiry.repliedAt)})` : ''}
          </div>
          <div
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              lineHeight: 1.7,
              color: 'var(--nike-ink)',
              whiteSpace: 'pre-wrap',
            }}
          >
            {inquiry.adminReply}
          </div>
        </div>
      )}

      {/* 답변 폼 */}
      <InquiryReplyForm inquiryId={inquiry.id} currentStatus={inquiry.status} />
    </div>
  )
}
