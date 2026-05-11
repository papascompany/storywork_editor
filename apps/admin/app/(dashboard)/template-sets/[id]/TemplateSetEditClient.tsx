'use client'

/**
 * TemplateSetEditClient — 템플릿 세트 편집
 *
 * 좌측: 선택된 Template 그리드 (순서 변경 + cover 지정 + 제거)
 * 우측: 메타 폼 (이름, coverIdx)
 * "Template 추가" 버튼 → 모달로 목록에서 다중 선택
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@storywork/ui'
import { ArrowLeft, Plus, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import type { AdminRole } from '../../../../src/lib/auth'

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface TemplateSummary {
  id: string
  name: string
  thumbnail: string | null
  slotCount: number
  formatName: string
}

export interface TemplateSetData {
  id: string
  name: string
  coverIdx: number
  templates: TemplateSummary[]
}

interface TemplateSetEditClientProps {
  set: TemplateSetData
  userRole: AdminRole
}

// ─── TemplateSetEditClient ────────────────────────────────────────────────────

export function TemplateSetEditClient({ set, userRole }: TemplateSetEditClientProps) {
  const router = useRouter()
  const [name, setName] = React.useState(set.name)
  const [templates, setTemplates] = React.useState<TemplateSummary[]>(set.templates)
  const [coverIdx, setCoverIdx] = React.useState(set.coverIdx)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [allTemplates, setAllTemplates] = React.useState<TemplateSummary[]>([])
  const [addSelectedIds, setAddSelectedIds] = React.useState<string[]>([])

  const canEdit = userRole === 'superadmin' || userRole === 'curator'
  const isSuperadmin = userRole === 'superadmin'

  const safeSetTemplates = (next: TemplateSummary[], prevCoverIdx: number) => {
    setTemplates(next)
    if (next.length === 0) setCoverIdx(0)
    else if (prevCoverIdx >= next.length) setCoverIdx(next.length - 1)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const next = [...templates]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]] as [(typeof next)[0], (typeof next)[0]]
    let newCover = coverIdx
    if (coverIdx === idx) newCover = idx - 1
    else if (coverIdx === idx - 1) newCover = idx
    setTemplates(next)
    setCoverIdx(newCover)
  }

  const moveDown = (idx: number) => {
    if (idx >= templates.length - 1) return
    const next = [...templates]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]] as [(typeof next)[0], (typeof next)[0]]
    let newCover = coverIdx
    if (coverIdx === idx) newCover = idx + 1
    else if (coverIdx === idx + 1) newCover = idx
    setTemplates(next)
    setCoverIdx(newCover)
  }

  const removeTemplate = (id: string) => {
    const idx = templates.findIndex((t) => t.id === id)
    const next = templates.filter((t) => t.id !== id)
    safeSetTemplates(next, idx <= coverIdx ? Math.max(0, coverIdx - 1) : coverIdx)
  }

  // 모달: 전체 템플릿 목록 로드
  const openAddModal = async () => {
    setAddSelectedIds([])
    setAddModalOpen(true)
    const res = await fetch('/api/templates?pageSize=100').catch(() => null)
    if (!res?.ok) return
    const body = (await res.json()) as {
      data?: {
        id: string
        name: string
        thumbnail: string | null
        slotCount: number
        format: { name: string }
      }[]
    }
    const currentIds = new Set(templates.map((t) => t.id))
    setAllTemplates(
      (body.data ?? [])
        .filter((t) => !currentIds.has(t.id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          thumbnail: t.thumbnail,
          slotCount: t.slotCount,
          formatName: t.format?.name ?? '',
        })),
    )
  }

  const confirmAdd = () => {
    const toAdd = allTemplates.filter((t) => addSelectedIds.includes(t.id))
    setTemplates((prev) => [...prev, ...toAdd])
    setAddModalOpen(false)
  }

  const handleSave = async () => {
    if (name.length < 2) {
      setSaveError('이름은 2자 이상이어야 합니다.')
      return
    }
    if (templates.length === 0) {
      setSaveError('템플릿이 1개 이상 필요합니다.')
      return
    }
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/template-sets/${set.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          templateIds: templates.map((t) => t.id),
          coverIdx,
        }),
      })
      if (res.ok) {
        router.refresh()
        return
      }
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      setSaveError(json.error?.message ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/template-sets/${set.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        setDeleteDialogOpen(false)
        router.push('/template-sets')
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
    <div className="p-6 lg:p-8 max-w-4xl">
      {/* 뒤로 */}
      <Link
        href="/template-sets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        세트 목록
      </Link>

      {/* 헤더 */}
      <div className="mt-2 flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-text)]">{set.name}</h1>
          <p className="mt-1 text-sm text-[var(--color-text-muted)]">
            템플릿 {set.templates.length}개
          </p>
        </div>
        {isSuperadmin && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            삭제
          </Button>
        )}
      </div>

      {saveError && (
        <p role="alert" className="mb-4 text-sm text-red-500">
          {saveError}
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 좌측: 템플릿 목록 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-[var(--color-text)]">
              포함 템플릿 ({templates.length}개)
            </h2>
            {canEdit && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-brand-500)] hover:text-[var(--color-brand-600)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
              >
                <Plus className="size-3.5" aria-hidden="true" />
                템플릿 추가
              </button>
            )}
          </div>

          {templates.length === 0 ? (
            <div className="border border-dashed border-[var(--color-border)] rounded-[var(--radius-lg)] py-12 text-center">
              <p className="text-sm text-[var(--color-text-muted)]">템플릿이 없습니다.</p>
              {canEdit && (
                <button
                  type="button"
                  onClick={openAddModal}
                  className="mt-3 text-sm text-[var(--color-brand-500)] hover:underline focus-visible:outline-none"
                >
                  + 템플릿 추가
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((t, idx) => {
                const isCover = idx === coverIdx
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface)] p-3"
                  >
                    <span className="text-xs text-[var(--color-text-muted)] w-4 shrink-0">
                      {idx + 1}
                    </span>
                    {t.thumbnail ? (
                      <div className="relative h-12 w-12 rounded-[var(--radius-sm)] overflow-hidden border border-[var(--color-border)] shrink-0">
                        <Image
                          src={t.thumbnail}
                          alt={t.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-12 w-12 rounded-[var(--radius-sm)] bg-[var(--color-surface-muted)] border border-[var(--color-border)] shrink-0 flex items-center justify-center text-xs text-[var(--color-text-disabled)]">
                        없음
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--color-text)] truncate">
                        {t.name}
                      </p>
                      <p className="text-xs text-[var(--color-text-muted)]">
                        {t.formatName} · 슬롯 {t.slotCount}개
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCoverIdx(idx)}
                          title={isCover ? '커버 (지정됨)' : '커버로 지정'}
                          className={`rounded p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                            isCover
                              ? 'text-yellow-500'
                              : 'text-[var(--color-text-muted)] hover:text-yellow-500'
                          }`}
                        >
                          <Star
                            className={`size-3.5 ${isCover ? 'fill-yellow-400' : ''}`}
                            aria-label={isCover ? '커버' : '커버로 지정'}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="text-xs px-1 text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
                          aria-label="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={idx === templates.length - 1}
                          className="text-xs px-1 text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTemplate(t.id)}
                          className="text-xs px-1 text-red-400 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
                          aria-label="제거"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: 메타 폼 */}
        <div className="w-full lg:w-72 shrink-0">
          <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">세트 정보</h2>
          <div className="flex flex-col gap-4">
            {/* 이름 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-name" className="text-sm font-medium text-[var(--color-text)]">
                이름
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                disabled={!canEdit}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={50}
                className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
              />
            </div>

            {canEdit && (
              <Button onClick={handleSave} disabled={isSaving} className="mt-2">
                {isSaving ? '저장 중...' : '저장'}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Template 추가 모달 */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(v) => {
          if (!v) setAddModalOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 추가</DialogTitle>
            <DialogDescription>추가할 템플릿을 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {allTemplates.length === 0 ? (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                추가할 수 있는 템플릿이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {allTemplates.map((t) => {
                  const isSelected = addSelectedIds.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className={`flex items-center gap-3 rounded-[var(--radius-md)] p-2 cursor-pointer transition-colors ${
                        isSelected
                          ? 'bg-[var(--color-brand-50)]'
                          : 'hover:bg-[var(--color-surface-muted)]'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setAddSelectedIds((prev) =>
                            prev.includes(t.id) ? prev.filter((i) => i !== t.id) : [...prev, t.id],
                          )
                        }}
                        className="rounded border-[var(--color-border)] accent-[var(--color-brand-500)]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">
                          {t.name}
                        </p>
                        <p className="text-xs text-[var(--color-text-muted)]">
                          {t.formatName} · 슬롯 {t.slotCount}개
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setAddModalOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={confirmAdd} disabled={addSelectedIds.length === 0}>
              추가 ({addSelectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          if (!v) setDeleteDialogOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세트 삭제</DialogTitle>
            <DialogDescription>
              <strong>&quot;{set.name}&quot;</strong> 세트를 삭제합니다. 이 작업은 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
