/**
 * /admin/showcase — 쇼케이스 + 댓글 모더레이션
 */
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

export default async function AdminShowcasePage() {
  await requireRole('curator')

  const [showcases, flaggedComments] = await Promise.all([
    prisma.showcase.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        owner: { select: { email: true, name: true } },
        project: { select: { title: true } },
        _count: { select: { comments: true, reactions: true } },
      },
    }),
    prisma.comment.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { email: true, name: true } },
        showcase: { select: { id: true } },
      },
    }),
  ])

  return (
    <div className="nike-main-inner">
      <h1
        style={{
          fontFamily: 'var(--nike-font-display)',
          fontSize: '22px',
          fontWeight: 500,
          color: 'var(--nike-ink)',
          marginBottom: '32px',
        }}
      >
        쇼케이스 모더레이션
      </h1>

      {/* 쇼케이스 섹션 */}
      <section style={{ marginBottom: '48px' }}>
        <h2
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--nike-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '16px',
          }}
        >
          쇼케이스 목록 (최근 50건)
        </h2>
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
                {['작품명', '작성자', '모드', '좋아요', '댓글', '날짜', '액션'].map((h) => (
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
              {showcases.length === 0 && (
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
                    등록된 쇼케이스가 없습니다.
                  </td>
                </tr>
              )}
              {showcases.map((s) => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--nike-hairline-soft)' }}>
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
                    {s.project.title}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {s.owner.name ?? s.owner.email}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 7px',
                        borderRadius: '3px',
                        color: s.mode === 'contest' ? '#1a7a3b' : 'var(--nike-stone)',
                        backgroundColor:
                          s.mode === 'contest' ? '#e8fff2' : 'var(--nike-soft-cloud)',
                      }}
                    >
                      {s.mode === 'contest' ? '공모전' : '갤러리'}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-ink)',
                    }}
                  >
                    {s.likes}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-ink)',
                    }}
                  >
                    {s._count.comments}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {formatDate(s.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/api/admin/showcase/${s.id}`}
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '12px',
                        color: 'var(--nike-sale)',
                        textDecoration: 'none',
                      }}
                      onClick={(e) => {
                        e.preventDefault()
                        if (confirm(`"${s.project.title}" 쇼케이스를 삭제하시겠습니까?`)) {
                          void fetch(`/api/admin/showcase/${s.id}`, { method: 'DELETE' }).then(() =>
                            window.location.reload(),
                          )
                        }
                      }}
                    >
                      삭제
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 댓글 섹션 */}
      <section>
        <h2
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 500,
            color: 'var(--nike-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '16px',
          }}
        >
          최근 댓글 (최근 30건)
        </h2>
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
                {['내용', '작성자', '날짜', '액션'].map((h) => (
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
              {flaggedComments.length === 0 && (
                <tr>
                  <td
                    colSpan={4}
                    style={{
                      padding: '40px',
                      textAlign: 'center',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    댓글이 없습니다.
                  </td>
                </tr>
              )}
              {flaggedComments.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--nike-hairline-soft)' }}>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-ink)',
                      maxWidth: '320px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {c.body}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {c.user.name ?? c.user.email}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {formatDate(c.createdAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <button
                      onClick={() => {
                        if (confirm('이 댓글을 숨기시겠습니까?')) {
                          void fetch(`/api/admin/comments/${c.id}`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ isDeleted: true }),
                          }).then(() => window.location.reload())
                        }
                      }}
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '12px',
                        color: 'var(--nike-sale)',
                        backgroundColor: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: 0,
                      }}
                    >
                      숨기기
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
