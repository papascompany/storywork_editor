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

import { fitToViewport } from '../Footer'

// ─── API 연동 ─────────────────────────────────────────────────────────────────

type RawTemplate = {
  id?: unknown
  name?: unknown
  formatId?: unknown
  format?: { widthMm?: unknown; heightMm?: unknown; bleedMm?: unknown; safeMm?: unknown }
  slots?: unknown
  thumbnail?: unknown
  intent?: unknown
}

async function fetchPublishedTemplates(): Promise<TemplateSpec[]> {
  try {
    const res = await fetch('/api/templates?status=published', { cache: 'no-store' })
    if (!res.ok) return []
    const data = (await res.json()) as { templates?: RawTemplate[] }
    if (!Array.isArray(data.templates) || data.templates.length === 0) return []
    // 간단 매핑 (admin Template DB → TemplateSpec)
    return data.templates.map(
      (t: RawTemplate): TemplateSpec => ({
        id: String(t.id ?? ''),
        name: String(t.name ?? ''),
        formatId: String(t.formatId ?? ''),
        format: {
          widthMm: Number(t.format?.widthMm ?? 130),
          heightMm: Number(t.format?.heightMm ?? 200),
          bleedMm: Number(t.format?.bleedMm ?? 3),
          safeMm: Number(t.format?.safeMm ?? 5),
        },
        slots: Array.isArray(t.slots) ? (t.slots as TemplateSpec['slots']) : [],
        thumbnail: typeof t.thumbnail === 'string' ? t.thumbnail : undefined,
        intent: typeof t.intent === 'string' ? t.intent : undefined,
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
        // C.4 fix: 카드 높이 고정 (grid 내 균일 정렬). 호흡감: gap-1.5→2.5, p-2→3
        'flex flex-col gap-2.5 rounded-[var(--radius-md)]',
        'border border-[var(--editor-border)]',
        'p-3 text-left w-full',
        'bg-[var(--color-surface)]',
        'hover:bg-[var(--editor-hover)] hover:border-[var(--editor-border-strong)]',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--editor-focus)]',
        isApplying && 'opacity-50 cursor-not-allowed',
      )}
    >
      {/* C.4 fix: 썸네일 고정 비율 (2:3), 통일된 높이로 그리드 정렬 */}
      {template.thumbnail ? (
        <Image
          src={template.thumbnail}
          alt={template.name}
          width={110}
          height={165}
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
          <LayoutTemplate className="size-6 text-[var(--editor-text-muted)]" />
        </div>
      )}

      {/* 이름 */}
      <span className="text-[11px] font-semibold truncate text-[var(--editor-text)] leading-tight">
        {template.name}
      </span>

      {/* 슬롯 종류 뱃지 — gap-1.5 호흡감 (이모지 사이 답답함 해소) */}
      <div className="flex flex-wrap gap-1.5" aria-label="슬롯 구성">
        {Object.entries(kindCounts).map(([kind, count]) => (
          <span
            key={kind}
            title={`${kind} × ${count}`}
            className="text-[9px] leading-none text-[var(--editor-text-muted)]"
            aria-label={`${kind} ${count}개`}
          >
            {KIND_EMOJI[kind] ?? kind}×{count}
          </span>
        ))}
      </div>
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
        // 슬롯 배치 후 viewportTransform 을 항상 재계산한다.
        // applyTemplate 는 슬롯을 페이지 px 좌표에 배치하지만 viewportTransform 은
        // 건드리지 않는다. 이전 페이지 전환·판형 변경·ResizeObserver 타이밍 등으로
        // viewportTransform 이 identity 상태이면 슬롯이 좌상단에 겹쳐 보인다.
        fitToViewport(canvas)
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
      <div className="relative px-8 py-4 border-b border-[var(--editor-border)] shrink-0">
        <Search
          className="absolute left-8 top-1/2 -translate-y-1/2 size-4 text-[var(--editor-text-muted)] pointer-events-none"
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
            'focus:outline-none focus:ring-2 focus:ring-[var(--editor-focus)] focus:border-transparent',
            'transition-colors duration-[var(--duration-fast)]',
          )}
        />
      </div>

      {/* 본문 */}
      <div className="flex-1 overflow-y-auto p-8">
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
          <div className="grid grid-cols-2 gap-8" role="list" aria-label="템플릿 목록">
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
          'shrink-0 px-8 py-4 border-t border-[var(--editor-border)]',
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
