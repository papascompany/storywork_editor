/**
 * Admin / Resources / Upload 스토리
 *
 * M3-04 신규 PNG 업로드 폼 데모
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'

import { RESOURCE_KINDS, type ResourceKindValue } from '../../admin/src/lib/schemas/resource'

// ─── 업로드 폼 컴포넌트 (Storybook 전용 standalone) ──────────────────────────

const KIND_LABELS: Record<ResourceKindValue, string> = {
  pose: '포즈',
  background: '배경',
  'mise-en-scene': '미장센',
  prop: '소품',
  'speech-bubble': '말풍선',
  'word-fx': '워드효과',
  decoration: '꾸미기',
}

function UploadFormDemo({ onSubmit }: { onSubmit?: (payload: unknown) => void }) {
  const [isDragging, setIsDragging] = React.useState(false)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [fileName, setFileName] = React.useState<string | null>(null)
  const [kind, setKind] = React.useState<ResourceKindValue>('pose')
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const fileInputRef = React.useRef<HTMLInputElement>(null)

  const handleFile = (f: File) => {
    setFileName(f.name)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t)) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  return (
    <form
      className="flex flex-col gap-6 max-w-md"
      onSubmit={(e) => {
        e.preventDefault()
        onSubmit?.({ kind, tags, fileName })
      }}
    >
      {/* 드롭존 */}
      <div
        onDragOver={(e) => {
          e.preventDefault()
          setIsDragging(true)
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault()
          setIsDragging(false)
          const f = e.dataTransfer.files[0]
          if (f) handleFile(f)
        }}
        onClick={() => fileInputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-8 cursor-pointer transition-colors ${
          isDragging
            ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
            : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]'
        }`}
      >
        {preview ? (
          <>
            <img
              src={preview}
              alt="미리보기"
              className="max-h-48 max-w-full object-contain rounded-[var(--radius-md)]"
            />
            <p className="text-sm text-[var(--color-text)]">{fileName}</p>
          </>
        ) : (
          <>
            <div className="size-12 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center text-[var(--color-brand-500)]">
              <svg className="size-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
            </div>
            <p className="text-sm font-medium text-[var(--color-text)]">
              PNG 파일을 드롭하거나 클릭
            </p>
            <p className="text-xs text-[var(--color-text-muted)]">최대 10MB</p>
          </>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/png"
          className="sr-only"
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) handleFile(f)
          }}
        />
      </div>

      {/* 종류 */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="story-kind" className="text-sm font-medium text-[var(--color-text)]">
          종류
        </label>
        <select
          id="story-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as ResourceKindValue)}
          className="h-11 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
        >
          {RESOURCE_KINDS.map((k) => (
            <option key={k} value={k}>
              {KIND_LABELS[k]}
            </option>
          ))}
        </select>
      </div>

      {/* 태그 */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-[var(--color-text)]">태그</label>
        <div className="flex flex-wrap gap-1.5 min-h-[2.75rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
            >
              {t}
              <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))}>
                ×
              </button>
            </span>
          ))}
          <input
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(tagInput)
              }
            }}
            placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
            className="flex-1 min-w-[4rem] bg-transparent text-sm focus:outline-none"
          />
        </div>
      </div>

      <button
        type="submit"
        className="inline-flex items-center justify-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] focus-visible:outline-none"
      >
        업로드 (데모)
      </button>
    </form>
  )
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/Resources/Upload',
  component: UploadFormDemo,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component: 'M3-04 신규 리소스 업로드 폼. 드래그앤드롭 + 파일 선택 + 메타 입력 + 태그.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof UploadFormDemo>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: 기본 ───────────────────────────────────────────────────────────

export const Default: Story = {
  name: 'Default — 업로드 폼',
  render: () => {
    const [submitted, setSubmitted] = React.useState<unknown>(null)
    return (
      <div className="p-4">
        <h2 className="text-lg font-bold text-[var(--color-text)] mb-4">신규 리소스 업로드</h2>
        <UploadFormDemo onSubmit={(payload) => setSubmitted(payload)} />
        {submitted && (
          <div className="mt-4 p-4 bg-green-50 rounded-[var(--radius-md)] text-sm text-green-700">
            <strong>제출됨:</strong> {JSON.stringify(submitted)}
          </div>
        )}
      </div>
    )
  },
}
