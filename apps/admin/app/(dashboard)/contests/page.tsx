/**
 * /admin/contests — 공모전 시즌 목록
 */
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' })
}

function getStatus(now: Date, opensAt: Date, closesAt: Date): string {
  if (now < opensAt) return '예정'
  if (now <= closesAt) return '진행중'
  return '종료'
}

export default async function AdminContestsPage() {
  await requireRole('curator')
  const now = new Date()

  const seasons = await prisma.contestSeason.findMany({
    orderBy: { opensAt: 'desc' },
    include: { _count: { select: { entries: true } } },
  })

  return (
    <div className="nike-main-inner">
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
          공모전 시즌
        </h1>
        <Link
          href="/contests/new"
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
          새 시즌 등록
        </Link>
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
              {['시즌명', '기간', '결과 발표', '상태', '출품작', '액션'].map((h) => (
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
            {seasons.length === 0 && (
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
                  등록된 시즌이 없습니다.
                </td>
              </tr>
            )}
            {seasons.map((s) => {
              const status = getStatus(now, s.opensAt, s.closesAt)
              return (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--nike-hairline-soft)' }}>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-ink)',
                    }}
                  >
                    {s.name}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {formatDate(s.opensAt)} ~ {formatDate(s.closesAt)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {s.resultsAt ? formatDate(s.resultsAt) : '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '3px',
                        color:
                          status === '진행중'
                            ? '#1a7a3b'
                            : status === '예정'
                              ? '#a06000'
                              : 'var(--nike-stone)',
                        backgroundColor:
                          status === '진행중'
                            ? '#e8fff2'
                            : status === '예정'
                              ? '#fff8e8'
                              : 'var(--nike-soft-cloud)',
                      }}
                    >
                      {status}
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
                    {s._count.entries}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/contests/${s.id}`}
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
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
