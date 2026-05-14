'use client'

/**
 * FormatEditClient — 판형 편집 클라이언트 컴포넌트
 *
 * EntityForm + defaultValues 채움.
 * superadmin 만 삭제 버튼 노출.
 */

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@storywork/ui'
import { ArrowLeft, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { EntityForm } from '../../../../src/components/entity-form/EntityForm'
import type { FieldMeta } from '../../../../src/components/entity-form/EntityForm'
import type { AdminRole } from '../../../../src/lib/auth'
import { formatInputSchema } from '../../../../src/lib/schemas/format'
import type { FormatOutput } from '../../../../src/lib/schemas/format'

// ─── 필드 메타 ───────────────────────────────────────────────────────────────

const FIELD_META: Record<string, FieldMeta> = {
  name: { label: '판형 이름', placeholder: '예: B5 단행본', autoFocus: true },
  widthMm: { label: '가로 (mm)', helpText: '50~500' },
  heightMm: { label: '세로 (mm)', helpText: '50~500' },
  dpi: {
    label: '해상도 (DPI)',
    widget: 'select',
    options: [
      { value: '72', label: '72 DPI (웹/모바일)' },
      { value: '150', label: '150 DPI (디지털 출력)' },
      { value: '300', label: '300 DPI (인쇄 권장)' },
      { value: '600', label: '600 DPI (고품질 인쇄)' },
    ],
  },
  bleedMm: { label: '재단 여백 (Bleed, mm)', helpText: '인쇄소 권장 3mm' },
  safeMm: { label: '안전 영역 (Safe, mm)', helpText: '내용 잘림 방지 5mm' },
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface FormatData {
  id: string
  name: string
  widthMm: number
  heightMm: number
  dpi: 72 | 150 | 300 | 600
  bleedMm: number
  safeMm: number
  gridDef: Record<string, unknown>
  templateCount: number
  projectCount: number
}

interface FormatEditClientProps {
  format: FormatData
  userRole: AdminRole
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function FormatEditClient({ format, userRole }: FormatEditClientProps) {
  const router = useRouter()
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const isSuperadmin = userRole === 'superadmin'
  const usageCount = format.templateCount + format.projectCount

  const handleSubmit = async (values: FormatOutput) => {
    setServerErrors({})

    const res = await fetch(`/api/formats/${format.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (res.ok) {
      router.push('/formats')
      router.refresh()
      return
    }

    const json = (await res.json().catch(() => ({}))) as {
      error?: {
        code?: string
        message?: string
        details?: { fieldErrors?: Record<string, string[]> }
      }
    }

    if (json.error?.code === 'CONFLICT') {
      setServerErrors({ name: json.error.message ?? '이미 사용 중인 이름입니다.' })
      return
    }

    if (json.error?.code === 'VALIDATION_ERROR' && json.error.details?.fieldErrors) {
      const fe: Record<string, string> = {}
      for (const [k, msgs] of Object.entries(json.error.details.fieldErrors)) {
        fe[k] = Array.isArray(msgs) ? (msgs[0] ?? '오류') : String(msgs)
      }
      setServerErrors(fe)
      return
    }

    setServerErrors({ name: json.error?.message ?? '서버 오류가 발생했습니다.' })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/formats/${format.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        setDeleteDialogOpen(false)
        router.push('/formats')
        router.refresh()
        return
      }
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      alert(json.error?.message ?? '삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-2xl" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      {/* 뒤로 가기 */}
      <Link
        href="/formats"
        className="mb-6 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '14px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.5,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        판형 목록
      </Link>

      {/* 헤더 */}
      <div
        className="flex items-start justify-between gap-4 mb-8"
        style={{
          paddingBottom: 'var(--mkt-space-lg)',
          borderBottom: '1px solid var(--mkt-hairline)',
        }}
      >
        <div>
          <p
            className="mkt-eyebrow"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.4,
              marginBottom: 'var(--mkt-space-xs)',
              fontSize: '12px',
            }}
          >
            ADMIN / FORMATS / EDIT
          </p>
          <h1
            className="mkt-display-lg"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-xs)' }}
          >
            {format.name}
          </h1>
          <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
            템플릿 {format.templateCount}개 · 프로젝트 {format.projectCount}개 연결됨
          </p>
        </div>

        {/* 삭제 버튼 — superadmin 만 */}
        {isSuperadmin && (
          <button
            type="button"
            className="mkt-btn-secondary"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={usageCount > 0}
            title={
              usageCount > 0
                ? `사용 중인 판형은 삭제할 수 없습니다 (템플릿 ${format.templateCount}개, 프로젝트 ${format.projectCount}개)`
                : '판형 삭제'
            }
            style={{
              gap: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              borderColor: '#dc2626',
              color: '#dc2626',
              opacity: usageCount > 0 ? 0.4 : undefined,
            }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            삭제
          </button>
        )}
      </div>

      {/* EntityForm */}
      <EntityForm
        schema={formatInputSchema}
        defaultValues={{
          name: format.name,
          widthMm: format.widthMm,
          heightMm: format.heightMm,
          dpi: format.dpi,
          bleedMm: format.bleedMm,
          safeMm: format.safeMm,
          gridDef: format.gridDef,
        }}
        fieldMeta={FIELD_META}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
        submitLabel="저장"
        onCancel={() => router.push('/formats')}
        dirtyGuard
      />

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          if (!v) setDeleteDialogOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>판형 삭제</DialogTitle>
            <DialogDescription>
              <strong>&quot;{format.name}&quot;</strong> 판형을 삭제합니다. 이 작업은 되돌릴 수
              없습니다. 계속하겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="mkt-btn-secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="button"
              className="mkt-btn-primary"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              style={{ backgroundColor: '#dc2626', opacity: isDeleting ? 0.6 : undefined }}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
