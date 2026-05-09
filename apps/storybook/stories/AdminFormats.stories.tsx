/**
 * Admin / Formats 스토리
 *
 * M3-03 Format CRUD 컴포넌트 데모.
 * 1. Formats/List — DataTable + mock 데이터 5건
 * 2. Formats/New (Preset Cards) — 프리셋 카드 4장 + EntityForm
 * 3. Formats/Edit — 기존 데이터 채워진 EntityForm
 */

import type { Meta, StoryObj } from '@storybook/react'
import { cn } from '@storywork/ui'
import * as React from 'react'

import { FormatListClient } from '../../admin/app/(dashboard)/formats/FormatListClient'
import { EntityForm } from '../../admin/src/components/entity-form/EntityForm'
import type { FieldMeta } from '../../admin/src/components/entity-form/EntityForm'
import { FORMAT_PRESETS, formatInputSchema } from '../../admin/src/lib/schemas/format'
import type { FormatOutput } from '../../admin/src/lib/schemas/format'

// ─── Mock 픽스처 ──────────────────────────────────────────────────────────────

const MOCK_FORMATS = [
  {
    id: 'fmt-1',
    name: 'B5 단행본',
    widthMm: 130,
    heightMm: 200,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    templateCount: 5,
    createdAt: new Date('2026-01-15').toISOString(),
  },
  {
    id: 'fmt-2',
    name: 'A5 작품집',
    widthMm: 148,
    heightMm: 210,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    templateCount: 3,
    createdAt: new Date('2026-01-20').toISOString(),
  },
  {
    id: 'fmt-3',
    name: '정사각 1:1',
    widthMm: 150,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    templateCount: 0,
    createdAt: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'fmt-4',
    name: '세로형 모바일',
    widthMm: 90,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    templateCount: 1,
    createdAt: new Date('2026-02-10').toISOString(),
  },
  {
    id: 'fmt-5',
    name: 'A4 포스터',
    widthMm: 210,
    heightMm: 297,
    dpi: 300,
    bleedMm: 5,
    safeMm: 10,
    templateCount: 0,
    createdAt: new Date('2026-03-01').toISOString(),
  },
]

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Formats',
  component: FormatListClient,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component: 'M3-03 판형(Format) CRUD 페이지 컴포넌트. 목록/등록/편집 시나리오 데모.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof FormatListClient>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: Formats / List ─────────────────────────────────────────────────

export const List: Story = {
  name: 'Formats / List — 5건 데모',
  args: {
    initialData: MOCK_FORMATS,
    userRole: 'superadmin',
  },
}

export const ListCurator: Story = {
  name: 'Formats / List — curator (선택 없음)',
  args: {
    initialData: MOCK_FORMATS,
    userRole: 'curator',
  },
}

export const ListEmpty: Story = {
  name: 'Formats / List — 빈 상태',
  args: {
    initialData: [],
    userRole: 'superadmin',
  },
}

// ─── 필드 메타 (공통) ─────────────────────────────────────────────────────────

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

// ─── 스토리 2: Formats / New (Preset Cards) ───────────────────────────────────

function FormatNewDemo() {
  const [selectedPreset, setSelectedPreset] = React.useState<string | null>(null)
  const [defaultValues, setDefaultValues] = React.useState<Partial<FormatOutput>>({
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    gridDef: {},
  })
  const [formKey, setFormKey] = React.useState(0)
  const [submitted, setSubmitted] = React.useState<FormatOutput | null>(null)

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">새 판형 등록</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        프리셋을 선택하거나 직접 입력해 판형을 등록합니다.
      </p>

      {/* 프리셋 카드 */}
      <section className="mb-8">
        <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">프리셋에서 시작</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {FORMAT_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => {
                setSelectedPreset(preset.id)
                setDefaultValues(preset.values)
                setFormKey((k) => k + 1)
              }}
              className={cn(
                'flex flex-col items-start gap-1 rounded-[var(--radius-lg)] border p-4 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
                selectedPreset === preset.id
                  ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
                  : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
              )}
              aria-pressed={selectedPreset === preset.id}
            >
              <span className="font-semibold text-sm text-[var(--color-text)]">{preset.name}</span>
              <span className="text-xs text-[var(--color-text-muted)]">{preset.description}</span>
              <span className="text-xs text-[var(--color-text-disabled)] font-mono mt-1">
                {preset.values.widthMm} × {preset.values.heightMm} mm · {preset.values.dpi} DPI
              </span>
            </button>
          ))}
        </div>
      </section>

      <EntityForm
        key={formKey}
        schema={formatInputSchema}
        defaultValues={defaultValues as Parameters<typeof EntityForm>[0]['defaultValues']}
        fieldMeta={FIELD_META}
        onSubmit={async (values) => {
          await new Promise((r) => setTimeout(r, 500))
          setSubmitted(values)
        }}
        submitLabel="판형 등록"
        onCancel={() => window.alert('취소')}
        dirtyGuard
      />

      {submitted && (
        <pre className="mt-6 p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-md)] text-xs overflow-auto">
          {JSON.stringify(submitted, null, 2)}
        </pre>
      )}
    </div>
  )
}

export const NewWithPresets: StoryObj = {
  name: 'Formats / New (Preset Cards)',
  render: () => <FormatNewDemo />,
}

// ─── 스토리 3: Formats / Edit ─────────────────────────────────────────────────

function FormatEditDemo() {
  const [submitted, setSubmitted] = React.useState<FormatOutput | null>(null)

  return (
    <div className="max-w-2xl p-6">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-1">B5 단행본</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        이 판형으로 만든 템플릿 <strong>5개</strong>, 프로젝트 <strong>2개</strong>
      </p>

      <EntityForm
        schema={formatInputSchema}
        defaultValues={{
          name: 'B5 단행본',
          widthMm: 130,
          heightMm: 200,
          dpi: 300,
          bleedMm: 3,
          safeMm: 5,
          gridDef: {},
        }}
        fieldMeta={FIELD_META}
        onSubmit={async (values) => {
          await new Promise((r) => setTimeout(r, 500))
          setSubmitted(values)
        }}
        submitLabel="저장"
        onCancel={() => window.alert('취소')}
        dirtyGuard
      />

      {submitted && (
        <pre className="mt-6 p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-md)] text-xs overflow-auto">
          {JSON.stringify(submitted, null, 2)}
        </pre>
      )}
    </div>
  )
}

export const Edit: StoryObj = {
  name: 'Formats / Edit',
  render: () => <FormatEditDemo />,
}

// ─── 스토리 4: 프리셋 카드만 ──────────────────────────────────────────────────

function PresetCardsOnly() {
  const [selected, setSelected] = React.useState<string | null>(null)

  return (
    <div className="p-6">
      <h2 className="text-sm font-semibold text-[var(--color-text)] mb-3">프리셋에서 시작</h2>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {FORMAT_PRESETS.map((preset) => (
          <button
            key={preset.id}
            type="button"
            onClick={() => setSelected(preset.id === selected ? null : preset.id)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-[var(--radius-lg)] border p-4 text-left transition-colors',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              selected === preset.id
                ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
                : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]',
            )}
            aria-pressed={selected === preset.id}
          >
            <span className="font-semibold text-sm text-[var(--color-text)]">{preset.name}</span>
            <span className="text-xs text-[var(--color-text-muted)]">{preset.description}</span>
            <span className="text-xs text-[var(--color-text-disabled)] font-mono mt-1">
              {preset.values.widthMm} × {preset.values.heightMm} mm · {preset.values.dpi} DPI
            </span>
          </button>
        ))}
      </div>
      {selected && (
        <p className="mt-4 text-sm text-[var(--color-text-muted)]">
          선택된 프리셋: <strong>{FORMAT_PRESETS.find((p) => p.id === selected)?.name}</strong>
        </p>
      )}
    </div>
  )
}

export const PresetCards: StoryObj = {
  name: 'Formats / Preset Cards Only',
  render: () => <PresetCardsOnly />,
}
