'use client'

/**
 * (dashboard)/template-sets/new/page.tsx — 새 템플릿 세트 생성
 */

import { ArrowLeft, Star } from 'lucide-react'
import Image from 'next/image'
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
    <div className="p-6 lg:p-10 max-w-3xl" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      <Link
        href="/template-sets"
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
        세트 목록
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
        Admin / 템플릿 세트 / 새 등록
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
        새 템플릿 세트 만들기
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
        여러 템플릿을 선택하고 순서를 지정해 세트를 구성합니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-6">
        {/* 이름 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="set-name"
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.55,
            }}
          >
            세트 이름 <span aria-hidden="true">*</span>
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
            style={{
              height: '44px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-canvas)',
              padding: '0 12px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              outline: 'none',
            }}
          />
        </div>

        {/* 템플릿 선택 */}
        <div className="flex flex-col gap-2">
          <span
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.55,
            }}
          >
            템플릿 선택 <span aria-hidden="true">*</span>
            <span style={{ marginLeft: '8px', opacity: 0.7 }}>(선택됨 {selectedIds.length}개)</span>
          </span>
          {templates.length === 0 && (
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                color: 'var(--mkt-ink)',
                opacity: 0.55,
              }}
            >
              등록된 템플릿이 없습니다.{' '}
              <Link href="/templates/new" style={{ textDecoration: 'underline' }}>
                먼저 템플릿을 만드세요
              </Link>
            </p>
          )}
          <div
            className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-64 overflow-y-auto p-2"
            style={{
              border: '1px solid var(--mkt-hairline)',
              borderRadius: 'var(--mkt-rounded-lg)',
            }}
          >
            {templates.map((t) => {
              const isSelected = selectedIds.includes(t.id)
              const selIdx = selectedIds.indexOf(t.id)
              const isCover = isSelected && selIdx === coverIdx
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => toggleSelect(t.id)}
                  className="relative flex flex-col items-start gap-1 text-left focus-visible:outline-none focus-visible:ring-2 rounded"
                  style={{
                    padding: '8px',
                    borderRadius: 'var(--mkt-rounded-md)',
                    border: `1px solid ${isSelected ? 'var(--mkt-ink)' : 'var(--mkt-hairline)'}`,
                    backgroundColor: isSelected ? 'var(--mkt-block-lime)' : 'var(--mkt-canvas)',
                    transition: 'background-color 100ms ease, border-color 100ms ease',
                    cursor: 'pointer',
                  }}
                  aria-pressed={isSelected}
                >
                  {isCover && (
                    <Star
                      className="absolute top-1.5 right-1.5 size-3 text-yellow-500 fill-yellow-400"
                      aria-label="커버"
                    />
                  )}
                  {t.thumbnail ? (
                    <div
                      className="relative w-full h-16 overflow-hidden"
                      style={{
                        borderRadius: 'var(--mkt-rounded-sm)',
                        border: '1px solid var(--mkt-hairline)',
                      }}
                    >
                      <Image
                        src={t.thumbnail}
                        alt={t.name}
                        fill
                        sizes="(max-width: 768px) 33vw, 160px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div
                      className="w-full h-16 flex items-center justify-center"
                      style={{
                        borderRadius: 'var(--mkt-rounded-sm)',
                        border: '1px solid var(--mkt-hairline)',
                        backgroundColor: 'var(--mkt-surface-soft)',
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '11px',
                        color: 'var(--mkt-ink)',
                        opacity: 0.4,
                      }}
                    >
                      미리보기 없음
                    </div>
                  )}
                  <span
                    className="truncate w-full"
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '12px',
                      fontWeight: 540,
                      color: 'var(--mkt-ink)',
                    }}
                  >
                    {t.name}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mkt-font-mono)',
                      fontSize: '10px',
                      color: 'var(--mkt-ink)',
                      opacity: 0.55,
                    }}
                  >
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
            <span
              style={{
                fontFamily: 'var(--mkt-font-mono)',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--mkt-ink)',
                opacity: 0.55,
              }}
            >
              순서 / 커버 지정
            </span>
            <div
              className="flex flex-col gap-1 p-2"
              style={{
                border: '1px solid var(--mkt-hairline)',
                borderRadius: 'var(--mkt-rounded-lg)',
              }}
            >
              {selectedIds.map((id, idx) => {
                const t = templates.find((x) => x.id === id)
                if (!t) return null
                const isCover = idx === coverIdx
                return (
                  <div
                    key={id}
                    className="flex items-center gap-2 px-2 py-1.5"
                    style={{
                      borderRadius: 'var(--mkt-rounded-md)',
                      backgroundColor: 'var(--mkt-surface-soft)',
                    }}
                  >
                    <span
                      className="w-5 text-right shrink-0"
                      style={{
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '11px',
                        color: 'var(--mkt-ink)',
                        opacity: 0.4,
                      }}
                    >
                      {idx + 1}
                    </span>
                    <span
                      className="flex-1 min-w-0 truncate"
                      style={{
                        fontFamily: 'var(--mkt-font-sans)',
                        fontSize: '13px',
                        fontWeight: 330,
                        color: 'var(--mkt-ink)',
                      }}
                    >
                      {t.name}
                    </span>
                    <button
                      type="button"
                      onClick={() => setCoverIdx(idx)}
                      title="커버로 지정"
                      className="rounded p-0.5 focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        color: isCover ? '#eab308' : 'var(--mkt-ink)',
                        opacity: isCover ? 1 : 0.4,
                      }}
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
                      className="rounded focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '12px',
                        padding: '0 4px',
                        color: 'var(--mkt-ink)',
                        opacity: idx === 0 ? 0.2 : 0.6,
                        cursor: idx === 0 ? 'not-allowed' : 'pointer',
                        border: 'none',
                        background: 'none',
                      }}
                      aria-label="위로 이동"
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      onClick={() => moveDown(idx)}
                      disabled={idx === selectedIds.length - 1}
                      className="rounded focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '12px',
                        padding: '0 4px',
                        color: 'var(--mkt-ink)',
                        opacity: idx === selectedIds.length - 1 ? 0.2 : 0.6,
                        cursor: idx === selectedIds.length - 1 ? 'not-allowed' : 'pointer',
                        border: 'none',
                        background: 'none',
                      }}
                      aria-label="아래로 이동"
                    >
                      ↓
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleSelect(id)}
                      className="rounded focus-visible:outline-none focus-visible:ring-2"
                      style={{
                        fontFamily: 'var(--mkt-font-mono)',
                        fontSize: '13px',
                        padding: '0 4px',
                        color: 'var(--mkt-ink)',
                        opacity: 0.5,
                        border: 'none',
                        background: 'none',
                        cursor: 'pointer',
                      }}
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
          <p
            role="alert"
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '13px',
              color: 'var(--mkt-ink)',
              backgroundColor: 'var(--mkt-block-pink)',
              borderRadius: 'var(--mkt-rounded-md)',
              padding: '10px 14px',
            }}
          >
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isLoading} className="mkt-btn-primary">
            {isLoading ? '저장 중...' : '세트 만들기'}
          </button>
          <Link href="/template-sets" className="mkt-btn-secondary">
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
