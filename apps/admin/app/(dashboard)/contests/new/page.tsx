import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { ContestSeasonForm } from '../ContestSeasonForm'

export default async function NewContestPage() {
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
        새 공모전 시즌 등록
      </h1>
      <ContestSeasonForm mode="create" />
    </div>
  )
}
