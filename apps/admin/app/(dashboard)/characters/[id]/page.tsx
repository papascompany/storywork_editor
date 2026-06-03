/**
 * /admin/characters/[id] — 캐릭터 상세/수정
 *
 * 기본 정보 편집 폼 + 해당 캐릭터의 포즈 목록 탭
 */
import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { CharacterForm } from '../CharacterForm'

interface Props {
  params: Promise<{ id: string }>
}

export const dynamic = 'force-dynamic'

export default async function EditCharacterPage({ params }: Props) {
  await requireRole('curator')
  const { id } = await params

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      _count: { select: { poses: true } },
      poses: {
        where: { kind: 'pose' },
        select: {
          id: true,
          slug: true,
          thumbUrl: true,
          fileUrl: true,
          status: true,
        },
        take: 60,
        orderBy: { createdAt: 'desc' },
      },
    },
  })

  if (!character) notFound()

  return (
    <div className="nike-main-inner">
      {/* 헤더 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '8px',
        }}
      >
        <Link
          href="/characters"
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-stone)',
            textDecoration: 'none',
          }}
        >
          ← 목록
        </Link>
      </div>

      <h1
        style={{
          fontFamily: 'var(--nike-font-display)',
          fontSize: '22px',
          fontWeight: 500,
          color: 'var(--nike-ink)',
          marginBottom: '32px',
        }}
      >
        {character.name} 편집
      </h1>

      {/* 기본 정보 폼 */}
      <section style={{ marginBottom: '48px' }}>
        <h2
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--nike-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '20px',
          }}
        >
          기본 정보
        </h2>
        <CharacterForm
          mode="edit"
          characterId={character.id}
          initialValues={{
            name: character.name,
            description: character.description ?? '',
            bodyType: character.bodyType,
            styleTag: character.styleTag ?? '',
            ownerType: character.ownerType,
            status: character.status,
          }}
        />
      </section>

      {/* 포즈 목록 탭 */}
      <section>
        <h2
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 600,
            color: 'var(--nike-stone)',
            textTransform: 'uppercase',
            letterSpacing: '0.4px',
            marginBottom: '16px',
          }}
        >
          포즈 ({character._count.poses}건)
        </h2>

        {character.poses.length === 0 ? (
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              color: 'var(--nike-stone)',
            }}
          >
            등록된 포즈가 없습니다.
          </p>
        ) : (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))',
              gap: '8px',
            }}
          >
            {character.poses.map((pose) => (
              <Link key={pose.id} href={`/resources/${pose.id}`} style={{ textDecoration: 'none' }}>
                <div
                  style={{
                    border: '1px solid var(--nike-hairline-soft)',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    backgroundColor: 'var(--nike-surface)',
                    aspectRatio: '1',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {pose.thumbUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={pose.thumbUrl}
                      alt={pose.slug}
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                  ) : (
                    <span
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '10px',
                        color: 'var(--nike-stone)',
                      }}
                    >
                      {pose.slug.slice(0, 6)}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        )}

        {character._count.poses > 60 && (
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '12px',
              color: 'var(--nike-stone)',
              marginTop: '12px',
            }}
          >
            * 최근 60건만 표시됩니다. 전체 {character._count.poses}건은 리소스 목록에서 확인하세요.
          </p>
        )}
      </section>
    </div>
  )
}
