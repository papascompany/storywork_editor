'use client'

/**
 * (dashboard)/formats/new/page.tsx — 새 판형 생성
 *
 * 상단 프리셋 카드 4장 + EntityForm 으로 구성.
 * 프리셋 카드 클릭 → EntityForm defaultValues 채움 (reset 활용).
 */

import { cn } from '@storywork/ui'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { EntityForm } from '../../../../src/components/entity-form/EntityForm'
import type { FieldMeta } from '../../../../src/components/entity-form/EntityForm'
import { FORMAT_PRESETS, formatInputSchema } from '../../../../src/lib/schemas/format'
import type { FormatOutput, FormatPreset } from '../../../../src/lib/schemas/format'

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

// ─── 프리셋 카드 ──────────────────────────────────────────────────────────────

function PresetCard({
  preset,
  selected,
  onClick,
}: {
  preset: FormatPreset
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex flex-col items-start gap-1 rounded-[var(--radius-lg)] border p-4 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        selected
          ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
          : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
      )}
      aria-pressed={selected}
    >
      <span className="font-semibold text-sm text-[var(--color-text)]">{preset.name}</span>
      <span className="text-xs text-[var(--color-text-muted)]">{preset.description}</span>
      <span className="text-xs text-[var(--color-text-disabled)] font-mono mt-1">
        {preset.values.widthMm} × {preset.values.heightMm} mm · {preset.values.dpi} DPI
      </span>
    </button>
  )
}

// ─── 페이지 ──────────────────────────────────────────────────────────────────

export default function NewFormatPage() {
  const router = useRouter()
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null)
  const [defaultValues, setDefaultValues] = React.useState<Partial<FormatOutput>>({
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    gridDef: {},
  })
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})
  const [formKey, setFormKey] = React.useState(0)

  const handlePresetClick = (preset: FormatPreset) => {
    setSelectedPreset(preset.id)
    setDefaultValues(preset.values)
    // formKey 변경으로 EntityForm 재마운트 → defaultValues 반영
    setFormKey((k) => k + 1)
  }

  const handleSubmit = async (values: FormatOutput) => {
    setServerErrors({})

    const res = await fetch('/api/formats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (res.status === 201) {
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

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      {/* 뒤로 가기 */}
      <Link
        href="/formats"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        판형 목록
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)]">새 판형 등록</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)] mb-6">
        프리셋을 선택하거나 직접 입력해 판형을 등록합니다.
      </p>

      {/* 프리셋 카드 */}
      <section aria-label="프리셋에서 시작" className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">프리셋에서 시작</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FORMAT_PRESETS.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              selected={selectedPreset === preset.id}
              onClick={() => handlePresetClick(preset)}
            />
          ))}
        </div>
      </section>

      {/* EntityForm */}
      <EntityForm
        key={formKey}
        schema={formatInputSchema}
        defaultValues={defaultValues as Parameters<typeof EntityForm>[0]['defaultValues']}
        fieldMeta={FIELD_META}
        onSubmit={handleSubmit}
        serverErrors={serverErrors}
        submitLabel="판형 등록"
        onCancel={() => router.push('/formats')}
        dirtyGuard
      />
    </div>
  )
}
