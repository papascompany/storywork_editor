'use client'

/**
 * ScriptInputArea — Wizard Step 1: 대본 입력 + 판형 선택 (M4-04 Step 2)
 * React 명시 import: vitest JSX transform 호환
 *
 * - textarea: 대본 붙여넣기 (1~50,000자)
 * - 판형 선택: FORMAT_PRESETS 4종 라디오 카드
 * - "다음" 버튼 → step 'format-check'
 */

import { cn } from '@storywork/ui'
import React from 'react'

import { FORMAT_PRESETS } from './types'
import type { FormatPreset } from './types'

interface ScriptInputAreaProps {
  scriptRaw: string
  onScriptChange: (value: string) => void
  selectedFormatId: string
  onFormatChange: (id: string) => void
  onNext: () => void
}

const MAX_CHARS = 50_000

export function ScriptInputArea({
  scriptRaw,
  onScriptChange,
  selectedFormatId,
  onFormatChange,
  onNext,
}: ScriptInputAreaProps) {
  const charCount = scriptRaw.length
  const isValid = charCount >= 1 && charCount <= MAX_CHARS

  return (
    <div className="flex flex-col gap-6">
      {/* 대본 textarea */}
      <div className="flex flex-col gap-2">
        <label htmlFor="script-textarea" className="text-sm font-medium text-neutral-700">
          대본 붙여넣기
          <span className="ml-1 text-xs text-neutral-400">(최대 50,000자)</span>
        </label>
        <textarea
          id="script-textarea"
          value={scriptRaw}
          onChange={(e) => onScriptChange(e.target.value)}
          placeholder={`여기에 대본을 붙여넣으세요.\n\n예시:\n철수: 오늘 날씨가 참 좋네요.\n영희: 그러게요, 산책이나 할까요?`}
          rows={14}
          className={cn(
            'w-full resize-none rounded-lg border px-4 py-3 font-mono text-sm leading-relaxed',
            'focus:outline-none focus:ring-2 focus:ring-blue-500',
            'placeholder:text-neutral-400',
            charCount > MAX_CHARS ? 'border-red-400 bg-red-50' : 'border-neutral-300 bg-white',
          )}
        />
        <div className="flex items-center justify-between text-xs">
          <span className="text-neutral-400">screenplay, 소설, 에세이 등 자동 감지</span>
          <span
            className={cn(
              'tabular-nums',
              charCount > MAX_CHARS ? 'text-red-500 font-semibold' : 'text-neutral-400',
            )}
          >
            {charCount.toLocaleString()} / {MAX_CHARS.toLocaleString()}
          </span>
        </div>
      </div>

      {/* 판형 선택 */}
      <div className="flex flex-col gap-3">
        <p className="text-sm font-medium text-neutral-700">판형 선택</p>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {FORMAT_PRESETS.map((preset: FormatPreset) => {
            const selected = preset.id === selectedFormatId
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onFormatChange(preset.id)}
                className={cn(
                  'flex flex-col items-start rounded-lg border px-4 py-3 text-left transition-colors',
                  selected
                    ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                    : 'border-neutral-200 bg-white hover:border-neutral-400',
                )}
              >
                <span className="text-sm font-semibold text-neutral-800">{preset.label}</span>
                <span className="mt-0.5 text-xs text-neutral-500">{preset.description}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* 다음 버튼 */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!isValid}
          onClick={onNext}
          className={cn(
            'rounded-lg px-6 py-2.5 text-sm font-semibold transition-colors',
            isValid
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'cursor-not-allowed bg-neutral-200 text-neutral-400',
          )}
        >
          다음 →
        </button>
      </div>
    </div>
  )
}
