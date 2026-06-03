/**
 * /admin/notices — 공지사항 목록 (Server Component)
 */
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

function formatDate(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function AdminNoticesPage() {
  await requireRole('curator')

  const notices = await prisma.notice.findMany({
    orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }, { createdAt: 'desc' }],
    include: { author: { select: { email: true, name: true } } },
  })

  return (
    <div className="nike-main-inner">
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
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
          공지사항
        </h1>
        <Link
          href="/notices/new"
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--nike-canvas)',
            backgroundColor: 'var(--nike-ink)',
            padding: '8px 16px',
            borderRadius: '6px',
            textDecoration: 'none',
          }}
        >
          새 공지 작성
        </Link>
      </div>

      {/* 테이블 */}
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
              {['제목', '작성자', '핀 고정', '게시일', '상태', '액션'].map((h) => (
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
            {notices.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  등록된 공지사항이 없습니다.
                </td>
              </tr>
            )}
            {notices.map((notice) => (
              <tr
                key={notice.id}
                style={{
                  borderBottom: '1px solid var(--nike-hairline-soft)',
                }}
              >
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-ink)',
                    maxWidth: '280px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {notice.title}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '12px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  {notice.author.name ?? notice.author.email}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  {notice.isPinned ? (
                    <span
                      style={{
                        fontSize: '10px',
                        fontWeight: 600,
                        color: 'var(--nike-sale)',
                        backgroundColor: '#fff3f3',
                        padding: '2px 7px',
                        borderRadius: '3px',
                      }}
                    >
                      핀
                    </span>
                  ) : (
                    <span style={{ color: 'var(--nike-stone)', fontSize: '12px' }}>—</span>
                  )}
                </td>
                <td
                  style={{
                    padding: '12px 16px',
                    fontFamily: 'var(--nike-font-mono)',
                    fontSize: '12px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  {formatDate(notice.publishedAt)}
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <span
                    style={{
                      fontSize: '11px',
                      fontWeight: 500,
                      color: notice.publishedAt ? '#1a7a3b' : 'var(--nike-stone)',
                      backgroundColor: notice.publishedAt ? '#e8fff2' : 'var(--nike-soft-cloud)',
                      padding: '2px 8px',
                      borderRadius: '3px',
                    }}
                  >
                    {notice.publishedAt ? '게시중' : '초안'}
                  </span>
                </td>
                <td style={{ padding: '12px 16px' }}>
                  <Link
                    href={`/notices/${notice.id}`}
                    style={{
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      color: 'var(--nike-ink)',
                      textDecoration: 'none',
                      opacity: 0.65,
                    }}
                  >
                    편집
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
