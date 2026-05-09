/**
 * Admin / Templates 스토리
 *
 * M3-05 Template + TemplateSet Builder 컴포넌트 데모.
 * 1. Templates / List — DataTable + 포맷 필터 + BulkActionBar
 * 2. Templates / Edit (SlotCanvas) — 빈 캔버스
 * 3. Templates / Edit (SlotCanvas) — 미리 정의된 슬롯 5개
 * 4. TemplateSets / List — DataTable + 커버 썸네일
 * 5. TemplateSets / Edit — 순서/커버 지정 편집
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { TemplateSetListClient } from '../../admin/app/(dashboard)/template-sets/TemplateSetListClient'
import type { TemplateSetRow } from '../../admin/app/(dashboard)/template-sets/TemplateSetListClient'
import { TemplateListClient } from '../../admin/app/(dashboard)/templates/TemplateListClient'
import type { TemplateRow } from '../../admin/app/(dashboard)/templates/TemplateListClient'
import { SlotCanvas } from '../../admin/src/components/slot-canvas/SlotCanvas'
import type { Slot } from '../../admin/src/lib/schemas/template'
import { SLOT_KIND_COLORS, SLOT_KINDS } from '../../admin/src/lib/schemas/template'

// ─── Mock 픽스처 — Templates ──────────────────────────────────────────────────

const MOCK_FORMATS = [
  { id: 'fmt-1', name: 'B5 단행본' },
  { id: 'fmt-2', name: 'A5 작품집' },
  { id: 'fmt-3', name: '세로형 모바일' },
]

const MOCK_TEMPLATES: TemplateRow[] = [
  {
    id: 'tmpl-1',
    name: '기본 2컷 세로',
    formatId: 'fmt-1',
    formatName: 'B5 단행본',
    slotCount: 2,
    thumbnail: null,
    createdAt: new Date('2026-01-15').toISOString(),
  },
  {
    id: 'tmpl-2',
    name: '감정 클로즈업 3분할',
    formatId: 'fmt-1',
    formatName: 'B5 단행본',
    slotCount: 3,
    thumbnail: 'https://placehold.co/256x384/f0f0ff/6366f1?text=T2',
    createdAt: new Date('2026-01-20').toISOString(),
  },
  {
    id: 'tmpl-3',
    name: '액션 다이나믹 4분할',
    formatId: 'fmt-2',
    formatName: 'A5 작품집',
    slotCount: 4,
    thumbnail: 'https://placehold.co/256x360/f0fff0/10b981?text=T3',
    createdAt: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'tmpl-4',
    name: '대화씬 2컷 가로',
    formatId: 'fmt-2',
    formatName: 'A5 작품집',
    slotCount: 2,
    thumbnail: null,
    createdAt: new Date('2026-02-10').toISOString(),
  },
  {
    id: 'tmpl-5',
    name: '모바일 세로 풀샷',
    formatId: 'fmt-3',
    formatName: '세로형 모바일',
    slotCount: 1,
    thumbnail: 'https://placehold.co/256x455/fff0f0/ef4444?text=T5',
    createdAt: new Date('2026-03-01').toISOString(),
  },
]

// ─── Mock 픽스처 — TemplateSets ───────────────────────────────────────────────

const MOCK_SETS: TemplateSetRow[] = [
  {
    id: 'set-1',
    name: '로맨스 코믹 기본 세트',
    templateCount: 4,
    coverIdx: 0,
    coverThumbnail: 'https://placehold.co/256x384/f0f0ff/6366f1?text=커버',
    createdAt: new Date('2026-02-01').toISOString(),
  },
  {
    id: 'set-2',
    name: '액션 배틀 세트',
    templateCount: 3,
    coverIdx: 1,
    coverThumbnail: null,
    createdAt: new Date('2026-02-15').toISOString(),
  },
  {
    id: 'set-3',
    name: '일상 힐링 세트',
    templateCount: 5,
    coverIdx: 0,
    coverThumbnail: 'https://placehold.co/256x384/f0fff0/10b981?text=세트',
    createdAt: new Date('2026-03-01').toISOString(),
  },
]

// ─── Sample Slots ──────────────────────────────────────────────────────────────

const SAMPLE_SLOTS_5: Slot[] = [
  {
    id: 'slot-1',
    kind: 'pose',
    x: 0.05,
    y: 0.05,
    w: 0.4,
    h: 0.42,
    rotation: 0,
    preferredTags: ['standing', 'hero'],
    locked: false,
    hint: '주인공',
  },
  {
    id: 'slot-2',
    kind: 'background',
    x: 0.0,
    y: 0.0,
    w: 1.0,
    h: 1.0,
    rotation: 0,
    preferredTags: ['indoor', 'school'],
    locked: true,
    hint: '배경',
  },
  {
    id: 'slot-3',
    kind: 'pose',
    x: 0.55,
    y: 0.05,
    w: 0.4,
    h: 0.42,
    rotation: 0,
    preferredTags: ['sitting', 'female'],
    locked: false,
    hint: '조연',
  },
  {
    id: 'slot-4',
    kind: 'speech-bubble',
    x: 0.1,
    y: 0.5,
    w: 0.35,
    h: 0.15,
    rotation: 0,
    preferredTags: [],
    locked: false,
  },
  {
    id: 'slot-5',
    kind: 'word-fx',
    x: 0.6,
    y: 0.65,
    w: 0.3,
    h: 0.2,
    rotation: -15,
    preferredTags: ['shock'],
    locked: false,
    hint: '효과음',
  },
]

const SAMPLE_FORMAT = {
  widthMm: 130,
  heightMm: 200,
  bleedMm: 3,
  safeMm: 5,
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Templates',
  component: TemplateListClient,
  parameters: {
    layout: 'fullscreen',
    docs: {
      description: {
        component:
          'M3-05 Template + TemplateSet Builder. 목록/SlotCanvas 편집기/세트 목록/세트 편집 시나리오 데모.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof TemplateListClient>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: Templates / List ───────────────────────────────────────────────

export const List: Story = {
  name: 'Templates / List — 5건 + superadmin',
  args: {
    initialData: MOCK_TEMPLATES,
    formats: MOCK_FORMATS,
    userRole: 'superadmin',
  },
}

export const ListCurator: Story = {
  name: 'Templates / List — curator (삭제 버튼 없음)',
  args: {
    initialData: MOCK_TEMPLATES,
    formats: MOCK_FORMATS,
    userRole: 'curator',
  },
}

export const ListEmpty: Story = {
  name: 'Templates / List — 빈 상태',
  args: {
    initialData: [],
    formats: MOCK_FORMATS,
    userRole: 'superadmin',
  },
}

// ─── 스토리 2: SlotCanvas — 빈 캔버스 ────────────────────────────────────────

function SlotCanvasEmptyDemo() {
  const [slots, setSlots] = React.useState<Slot[]>([])
  const [selectedId, setSelectedId] = React.useState<string | null>(null)
  const [showGrid, setShowGrid] = React.useState(false)

  const selected = slots.find((s) => s.id === selectedId)

  return (
    <div className="flex h-screen bg-[var(--color-surface-muted)]">
      {/* 캔버스 영역 */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            SlotCanvas — 빈 캔버스 (드래그로 슬롯 생성)
          </h2>
          <button
            type="button"
            onClick={() => setShowGrid((v) => !v)}
            className={`px-2 py-1 text-xs rounded border ${showGrid ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)] border-[var(--color-brand-300)]' : 'bg-[var(--color-surface)] border-[var(--color-border)] text-[var(--color-text-muted)]'}`}
          >
            그리드 {showGrid ? 'ON' : 'OFF'}
          </button>
          <span className="text-xs text-[var(--color-text-muted)]">슬롯 {slots.length}개</span>
        </div>
        <div className="flex-1 border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          <SlotCanvas
            format={SAMPLE_FORMAT}
            slots={slots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setSlots}
            showGrid={showGrid}
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 인스펙터 */}
      <div className="w-64 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-4">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">인스펙터</h3>
        {selected ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-3 h-3 rounded-full"
                style={{
                  background:
                    SLOT_KIND_COLORS[selected.kind as (typeof SLOT_KINDS)[number]] ?? '#6b7280',
                }}
              />
              <span className="text-sm font-medium text-[var(--color-text)]">{selected.kind}</span>
            </div>
            <pre className="text-xs bg-[var(--color-surface-muted)] p-2 rounded overflow-auto">
              {JSON.stringify(
                {
                  x: selected.x.toFixed(3),
                  y: selected.y.toFixed(3),
                  w: selected.w.toFixed(3),
                  h: selected.h.toFixed(3),
                },
                null,
                2,
              )}
            </pre>
            <button
              type="button"
              onClick={() => {
                setSlots((prev) => prev.filter((s) => s.id !== selectedId))
                setSelectedId(null)
              }}
              className="text-xs text-red-500 hover:text-red-700 text-left"
            >
              슬롯 삭제
            </button>
          </div>
        ) : (
          <p className="text-xs text-[var(--color-text-muted)]">
            캔버스에서 드래그해 슬롯을 만들거나, 슬롯을 클릭해 선택하세요.
          </p>
        )}

        <div className="mt-auto">
          <button
            type="button"
            onClick={() => setSlots([])}
            className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]"
          >
            모두 지우기
          </button>
        </div>
      </div>
    </div>
  )
}

export const SlotCanvasEmpty: StoryObj = {
  name: 'Templates / Edit — SlotCanvas 빈 캔버스',
  render: () => <SlotCanvasEmptyDemo />,
}

// ─── 스토리 3: SlotCanvas — 슬롯 5개 ─────────────────────────────────────────

function SlotCanvasWith5SlotsDemo() {
  const [slots, setSlots] = React.useState<Slot[]>(SAMPLE_SLOTS_5)
  const [selectedId, setSelectedId] = React.useState<string | null>(null)

  const selected = slots.find((s) => s.id === selectedId)

  return (
    <div className="flex h-screen bg-[var(--color-surface-muted)]">
      {/* 캔버스 */}
      <div className="flex-1 p-6 flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-[var(--color-text)]">
            SlotCanvas — 미리 정의된 슬롯 5개
          </h2>
          <span className="text-xs text-[var(--color-text-muted)]">슬롯 {slots.length}개</span>
        </div>
        {/* 범례 */}
        <div className="flex items-center gap-3 flex-wrap">
          {SLOT_KINDS.map((kind) => (
            <span key={kind} className="flex items-center gap-1 text-xs">
              <span
                className="inline-block w-2.5 h-2.5 rounded-sm"
                style={{ background: SLOT_KIND_COLORS[kind] }}
              />
              {kind}
            </span>
          ))}
        </div>
        <div className="flex-1 border border-[var(--color-border)] rounded-[var(--radius-lg)] overflow-hidden">
          <SlotCanvas
            format={SAMPLE_FORMAT}
            slots={slots}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onChange={setSlots}
            showGrid
            className="w-full h-full"
          />
        </div>
      </div>

      {/* 슬롯 목록 */}
      <div className="w-64 border-l border-[var(--color-border)] bg-[var(--color-surface)] p-4 flex flex-col gap-2">
        <h3 className="text-sm font-semibold text-[var(--color-text)]">슬롯 목록</h3>
        {slots.map((slot, idx) => (
          <button
            key={slot.id}
            type="button"
            onClick={() => setSelectedId(slot.id === selectedId ? null : slot.id)}
            className={`flex items-center gap-2 rounded-[var(--radius-md)] p-2 text-left text-xs transition-colors ${
              slot.id === selectedId
                ? 'bg-[var(--color-brand-50)] border border-[var(--color-brand-300)]'
                : 'bg-[var(--color-surface-muted)] border border-transparent hover:border-[var(--color-border)]'
            }`}
          >
            <span
              className="inline-block w-2.5 h-2.5 rounded-sm shrink-0"
              style={{
                background: SLOT_KIND_COLORS[slot.kind as (typeof SLOT_KINDS)[number]] ?? '#6b7280',
              }}
            />
            <span className="flex-1 truncate text-[var(--color-text)]">
              {idx + 1}. {slot.hint ?? slot.kind}
            </span>
            {slot.locked && (
              <span className="text-[10px] text-amber-600 bg-amber-50 px-1 rounded">잠금</span>
            )}
          </button>
        ))}
        {selected && (
          <div className="mt-2 p-2 bg-[var(--color-surface-muted)] rounded text-xs">
            <div className="font-medium text-[var(--color-text)] mb-1">
              {selected.hint ?? selected.kind}
            </div>
            <div className="text-[var(--color-text-muted)]">
              x: {(selected.x * 100).toFixed(1)}% · y: {(selected.y * 100).toFixed(1)}%
            </div>
            <div className="text-[var(--color-text-muted)]">
              w: {(selected.w * 100).toFixed(1)}% · h: {(selected.h * 100).toFixed(1)}%
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export const SlotCanvasWith5Slots: StoryObj = {
  name: 'Templates / Edit — SlotCanvas 슬롯 5개',
  render: () => <SlotCanvasWith5SlotsDemo />,
}

// ─── 스토리 4: TemplateSets / List ───────────────────────────────────────────

export const TemplateSetList: StoryObj = {
  name: 'TemplateSets / List — 3건 + superadmin',
  render: () => <TemplateSetListClient initialData={MOCK_SETS} userRole="superadmin" />,
}

export const TemplateSetListEmpty: StoryObj = {
  name: 'TemplateSets / List — 빈 상태',
  render: () => <TemplateSetListClient initialData={[]} userRole="superadmin" />,
}

// ─── 스토리 5: TemplateSets / Edit ───────────────────────────────────────────

interface EditableTemplate {
  id: string
  name: string
  thumbnail: string | null
  slotCount: number
  formatName: string
}

const ALL_TEMPLATES: EditableTemplate[] = MOCK_TEMPLATES.map((t) => ({
  id: t.id,
  name: t.name,
  thumbnail: t.thumbnail,
  slotCount: t.slotCount,
  formatName: t.formatName,
}))

function TemplateSetEditDemo() {
  const [items, setItems] = React.useState<EditableTemplate[]>(ALL_TEMPLATES.slice(0, 3))
  const [coverIdx, setCoverIdx] = React.useState(0)
  const [name, setName] = React.useState('로맨스 코믹 기본 세트')
  const [saved, setSaved] = React.useState(false)

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setItems((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]] as [
        EditableTemplate,
        EditableTemplate,
      ]
      if (coverIdx === idx) setCoverIdx(idx - 1)
      else if (coverIdx === idx - 1) setCoverIdx(idx)
      return next
    })
    setSaved(false)
  }

  const moveDown = (idx: number) => {
    setItems((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]] as [
        EditableTemplate,
        EditableTemplate,
      ]
      if (coverIdx === idx) setCoverIdx(idx + 1)
      else if (coverIdx === idx + 1) setCoverIdx(idx)
      return next
    })
    setSaved(false)
  }

  const remove = (id: string) => {
    setItems((prev) => {
      const next = prev.filter((t) => t.id !== id)
      if (coverIdx >= next.length && next.length > 0) setCoverIdx(next.length - 1)
      return next
    })
    setSaved(false)
  }

  return (
    <div className="flex min-h-screen bg-[var(--color-surface-muted)] p-6 gap-6">
      {/* 좌측: 템플릿 목록 */}
      <div className="flex-1 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-[var(--color-text)]">
            선택된 템플릿 ({items.length}개)
          </h2>
          <button
            type="button"
            className="text-xs text-[var(--color-brand-500)] hover:text-[var(--color-brand-600)]"
            onClick={() => {
              // 시연용: ALL_TEMPLATES 에서 없는 것 추가
              const existing = new Set(items.map((t) => t.id))
              const toAdd = ALL_TEMPLATES.find((t) => !existing.has(t.id))
              if (toAdd) setItems((prev) => [...prev, toAdd])
            }}
          >
            + 템플릿 추가
          </button>
        </div>

        <div className="flex flex-col gap-1">
          {items.map((t, idx) => {
            const isCover = idx === coverIdx
            return (
              <div
                key={t.id}
                className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-2 bg-[var(--color-surface-muted)] border border-[var(--color-border)]"
              >
                <span className="text-xs text-[var(--color-text-muted)] w-5 text-right shrink-0">
                  {idx + 1}
                </span>
                {t.thumbnail ? (
                  <img
                    src={t.thumbnail}
                    alt={t.name}
                    className="h-8 w-8 object-cover rounded shrink-0"
                  />
                ) : (
                  <div className="h-8 w-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded shrink-0 flex items-center justify-center text-[10px] text-[var(--color-text-disabled)]">
                    없음
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-[var(--color-text)] truncate">
                    {t.name}
                  </div>
                  <div className="text-xs text-[var(--color-text-muted)]">
                    {t.formatName} · 슬롯 {t.slotCount}개
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setCoverIdx(idx)}
                  title="커버로 지정"
                  className={`shrink-0 ${isCover ? 'text-yellow-500' : 'text-[var(--color-text-muted)] hover:text-yellow-500'}`}
                >
                  <svg
                    className={`size-4 ${isCover ? 'fill-yellow-400' : ''}`}
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    fill="none"
                    strokeWidth={2}
                  >
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                  className="text-xs px-1 text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)]"
                  aria-label="위로"
                >
                  ↑
                </button>
                <button
                  type="button"
                  onClick={() => moveDown(idx)}
                  disabled={idx === items.length - 1}
                  className="text-xs px-1 text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)]"
                  aria-label="아래로"
                >
                  ↓
                </button>
                <button
                  type="button"
                  onClick={() => remove(t.id)}
                  className="text-xs px-1 text-red-500 hover:text-red-700"
                  aria-label="제거"
                >
                  ×
                </button>
              </div>
            )
          })}

          {items.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)] p-4 text-center">
              템플릿을 추가해주세요.
            </p>
          )}
        </div>
      </div>

      {/* 우측: 메타 폼 */}
      <div className="w-72 bg-[var(--color-surface)] rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 flex flex-col gap-4 h-fit">
        <h2 className="text-base font-semibold text-[var(--color-text)]">세트 정보</h2>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="sb-set-name" className="text-sm font-medium text-[var(--color-text)]">
            세트 이름
          </label>
          <input
            id="sb-set-name"
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value)
              setSaved(false)
            }}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <span className="text-sm font-medium text-[var(--color-text)]">커버 템플릿</span>
          <span className="text-sm text-[var(--color-text-muted)]">
            {items[coverIdx]?.name ?? '없음'} (#{coverIdx + 1})
          </span>
        </div>

        <button
          type="button"
          onClick={() => setSaved(true)}
          className="mt-2 inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)]"
        >
          저장
        </button>

        {saved && (
          <p className="text-xs text-green-600 bg-green-50 rounded p-2">
            저장되었습니다. (name="{name}", coverIdx={coverIdx}, templates={items.length}개)
          </p>
        )}
      </div>
    </div>
  )
}

export const TemplateSetEdit: StoryObj = {
  name: 'TemplateSets / Edit — 순서/커버 지정 편집',
  render: () => <TemplateSetEditDemo />,
}
