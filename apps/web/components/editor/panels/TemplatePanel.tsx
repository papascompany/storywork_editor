'use client'

// ─────────────────────────────────────────────
// TemplatePanel — 템플릿 선택 + 캔버스 적용 패널
//
// 동작:
// 1. /api/templates?status=published 로 목록 fetch
//    - 비어 있거나 실패 시 DEFAULT_TEMPLATES 5개 프리셋으로 fallback
// 2. 썸네일 + 이름 + 슬롯 수 + format 이름 그리드 (2열)
// 3. 클릭 → applyTemplate(canvas, template, { existingObjects: 'preserve-user' })
//    → 토스트 "{name} 템플릿 적용됨"
// 4. 검색 (이름/intent)
//
// 이 패널은 FeatureSidebar 의 'template' case 에서 렌더된다.
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import type { TemplateSpec } from '@storywork/editor-template'
import { DEFAULT_TEMPLATES } from '@storywork/editor-template'
import { cn, showToast } from '@storywork/ui'
import { LayoutTemplate, Search } from 'lucide-react'
import Image from 'next/image'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'

// ─── API 연동 ─────────────────────────────────────────────────────────────────

async function fetchPublishedTemplates(): Promise<TemplateSpec[]> {
  try {
    const res = await fetch('/api/templates?status=published', { cache: 'no-store' })
    if (!res.ok) return []
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const data = (await res.json()) as { templates?: any[] }
    if (!Array.isArray(data.templates) || data.templates.length === 0) return []
    // 간단 매핑 (admin Template DB → TemplateSpec)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return data.templates.map(
      (t: any): TemplateSpec => ({
        id: String(t.id ?? ''),
        name: String(t.name ?? ''),
        formatId: String(t.formatId ?? ''),
        format: {
          widthMm: Number(t.format?.widthMm ?? 130),
          heightMm: Number(t.format?.heightMm ?? 200),
          bleedMm: Number(t.format?.bleedMm ?? 3),
          safeMm: Number(t.format?.safeMm ?? 5),
        },
        slots: Array.isArray(t.slots) ? t.slots : [],
        thumbnail: t.thumbnail as string | undefined,
        intent: t.intent as string | undefined,
      }),
    )
  } catch {
    return []
  }
}

// ─── 슬롯 kind 아이콘 (간소) ──────────────────────────────────────────────────

const KIND_EMOJI: Record<string, string> = {
  pose: '🧍',
  background: '🏞',
  'speech-bubble': '💬',
  text: 'T',
  prop: '📦',
  'mise-en-scene': '🎭',
  'word-fx': '✨',
  decoration: '⭐',
}

// ─── TemplateCard ─────────────────────────────────────────────────────────────

type TemplateCardProps = {
  template: TemplateSpec
  onClick: (template: TemplateSpec) => void
  isApplying: boolean
}

function TemplateCard({ template, onClick, isApplying }: TemplateCardProps) {
  const kindCounts: Record<string, number> = {}
  for (const slot of template.slots) {
    kindCounts[slot.kind] = (kindCounts[slot.kind] ?? 0) + 1
  }

  return (
    <button
      type="button"
      aria-label={`${template.name} 템플릿 적용`}
      disabled={isApplying}
      onClick={() => onClick(template)}
      className={cn(
        'flex flex-col gap-2 rounded-[var(--radius-md)]',
        'border border-[var(--editor-border)]',
        'p-3 text-left',
        'bg-[var(--color-surface)]',
        'hover:bg-[var(--editor-hover)] hover:border-[var(--color-brand-400)]',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        isApplying && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* 썸네일 or 플레이스홀더 */}
      {template.thumbnail ? (
        <Image
          src={template.thumbnail}
          alt={template.name}
          width={130}
          height={200}
          className="w-full aspect-[2/3] object-cover rounded-[var(--radius-sm)]"
          unoptimized
        />
      ) : (
        <div
          className={cn(
            'w-full aspect-[2/3] rounded-[var(--radius-sm)]',
            'flex items-center justify-center',
            'bg-[var(--color-surface-muted)]',
          )}
          aria-hidden="true"
        >
          <LayoutTemplate className="size-8 text-[var(--editor-text-muted)]" />
        </div>
      )}

      {/* 이름 */}
      <span className="text-[12px] font-semibold truncate text-[var(--editor-text)]">
        {template.name}
      </span>

      {/* 슬롯 종류 뱃지 */}
      <div className="flex flex-wrap gap-1" aria-label="슬롯 구성">
        {Object.entries(kindCounts).map(([kind, count]) => (
          <span
            key={kind}
            title={`${kind} × ${count}`}
            className="text-[10px] leading-none"
            aria-label={`${kind} ${count}개`}
          >
            {KIND_EMOJI[kind] ?? kind} ×{count}
          </span>
        ))}
      </div>

      {/* intent */}
      {template.intent && (
        <span className="text-[10px] text-[var(--editor-text-muted)] line-clamp-1">
          {template.intent}
        </span>
      )}
    </button>
  )
}

// ─── TemplatePanel ────────────────────────────────────────────────────────────

export type TemplatePanelProps = {
  canvas: StoryCanvas | null
}

export function TemplatePanel({ canvas }: TemplatePanelProps) {
  const [templates, setTemplates] = useState<TemplateSpec[]>([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [applying, setApplying] = useState(false)
  const searchRef = useRef<HTMLInputElement>(null)

  // 마운트 시 목록 fetch
  useEffect(() => {
    let cancelled = false
    setLoading(true)

    fetchPublishedTemplates()
      .then((fetched) => {
        if (cancelled) return
        // API 가 빈 경우 기본 프리셋 사용
        setTemplates(fetched.length > 0 ? fetched : DEFAULT_TEMPLATES)
      })
      .catch(() => {
        if (!cancelled) setTemplates(DEFAULT_TEMPLATES)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  // 검색 필터
  const filtered = useMemo(() => {
    if (!query.trim()) return templates
    const q = query.toLowerCase()
    return templates.filter(
      (t) => t.name.toLowerCase().includes(q) || (t.intent ?? '').toLowerCase().includes(q),
    )
  }, [templates, query])

  const handleApply = useCallback(
    async (template: TemplateSpec) => {
      if (!canvas) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }
      if (applying) return

      setApplying(true)
      try {
        const { applyTemplate } = await import('@storywork/editor-template')
        applyTemplate(canvas, template, { existingObjects: 'preserve-user' })
        showToast(`"${template.name}" 템플릿 적용됨`, 'success')
      } catch (err) {
        console.error('[TemplatePanel] applyTemplate 실패:', err)
        showToast('템플릿 적용에 실패했습니다.', 'error')
      } finally {
        setApplying(false)
      }
    },
    [canvas, applying],
  )

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 검색창 */}
      <div className="relative px-4 py-3 border-b border-[var(--editor-border)] shrink-0">
        <Search
          className="absolute left-7 top-1/2 -translate-y-1/2 size-4 text-[var(--editor-text-muted)] pointer-events-none"
          aria-hidden="true"
        />
        <input
          ref={searchRef}
          type="search"
          aria-label="템플릿 검색"
          placeholder="템플릿 검색..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className={cn(
            'w-full rounded-[var(--radius-md)]',
            'border border-[var(--editor-border)]',
            'bg-[var(--color-surface-muted)]',
            'pl-8 pr-3 py-1.5',
            'text-[13px] text-[var(--editor-text)]',
            'placeholder:text-[var(--editor-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent',
            'transition-colors duration-[var(--duration-fast)]',
          )}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-4">
        {loading ? (
          // 로딩
          <div className="flex flex-col gap-3" aria-live="polite" aria-busy="true">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-40 rounded-[var(--radius-md)] bg-[var(--color-surface-muted)] animate-pulse"
              />
            ))}
            <span className="sr-only">템플릿 목록 로딩 중...</span>
          </div>
        ) : filtered.length === 0 ? (
          // 빈 상태
          <div className="flex flex-col items-center gap-2 py-10 text-[var(--editor-text-muted)]">
            <LayoutTemplate className="size-10" aria-hidden="true" />
            <p className="text-[13px] text-center">
              {query ? `"${query}" 에 맞는 템플릿이 없습니다.` : '사용 가능한 템플릿이 없습니다.'}
            </p>
          </div>
        ) : (
          // 그리드
          <div className="grid grid-cols-2 gap-3" role="list" aria-label="템플릿 목록">
            {filtered.map((template) => (
              <div key={template.id} role="listitem">
                <TemplateCard template={template} onClick={handleApply} isApplying={applying} />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 안내 */}
      <div
        className={cn(
          'shrink-0 px-4 py-3 border-t border-[var(--editor-border)]',
          'text-[11px] text-[var(--editor-text-muted)]',
        )}
      >
        템플릿 클릭 시 슬롯 placeholder 가 생성됩니다.
        <br />
        기존 자산은 유지됩니다. Cmd+Z 로 되돌릴 수 있습니다.
      </div>
    </div>
  )
}
