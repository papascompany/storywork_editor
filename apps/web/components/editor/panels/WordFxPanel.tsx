'use client'

// ─────────────────────────────────────────────
// WordFxPanel — 워드효과 도구 패널 (FeatureSidebar 내부)
//
// 구성:
//   - 검색창
//   - 카테고리 탭 (8개)
//   - 효과 그리드 (3열, 미리보기 카드)
//   - 적용된 효과 목록 + "효과 제거" 버튼
//
// 클릭 → ApplyEffectCommand 실행 (history 에 push)
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import {
  EFFECT_CATEGORIES,
  EFFECTS_REGISTRY,
  getEffectsByCategory,
  searchEffects,
} from '@storywork/editor-effects'
import type { EffectCategory, WordEffect } from '@storywork/editor-effects'
import { cn, showToast } from '@storywork/ui'
import React, { useCallback, useMemo, useRef, useState } from 'react'

import type { HistoryRef as History } from '../types'

// ─── 카테고리 한국어 라벨 ─────────────────────────────────────────────────────

const CATEGORY_LABEL: Record<EffectCategory, string> = {
  shadow: '그림자',
  outline: '외곽선',
  glow: '글로우',
  gradient: '그라디언트',
  metallic: '금속',
  transform: '변형',
  background: '배경 박스',
  pattern: '패턴',
}

// ─── 효과 미리보기 아이콘 ─────────────────────────────────────────────────────

// 단순 SVG "Aa" 텍스트 카드 — 실제 fabric 렌더 대신 인라인 SVG 으로 표현
function EffectPreviewIcon({ effect, isActive }: { effect: WordEffect; isActive: boolean }) {
  // 카테고리별 시각적 힌트 색상
  const categoryColor: Record<EffectCategory, string> = {
    shadow: '#555',
    outline: '#1a1a1a',
    glow: '#00b4ff',
    gradient: '#f6d365',
    metallic: '#c8860f',
    transform: '#6366f1',
    background: '#fbbf24',
    pattern: '#10b981',
  }
  const color = categoryColor[effect.category] ?? '#333'

  return (
    <svg viewBox="0 0 48 32" width="48" height="32" aria-hidden="true" className="shrink-0">
      <rect width="48" height="32" rx="4" fill={isActive ? 'var(--color-brand-50)' : '#f8f8f8'} />
      <text
        x="24"
        y="22"
        textAnchor="middle"
        fontSize="16"
        fontWeight="bold"
        fontFamily="serif"
        fill={color}
      >
        Aa
      </text>
    </svg>
  )
}

// ─── 효과 카드 ────────────────────────────────────────────────────────────────

type EffectCardProps = {
  effect: WordEffect
  isActive: boolean
  onClick: (effectId: string) => void
}

function EffectCard({ effect, isActive, onClick }: EffectCardProps) {
  return (
    <button
      type="button"
      aria-label={`${effect.name} 효과 적용${isActive ? ' (현재 적용됨)' : ''}`}
      aria-pressed={isActive}
      title={effect.description ?? effect.name}
      onClick={() => onClick(effect.id)}
      className={cn(
        'flex flex-col items-center gap-1.5 rounded-[var(--radius-md)]',
        'border p-2',
        'text-[var(--editor-text)] bg-[var(--color-surface)]',
        'hover:bg-[var(--editor-hover)] hover:border-[var(--color-brand-400)]',
        'transition-colors duration-[var(--duration-fast)]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        isActive
          ? 'border-[var(--color-brand-500)] bg-[var(--color-brand-50)]'
          : 'border-[var(--editor-border)]',
      )}
    >
      <EffectPreviewIcon effect={effect} isActive={isActive} />
      <span className="text-[10px] font-medium text-center leading-tight truncate w-full text-center">
        {effect.name}
      </span>
    </button>
  )
}

// ─── WordFxPanel ──────────────────────────────────────────────────────────────

export type WordFxPanelProps = {
  canvas: StoryCanvas | null
  history: History | null
}

export function WordFxPanel({ canvas, history }: WordFxPanelProps) {
  const [activeCategory, setActiveCategory] = useState<EffectCategory | 'all'>('all')
  const [query, setQuery] = useState('')
  const [appliedEffects, setAppliedEffects] = useState<string[]>([])
  const searchRef = useRef<HTMLInputElement>(null)

  // 현재 선택된 fabric 객체 ID (canvas 이벤트로 추적)
  const selectedIdRef = useRef<string | null>(null)

  // canvas 선택 이벤트 구독 (최초 마운트 시)
  React.useEffect(() => {
    if (!canvas) return

    const unsub = canvas.on('selection:changed', ({ ids }) => {
      if (ids.length === 0) {
        selectedIdRef.current = null
        setAppliedEffects([])
        return
      }
      const id = ids[0] ?? null
      selectedIdRef.current = id
      if (id) {
        const obj = canvas.getObject(id)
        if (obj) {
          // @ts-expect-error appliedEffects 는 ObjectData.meta 확장
          const effects: string[] = obj.data?.appliedEffects ?? []
          setAppliedEffects([...effects])
        }
      }
    })

    return unsub
  }, [canvas])

  // 표시할 효과 목록
  const displayedEffects = useMemo<WordEffect[]>(() => {
    if (query.trim()) {
      return searchEffects(query)
    }
    if (activeCategory === 'all') {
      return EFFECTS_REGISTRY
    }
    return getEffectsByCategory(activeCategory)
  }, [activeCategory, query])

  const handleEffectClick = useCallback(
    async (effectId: string) => {
      if (!canvas || !history) {
        showToast('편집기가 준비되지 않았습니다.', 'error')
        return
      }

      const targetId = selectedIdRef.current
      if (!targetId) {
        showToast('텍스트 객체를 먼저 선택하세요.', 'error')
        return
      }

      const obj = canvas.getObject(targetId)
      if (!obj) {
        showToast('선택된 객체를 찾을 수 없습니다.', 'error')
        return
      }

      // text 계열 객체만 허용
      // @ts-expect-error fabric type — type property
      const objType: string = ((obj as Record<string, unknown>).type as string) ?? ''
      const isTextType = ['text', 'textbox', 'i-text', 'itext'].some((t) =>
        objType.toLowerCase().includes(t),
      )
      if (!isTextType) {
        showToast('텍스트 객체에만 워드효과를 적용할 수 있습니다.', 'error')
        return
      }

      try {
        const { ApplyEffectCommand } = await import('@storywork/editor-effects')
        const cmd = new ApplyEffectCommand({ canvas, targetId, effectId })
        history.push(cmd)

        // 로컬 상태 업데이트
        setAppliedEffects((prev) => {
          if (prev.includes(effectId)) return prev
          return [...prev, effectId]
        })

        showToast('효과가 적용되었습니다.', 'success')
      } catch (err) {
        console.error('[WordFxPanel] 효과 적용 실패:', err)
        showToast('효과 적용에 실패했습니다.', 'error')
      }
    },
    [canvas, history],
  )

  const handleRemoveEffect = useCallback(
    async (effectId: string) => {
      if (!canvas || !history) return
      const targetId = selectedIdRef.current
      if (!targetId) return

      try {
        const { RemoveEffectCommand } = await import('@storywork/editor-effects')
        const cmd = new RemoveEffectCommand({ canvas, targetId, effectId })
        history.push(cmd)
        setAppliedEffects((prev) => prev.filter((id) => id !== effectId))
        showToast('효과가 제거되었습니다.', 'success')
      } catch (err) {
        console.error('[WordFxPanel] 효과 제거 실패:', err)
        showToast('효과 제거에 실패했습니다.', 'error')
      }
    },
    [canvas, history],
  )

  const hasSelection = selectedIdRef.current !== null

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 검색창 */}
      <div className="px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
        <input
          ref={searchRef}
          type="search"
          aria-label="워드효과 검색"
          placeholder="효과 검색..."
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            if (e.target.value) setActiveCategory('all')
          }}
          className={cn(
            'w-full rounded-[var(--radius-sm)]',
            'border border-[var(--editor-border)]',
            'bg-[var(--color-surface-muted)]',
            'px-3 py-1.5',
            'text-[12px] text-[var(--editor-text)]',
            'placeholder:text-[var(--editor-text-muted)]',
            'focus:outline-none focus:ring-2 focus:ring-[var(--color-brand-500)] focus:border-transparent',
            'transition-colors duration-[var(--duration-fast)]',
          )}
        />
      </div>

      {/* 카테고리 탭 — 검색 중엔 숨김 */}
      {!query.trim() && (
        <div
          className="flex overflow-x-auto gap-1 px-3 py-2 border-b border-[var(--editor-border)] shrink-0 scrollbar-none"
          role="tablist"
          aria-label="효과 카테고리"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeCategory === 'all'}
            onClick={() => setActiveCategory('all')}
            className={cn(
              'shrink-0 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium whitespace-nowrap',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              activeCategory === 'all'
                ? 'bg-[var(--color-brand-500)] text-white'
                : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-hover)]',
            )}
          >
            전체
          </button>
          {EFFECT_CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              role="tab"
              aria-selected={activeCategory === cat}
              onClick={() => setActiveCategory(cat)}
              className={cn(
                'shrink-0 px-2 py-1 rounded-[var(--radius-sm)] text-[11px] font-medium whitespace-nowrap',
                'transition-colors duration-[var(--duration-fast)]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
                activeCategory === cat
                  ? 'bg-[var(--color-brand-500)] text-white'
                  : 'text-[var(--editor-text-muted)] hover:text-[var(--editor-text)] hover:bg-[var(--editor-hover)]',
              )}
            >
              {CATEGORY_LABEL[cat]}
            </button>
          ))}
        </div>
      )}

      {/* 선택 안내 */}
      {!hasSelection && (
        <div className="px-4 py-2 shrink-0">
          <p className="text-[11px] text-[var(--color-warning-600)] bg-[var(--color-warning-50)] rounded-[var(--radius-sm)] px-3 py-2">
            텍스트 객체를 먼저 선택하세요.
          </p>
        </div>
      )}

      {/* 적용된 효과 표시 */}
      {hasSelection && appliedEffects.length > 0 && (
        <div className="px-3 py-2 border-b border-[var(--editor-border)] shrink-0">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[var(--editor-text-muted)] mb-1.5">
            적용된 효과
          </p>
          <div className="flex flex-wrap gap-1">
            {appliedEffects.map((effectId) => {
              const effect = EFFECTS_REGISTRY.find((e) => e.id === effectId)
              return (
                <span
                  key={effectId}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                >
                  {effect?.name ?? effectId}
                  <button
                    type="button"
                    aria-label={`${effect?.name ?? effectId} 효과 제거`}
                    onClick={() => void handleRemoveEffect(effectId)}
                    className="hover:text-[var(--color-brand-900)] focus-visible:outline-none"
                  >
                    &times;
                  </button>
                </span>
              )
            })}
          </div>
        </div>
      )}

      {/* 효과 그리드 */}
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {displayedEffects.length === 0 ? (
          <p className="text-[12px] text-[var(--editor-text-muted)] text-center py-8">
            검색 결과가 없습니다.
          </p>
        ) : (
          <div
            className="grid gap-2"
            style={{ gridTemplateColumns: 'repeat(3, 1fr)' }}
            role="listbox"
            aria-label="워드효과 목록"
          >
            {displayedEffects.map((effect) => (
              <EffectCard
                key={effect.id}
                effect={effect}
                isActive={appliedEffects.includes(effect.id)}
                onClick={(id) => void handleEffectClick(id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* 개수 표시 */}
      <div className="px-4 py-2 border-t border-[var(--editor-border)] shrink-0">
        <p className="text-[10px] text-[var(--editor-text-muted)]">
          {displayedEffects.length}개 효과
          {query.trim() ? ` (검색: "${query}")` : ''}
        </p>
      </div>
    </div>
  )
}
