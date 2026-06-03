/**
 * /admin/notices/new — 새 공지사항 작성
 */
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { NoticeForm } from '../NoticeForm'

export default async function NewNoticePage() {
  await requireRole('curator')

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
        새 공지사항 작성
      </h1>
      <NoticeForm mode="create" />
    </div>
  )
}
