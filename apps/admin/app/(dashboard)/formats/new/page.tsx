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
        'flex flex-col items-start gap-1 text-left transition-colors',
        'focus-visible:outline-none focus-visible:ring-2',
      )}
      style={{
        padding: '14px',
        borderRadius: 'var(--mkt-rounded-md)',
        border: selected ? '2px solid var(--mkt-ink)' : '1.5px solid var(--mkt-hairline)',
        backgroundColor: selected ? 'var(--mkt-block-lime)' : 'var(--mkt-canvas)',
        cursor: 'pointer',
      }}
      aria-pressed={selected}
    >
      <span
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '14px',
          fontWeight: 540,
          letterSpacing: '-0.10px',
          color: 'var(--mkt-ink)',
        }}
      >
        {preset.name}
      </span>
      <span
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '12px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.55,
          lineHeight: 1.4,
        }}
      >
        {preset.description}
      </span>
      <span
        style={{
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '11px',
          fontWeight: 400,
          color: 'var(--mkt-ink)',
          opacity: 0.4,
          marginTop: '4px',
        }}
      >
        {preset.values.widthMm} × {preset.values.heightMm}mm · {preset.values.dpi}dpi
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

      <header
        className="mb-8"
        style={{
          paddingBottom: 'var(--mkt-space-lg)',
          borderBottom: '1px solid var(--mkt-hairline)',
        }}
      >
        <p
          className="mkt-eyebrow"
          style={{
            color: 'var(--mkt-ink)',
            opacity: 0.4,
            marginBottom: 'var(--mkt-space-xs)',
            fontSize: '12px',
          }}
        >
          ADMIN / FORMATS / NEW
        </p>
        <h1
          className="mkt-display-lg"
          style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-xs)' }}
        >
          새 판형 등록
        </h1>
        <p className="mkt-body" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
          프리셋을 선택하거나 직접 입력해 판형을 등록합니다.
        </p>
      </header>

      {/* 프리셋 카드 — mkt-block-cream 섹션 */}
      <section aria-label="프리셋에서 시작" className="mkt-block mkt-block-cream mb-8">
        <h2
          className="mkt-eyebrow"
          style={{
            color: 'var(--mkt-ink)',
            opacity: 0.55,
            marginBottom: 'var(--mkt-space-md)',
            fontSize: '12px',
          }}
        >
          프리셋에서 시작
        </h2>
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
