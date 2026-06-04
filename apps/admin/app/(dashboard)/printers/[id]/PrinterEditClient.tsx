'use client'

/**
 * PrinterEditClient — 인쇄소 프로필 편집 클라이언트 컴포넌트
 *
 * PrinterProfileForm + delete dialog.
 * isSystem=true 인 프로필은 isActive 토글만 가능 (다른 필드 readonly).
 * superadmin 만 삭제 버튼 노출. isSystem=true 는 삭제 불가.
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

import type { AdminRole } from '../../../../src/lib/auth'
import { PrinterProfileForm } from '../PrinterProfileForm'
import type { PrinterProfileFormValues } from '../PrinterProfileForm'

// ─── Props ───────────────────────────────────────────────────────────────────

export interface PrinterProfileData {
  id: string
  slug: string
  name: string
  description?: string
  formats: string[]
  bleedMinMm: number
  bleedMaxMm: number
  safeMinMm: number
  imageDpiMinPose: number
  imageDpiMinBg: number
  fontEmbedRequired: boolean
  colorSpaces: Array<'rgb' | 'cmyk'>
  maxPages?: number | null
  customWarnings: string[]
  isSystem: boolean
  isActive: boolean
}

interface PrinterEditClientProps {
  profile: PrinterProfileData
  userRole: AdminRole
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function PrinterEditClient({ profile, userRole }: PrinterEditClientProps) {
  const router = useRouter()
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const isSuperadmin = userRole === 'superadmin'

  const handleSubmit = async (values: PrinterProfileFormValues) => {
    setServerErrors({})

    // isSystem=true 이면 isActive 만 전송
    const payload: Partial<PrinterProfileFormValues> = profile.isSystem
      ? { isActive: values.isActive }
      : values

    const res = await fetch(`/api/admin/printers/${profile.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })

    if (res.ok) {
      router.push('/printers')
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
      setServerErrors({ slug: json.error.message ?? '이미 사용 중인 슬러그입니다.' })
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

    setServerErrors({ slug: json.error?.message ?? '서버 오류가 발생했습니다.' })
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/admin/printers/${profile.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        setDeleteDialogOpen(false)
        router.push('/printers')
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
    <div className="p-6 lg:p-10 max-w-2xl">
      <Link
        href="/printers"
        className="mb-6 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
        style={{
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--nike-mute)',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        인쇄소 프로필 목록
      </Link>

      <div className="flex items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="nike-heading-xl">{profile.name}</h1>
          <p className="nike-caption-md mt-1">
            {profile.isSystem
              ? '시스템 프리셋 — isActive 토글만 편집 가능'
              : `슬러그: ${profile.slug}`}
          </p>
        </div>

        {/* 삭제 — superadmin 만, isSystem=false 만 */}
        {isSuperadmin && !profile.isSystem && (
          <button
            type="button"
            className="nike-btn-secondary"
            onClick={() => setDeleteDialogOpen(true)}
            style={{ borderColor: 'var(--nike-sale)', color: 'var(--nike-sale)' }}
          >
            <Trash2 className="size-4" aria-hidden="true" />
            삭제
          </button>
        )}
      </div>

      <PrinterProfileForm
        mode="edit"
        isSystem={profile.isSystem}
        defaultValues={profile}
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/printers')}
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
            <DialogTitle>인쇄소 프로필 삭제</DialogTitle>
            <DialogDescription>
              <strong>&quot;{profile.name}&quot;</strong> 프로필을 삭제합니다. 이 작업은 되돌릴 수
              없습니다. 계속하겠습니까?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <button
              type="button"
              className="nike-btn-secondary"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </button>
            <button
              type="button"
              className="nike-btn-primary"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              style={{ backgroundColor: 'var(--nike-sale)', opacity: isDeleting ? 0.6 : undefined }}
            >
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
