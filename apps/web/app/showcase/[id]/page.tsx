/**
 * /showcase/[id] — 쇼케이스 상세
 *
 * 작품 썸네일 + Reaction(like/heart/wow) + 댓글 목록 + 댓글 작성 폼.
 */
import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import * as React from 'react'

import { CommentSection } from './CommentSection'
import { ReactionBar } from './ReactionBar'

import { Footer } from '@/components/marketing/Footer'
import { Header } from '@/components/marketing/Header'
import { ReportButton } from '@/components/showcase/ReportButton'
import { ShareBar } from '@/components/showcase/ShareBar'
import { publicDisplayName } from '@/lib/display-name'
import { prisma } from '@/lib/prisma'
import { createWebServerClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const showcase = await prisma.showcase.findUnique({
    where: { id },
    include: { project: { select: { title: true } } },
  })
  if (!showcase) return { title: '작품을 찾을 수 없습니다' }
  const title = showcase.project.title
  const description = `스토리워크 갤러리에 출품된 작품 — ${title}`
  // 작품별 동적 OG 이미지는 M8-01(향후). 현재는 브랜드 기본 OG 카드 사용.
  const ogImage = '/api/og/default'
  return {
    title,
    description,
    alternates: { canonical: `/showcase/${id}` },
    openGraph: {
      title,
      description,
      type: 'article',
      url: `/showcase/${id}`,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title }],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

function formatDate(d: Date) {
  return d.toLocaleDateString('ko-KR', { year: 'numeric', month: 'long', day: 'numeric' })
}

export default async function ShowcaseDetailPage({ params }: Props) {
  const { id } = await params

  const [showcase, comments] = await Promise.all([
    prisma.showcase.findUnique({
      where: { id },
      include: {
        owner: { select: { name: true, email: true } },
        project: {
          select: {
            title: true,
            pages: {
              take: 4,
              orderBy: { index: 'asc' },
              select: { thumbnail: true, index: true },
            },
          },
        },
        reactions: true,
        contest: { select: { id: true, name: true } },
      },
    }),
    prisma.comment.findMany({
      where: { showcaseId: id, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { name: true, email: true } } },
    }),
  ])

  if (!showcase) notFound()

  // 로그인 확인
  let currentUserId: string | null = null
  let currentUserEmail: string | null = null
  try {
    const supabase = await createWebServerClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()
    if (user) {
      currentUserId = user.id
      currentUserEmail = user.email ?? null
    }
  } catch {
    // 비로그인
  }

  const ownerName = publicDisplayName(showcase.owner.name, showcase.owner.email)
  const thumbnail = showcase.project.pages[0]?.thumbnail

  // reaction 집계
  const reactionCounts: Record<string, number> = {}
  for (const r of showcase.reactions) {
    reactionCounts[r.kind] = (reactionCounts[r.kind] ?? 0) + 1
  }

  const serializedComments = comments.map((c) => ({
    id: c.id,
    body: c.body,
    authorName: publicDisplayName(c.user.name, c.user.email),
    createdAt: c.createdAt.toISOString(),
  }))

  return (
    <div style={{ backgroundColor: 'var(--mkt-canvas)', minHeight: '100dvh' }}>
      <Header />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '48px 24px 80px' }}>
        {/* 뒤로 */}
        <Link
          href="/showcase"
          style={{
            fontSize: '13px',
            color: 'var(--mkt-ink)',
            opacity: 0.5,
            textDecoration: 'none',
            display: 'block',
            marginBottom: '32px',
          }}
        >
          ← 갤러리
        </Link>

        {/* 공모전 링크 */}
        {showcase.contest && (
          <Link
            href={`/contest/${showcase.contest.id}`}
            style={{
              display: 'inline-block',
              marginBottom: '16px',
              fontSize: '12px',
              fontFamily: 'var(--mkt-font-sans)',
              backgroundColor: '#f0faf4',
              color: '#1a7a3b',
              padding: '3px 10px',
              borderRadius: '4px',
              textDecoration: 'none',
              fontWeight: 500,
            }}
          >
            공모전: {showcase.contest.name}
          </Link>
        )}

        {/* 작품 제목 + 메타 */}
        <h1
          style={{
            fontFamily: 'var(--mkt-font-display)',
            fontSize: 'clamp(22px, 4vw, 32px)',
            fontWeight: 600,
            color: 'var(--mkt-ink)',
            marginBottom: '8px',
          }}
        >
          {showcase.project.title}
        </h1>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: 'var(--mkt-ink)',
            opacity: 0.5,
            marginBottom: '20px',
          }}
        >
          {ownerName} · {formatDate(showcase.createdAt)}
        </p>

        {/* 공유 */}
        <div style={{ marginBottom: '32px' }}>
          <ShareBar
            title={showcase.project.title}
            text={`스토리워크 갤러리 — ${showcase.project.title}`}
            subjectLabel="작품"
          />
        </div>

        {/* 썸네일 */}
        {thumbnail && (
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              margin: '0 auto 40px',
              borderRadius: '8px',
              overflow: 'hidden',
              backgroundColor: 'var(--mkt-surface-soft)',
              aspectRatio: '3/4',
            }}
          >
            <Image
              src={thumbnail}
              alt={showcase.project.title}
              fill
              sizes="(max-width: 768px) 90vw, 480px"
              style={{ objectFit: 'contain', padding: '8px' }}
              priority
            />
          </div>
        )}

        {/* 분리선 */}
        <div
          style={{
            borderBottom: '1px solid var(--mkt-hairline)',
            marginBottom: '28px',
          }}
        />

        {/* Reaction 바 + 신고 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            flexWrap: 'wrap',
          }}
        >
          <ReactionBar
            showcaseId={showcase.id}
            reactionCounts={reactionCounts}
            currentUserId={currentUserId}
            userReactions={showcase.reactions
              .filter((r) => currentUserId && r.userId === currentUserId)
              .map((r) => r.kind)}
          />
          <ReportButton
            targetType="showcase"
            targetId={showcase.id}
            isAuthenticated={Boolean(currentUserId)}
            label="작품 신고"
          />
        </div>

        <div
          style={{
            borderBottom: '1px solid var(--mkt-hairline)',
            margin: '28px 0',
          }}
        />

        {/* 댓글 섹션 */}
        <CommentSection
          showcaseId={showcase.id}
          initialComments={serializedComments}
          currentUserId={currentUserId}
          currentUserEmail={currentUserEmail}
        />
      </main>

      <Footer />
    </div>
  )
}
