'use client'

/**
 * FormatPickerModal — 판형 선택 모달
 *
 * - 4종 인라인 프리셋 카드 (B5 / A5 / 정사각 / 세로형)
 * - 프로젝트 이름 입력 (선택, 기본 "새 콘티 YYYY-MM-DD")
 * - ESC 닫기 비활성 (project === null 일 때는 반드시 선택해야 함)
 * - FOLLOWUP: admin /api/formats 불러와 추가 그리드 표시
 */

import { Button, Dialog, DialogContent, DialogHeader, DialogTitle, cn } from '@storywork/ui'
import React, { useEffect, useState } from 'react'

import type { CoverConfig } from '../../../lib/cover-config'
import { resolveCoverConfig } from '../../../lib/cover-config'
import type { PageFormat } from '../store/usePageStore'

// ─── 프리셋 정의 ──────────────────────────────────────────────────────────────

interface FormatPresetCard {
  id: string
  name: string
  description: string
  widthMm: number
  heightMm: number
  dpi: number
  bleedMm: number
  safeMm: number
  emoji: string
  /** admin 표지 설정 (DB 판형 한정 — 하드코드 프리셋은 undefined) */
  coverEnabled?: boolean | null
  coverWidthMm?: number | null
  coverHeightMm?: number | null
}

/** GET /api/formats 응답 항목 */
interface DbFormat {
  id: string
  name: string
  widthMm: number
  heightMm: number
  dpi: number
  bleedMm: number
  safeMm: number
  coverEnabled: boolean | null
  coverWidthMm: number | null
  coverHeightMm: number | null
}

function dbFormatToCard(f: DbFormat): FormatPresetCard {
  return {
    id: f.id,
    name: f.name,
    description: `${f.widthMm}×${f.heightMm}mm · ${f.dpi}dpi`,
    widthMm: f.widthMm,
    heightMm: f.heightMm,
    dpi: f.dpi,
    bleedMm: f.bleedMm,
    safeMm: f.safeMm,
    emoji: '',
    coverEnabled: f.coverEnabled,
    coverWidthMm: f.coverWidthMm,
    coverHeightMm: f.coverHeightMm,
  }
}

const FORMAT_PRESETS: FormatPresetCard[] = [
  {
    id: 'preset:b5-novel',
    name: 'B5 단행본',
    description: '130×200mm · 일반 만화/콘티',
    widthMm: 130,
    heightMm: 200,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    emoji: '📚',
  },
  {
    id: 'preset:a5-artbook',
    name: 'A5 작품집',
    description: '148×210mm · 작품집/매거진',
    widthMm: 148,
    heightMm: 210,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    emoji: '📖',
  },
  {
    id: 'preset:square',
    name: '정사각 1:1',
    description: '150×150mm · 인스타 카드뉴스',
    widthMm: 150,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    emoji: '🔲',
  },
  {
    id: 'preset:mobile-story',
    name: '세로형 모바일',
    description: '90×150mm · 모바일 스토리',
    widthMm: 90,
    heightMm: 150,
    dpi: 300,
    bleedMm: 3,
    safeMm: 5,
    emoji: '📱',
  },
]

// ─── 비율 시각화 헬퍼 ──────────────────────────────────────────────────────────

function AspectPreview({ widthMm, heightMm }: { widthMm: number; heightMm: number }) {
  const maxW = 64
  const maxH = 80
  const ratio = widthMm / heightMm

  let w: number
  let h: number
  if (ratio >= 1) {
    w = maxW
    h = maxW / ratio
  } else {
    h = maxH
    w = maxH * ratio
  }

  return (
    <div
      className="flex items-center justify-center"
      style={{ width: maxW, height: maxH }}
      aria-hidden="true"
    >
      <div
        className={cn(
          'rounded-[var(--radius-sm)]',
          'border-2 border-[var(--editor-focus)]',
          'bg-[var(--editor-selected-bg)]',
          'opacity-70',
        )}
        style={{ width: Math.round(w), height: Math.round(h) }}
      />
    </div>
  )
}

// ─── 컴포넌트 ────────────────────────────────────────────────────────────────

export interface FormatPickerModalProps {
  open: boolean
  /** dismissable=false 이면 overlay 클릭/ESC 로 닫히지 않음 */
  dismissable?: boolean
  /** cover: 표지 사용 판형이면 유효 표지 치수, 아니면 null (FOLLOWUP-COVER-02) */
  onSelect: (format: PageFormat, formatId: string, title: string, cover: CoverConfig | null) => void
  onClose?: () => void
}

export function FormatPickerModal({
  open,
  dismissable = false,
  onSelect,
  onClose,
}: FormatPickerModalProps) {
  const [selectedPreset, setSelectedPreset] = useState<FormatPresetCard | null>(null)
  const [title, setTitle] = useState('')
  // DB 판형 목록 (isActive=true 만) — 실패 시 하드코드 프리셋 폴백
  const [dbCards, setDbCards] = useState<FormatPresetCard[] | null>(null)

  useEffect(() => {
    if (!open) return
    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/formats')
        if (!res.ok) return
        const data = (await res.json()) as { formats?: DbFormat[] }
        if (!cancelled && data.formats && data.formats.length > 0) {
          setDbCards(data.formats.map(dbFormatToCard))
        }
      } catch {
        // 오프라인/오류 → 하드코드 프리셋 유지
      }
    })()
    return () => {
      cancelled = true
    }
  }, [open])

  const cards = dbCards ?? FORMAT_PRESETS

  const defaultTitle = `새 콘티 ${new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' })}`

  const handleConfirm = () => {
    if (!selectedPreset) return
    const format: PageFormat = {
      name: selectedPreset.name,
      widthMm: selectedPreset.widthMm,
      heightMm: selectedPreset.heightMm,
      dpi: selectedPreset.dpi,
      bleedMm: selectedPreset.bleedMm,
      safeMm: selectedPreset.safeMm,
    }
    const cover = resolveCoverConfig({
      widthMm: selectedPreset.widthMm,
      heightMm: selectedPreset.heightMm,
      coverEnabled: selectedPreset.coverEnabled,
      coverWidthMm: selectedPreset.coverWidthMm,
      coverHeightMm: selectedPreset.coverHeightMm,
    })
    onSelect(format, selectedPreset.id, title.trim() || defaultTitle, cover)
  }

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen && dismissable && onClose) {
      onClose()
    }
    // dismissable=false 이면 닫기 무시
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent
        className={cn(
          'max-w-xl w-full',
          // dismissable=false 이면 X 버튼만 숨김
          // (selector 가 너무 광범위하면 footer 의 시작하기 버튼까지 0×0 으로 가려짐 — 실제 production 에서 발생)
          !dismissable && '[&>button[aria-label="닫기"]]:hidden',
        )}
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold">어떤 판형으로 시작할까요?</DialogTitle>
        </DialogHeader>

        {/* 프리셋 카드 그리드 — gap-4 mt-4 호흡감 */}
        <div className="grid grid-cols-2 gap-4 mt-4" role="radiogroup" aria-label="판형 선택">
          {cards.map((preset) => {
            const isSelected = selectedPreset?.id === preset.id
            const hasCover = preset.coverEnabled === true
            return (
              <button
                key={preset.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => setSelectedPreset(preset)}
                className={cn(
                  // relative 필수: 내부 absolute 체크 뱃지용
                  'relative flex flex-col items-center gap-3 p-5 rounded-[var(--radius-lg)]',
                  'border-2 transition-all duration-[var(--duration-fast)]',
                  'cursor-pointer text-left',
                  'hover:shadow-md hover:-translate-y-0.5',
                  'focus-visible:outline-none focus-visible:ring-2',
                  'focus-visible:ring-[var(--editor-focus)] focus-visible:ring-offset-2',
                  isSelected
                    ? 'border-[color:var(--editor-accent-pop,var(--editor-focus))] bg-[var(--editor-selected-bg)] shadow-md'
                    : 'border-[color:var(--color-border)] bg-[var(--color-surface)] hover:border-[color:var(--editor-border-strong)]',
                )}
                data-testid={`format-preset-${preset.id}`}
              >
                <AspectPreview widthMm={preset.widthMm} heightMm={preset.heightMm} />
                <div className="text-center">
                  <div className="font-medium text-sm text-[var(--color-text)]">{preset.name}</div>
                  <div className="text-xs text-[var(--color-text-muted)] mt-0.5">
                    {preset.description}
                  </div>
                </div>
                {hasCover && (
                  <span
                    className={cn(
                      'absolute top-2 left-2 rounded-full px-2 py-0.5 text-[10px] font-medium',
                      'bg-[var(--editor-accent-pop,var(--editor-accent))] text-white',
                    )}
                    data-testid={`format-cover-badge-${preset.id}`}
                  >
                    표지 포함
                  </span>
                )}
                {isSelected && (
                  <div
                    className="editor-pop-in absolute top-2 right-2 size-4 rounded-full bg-[var(--editor-accent-pop,var(--editor-accent))] flex items-center justify-center"
                    aria-hidden="true"
                  >
                    <svg
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="white"
                      strokeWidth="3"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="size-2.5"
                    >
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  </div>
                )}
              </button>
            )
          })}
        </div>

        {/* 프로젝트 이름 입력 */}
        {selectedPreset && (
          <div className="mt-5 space-y-2">
            <label
              htmlFor="project-title-input"
              className="text-sm font-medium text-[var(--color-text)]"
            >
              프로젝트 이름 (선택)
            </label>
            <input
              id="project-title-input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={defaultTitle}
              className={cn(
                'w-full rounded-[var(--radius-md)]',
                'border border-[var(--color-border)]',
                'bg-[var(--color-surface)]',
                'px-3 py-2 text-sm text-[var(--color-text)]',
                'placeholder:text-[var(--color-text-muted)]',
                'focus-visible:outline-none focus-visible:ring-2',
                'focus-visible:ring-[var(--editor-focus)] focus-visible:ring-offset-1',
                'transition-shadow',
              )}
              maxLength={50}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleConfirm()
              }}
              aria-label="프로젝트 이름 입력"
              data-testid="project-title-input"
            />
          </div>
        )}

        {/* 확인 버튼 */}
        <Button
          onClick={handleConfirm}
          disabled={!selectedPreset}
          className="w-full mt-5"
          data-testid="format-picker-confirm"
          aria-label="선택한 판형으로 시작하기"
        >
          시작하기
        </Button>
      </DialogContent>
    </Dialog>
  )
}
