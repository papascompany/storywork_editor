'use client'

/**
 * (dashboard)/resources/upload/page.tsx — 신규 PNG 업로드
 *
 * 드래그앤드롭 or 파일 선택 → 미리보기 → 메타 폼 → 업로드
 * Client Component (파일 드롭 + FormData)
 */

import { useRouter } from 'next/navigation'
import * as React from 'react'

import { RESOURCE_KINDS, type ResourceKindValue } from '../../../../src/lib/schemas/resource'

const KIND_LABELS: Record<ResourceKindValue, string> = {
  pose: '포즈',
  background: '배경',
  'mise-en-scene': '미장센',
  prop: '소품',
  'speech-bubble': '말풍선',
  'word-fx': '워드효과',
  decoration: '꾸미기',
}

export default function ResourceUploadPage() {
  const router = useRouter()
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const dropZoneRef = React.useRef<HTMLDivElement>(null)

  const [file, setFile] = React.useState<File | null>(null)
  const [preview, setPreview] = React.useState<string | null>(null)
  const [isDragging, setIsDragging] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  // 메타 폼 상태
  const [kind, setKind] = React.useState<ResourceKindValue>('pose')
  const [tags, setTags] = React.useState<string[]>([])
  const [tagInput, setTagInput] = React.useState('')
  const [bodyType, setBodyType] = React.useState('')
  const [view, setView] = React.useState('')
  const [action, setAction] = React.useState('')
  const [flippable, setFlippable] = React.useState(true)

  const handleFile = (f: File) => {
    if (!f.type.includes('image/png') && !f.name.endsWith('.png')) {
      setError('PNG 파일만 허용됩니다.')
      return
    }
    if (f.size > 10 * 1024 * 1024) {
      setError('파일 크기는 10MB 이하여야 합니다.')
      return
    }
    setError(null)
    setFile(f)
    const url = URL.createObjectURL(f)
    setPreview(url)
  }

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    setIsDragging(false)
    const dropped = e.dataTransfer.files[0]
    if (dropped) handleFile(dropped)
  }

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t) && tags.length < 20) {
      setTags((prev) => [...prev, t])
    }
    setTagInput('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) {
      setError('파일을 선택해 주세요.')
      return
    }

    setIsUploading(true)
    setError(null)

    const payload = {
      kind,
      ownerType: 'system',
      tags,
      meta: {
        ...(kind === 'pose'
          ? {
              bodyType: bodyType || undefined,
              view: view || undefined,
              action: action || undefined,
              flippable,
            }
          : {}),
      },
    }

    const formData = new FormData()
    formData.append('file', file)
    formData.append('payload', JSON.stringify(payload))

    try {
      const res = await fetch('/api/resources/upload', { method: 'POST', body: formData })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? '업로드 실패')
      }
      const created = (await res.json()) as { id: string }
      router.push(`/resources/${created.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.')
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-2xl">
      <h1 className="text-2xl font-bold text-[var(--color-text)] mb-2">신규 리소스 업로드</h1>
      <p className="text-sm text-[var(--color-text-muted)] mb-6">
        PNG 파일을 업로드합니다. 업로드 후 검수 큐에 등록됩니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 파일 드롭존 */}
        <div
          ref={dropZoneRef}
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') fileInputRef.current?.click()
          }}
          tabIndex={0}
          role="button"
          aria-label="PNG 파일 선택 또는 드롭"
          className={`relative flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border-2 border-dashed p-8 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
            isDragging
              ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
              : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]'
          }`}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL (URL.createObjectURL) 은 next/image 미지원 */}
              <img
                src={preview}
                alt="미리보기"
                className="max-h-48 max-w-full object-contain rounded-[var(--radius-md)]"
              />
              <p className="text-sm text-[var(--color-text)]">{file?.name}</p>
              <p className="text-xs text-[var(--color-text-muted)]">
                {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
              </p>
            </>
          ) : (
            <>
              <div className="size-12 rounded-full bg-[var(--color-brand-100)] flex items-center justify-center">
                <svg
                  className="size-6 text-[var(--color-brand-500)]"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                  />
                </svg>
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-[var(--color-text)]">
                  PNG 파일을 드롭하거나 클릭하세요
                </p>
                <p className="text-xs text-[var(--color-text-muted)] mt-1">최대 10MB</p>
              </div>
            </>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,.png"
            className="sr-only"
            onChange={(e) => {
              const f = e.target.files?.[0]
              if (f) handleFile(f)
            }}
          />
        </div>

        {/* 종류 선택 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="kind" className="text-sm font-medium text-[var(--color-text)]">
            종류 *
          </label>
          <select
            id="kind"
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

        {/* 포즈 전용 메타 */}
        {kind === 'pose' && (
          <fieldset className="flex flex-col gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
            <legend className="text-sm font-medium text-[var(--color-text)] px-2">포즈 메타</legend>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bodyType" className="text-sm text-[var(--color-text-muted)]">
                  신체 유형
                </label>
                <select
                  id="bodyType"
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                >
                  <option value="">선택 안 함</option>
                  <option value="M">남성 (M)</option>
                  <option value="F">여성 (F)</option>
                  <option value="child">어린이</option>
                  <option value="beast">동물/괴물</option>
                  <option value="unknown">미분류</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor="view" className="text-sm text-[var(--color-text-muted)]">
                  시점
                </label>
                <select
                  id="view"
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                >
                  <option value="">선택 안 함</option>
                  <option value="front">정면</option>
                  <option value="side">측면</option>
                  <option value="back">후면</option>
                  <option value="three-quarter">3/4</option>
                </select>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label htmlFor="action" className="text-sm text-[var(--color-text-muted)]">
                액션 키
              </label>
              <input
                id="action"
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="예: 걷기, 놀람, 싸움"
                className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={flippable}
                onClick={() => setFlippable((v) => !v)}
                className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 ${flippable ? 'bg-[var(--color-brand-500)]' : 'bg-[var(--color-surface-muted)]'}`}
              >
                <span
                  className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${flippable ? 'translate-x-5' : 'translate-x-0'}`}
                />
              </button>
              <label className="text-sm text-[var(--color-text-muted)]">
                좌우 반전 허용 (flippable)
              </label>
            </div>
          </fieldset>
        )}

        {/* 태그 */}
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-[var(--color-text)]">태그</label>
          <div className="flex flex-wrap gap-1.5 min-h-[2.75rem] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-brand-500)]">
            {tags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  aria-label={`태그 ${tag} 삭제`}
                  className="focus-visible:outline-none"
                >
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
              onBlur={() => {
                if (tagInput.trim()) addTag(tagInput)
              }}
              placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
              className="flex-1 min-w-[4rem] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus:outline-none"
            />
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div
            role="alert"
            className="px-4 py-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-red-700"
          >
            {error}
          </div>
        )}

        {/* 제출 */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || isUploading}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2"
          >
            {isUploading && (
              <span
                className="animate-spin size-4 border border-white border-t-transparent rounded-full"
                aria-hidden="true"
              />
            )}
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2 text-sm font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded-[var(--radius-md)]"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
