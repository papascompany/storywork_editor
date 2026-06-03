'use client'

// ─────────────────────────────────────────────
// alternatives-section — AI 추천 대안 후보 섹션
//
// M4-05: Properties 탭 하단에 노출되는 "다른 추천 보기" 섹션.
// layer 가 pose/bubble/bg/wordFx 일 때만 표시.
//
// 카드 그리드 (K=5, 2열):
//   - 포즈: 썸네일 이미지
//   - 배경: 색상 칩
//   - 말풍선: 모양 아이콘
//   - confidence 배지 (퍼센트)
//   - 현재 적용된 카드: "현재" 배지 + 강조 테두리
//   - 한 클릭 교체 → onApply 콜백
// ─────────────────────────────────────────────

import { cn } from '@storywork/ui'
import { Cloud, MessageCircle, MessageSquare, Mic, Sparkles, Wand2 } from 'lucide-react'
import React from 'react'

import type { AlternativeCandidate, AlternativeLayerKind } from '../store/useAlternativesStore'
import {
  selectCurrentCandidates,
  selectHasAlternatives,
  selectSelectedIndex,
  useAlternativesStore,
} from '../store/useAlternativesStore'

// ─── 배경 톤 → CSS 색상 매핑 ─────────────────────────────────────────────────

const BG_TONE_COLOR: Record<string, string> = {
  cream: '#FFF8F0',
  mint: '#E8F5F0',
  lilac: '#EEE8F8',
  pink: '#FDE8F0',
  navy: '#1A2540',
  white: '#FFFFFF',
}

// ─── 말풍선 모양 → 아이콘 매핑 ────────────────────────────────────────────────

function BubbleShapeIcon({ shape, className }: { shape: string | undefined; className?: string }) {
  switch (shape) {
    case 'cloud':
      return <Cloud className={cn('size-5', className)} aria-hidden="true" />
    case 'shout':
      return <Sparkles className={cn('size-5', className)} aria-hidden="true" />
    case 'oval':
      return <MessageCircle className={cn('size-5', className)} aria-hidden="true" />
    case 'narration':
      return <Mic className={cn('size-5', className)} aria-hidden="true" />
    case 'rounded':
    default:
      return <MessageSquare className={cn('size-5', className)} aria-hidden="true" />
  }
}

// ─── 단일 카드 ────────────────────────────────────────────────────────────────

type CandidateCardProps = {
  candidate: AlternativeCandidate
  kind: AlternativeLayerKind
  isCurrent: boolean
  onApply: (candidate: AlternativeCandidate) => void
}

function CandidateCard({ candidate, kind, isCurrent, onApply }: CandidateCardProps) {
  const confidencePct = Math.round(candidate.confidence * 100)

  return (
    <button
      type="button"
      aria-label={`${candidate.label} 적용${isCurrent ? ' (현재 적용됨)' : ''}`}
      aria-pressed={isCurrent}
      onClick={() => onApply(candidate)}
      disabled={isCurrent}
      className={cn(
        'group relative flex flex-col items-center gap-1.5',
        'rounded-[var(--radius-md)]',
        'border-2 transition-all',
        'min-h-[44px] p-2',
        // 터치 타겟 ≥ 44px
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
        'motion-reduce:transition-none',
        isCurrent
          ? [
              'border-[var(--color-brand-500)]',
              'bg-[var(--color-brand-50)] dark:bg-[var(--color-brand-950)]',
              'cursor-default',
            ]
          : [
              'border-[var(--editor-hairline,var(--color-border))]',
              'bg-[var(--color-surface-raised)]',
              'hover:border-[var(--color-brand-300)]',
              'hover:shadow-sm',
              'cursor-pointer',
            ],
      )}
    >
      {/* 썸네일 영역 */}
      <div
        className={cn(
          'relative flex h-14 w-full items-center justify-center',
          'overflow-hidden rounded-[var(--radius-sm)]',
          'bg-[var(--color-surface-muted)]',
        )}
      >
        {/* 포즈: 썸네일 이미지
            eslint-disable-next-line @next/next/no-img-element
            사유: AI 추천 썸네일은 외부 Supabase blob URL 또는 data URL 로, next/image 의 도메인 화이트리스트 구성 없이 사용되는 보조 UI 요소
        */}
        {kind === 'pose' && candidate.thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={candidate.thumbnail}
            alt={candidate.label}
            className="h-full w-full object-contain"
            draggable={false}
          />
        )}

        {/* 포즈 썸네일 없음 */}
        {kind === 'pose' && !candidate.thumbnail && (
          <Wand2 className="size-6 text-[var(--color-text-muted)] opacity-40" aria-hidden="true" />
        )}

        {/* 배경: 색상 칩 */}
        {kind === 'bg' && (
          <div
            aria-hidden="true"
            className="h-full w-full rounded-[var(--radius-sm)] border border-[var(--color-border)]"
            style={{ backgroundColor: BG_TONE_COLOR[candidate.tone ?? ''] ?? '#F5F5F5' }}
          />
        )}

        {/* 말풍선: 모양 아이콘 */}
        {kind === 'bubble' && (
          <BubbleShapeIcon shape={candidate.shape} className="text-[var(--color-text-muted)]" />
        )}

        {/* wordFx: sparkles 아이콘 */}
        {kind === 'wordFx' && (
          <Sparkles className="size-6 text-[var(--color-text-muted)]" aria-hidden="true" />
        )}

        {/* confidence 배지 */}
        <span
          aria-hidden="true"
          className={cn(
            'absolute right-1 top-1',
            'rounded-full px-1 py-0.5',
            'text-[9px] font-semibold leading-none',
            confidencePct >= 80
              ? 'bg-[var(--color-brand-100)] text-[var(--color-brand-700)]'
              : 'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)]',
          )}
        >
          {confidencePct}%
        </span>
      </div>

      {/* 라벨 */}
      <span className="max-w-full truncate text-center text-[10px] leading-tight text-[var(--color-text)]">
        {candidate.label}
      </span>

      {/* "현재" 배지 */}
      {isCurrent && (
        <span
          className={cn(
            'absolute -top-2 left-1/2 -translate-x-1/2',
            'rounded-full bg-[var(--color-brand-500)] px-1.5 py-0.5',
            'text-[8px] font-semibold text-white leading-none',
          )}
          aria-hidden="true"
        >
          현재
        </span>
      )}
    </button>
  )
}

// ─── AlternativesSection (메인) ──────────────────────────────────────────────

export type AlternativesSectionProps = {
  /**
   * 후보 선택 시 호출.
   * 실제 canvas 변경 (fabricJson 갱신 + canvas 재렌더) 은 이 콜백에서 수행.
   */
  onApply: (candidate: AlternativeCandidate) => void
  /** 모바일 BottomSheet 안에서 사용될 때 true — grid 2열 유지 */
  isMobile?: boolean
}

export function AlternativesSection({ onApply, isMobile = false }: AlternativesSectionProps) {
  const candidates = useAlternativesStore(selectCurrentCandidates)
  const selectedIndex = useAlternativesStore(selectSelectedIndex)
  const hasAlternatives = useAlternativesStore(selectHasAlternatives)
  const current = useAlternativesStore((s) => s.current)

  if (!hasAlternatives || !current) return null

  const kind = current.layerKind

  const handleApply = (candidate: AlternativeCandidate) => {
    if (candidate.index === selectedIndex) return
    useAlternativesStore.getState().selectCandidate(candidate.index)
    onApply(candidate)
  }

  return (
    <section
      aria-label="AI 추천 대안 후보"
      data-testid="alternatives-section"
      className={cn('flex flex-col gap-3', isMobile ? 'p-4' : 'p-4')}
    >
      {/* 섹션 헤더 */}
      <div className="flex items-center gap-2">
        <Wand2 className="size-3.5 shrink-0 text-[var(--color-brand-500)]" aria-hidden="true" />
        <h3 className="text-[10px] font-medium uppercase tracking-[0.6px] text-[var(--editor-text-muted,var(--color-text-muted))] opacity-70">
          다른 추천 보기
        </h3>
        <span
          aria-hidden="true"
          className="ml-auto rounded-full bg-[var(--color-surface-muted)] px-1.5 py-0.5 text-[9px] text-[var(--color-text-muted)]"
        >
          {candidates.length}개
        </span>
      </div>

      {/* 카드 그리드 (항상 2열) */}
      <div
        role="list"
        aria-label={`${candidates.length}개 추천 후보`}
        className="grid grid-cols-2 gap-2"
      >
        {candidates.map((candidate) => (
          <div key={candidate.index} role="listitem">
            <CandidateCard
              candidate={candidate}
              kind={kind}
              isCurrent={candidate.index === selectedIndex}
              onApply={handleApply}
            />
          </div>
        ))}
      </div>

      {/* 힌트 텍스트 */}
      <p className="text-center text-[10px] text-[var(--color-text-muted)] opacity-60">
        카드를 클릭하면 캔버스에 즉시 적용됩니다
      </p>
    </section>
  )
}
