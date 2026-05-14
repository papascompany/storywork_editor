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

// ─── 공통 인스펙터 스타일 ───────────────────────────────────────────────────

const INSPECTOR_LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--mkt-font-mono)',
  fontSize: '10px',
  fontWeight: 400,
  letterSpacing: '0.6px',
  textTransform: 'uppercase',
  color: 'var(--mkt-ink)',
  opacity: 0.55,
}

const INSPECTOR_INPUT_STYLE: React.CSSProperties = {
  width: '100%',
  height: '36px',
  borderRadius: 'var(--mkt-rounded-md)',
  border: '1px solid var(--mkt-hairline)',
  backgroundColor: 'var(--mkt-canvas)',
  padding: '0 10px',
  fontFamily: 'var(--mkt-font-sans)',
  fontSize: '13px',
  fontWeight: 330,
  color: 'var(--mkt-ink)',
  outline: 'none',
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
        <label style={INSPECTOR_LABEL_STYLE}>종류</label>
        <select
          value={slot.kind}
          disabled={readonly}
          onChange={(e) => onChange({ ...slot, kind: e.target.value as SlotKind })}
          style={{
            ...INSPECTOR_INPUT_STYLE,
            borderLeftColor: color,
            borderLeftWidth: 3,
            opacity: readonly ? 0.6 : 1,
          }}
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
        <label style={INSPECTOR_LABEL_STYLE}>힌트 (선택)</label>
        <input
          type="text"
          value={slot.hint ?? ''}
          disabled={readonly}
          maxLength={100}
          placeholder="예: 주인공 정면"
          onChange={(e) => onChange({ ...slot, hint: e.target.value || undefined })}
          style={{ ...INSPECTOR_INPUT_STYLE, opacity: readonly ? 0.6 : 1 }}
        />
      </div>

      {/* position & size */}
      <div className="flex flex-col gap-1.5">
        <span style={INSPECTOR_LABEL_STYLE}>위치 / 크기 (mm)</span>
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
              <label style={{ ...INSPECTOR_LABEL_STYLE, fontSize: '10px' }}>{label}</label>
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
                style={{
                  height: '32px',
                  borderRadius: 'var(--mkt-rounded-sm)',
                  border: '1px solid var(--mkt-hairline)',
                  backgroundColor: 'var(--mkt-canvas)',
                  padding: '0 8px',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '12px',
                  color: 'var(--mkt-ink)',
                  outline: 'none',
                  opacity: readonly ? 0.6 : 1,
                  width: '100%',
                }}
              />
            </div>
          ))}
        </div>
      </div>

      {/* rotation */}
      <div className="flex flex-col gap-1.5">
        <label style={INSPECTOR_LABEL_STYLE}>회전 ({slot.rotation}°)</label>
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={slot.rotation}
          disabled={readonly}
          onChange={(e) => onChange({ ...slot, rotation: Number(e.target.value) })}
          className="w-full"
          style={{ accentColor: 'var(--mkt-ink)', opacity: readonly ? 0.6 : 1 }}
        />
      </div>

      {/* locked */}
      <label
        className="flex items-center gap-2 cursor-pointer"
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '13px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
        }}
      >
        <input
          type="checkbox"
          checked={slot.locked}
          disabled={readonly}
          onChange={(e) => onChange({ ...slot, locked: e.target.checked })}
          style={{ accentColor: 'var(--mkt-ink)', opacity: readonly ? 0.6 : 1 }}
        />
        자동 배치 잠금
      </label>

      {/* preferredTags */}
      <div className="flex flex-col gap-1.5">
        <label style={INSPECTOR_LABEL_STYLE}>우선 태그 (쉼표 구분)</label>
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
          style={{ ...INSPECTOR_INPUT_STYLE, opacity: readonly ? 0.6 : 1 }}
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
      <div
        className="flex items-center gap-3 px-4 py-3 flex-wrap"
        style={{
          borderBottom: '1px solid var(--mkt-hairline)',
          backgroundColor: 'var(--mkt-canvas)',
        }}
      >
        <Link
          href="/templates"
          className="inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 rounded"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            fontWeight: 330,
            color: 'var(--mkt-ink)',
            opacity: 0.5,
            textDecoration: 'none',
          }}
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
            style={{
              height: '36px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-canvas)',
              padding: '0 12px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 500,
              color: 'var(--mkt-ink)',
              outline: 'none',
              minWidth: 0,
              flex: '1 1 0',
              maxWidth: '20rem',
              opacity: canEdit ? 1 : 0.6,
            }}
            aria-label="템플릿 이름"
          />
          <span
            className="shrink-0"
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              color: 'var(--mkt-ink)',
              opacity: 0.4,
            }}
          >
            {template.format.name} · 슬롯 {slots.length}개
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
            style={{
              height: '32px',
              padding: '0 12px',
              borderRadius: 'var(--mkt-rounded-md)',
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              color: 'var(--mkt-ink)',
              backgroundColor: showGrid ? 'var(--mkt-block-lime)' : 'var(--mkt-surface-soft)',
              border: 'none',
              cursor: 'pointer',
              transition: 'background-color 150ms ease',
            }}
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
          style={{
            padding: '10px 16px',
            borderBottom: '1px solid var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-block-pink)',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: 'var(--mkt-ink)',
          }}
        >
          {saveError}
        </div>
      )}

      {/* ─── 본체: 캔버스 + 인스펙터 ─── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* 캔버스 영역 */}
        <div
          className="flex-1 min-w-0 overflow-hidden p-4"
          style={{ backgroundColor: 'var(--mkt-surface-soft)' }}
        >
          <SlotCanvas
            format={template.format}
            slots={slots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={canEdit ? setSlots : () => undefined}
            showGrid={showGrid}
            readonly={!canEdit}
            className="w-full h-full"
          />
        </div>

        {/* 인스펙터 패널 */}
        <aside
          className="w-64 shrink-0 overflow-y-auto"
          style={{
            borderLeft: '1px solid var(--mkt-hairline)',
            backgroundColor: 'var(--mkt-canvas)',
          }}
          aria-label="슬롯 인스펙터"
        >
          <div className="p-4">
            {selectedSlot ? (
              <>
                <h2
                  style={{
                    fontFamily: 'var(--mkt-font-mono)',
                    fontSize: '11px',
                    fontWeight: 400,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: 'var(--mkt-ink)',
                    opacity: 0.55,
                    marginBottom: '16px',
                  }}
                >
                  슬롯 속성
                </h2>
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
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '14px',
                    fontWeight: 540,
                    color: 'var(--mkt-ink)',
                    marginBottom: '4px',
                  }}
                >
                  슬롯을 선택하세요
                </p>
                {canEdit && (
                  <p
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '12px',
                      fontWeight: 330,
                      color: 'var(--mkt-ink)',
                      opacity: 0.55,
                    }}
                  >
                    캔버스를 드래그해 새 슬롯을 그리거나, 기존 슬롯을 클릭해 선택하세요.
                  </p>
                )}
              </div>
            )}
          </div>

          {/* 슬롯 목록 */}
          {slots.length > 0 && (
            <div style={{ borderTop: '1px solid var(--mkt-hairline)', padding: '16px' }}>
              <h3
                style={{
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '10px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--mkt-ink)',
                  opacity: 0.4,
                  marginBottom: '12px',
                }}
              >
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
                      className="flex items-center gap-2 text-left focus-visible:outline-none focus-visible:ring-2 rounded"
                      style={{
                        padding: '6px 8px',
                        borderRadius: 'var(--mkt-rounded-sm)',
                        backgroundColor: isSelected ? 'var(--mkt-block-lime)' : 'transparent',
                        fontFamily: 'var(--mkt-font-sans)',
                        fontSize: '12px',
                        fontWeight: isSelected ? 540 : 330,
                        color: 'var(--mkt-ink)',
                        border: 'none',
                        cursor: 'pointer',
                        transition: 'background-color 100ms ease',
                      }}
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
