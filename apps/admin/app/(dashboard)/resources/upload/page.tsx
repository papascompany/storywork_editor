'use client'

/**
 * (dashboard)/resources/upload/page.tsx — 신규 PNG 업로드
 *
 * 드래그앤드롭 or 파일 선택 → 미리보기 → 메타 폼 → 업로드
 * Client Component (파일 드롭 + FormData)
 */

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
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

const INPUT_STYLE: React.CSSProperties = {
  height: '44px',
  borderRadius: 'var(--mkt-rounded-md)',
  border: '1px solid var(--mkt-hairline)',
  backgroundColor: 'var(--mkt-canvas)',
  padding: '0 12px',
  fontFamily: 'var(--mkt-font-sans)',
  fontSize: '15px',
  fontWeight: 320,
  color: 'var(--mkt-ink)',
  outline: 'none',
  width: '100%',
  transition: 'border-color 150ms ease',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--mkt-font-mono)',
  fontSize: '11px',
  fontWeight: 400,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: 'var(--mkt-ink)',
  opacity: 0.55,
  marginBottom: '6px',
  display: 'block',
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
    <div className="p-6 lg:p-10 max-w-2xl" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      {/* 뒤로 가기 */}
      <Link
        href="/resources"
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
        리소스 목록
      </Link>

      <p
        style={{
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--mkt-ink)',
          opacity: 0.4,
          marginBottom: '6px',
        }}
      >
        Admin / 리소스 / 업로드
      </p>
      <h1
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: 'clamp(24px, 3.5vw, 32px)',
          fontWeight: 340,
          lineHeight: 1.1,
          letterSpacing: '-0.96px',
          color: 'var(--mkt-ink)',
          marginBottom: '6px',
        }}
      >
        신규 리소스 업로드
      </h1>
      <p
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '15px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.55,
          marginBottom: '32px',
        }}
      >
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
          className="relative flex flex-col items-center justify-center gap-3 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2"
          style={{
            padding: '32px',
            borderRadius: 'var(--mkt-rounded-lg)',
            border: isDragging ? '2px solid var(--mkt-ink)' : '1.5px dashed var(--mkt-hairline)',
            backgroundColor: isDragging ? 'var(--mkt-block-lime)' : 'var(--mkt-canvas)',
            minHeight: '180px',
          }}
        >
          {preview ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element -- blob URL (URL.createObjectURL) 은 next/image 미지원 */}
              <img
                src={preview}
                alt="미리보기"
                style={{
                  maxHeight: '192px',
                  maxWidth: '100%',
                  objectFit: 'contain',
                  borderRadius: 'var(--mkt-rounded-md)',
                }}
              />
              <p
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: 'var(--mkt-ink)',
                }}
              >
                {file?.name}
              </p>
              <p
                style={{
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '12px',
                  color: 'var(--mkt-ink)',
                  opacity: 0.45,
                }}
              >
                {file ? `${(file.size / 1024).toFixed(1)} KB` : ''}
              </p>
            </>
          ) : (
            <>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: 'var(--mkt-rounded-full)',
                  backgroundColor: 'var(--mkt-surface-soft)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <svg
                  style={{ width: '24px', height: '24px', color: 'var(--mkt-ink)', opacity: 0.5 }}
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
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '15px',
                    fontWeight: 480,
                    color: 'var(--mkt-ink)',
                    marginBottom: '4px',
                  }}
                >
                  PNG 파일을 드롭하거나 클릭하세요
                </p>
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-mono)',
                    fontSize: '12px',
                    color: 'var(--mkt-ink)',
                    opacity: 0.4,
                    letterSpacing: '0.3px',
                  }}
                >
                  최대 10MB
                </p>
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
          <label htmlFor="kind" style={LABEL_STYLE}>
            종류 *
          </label>
          <select
            id="kind"
            value={kind}
            onChange={(e) => setKind(e.target.value as ResourceKindValue)}
            style={INPUT_STYLE}
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
          <fieldset
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '16px',
              padding: '20px',
              borderRadius: 'var(--mkt-rounded-lg)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-surface-soft)',
            }}
          >
            <legend
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'var(--mkt-ink)',
                opacity: 0.55,
                padding: '0 4px',
              }}
            >
              포즈 메타
            </legend>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="bodyType" style={LABEL_STYLE}>
                  신체 유형
                </label>
                <select
                  id="bodyType"
                  value={bodyType}
                  onChange={(e) => setBodyType(e.target.value)}
                  style={{ ...INPUT_STYLE, height: '40px' }}
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
                <label htmlFor="view" style={LABEL_STYLE}>
                  시점
                </label>
                <select
                  id="view"
                  value={view}
                  onChange={(e) => setView(e.target.value)}
                  style={{ ...INPUT_STYLE, height: '40px' }}
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
              <label htmlFor="action" style={LABEL_STYLE}>
                액션 키
              </label>
              <input
                id="action"
                type="text"
                value={action}
                onChange={(e) => setAction(e.target.value)}
                placeholder="예: 걷기, 놀람, 싸움"
                style={{ ...INPUT_STYLE, height: '40px' }}
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={flippable}
                onClick={() => setFlippable((v) => !v)}
                className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                style={{
                  position: 'relative',
                  display: 'inline-flex',
                  height: '24px',
                  width: '44px',
                  borderRadius: 'var(--mkt-rounded-full)',
                  border: '2px solid transparent',
                  backgroundColor: flippable ? 'var(--mkt-ink)' : 'var(--mkt-hairline)',
                  transition: 'background-color 150ms ease',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    display: 'inline-block',
                    width: '20px',
                    height: '20px',
                    borderRadius: 'var(--mkt-rounded-full)',
                    backgroundColor: 'var(--mkt-canvas)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                    transform: flippable ? 'translateX(20px)' : 'translateX(0)',
                    transition: 'transform 150ms ease',
                  }}
                />
              </button>
              <label
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: 'var(--mkt-ink)',
                  opacity: 0.7,
                  cursor: 'default',
                }}
              >
                좌우 반전 허용 (flippable)
              </label>
            </div>
          </fieldset>
        )}

        {/* 태그 */}
        <div className="flex flex-col gap-1.5">
          <label style={LABEL_STYLE}>태그</label>
          <div
            className="flex flex-wrap gap-1.5 focus-within:ring-2"
            style={{
              minHeight: '44px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-canvas)',
              padding: '8px 12px',
            }}
          >
            {tags.map((tag) => (
              <span
                key={tag}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 8px',
                  borderRadius: 'var(--mkt-rounded-full)',
                  backgroundColor: 'var(--mkt-block-lime)',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '12px',
                  fontWeight: 480,
                  color: 'var(--mkt-ink)',
                }}
              >
                {tag}
                <button
                  type="button"
                  onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                  aria-label={`태그 ${tag} 삭제`}
                  style={{
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: 'var(--mkt-ink)',
                    opacity: 0.6,
                    padding: '0',
                    lineHeight: 1,
                  }}
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
              style={{
                flex: 1,
                minWidth: '64px',
                background: 'transparent',
                border: 'none',
                outline: 'none',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 320,
                color: 'var(--mkt-ink)',
              }}
            />
          </div>
        </div>

        {/* 에러 */}
        {error && (
          <div
            role="alert"
            style={{
              borderRadius: 'var(--mkt-rounded-md)',
              backgroundColor: 'var(--mkt-block-pink)',
              border: '1px solid #e0b0b0',
              padding: '10px 14px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: '#8b2222',
            }}
          >
            {error}
          </div>
        )}

        {/* 제출 */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={!file || isUploading}
            className="mkt-btn-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
            style={{
              gap: '8px',
              display: 'inline-flex',
              alignItems: 'center',
              opacity: !file || isUploading ? 0.5 : undefined,
              cursor: !file || isUploading ? 'not-allowed' : undefined,
            }}
          >
            {isUploading && (
              <span
                style={{
                  display: 'inline-block',
                  width: '16px',
                  height: '16px',
                  border: '2px solid var(--mkt-canvas)',
                  borderTopColor: 'transparent',
                  borderRadius: 'var(--mkt-rounded-full)',
                  animation: 'spin 0.6s linear infinite',
                }}
                aria-hidden="true"
              />
            )}
            {isUploading ? '업로드 중...' : '업로드'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="mkt-btn-secondary focus-visible:outline-none focus-visible:ring-2"
          >
            취소
          </button>
        </div>
      </form>
    </div>
  )
}
