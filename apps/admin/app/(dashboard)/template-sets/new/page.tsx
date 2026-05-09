'use client'

/**
 * (dashboard)/template-sets/new/page.tsx — 새 템플릿 세트 생성
 */

import { ArrowLeft, Star } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

interface TemplateItem {
  id: string
  name: string
  thumbnail: string | null
  slotCount: number
  formatName: string
}

export default function NewTemplateSetPage() {
  const router = useRouter()
  const [templates, setTemplates] = React.useState<TemplateItem[]>([])
  const [selectedIds, setSelectedIds] = React.useState<string[]>([])
  const [coverIdx, setCoverIdx] = React.useState(0)
  const [name, setName] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    fetch('/api/templates?pageSize=100')
      .then((r) => r.json())
      .then(
        (body: {
          data?: {
            id: string
            name: string
            thumbnail: string | null
            slotCount: number
            format: { name: string }
          }[]
        }) => {
          setTemplates(
            (body.data ?? []).map((t) => ({
              id: t.id,
              name: t.name,
              thumbnail: t.thumbnail,
              slotCount: t.slotCount,
              formatName: t.format?.name ?? '',
            })),
          )
        },
      )
      .catch(() => setError('템플릿 목록을 불러오지 못했습니다.'))
  }, [])

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      if (prev.includes(id)) {
        const next = prev.filter((i) => i !== id)
        if (coverIdx >= next.length && next.length > 0) setCoverIdx(next.length - 1)
        if (next.length === 0) setCoverIdx(0)
        return next
      }
      return [...prev, id]
    })
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    setSelectedIds((prev) => {
      const next = [...prev]
      ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]] as [string, string]
      if (coverIdx === idx) setCoverIdx(idx - 1)
      else if (coverIdx === idx - 1) setCoverIdx(idx)
      return next
    })
  }

  const moveDown = (idx: number) => {
    setSelectedIds((prev) => {
      if (idx >= prev.length - 1) return prev
      const next = [...prev]
      ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]] as [string, string]
      if (coverIdx === idx) setCoverIdx(idx + 1)
      else if (coverIdx === idx + 1) setCoverIdx(idx)
      return next
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (name.length < 2) {
      setError('이름은 2자 이상 입력해주세요.')
      return
    }
    if (selectedIds.length === 0) {
      setError('템플릿을 1개 이상 선택해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/template-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          templateIds: selectedIds,
          coverIdx,
        }),
      })

      if (res.status === 201) {
        const set = (await res.json()) as { id: string }
        router.push(`/template-sets/${set.id}`)
        return
      }

      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      setError(json.error?.message ?? '생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-3xl">
      <Link
        href="/template-sets"
        className="mb-4 inline-flex items-center gap-1 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        세트 목록
      </Link>

      <h1 className="mt-2 text-2xl font-bold text-[var(--color-text)]">새 템플릿 세트 만들기</h1>
      <p className="mt-1 text-sm text-[var(--color-text-muted)] mb-6">
        여러 템플릿을 선택하고 순서를 지정해 세트를 구성합니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 이름 */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="set-name" className="text-sm font-medium text-[var(--color-text)]">
            세트 이름{' '}
            <span aria-hidden="true" className="text-red-500">
              *
            </span>
          </label>
          <input
            id="set-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            placeholder="예: 로맨스 코믹 기본 세트"
            autoFocus
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          />
        </div>

        {/* 템플릿 선택 */}
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium text-[var(--color-text)]">
            템플릿 선택{' '}
            <span aria-hidden="true" className="text-red-500">
              *
            </span>
            <span className="ml-2 text-xs text-[var(--color-text-muted)] font-normal">
              (선택됨 {selectedIds.length}개)
            </span>
          </span>
          {templates.length === 0 && (
            <p className="text-sm text-[var(--color-text-muted)]">
              등록된 템플릿이 없습니다.{' '}
              <Link href="/templates/new" className="text-[var(--color-brand-500)] underline">
                먼저 템플릿을 만드세요
              </Link>
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto border border-[var(--color-border)] rounded-[var(--radius-lg)] p-2">
            {templates.map((t) => {
              const isSelected = selectedIds.includes(t.id)
              const selIdx = selectedIds.indexOf(t.id)
              const isCover = isSelected && selIdx === coverIdx
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSelect(t.id)}
                  className={`relative flex flex-col items-start gap-1 rounded-[var(--radius-md)] border p-2 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                    isSelected
                      ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
                      : 'border-[var(--color-border)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-muted)]'
                  }`}
                  aria-pressed={isSelected}
                >
                  {isCover && (
                    <Star
                      className="absolute top-1.5 right-1.5 size-3 text-yellow-500 fill-yellow-400"
                      aria-label="커버"
                    />
                  )}
                  {t.thumbnail ? (
                    <img
                      src={t.thumbnail}
                      alt={t.name}
                      className="w-full h-16 object-cover rounded-[var(--radius-sm)] border border-[var(--color-border)]"
                    />
                  ) : (
                    <div className="w-full h-16 bg-[var(--color-surface-muted)] rounded-[var(--radius-sm)] border border-[var(--color-border)] flex items-center justify-center text-xs text-[var(--color-text-disabled)]">
                      미리보기 없음
                    </div>
                  )}
                  <span className="text-xs font-medium text-[var(--color-text)] truncate w-full">
                    {t.name}
                  </span>
                  <span className="text-xs text-[var(--color-text-muted)]">
                    {t.formatName} · 슬롯 {t.slotCount}개
                  </span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 선택된 템플릿 순서 조정 */}
        {selectedIds.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium text-[var(--color-text)]">순서 / 커버 지정</span>
            <div className="flex flex-col gap-1 border border-[var(--color-border)] rounded-[var(--radius-lg)] p-2">
              {selectedIds.map((id, idx) => {
                const t = templates.find((x) => x.id === id)
                if (!t) return null
                const isCover = idx === coverIdx
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 bg-[var(--color-surface-muted)]"
                  >
                    <span className="text-xs text-[var(--color-text-muted)] w-5 text-right shrink-0">
                      {idx + 1}
                    </span>
                    <span className="flex-1 min-w-0 text-sm text-[var(--color-text)] truncate">
                      {t.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoverIdx(idx)}
                      title="커버로 지정"
                      className={`rounded p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] ${
                        isCover
                          ? 'text-yellow-500'
                          : 'text-[var(--color-text-muted)] hover:text-yellow-500'
                      }`}
                    >
                      <Star
                        className={`size-3.5 ${isCover ? 'fill-yellow-400' : ''}`}
                        aria-label={isCover ? '커버 (지정됨)' : '커버로 지정'}
                      />
                    </button>
                    <button
                      type="button"
                      onClick={() => moveUp(idx)}
                      disabled={idx === 0}
                      className="text-xs px-1 text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
                      aria-label="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === selectedIds.length - 1}
                      className="text-xs px-1 text-[var(--color-text-muted)] disabled:opacity-30 hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
                      aria-label="아래로 이동"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelect(id)}
                      className="text-xs px-1 text-red-500 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
                      aria-label="제거"
                    >
                      ×
                    </button>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <p role="alert" className="text-sm text-red-500">
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-[var(--color-brand-600)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
          >
            {isLoading ? '저장 중...' : '세트 만들기'}
          </button>
          <Link
            href="/template-sets"
            className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
          >
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
