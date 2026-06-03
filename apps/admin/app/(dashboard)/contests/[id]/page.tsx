import { notFound } from 'next/navigation'
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { prisma } from '../../../../src/lib/prisma'
import { ContestSeasonForm } from '../ContestSeasonForm'

interface Props {
  params: Promise<{ id: string }>
}

export default async function EditContestPage({ params }: Props) {
  await requireRole('curator')
  const { id } = await params
  const season = await prisma.contestSeason.findUnique({ where: { id } })
  if (!season) notFound()

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
        공모전 시즌 수정
      </h1>
      <ContestSeasonForm
        mode="edit"
        seasonId={season.id}
        initialValues={{
          name: season.name,
          opensAt: season.opensAt,
          closesAt: season.closesAt,
          resultsAt: season.resultsAt,
          rules: season.rules,
        }}
      />
    </div>
  )
}
