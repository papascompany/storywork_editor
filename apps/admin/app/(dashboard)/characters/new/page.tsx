/**
 * /admin/characters/new — 새 캐릭터 생성
 */
import * as React from 'react'

import { requireRole } from '../../../../src/lib/auth'
import { CharacterForm } from '../CharacterForm'

export default async function NewCharacterPage() {
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
        새 캐릭터 생성
      </h1>
      <CharacterForm mode="create" />
    </div>
  )
}
