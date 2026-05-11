'use client'

// ─────────────────────────────────────────────
// TextPanel — FeatureSidebar 텍스트 패널
//
// "텍스트 추가" 버튼 → AddTextCommand 실행 → 추가 후 자동 선택 + 인라인 편집 진입
// ─────────────────────────────────────────────

import type { StoryCanvas } from '@storywork/editor-core'
import { Type } from 'lucide-react'
import React, { useCallback } from 'react'

import type { HistoryRef as History } from '../types'

// ─── 타입 ─────────────────────────────────────────────────────────────────────

type TextPanelProps = {
  canvas: StoryCanvas | null
  history: History | null
}

// ─── TextPanel ────────────────────────────────────────────────────────────────

export function TextPanel({ canvas, history }: TextPanelProps) {
  const handleAddText = useCallback(async () => {
    if (!canvas || !history) return

    const { AddTextCommand } = await import('@storywork/editor-text')

    // 캔버스 중앙에 배치
    const fc = canvas._fabricCanvas
    const canvasWidth = fc.getWidth()
    const canvasHeight = fc.getHeight()

    const cmd = new AddTextCommand({
      canvas,
      textOpts: {
        text: '텍스트를 입력하세요',
        left: canvasWidth / 2 - 100,
        top: canvasHeight / 3,
        width: 200,
        fontSize: 24,
        fill: '#111111',
      },
    })

    await cmd.do()
    history.push(cmd)

    // 추가 후 자동 선택 + 인라인 편집 진입
    const id = cmd.assignedId
    if (id) {
      const fabricObj = canvas.getObject(id)
      if (fabricObj) {
        fc.setActiveObject(fabricObj)
        fc.requestRenderAll()
        // 편집 모드 진입 (IText/Textbox)
        const itext = fabricObj as { enterEditing?: () => void }
        if (typeof itext.enterEditing === 'function') {
          itext.enterEditing()
        }
      }
    }
  }, [canvas, history])

  return (
    <div className="flex flex-col gap-3 p-4">
      {/* 텍스트 추가 버튼 */}
      <button
        type="button"
        aria-label="텍스트 추가"
        onClick={() => {
          void handleAddText()
        }}
        className="flex w-full items-center justify-center gap-2 rounded-[var(--radius-md)] border border-dashed border-[var(--color-brand-400)] bg-[var(--color-brand-50)] py-3 text-sm font-medium text-[var(--color-brand-600)] transition-colors hover:bg-[var(--color-brand-100)] dark:bg-[var(--color-brand-950)] dark:text-[var(--color-brand-400)] dark:hover:bg-[var(--color-brand-900)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
      >
        <Type className="size-4" aria-hidden="true" />
        텍스트 추가
      </button>

      {/* 빠른 스타일 */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-text-muted)]">
          빠른 스타일
        </span>
        {QUICK_STYLES.map((style) => (
          <QuickStyleButton key={style.label} style={style} canvas={canvas} history={history} />
        ))}
      </div>

      {/* 안내 */}
      <p className="text-center text-[11px] text-[var(--color-text-muted)]">
        더블클릭하면 텍스트를 편집할 수 있습니다
      </p>
    </div>
  )
}

// ─── 빠른 스타일 정의 ─────────────────────────────────────────────────────────

type QuickStyle = {
  label: string
  fontSize: number
  fontWeight?: 'normal' | 'bold'
  preview: string
}

const QUICK_STYLES: QuickStyle[] = [
  { label: '제목', fontSize: 36, fontWeight: 'bold', preview: '큰 제목' },
  { label: '소제목', fontSize: 24, fontWeight: 'bold', preview: '소제목' },
  { label: '본문', fontSize: 16, fontWeight: 'normal', preview: '일반 텍스트' },
  { label: '캡션', fontSize: 12, fontWeight: 'normal', preview: '작은 글씨' },
]

type QuickStyleButtonProps = {
  style: QuickStyle
  canvas: StoryCanvas | null
  history: History | null
}

function QuickStyleButton({ style, canvas, history }: QuickStyleButtonProps) {
  const handleClick = useCallback(async () => {
    if (!canvas || !history) return

    const { AddTextCommand } = await import('@storywork/editor-text')

    const fc = canvas._fabricCanvas
    const canvasWidth = fc.getWidth()
    const canvasHeight = fc.getHeight()

    const cmd = new AddTextCommand({
      canvas,
      textOpts: {
        text: style.preview,
        left: canvasWidth / 2 - 100,
        top: canvasHeight / 3,
        width: 200,
        fontSize: style.fontSize,
        fontWeight: style.fontWeight ?? 'normal',
        fill: '#111111',
      },
    })

    await cmd.do()
    history.push(cmd)

    const id = cmd.assignedId
    if (id) {
      const fabricObj = canvas.getObject(id)
      if (fabricObj) {
        fc.setActiveObject(fabricObj)
        fc.requestRenderAll()
      }
    }
  }, [canvas, history, style])

  return (
    <button
      type="button"
      aria-label={`${style.label} 스타일로 텍스트 추가`}
      onClick={() => {
        void handleClick()
      }}
      className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-surface-muted)] px-3 py-2 text-left transition-colors hover:bg-[var(--color-surface-raised)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
    >
      <span className="text-[11px] text-[var(--color-text-muted)]">{style.label}</span>
      <span
        style={{ fontSize: Math.min(style.fontSize, 18), fontWeight: style.fontWeight }}
        className="truncate text-[var(--color-text)]"
      >
        {style.preview}
      </span>
    </button>
  )
}
