/**
 * /admin/notices/[id] — 공지사항 수정
 */
import { notFound } from 'next/navigation'
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { NoticeForm } from '../NoticeForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditNoticePage({ params }: Props) {
  await requireRole('curator')
  const { id } = await params

  const notice = await prisma.notice.findUnique({ where: { id } })
  if (!notice) notFound()

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
        공지사항 수정
      </h1>
      <NoticeForm
        mode="edit"
        noticeId={notice.id}
        initialValues={{
          title: notice.title,
          body: notice.body,
          isPinned: notice.isPinned,
          publish: notice.publishedAt !== null,
        }}
      />
    </div>
  )
}
