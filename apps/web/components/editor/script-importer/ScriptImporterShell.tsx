'use client'

/**
 * ScriptImporterShell — 대본 → 자동 페이지 생성 Wizard 메인 (M4-04 Step 2)
 * React 명시 import: vitest JSX transform 호환
 *
 * Wizard 5단계 흐름:
 *   Step 1 (input)        : 대본 입력 + 판형 선택
 *   Step 2 (format-check) : 판형 + 자동 감지 형식 확인
 *   Step 3 (character-map): 화자 → 캐릭터 매핑
 *   Step 4 (preview)      : 생성 결과 미리보기 + warnings
 *   → /editor?projectId=...
 *
 * M4-05 영역(alternatives UI)과 충돌하지 않도록
 * alternatives 관련 UI 는 이 파일에 포함하지 않는다.
 */

import { useRouter } from 'next/navigation'
import React, { useCallback, useState } from 'react'

import { CharacterMappingTable } from './CharacterMappingTable'
import { PipelineWarnings } from './PipelineWarnings'
import { PreviewPages } from './PreviewPages'
import { ScriptInputArea } from './ScriptInputArea'
import { FORMAT_PRESETS } from './types'
import type { CharacterMapEntry, FullPipelineResponse, WizardState, WizardStep } from './types'

// ─── 대본에서 화자 추출 ──────────────────────────────────────────────────────

function extractSpeakers(scriptRaw: string): string[] {
  const seen = new Set<string>()
  // screenplay: "이름: 대사" 패턴
  const screenplayPattern = /^([가-힣a-zA-Z0-9_]{1,20})\s*:\s*\S/gm
  // 소설: 따옴표 앞 화자 ("이름이 말했다")
  const novelPattern = /"([가-힣a-zA-Z0-9_]{1,20})"\s*(이?라고|라며|하며|하고|했다|했습니다)/g

  for (const m of scriptRaw.matchAll(screenplayPattern)) {
    const name = m[1]?.trim()
    if (name) seen.add(name)
  }
  for (const m of scriptRaw.matchAll(novelPattern)) {
    const name = m[1]?.trim()
    if (name) seen.add(name)
  }

  return [...seen].slice(0, 10) // 최대 10명
}

// ─── Wizard 스텝 레이블 ───────────────────────────────────────────────────────

const STEP_LABELS: Record<WizardStep, string> = {
  input: '대본 입력',
  'format-check': '판형 확인',
  'character-map': '캐릭터 매핑',
  preview: '미리보기',
}

const STEP_ORDER: WizardStep[] = ['input', 'format-check', 'character-map', 'preview']

// ─── ScriptImporterShell ─────────────────────────────────────────────────────

export function ScriptImporterShell() {
  const router = useRouter()

  const [state, setState] = useState<WizardState>({
    step: 'input',
    scriptRaw: '',
    selectedFormatId: FORMAT_PRESETS[0]?.id ?? 'preset-b5-novel',
    detectedFormat: null,
    characterEntries: [],
    seed: Math.floor(Math.random() * 10_000),
    isGenerating: false,
    generationError: null,
    result: null,
  })

  const updateState = useCallback((partial: Partial<WizardState>) => {
    setState((prev) => ({ ...prev, ...partial }))
  }, [])

  // ── Step 1 → 2: 판형 확인 ────────────────────────────────────────────────
  const handleStep1Next = useCallback(() => {
    updateState({ step: 'format-check' })
  }, [updateState])

  // ── Step 2 → 3: 캐릭터 매핑 ─────────────────────────────────────────────
  const handleStep2Next = useCallback(() => {
    const speakers = extractSpeakers(state.scriptRaw)
    const entries: CharacterMapEntry[] = speakers.map((name) => ({
      scriptName: name,
      characterId: null, // 더미맨 사용
    }))
    updateState({ step: 'character-map', characterEntries: entries })
  }, [state.scriptRaw, updateState])

  // ── Step 3 → 4: 자동 생성 ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    updateState({ isGenerating: true, generationError: null })

    const characterMapping: Record<string, string> = {}
    for (const entry of state.characterEntries) {
      if (entry.characterId) {
        characterMapping[entry.scriptName] = entry.characterId
      }
    }

    try {
      const res = await fetch('/api/script/full-pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scriptRaw: state.scriptRaw,
          formatId: state.selectedFormatId,
          title: `새 콘티 — ${new Date().toLocaleDateString('ko-KR')}`,
          characterMapping,
          seed: state.seed,
          llmEnabled: false,
        }),
      })

      if (!res.ok) {
        const err = (await res.json()) as { error?: string }
        updateState({
          isGenerating: false,
          generationError: err.error ?? `오류 발생 (${res.status})`,
        })
        return
      }

      const data = (await res.json()) as FullPipelineResponse
      updateState({ isGenerating: false, result: data, step: 'preview' })
    } catch (err) {
      updateState({
        isGenerating: false,
        generationError: err instanceof Error ? err.message : '알 수 없는 오류가 발생했습니다.',
      })
    }
  }, [state, updateState])

  // ── 편집기 진입 ───────────────────────────────────────────────────────────
  const handleOpenEditor = useCallback(() => {
    if (!state.result) return
    router.push(state.result.redirectTo)
  }, [state.result, router])

  // ── 현재 판형 레이블 ─────────────────────────────────────────────────────
  const selectedFormat = FORMAT_PRESETS.find((f) => f.id === state.selectedFormatId)
  const formatLabel = selectedFormat?.label ?? state.selectedFormatId

  // ── step 인덱스 ───────────────────────────────────────────────────────────
  const currentStepIndex = STEP_ORDER.indexOf(state.step)

  return (
    <div className="min-h-screen bg-neutral-50 py-8">
      <div className="mx-auto max-w-2xl px-4">
        {/* 헤더 */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-neutral-900">대본으로 시작하기</h1>
          <p className="mt-1 text-sm text-neutral-500">
            대본을 붙여넣으면 AI 가 자동으로 스토리보드 페이지를 생성합니다.
          </p>
        </div>

        {/* 진행 표시 */}
        <div className="mb-6 flex items-center gap-2">
          {STEP_ORDER.map((step, idx) => (
            <div key={step} className="flex items-center gap-2">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold ${
                  idx < currentStepIndex
                    ? 'bg-blue-600 text-white'
                    : idx === currentStepIndex
                      ? 'bg-blue-600 text-white ring-2 ring-blue-200'
                      : 'bg-neutral-200 text-neutral-400'
                }`}
              >
                {idx < currentStepIndex ? '✓' : idx + 1}
              </div>
              <span
                className={`text-xs ${
                  idx === currentStepIndex ? 'font-semibold text-neutral-800' : 'text-neutral-400'
                }`}
              >
                {STEP_LABELS[step]}
              </span>
              {idx < STEP_ORDER.length - 1 && <div className="h-px w-4 bg-neutral-200" />}
            </div>
          ))}
        </div>

        {/* 카드 */}
        <div className="rounded-xl border border-neutral-200 bg-white p-6 shadow-sm">
          {/* Step 1: 대본 입력 */}
          {state.step === 'input' && (
            <ScriptInputArea
              scriptRaw={state.scriptRaw}
              onScriptChange={(v) => updateState({ scriptRaw: v })}
              selectedFormatId={state.selectedFormatId}
              onFormatChange={(id) => updateState({ selectedFormatId: id })}
              onNext={handleStep1Next}
            />
          )}

          {/* Step 2: 판형 확인 */}
          {state.step === 'format-check' && selectedFormat && (
            <div className="flex flex-col gap-6">
              <div className="flex flex-col gap-1">
                <h3 className="text-sm font-semibold text-neutral-700">판형 확인</h3>
                <p className="text-xs text-neutral-500">
                  선택한 판형과 대본 미리보기를 확인해 주세요.
                </p>
              </div>

              {/* 선택된 판형 요약 */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3">
                <p className="text-sm font-semibold text-blue-800">{selectedFormat.label}</p>
                <p className="mt-0.5 text-xs text-blue-600">{selectedFormat.description}</p>
                <p className="mt-1 text-xs text-blue-500">
                  {selectedFormat.widthMm} × {selectedFormat.heightMm}mm · {selectedFormat.dpi}dpi
                </p>
              </div>

              {/* 대본 미리보기 */}
              <div className="flex flex-col gap-1">
                <p className="text-xs font-medium text-neutral-500">대본 미리보기</p>
                <div className="max-h-40 overflow-y-auto rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-3 font-mono text-xs text-neutral-700 leading-relaxed whitespace-pre-wrap">
                  {state.scriptRaw.slice(0, 500)}
                  {state.scriptRaw.length > 500 && (
                    <span className="text-neutral-400"> …({state.scriptRaw.length}자)</span>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => updateState({ step: 'input' })}
                  className="text-sm text-neutral-500 hover:text-neutral-700"
                >
                  ← 이전
                </button>
                <button
                  type="button"
                  onClick={handleStep2Next}
                  className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  다음 →
                </button>
              </div>
            </div>
          )}

          {/* Step 3: 캐릭터 매핑 */}
          {state.step === 'character-map' && (
            <>
              {state.generationError && (
                <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {state.generationError}
                </div>
              )}
              <CharacterMappingTable
                entries={state.characterEntries}
                onBack={() => updateState({ step: 'format-check', generationError: null })}
                onNext={() => {
                  void handleGenerate()
                }}
              />
              {state.isGenerating && (
                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-neutral-500">
                  <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-blue-600" />
                  AI 가 페이지를 생성 중입니다…
                </div>
              )}
            </>
          )}

          {/* Step 4: 미리보기 */}
          {state.step === 'preview' && state.result && (
            <>
              <PipelineWarnings warnings={state.result.warnings} />
              {state.result.warnings.length > 0 && <div className="mt-4" />}
              <PreviewPages
                result={state.result}
                formatLabel={formatLabel}
                onOpenEditor={handleOpenEditor}
                onBack={() =>
                  updateState({
                    step: 'character-map',
                    result: null,
                    seed: Math.floor(Math.random() * 10_000),
                  })
                }
              />
            </>
          )}
        </div>

        {/* 하단 링크 */}
        <div className="mt-4 text-center text-xs text-neutral-400">
          <a href="/editor" className="hover:text-neutral-600 hover:underline">
            빈 캔버스에서 직접 시작하기
          </a>
        </div>
      </div>
    </div>
  )
}
