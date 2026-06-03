/**
 * /admin/characters — 캐릭터 목록 (Server Component)
 *
 * DataTable: name / bodyType / ownerType / poses count / status
 */
import Link from 'next/link'
import * as React from 'react'

import { requireRole } from '../../../src/lib/auth'
import { prisma } from '../../../src/lib/prisma'

export const dynamic = 'force-dynamic'

const STATUS_STYLE: Record<string, { label: string; color: string }> = {
  draft: { label: '초안', color: 'var(--nike-hairline-soft)' },
  review: { label: '검수중', color: 'var(--nike-card-cream)' },
  published: { label: '게시됨', color: 'var(--nike-card-mint)' },
  rejected: { label: '거절됨', color: 'var(--nike-card-pink)' },
}

const OWNER_TYPE_LABELS: Record<string, string> = {
  system: '시스템',
  creator: '크리에이터',
}

const BODY_TYPE_LABELS: Record<string, string> = {
  M: '남성',
  F: '여성',
  child: '어린이',
  beast: '수인',
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_STYLE[status] ?? { label: status, color: 'var(--nike-hairline-soft)' }
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '2px 8px',
        borderRadius: 'var(--nike-rounded-full)',
        backgroundColor: s.color,
        fontFamily: 'var(--nike-font-text)',
        fontSize: '12px',
        fontWeight: 480,
        color: 'var(--nike-ink)',
        whiteSpace: 'nowrap',
      }}
    >
      {s.label}
    </span>
  )
}

export default async function AdminCharactersPage() {
  await requireRole('curator')

  const characters = await prisma.character.findMany({
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { poses: true } } },
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
          캐릭터
        </h1>
        <Link
          href="/characters/new"
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
          새 캐릭터
        </Link>
      </div>

      {/* 통계 */}
      <div
        style={{
          display: 'flex',
          gap: '16px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        {[
          { label: '전체', value: characters.length },
          {
            label: '게시됨',
            value: characters.filter((c) => c.status === 'published').length,
          },
          {
            label: '시스템',
            value: characters.filter((c) => c.ownerType === 'system').length,
          },
          {
            label: '크리에이터',
            value: characters.filter((c) => c.ownerType === 'creator').length,
          },
        ].map((stat) => (
          <div
            key={stat.label}
            style={{
              padding: '12px 20px',
              border: '1px solid var(--nike-hairline-soft)',
              borderRadius: '8px',
              minWidth: '100px',
            }}
          >
            <div
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '12px',
                color: 'var(--nike-stone)',
                marginBottom: '4px',
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontFamily: 'var(--nike-font-display)',
                fontSize: '20px',
                fontWeight: 600,
                color: 'var(--nike-ink)',
              }}
            >
              {stat.value}
            </div>
          </div>
        ))}
      </div>

      {/* 테이블 */}
      <div
        style={{
          border: '1px solid var(--nike-hairline-soft)',
          borderRadius: '8px',
          overflow: 'hidden',
        }}
      >
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr
              style={{
                borderBottom: '1px solid var(--nike-hairline-soft)',
                backgroundColor: 'var(--nike-surface)',
              }}
            >
              {['이름', '신체 유형', '소유 유형', '포즈 수', '스타일', '상태', ''].map((h) => (
                <th
                  key={h}
                  style={{
                    padding: '10px 16px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--nike-stone)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    textAlign: 'left',
                  }}
                >
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {characters.length === 0 ? (
              <tr>
                <td
                  colSpan={7}
                  style={{
                    padding: '48px',
                    textAlign: 'center',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-stone)',
                  }}
                >
                  등록된 캐릭터가 없습니다.
                </td>
              </tr>
            ) : (
              characters.map((c) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--nike-hairline-soft)' }}>
                  <td style={{ padding: '12px 16px' }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      {c.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={c.thumbnail}
                          alt={c.name}
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '4px',
                            objectFit: 'cover',
                            backgroundColor: 'var(--nike-surface)',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '4px',
                            backgroundColor: 'var(--nike-surface)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '14px',
                          }}
                          aria-hidden="true"
                        >
                          &#129377;
                        </div>
                      )}
                      <span
                        style={{
                          fontFamily: 'var(--nike-font-text)',
                          fontSize: '13px',
                          fontWeight: 500,
                          color: 'var(--nike-ink)',
                        }}
                      >
                        {c.name}
                      </span>
                    </div>
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {BODY_TYPE_LABELS[c.bodyType] ?? c.bodyType}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '13px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {OWNER_TYPE_LABELS[c.ownerType] ?? c.ownerType}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-display)',
                      fontSize: '14px',
                      fontWeight: 600,
                      color: 'var(--nike-ink)',
                    }}
                  >
                    {c._count.poses}
                  </td>
                  <td
                    style={{
                      padding: '12px 16px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      color: 'var(--nike-stone)',
                    }}
                  >
                    {c.styleTag ?? '—'}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    <StatusBadge status={c.status} />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                    <Link
                      href={`/characters/${c.id}`}
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '12px',
                        color: 'var(--nike-stone)',
                        textDecoration: 'none',
                        padding: '4px 10px',
                        border: '1px solid var(--nike-hairline-soft)',
                        borderRadius: '4px',
                      }}
                    >
                      편집
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
