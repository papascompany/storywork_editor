/**
 * /admin/inquiries — 문의 처리 큐
 *
 * OPEN 우선 정렬. 클릭 시 상세/답변 페이지.
 */
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

const STATUS_LABEL: Record<string, string> = {
  OPEN: '답변 대기',
  REPLIED: '답변 완료',
  CLOSED: '종료',
}

const STATUS_STYLE: Record<string, React.CSSProperties> = {
  OPEN: { color: '#e8a000', backgroundColor: '#fff8e8' },
  REPLIED: { color: '#1a7a3b', backgroundColor: '#e8fff2' },
  CLOSED: { color: 'var(--nike-stone)', backgroundColor: 'var(--nike-soft-cloud)' },
}

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function AdminInquiriesPage() {
  await requireRole('support')

  const inquiries = await prisma.inquiry.findMany({
    orderBy: [
      { status: 'asc' }, // OPEN 이 알파벳 우선
      { createdAt: 'desc' },
    ],
    include: { user: { select: { email: true, name: true } } },
  })

  const openCount = inquiries.filter((i) => i.status === 'OPEN').length

  return (
    <div className="nike-main-inner">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
        }}
      >
        <h1
          style={{
            fontFamily: 'var(--nike-font-display)',
            fontSize: '22px',
            fontWeight: 500,
            color: 'var(--nike-ink)',
          }}
        >
          문의 처리 큐
        </h1>
        {openCount > 0 && (
          <span
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--nike-canvas)',
              backgroundColor: 'var(--nike-sale)',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            {openCount} 미처리
          </span>
        )}
      </div>

      <div
        style={{
          border: '1px solid var(--nike-hairline-soft)',
          borderRadius: '8px',
          overflow: 'hidden',
          backgroundColor: 'var(--nike-canvas)',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--nike-hairline-soft)',
                backgroundColor: 'var(--nike-soft-cloud)',
              }}
            >
              {['제목', '이메일', '사용자', '상태', '접수일', '답변일', '액션'].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    textAlign: 'left',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '11px',
                    fontWeight: 500,
                    color: 'var(--nike-stone)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.4px',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {inquiries.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  접수된 문의가 없습니다.
                </td>
              </tr>
            )}
            {inquiries.map((inq) => (
              <tr
                key={inq.id}
                style={{
                  borderBottom: '1px solid var(--nike-hairline-soft)',
                  backgroundColor: inq.status === 'OPEN' ? '#fffdf8' : 'transparent',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-ink)',
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {inq.subject}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '12px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  {inq.email}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '12px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  {inq.user ? (inq.user.name ?? inq.user.email) : '비회원'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      padding: '2px 8px',
                      borderRadius: '3px',
                      ...STATUS_STYLE[inq.status],
                    }}
                  >
                    {STATUS_LABEL[inq.status] ?? inq.status}
                  </span>
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-mono)',
                    fontSize: '12px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  {formatDate(inq.createdAt)}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-mono)',
                    fontSize: '12px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  {inq.repliedAt ? formatDate(inq.repliedAt) : '—'}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link
                    href={`/inquiries/${inq.id}`}
                    style={{
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      color: inq.status === 'OPEN' ? 'var(--nike-sale)' : 'var(--nike-ink)',
                      textDecoration: 'none',
                      fontWeight: inq.status === 'OPEN' ? 500 : 400,
                    }}
                  >
                    {inq.status === 'OPEN' ? '답변하기' : '보기'}
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
