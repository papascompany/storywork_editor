/**
 * /admin/users — 회원 관리
 *
 * DataTable: 회원 목록 (active / soft-deleted / scheduled).
 * 검색 + 탈퇴 필터.
 * LEGAL-OPS-03
 */
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

type UserStatus = 'active' | 'deleted' | 'scheduled'

function getUserStatus(deletedAt: Date | null, deletionScheduledFor: Date | null): UserStatus {
  if (!deletedAt) return 'active'
  if (deletionScheduledFor && deletionScheduledFor < new Date()) return 'scheduled' // 영구 삭제 대기
  return 'deleted'
}

const STATUS_LABEL: Record<UserStatus, string> = {
  active: '활성',
  deleted: '탈퇴(복원 가능)',
  scheduled: '영구 삭제 예정',
}

const STATUS_STYLE: Record<UserStatus, React.CSSProperties> = {
  active: { color: '#1a7a3b', backgroundColor: '#e8fff2' },
  deleted: { color: '#e8a000', backgroundColor: '#fff8e8' },
  scheduled: { color: '#dc2626', backgroundColor: '#fef2f2' },
}

function formatDate(d: Date | null) {
  if (!d) return '—'
  return d.toLocaleDateString('ko-KR', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>
}) {
  await requireRole('support')
  const params = await searchParams
  const q = params.q?.trim() ?? ''
  const statusFilter = params.status ?? 'all'

  const users = await prisma.user.findMany({
    where: {
      ...(q
        ? {
            OR: [
              { email: { contains: q, mode: 'insensitive' } },
              { name: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
      ...(statusFilter === 'active' ? { deletedAt: null } : {}),
      ...(statusFilter === 'deleted' ? { deletedAt: { not: null } } : {}),
    },
    orderBy: { createdAt: 'desc' },
    take: 100,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      deletedAt: true,
      deletionScheduledFor: true,
      createdAt: true,
      _count: {
        select: { projects: true, inquiries: true },
      },
    },
  })

  const deletedCount = users.filter((u) => u.deletedAt).length

  return (
    <div className="nike-main-inner">
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          flexWrap: 'wrap',
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
          회원 관리
        </h1>
        {deletedCount > 0 && (
          <span
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '11px',
              fontWeight: 600,
              color: 'white',
              backgroundColor: '#dc2626',
              padding: '2px 8px',
              borderRadius: '10px',
            }}
          >
            탈퇴 {deletedCount}명
          </span>
        )}
      </div>

      {/* 검색 + 필터 */}
      <form style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
        <input
          name="q"
          defaultValue={q}
          placeholder="이메일 또는 이름 검색..."
          style={{
            flex: 1,
            minWidth: '200px',
            height: '36px',
            padding: '0 12px',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '6px',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            backgroundColor: 'var(--nike-canvas)',
            color: 'var(--nike-ink)',
          }}
        />
        <select
          name="status"
          defaultValue={statusFilter}
          style={{
            height: '36px',
            padding: '0 12px',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '6px',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            backgroundColor: 'var(--nike-canvas)',
            color: 'var(--nike-ink)',
          }}
        >
          <option value="all">전체</option>
          <option value="active">활성</option>
          <option value="deleted">탈퇴</option>
        </select>
        <button
          type="submit"
          style={{
            height: '36px',
            padding: '0 16px',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '6px',
            backgroundColor: 'var(--nike-canvas)',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-ink)',
            cursor: 'pointer',
          }}
        >
          검색
        </button>
      </form>

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
              {['이메일', '이름', '역할', '상태', '작품', '문의', '가입일', '탈퇴일', ''].map(
                (h) => (
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
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {h}
                  </th>
                ),
              )}
            </tr>
          </thead>
          <tbody>
            {users.length === 0 && (
              <tr>
                <td
                  colSpan={9}
                  style={{
                    padding: '40px',
                    textAlign: 'center',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  회원이 없습니다.
                </td>
              </tr>
            )}
            {users.map((user) => {
              const status = getUserStatus(user.deletedAt, user.deletionScheduledFor)
              return (
                <tr
                  key={user.id}
                  style={{
                    borderBottom: '1px solid var(--nike-hairline-soft)',
                    backgroundColor:
                      status === 'scheduled'
                        ? '#fff8f8'
                        : status === 'deleted'
                          ? '#fffdf8'
                          : 'transparent',
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
                    {user.email}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {user.name ?? '—'}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '11px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {user.role}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <span
                      style={{
                        fontSize: '11px',
                        fontWeight: 500,
                        padding: '2px 8px',
                        borderRadius: '3px',
                        ...STATUS_STYLE[status],
                      }}
                    >
                      {STATUS_LABEL[status]}
                    </span>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                      textAlign: 'center',
                    }}
                  >
                    {user._count.projects}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                      textAlign: 'center',
                    }}
                  >
                    {user._count.inquiries}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(user.createdAt)}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '12px',
                      color: status !== 'active' ? '#dc2626' : 'var(--nike-stone)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {formatDate(user.deletedAt)}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <Link
                      href={`/users/${user.id}`}
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '12px',
                        color: user.deletedAt ? 'var(--nike-sale)' : 'var(--nike-ink)',
                        textDecoration: 'none',
                        fontWeight: user.deletedAt ? 500 : 400,
                      }}
                    >
                      {user.deletedAt ? '복원' : '상세'}
                    </Link>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <p
        style={{
          fontFamily: 'var(--nike-font-text)',
          fontSize: '12px',
          color: 'var(--nike-stone)',
          marginTop: '12px',
        }}
      >
        최대 100건 표시. 더 많은 회원은 검색어로 필터링하세요.
      </p>
    </div>
  )
}
