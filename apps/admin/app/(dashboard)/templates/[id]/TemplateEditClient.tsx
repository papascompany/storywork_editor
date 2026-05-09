'use client'

/**
 * TemplateEditClient — 슬롯 정의 편집기 클라이언트 컴포넌트
 *
 * 좌측: SlotCanvas (드래그로 슬롯 그리기/이동/리사이즈/삭제)
 * 우측: 인스펙터 (선택된 슬롯 메타, position/size, 저장 버튼)
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
import { ArrowLeft, Grid3X3, Trash2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { SlotCanvas } from '../../../../src/components/slot-canvas/SlotCanvas'
import type { AdminRole } from '../../../../src/lib/auth'
import { SLOT_KIND_COLORS, SLOT_KINDS } from '../../../../src/lib/schemas/template'
import type { Slot, SlotKind } from '../../../../src/lib/schemas/template'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface TemplateData {
  id: string
  name: string
  formatId: string
  format: {
    id: string
    name: string
    widthMm: number
    heightMm: number
    bleedMm: number
    safeMm: number
  }
  slots: Slot[]
  thumbnail: string | null
  fabricJson: Record<string, unknown>
}

interface TemplateEditClientProps {
  template: TemplateData
  userRole: AdminRole
}

// ─── 인스펙터 ─────────────────────────────────────────────────────────────────

interface SlotInspectorProps {
  slot: Slot
  format: { widthMm: number; heightMm: number }
  onChange: (updated: Slot) => void
  onDelete: () => void
  readonly: boolean
}

function SlotInspector({ slot, format, onChange, onDelete, readonly }: SlotInspectorProps) {
  const color = SLOT_KIND_COLORS[slot.kind as SlotKind] ?? '#6b7280'

  // mm 단위 ↔ 정규화 변환
  const toMm = (n: number, dim: number) => Math.round(n * dim * 10) / 10
  const toNorm = (mm: number, dim: number) => mm / dim

  return (
    <div className="flex flex-col gap-4">
      {/* kind */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          종류
        </label>
        <select
          value={slot.kind}
          disabled={readonly}
          onChange={(e) => onChange({ ...slot, kind: e.target.value as SlotKind })}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
          style={{ borderLeftColor: color, borderLeftWidth: 3 }}
        >
          {SLOT_KINDS.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
      </div>

      {/* hint */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          힌트 (선택)
        </label>
        <input
          type="text"
          value={slot.hint ?? ''}
          disabled={readonly}
          maxLength={100}
          placeholder="예: 주인공 정면"
          onChange={(e) => onChange({ ...slot, hint: e.target.value || undefined })}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
        />
      </div>

      {/* position & size */}
      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          위치 / 크기 (mm)
        </span>
        <div className="grid grid-cols-2 gap-2">
          {(
            [
              { key: 'x', label: 'X', dim: format.widthMm },
              { key: 'y', label: 'Y', dim: format.heightMm },
              { key: 'w', label: 'W', dim: format.widthMm },
              { key: 'h', label: 'H', dim: format.heightMm },
            ] as { key: 'x' | 'y' | 'w' | 'h'; label: string; dim: number }[]
          ).map(({ key, label, dim }) => (
            <div key={key} className="flex flex-col gap-0.5">
              <label className="text-xs text-[var(--color-text-muted)]">{label}</label>
              <input
                type="number"
                min={0}
                max={dim}
                step={0.5}
                value={toMm(slot[key], dim)}
                disabled={readonly}
                onChange={(e) => {
                  const mm = Number(e.target.value)
                  onChange({ ...slot, [key]: toNorm(mm, dim) })
                }}
                className="rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface)] px-2 py-1 text-xs text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
              />
            </div>
          ))}
        </div>
      </div>

      {/* rotation */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          회전 ({slot.rotation}°)
        </label>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={slot.rotation}
          disabled={readonly}
          onChange={(e) => onChange({ ...slot, rotation: Number(e.target.value) })}
          className="w-full accent-[var(--color-brand-500)] disabled:opacity-60"
        />
      </div>

      {/* locked */}
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={slot.locked}
          disabled={readonly}
          onChange={(e) => onChange({ ...slot, locked: e.target.checked })}
          className="rounded border-[var(--color-border)] accent-[var(--color-brand-500)] disabled:opacity-60"
        />
        <span className="text-sm text-[var(--color-text)]">자동 배치 잠금</span>
      </label>

      {/* preferredTags */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider">
          우선 태그 (쉼표 구분)
        </label>
        <input
          type="text"
          value={slot.preferredTags.join(', ')}
          disabled={readonly}
          placeholder="예: 걷기, 여자"
          onChange={(e) => {
            const tags = e.target.value
              .split(',')
              .map((t) => t.trim())
              .filter(Boolean)
              .slice(0, 10)
            onChange({ ...slot, preferredTags: tags })
          }}
          className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
        />
      </div>

      {/* 삭제 */}
      {!readonly && (
        <Button variant="destructive" size="sm" onClick={onDelete} className="mt-2">
          <Trash2 className="size-3.5 mr-1" aria-hidden="true" />
          슬롯 삭제
        </Button>
      )}
    </div>
  )
}

// ─── TemplateEditClient ────────────────────────────────────────────────────────

export function TemplateEditClient({ template, userRole }: TemplateEditClientProps) {
  const router = useRouter()
  const [name, setName] = React.useState(template.name)
  const [slots, setSlots] = React.useState<Slot[]>(template.slots)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [showGrid, setShowGrid] = React.useState(false)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  const isSuperadmin = userRole === 'superadmin'
  const canEdit = userRole === 'superadmin' || userRole === 'curator'

  const selectedSlot = slots.find((s) => s.id === selectedId) ?? null

  const handleSlotChange = React.useCallback((updated: Slot) => {
    setSlots((prev) => prev.map((s) => (s.id === updated.id ? updated : s)))
  }, [])

  const handleDeleteSlot = React.useCallback(() => {
    if (!selectedId) return
    setSlots((prev) => prev.filter((s) => s.id !== selectedId))
    setSelectedId(null)
  }, [selectedId])

  const handleSave = async () => {
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/templates/${template.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slots }),
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
      const res = await fetch(`/api/templates/${template.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        setDeleteDialogOpen(false)
        router.push('/templates')
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
    <div className="flex flex-col h-full min-h-0 overflow-hidden">
      {/* ─── 툴바 ─── */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex-wrap">
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
        >
          <ArrowLeft className="size-4" aria-hidden="true" />
          목록
        </Link>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!canEdit}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-1.5 text-sm font-medium text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] min-w-0 flex-1 max-w-xs disabled:opacity-60"
            aria-label="템플릿 이름"
          />
          <span className="text-xs text-[var(--color-text-muted)] shrink-0">
            {template.format.name} · 슬롯 {slots.length}개
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`inline-flex items-center gap-1.5 rounded-[var(--radius-md)] px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
              showGrid
                ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]'
                : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
            }`}
            aria-pressed={showGrid}
            title="격자 토글"
          >
            <Grid3X3 className="size-3.5" aria-hidden="true" />
            격자
          </button>

          {canEdit && (
            <Button variant="secondary" size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? '저장 중...' : '저장'}
            </Button>
          )}

          {isSuperadmin && (
            <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
              <Trash2 className="size-3.5" aria-hidden="true" />
              삭제
            </Button>
          )}
        </div>
      </div>

      {saveError && (
        <div
          role="alert"
          className="px-4 py-2 bg-red-50 border-b border-red-200 text-sm text-red-600"
        >
          {saveError}
        </div>
      )}

      {/* ─── 본체: 캔버스 + 인스펙터 ─── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 캔버스 영역 */}
        <div className="flex-1 min-w-0 overflow-hidden p-4">
          <SlotCanvas
            format={template.format}
            slots={slots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={canEdit ? setSlots : () => undefined}
            showGrid={showGrid}
            readonly={!canEdit}
            className="w-full h-full rounded-[var(--radius-lg)] border border-[var(--color-border)]"
          />
        </div>

        {/* 인스펙터 패널 */}
        <aside
          className="w-64 shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] overflow-y-auto"
          aria-label="슬롯 인스펙터"
        >
          <div className="p-4">
            {selectedSlot ? (
              <>
                <h2 className="text-sm font-semibold text-[var(--color-text)] mb-4">슬롯 속성</h2>
                <SlotInspector
                  slot={selectedSlot}
                  format={template.format}
                  onChange={handleSlotChange}
                  onDelete={handleDeleteSlot}
                  readonly={!canEdit}
                />
              </>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">슬롯을 선택하세요</p>
                {canEdit && (
                  <p className="mt-1 text-xs text-[var(--color-text-muted)]">
                    캔버스를 드래그해 새 슬롯을 그리거나, 기존 슬롯을 클릭해 선택하세요.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 슬롯 목록 */}
          {slots.length > 0 && (
            <div className="border-t border-[var(--color-border)] p-4">
              <h3 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">
                슬롯 목록 ({slots.length})
              </h3>
              <div className="flex flex-col gap-1">
                {slots.map((slot, idx) => {
                  const color = SLOT_KIND_COLORS[slot.kind as SlotKind] ?? '#6b7280'
                  const isSelected = slot.id === selectedId
                  return (
                    <button
                      key={slot.id}
                      type="button"
                      onClick={() => setSelectedId(isSelected ? null : slot.id)}
                      className={`flex items-center gap-2 rounded-[var(--radius-sm)] px-2 py-1.5 text-left text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                        isSelected
                          ? 'bg-[var(--color-brand-50)] text-[var(--color-brand-700)]'
                          : 'text-[var(--color-text)] hover:bg-[var(--color-surface-muted)]'
                      }`}
                    >
                      <span
                        className="size-2 rounded-full shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span className="flex-1 min-w-0 truncate">
                        {idx + 1}. {slot.kind}
                        {slot.hint ? ` — ${slot.hint}` : ''}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* 삭제 확인 다이얼로그 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          if (!v) setDeleteDialogOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 삭제</DialogTitle>
            <DialogDescription>
              <strong>&quot;{template.name}&quot;</strong> 템플릿을 삭제합니다. 이 작업은 되돌릴 수
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
