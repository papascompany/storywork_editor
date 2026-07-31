'use client'

/**
 * ContiBoard — 콘티 확정 단계 컷 리스트 (CONTI-03)
 * React 명시 import: vitest JSX transform 호환
 *
 * 무영속 분석(/api/script/analyze, projectId 없음) 결과를 컷 카드 리스트로
 * 보여주고, 컷 제외 토글·재생성(시드+1)·확정(페이지 생성)을 제공한다.
 * 완전 제어형 — 상태는 부모(ScriptImporterShell)가 소유한다.
 * (컷별 대사 "펼치기"만 검토용 로컬 UI 상태)
 *
 * 재생성 버튼은 showRegenerate 일 때만 노출 — rule-only 분석은 시드가 장면
 * 분할에 영향을 주지 않아 no-op 이므로 숨긴다 (CONTI-01 LLM 활성 후 노출).
 *
 * 컷 재정렬(DnD)·컷 교체(alternatives)는 2차 범위 — 편집기 M4-05 가 담당.
 */

import React from 'react'

import type { ContiAnalyzeResponse, ContiScene } from './types'

// ─── 감정 레이블 ─────────────────────────────────────────────────────────────

const EMOTION_LABELS: Record<string, string> = {
  happy: '기쁨',
  sad: '슬픔',
  angry: '분노',
  surprised: '놀람',
  tense: '긴장',
  calm: '평온',
  neutral: '중립',
}

// ─── Props ───────────────────────────────────────────────────────────────────

export interface ContiBoardProps {
  conti: ContiAnalyzeResponse
  /** 제외된 컷 index 목록 */
  excludedSceneIndices: number[]
  /** 컷 제외/복원 토글 */
  onToggleExclude: (sceneIndex: number) => void
  /** 재생성 — 시드+1 로 무영속 분석 재호출 */
  onRegenerate: () => void
  /** 재생성 버튼 노출 여부 — rule-only 분석에서는 시드 변주가 no-op 이라 숨김 */
  showRegenerate: boolean
  /** 콘티 확정 → 페이지 생성 (full-pipeline) */
  onConfirm: () => void
  onBack: () => void
  isGenerating: boolean
  seed: number
}

// ─── 컷 카드 ─────────────────────────────────────────────────────────────────

const MAX_VISIBLE_LINES = 3
const MAX_LINE_CHARS = 60

function ContiCutCard({
  scene,
  cutNo,
  excluded,
  onToggleExclude,
}: {
  scene: ContiScene
  cutNo: number
  excluded: boolean
  onToggleExclude: () => void
}) {
  // 검토용 펼치기 — 로컬 UI 상태 (제외 토글만 부모 소유)
  const [expanded, setExpanded] = React.useState(false)

  const emotion = scene.meta.emotion
  const needsExpand =
    scene.lines.length > MAX_VISIBLE_LINES ||
    scene.lines.some((l) => l.text.length > MAX_LINE_CHARS)
  const visibleLines = expanded ? scene.lines : scene.lines.slice(0, MAX_VISIBLE_LINES)
  const hiddenCount = scene.lines.length - visibleLines.length

  return (
    <div
      data-testid={`conti-cut-${scene.index}`}
      className={`rounded-lg border px-4 py-3 transition-colors ${
        excluded ? 'border-dashed border-neutral-300 bg-neutral-50' : 'border-neutral-200 bg-white'
      }`}
    >
      {/* 헤더: 컷 번호 + 감정 + 화자 + 제외 토글 */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <span
            className={`inline-flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold ${
              excluded ? 'bg-neutral-300 text-neutral-600 line-through' : 'bg-blue-600 text-white'
            }`}
          >
            {cutNo}
          </span>
          {emotion && emotion !== 'neutral' && (
            <span className="inline-flex whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-[11px] text-neutral-600">
              {EMOTION_LABELS[emotion] ?? emotion}
            </span>
          )}
          {scene.characters.map((name) => (
            <span
              key={name}
              className={`inline-flex whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                excluded ? 'bg-neutral-100 text-neutral-600' : 'bg-blue-50 text-blue-700'
              }`}
            >
              {name}
            </span>
          ))}
        </div>
        <button
          type="button"
          aria-label={excluded ? `${cutNo}번 컷 복원` : `${cutNo}번 컷 제외`}
          onClick={onToggleExclude}
          className={`shrink-0 rounded-md border px-2.5 py-1 text-xs font-medium ${
            excluded
              ? 'border-blue-400 text-blue-700 hover:bg-blue-50'
              : 'border-neutral-300 text-neutral-600 hover:bg-neutral-50 hover:text-neutral-800'
          }`}
        >
          {excluded ? '복원' : '제외'}
        </button>
      </div>

      {/* 지문 — 제외 상태에서도 복원 판단을 위해 AA 대비 유지 */}
      <p className="mt-2 text-xs leading-relaxed text-neutral-600">{scene.summary}</p>

      {/* 대사 */}
      {visibleLines.length > 0 && (
        <ul className="mt-2 flex flex-col gap-1">
          {visibleLines.map((line) => (
            <li
              key={line.index}
              className={`text-xs leading-relaxed ${excluded ? 'text-neutral-600' : 'text-neutral-700'}`}
            >
              {line.speaker && <span className="font-semibold">{line.speaker}: </span>}
              <span>
                {!expanded && line.text.length > MAX_LINE_CHARS
                  ? `${line.text.slice(0, MAX_LINE_CHARS)}…`
                  : line.text}
              </span>
            </li>
          ))}
        </ul>
      )}
      {needsExpand && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={() => setExpanded((v) => !v)}
          className="mt-1 text-[11px] font-medium text-blue-700 hover:underline"
        >
          {expanded ? '접기' : hiddenCount > 0 ? `대사 ${hiddenCount}개 더 보기` : '전체 보기'}
        </button>
      )}
    </div>
  )
}

// ─── ContiBoard ──────────────────────────────────────────────────────────────

export function ContiBoard({
  conti,
  excludedSceneIndices,
  onToggleExclude,
  onRegenerate,
  showRegenerate,
  onConfirm,
  onBack,
  isGenerating,
  seed,
}: ContiBoardProps) {
  const excludedSet = new Set(excludedSceneIndices)
  const includedCount = conti.scenes.length - excludedSet.size

  // 0컷 — 분석이 컷을 만들지 못한 막다른 상태 안내
  if (conti.scenes.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-semibold text-neutral-700">콘티 확정</h3>
        </div>
        <div className="rounded-lg border border-dashed border-neutral-300 py-10 text-center">
          <p className="text-sm text-neutral-600">대본에서 컷을 만들지 못했습니다.</p>
          <p className="mt-1 text-xs text-neutral-500">
            대본이 너무 짧거나 형식을 인식하지 못했을 수 있어요. 이전 단계로 돌아가 대본을 보완해
            주세요.
          </p>
        </div>
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBack}
            className="text-sm text-neutral-500 hover:text-neutral-700"
          >
            ← 이전
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-6">
      {/* 헤더 */}
      <div className="flex flex-col gap-1">
        <h3 className="text-sm font-semibold text-neutral-700">콘티 확정</h3>
        <p className="text-xs text-neutral-500">
          대본이 {conti.scenes.length}개 컷으로 분석되었습니다. 필요 없는 컷은 제외한 뒤 페이지를
          생성하세요. 페이지는 확정 후에만 만들어집니다.
        </p>
      </div>

      {/* 요약 바: 컷 수 (+ 재생성 — LLM 분석 활성 시에만) */}
      <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-neutral-200 bg-neutral-50 px-4 py-2.5">
        <p className="text-xs text-neutral-600">
          <span className="font-semibold text-neutral-800">{includedCount}컷</span> 사용
          {excludedSet.size > 0 && <span> · {excludedSet.size}컷 제외</span>}
          {showRegenerate && (
            <span className="ml-2" title={`분석 시드 ${seed}`}>
              변주 #{seed}
            </span>
          )}
        </p>
        {showRegenerate && (
          <button
            type="button"
            onClick={onRegenerate}
            disabled={isGenerating}
            className="rounded-md border border-neutral-300 px-3 py-1 text-xs font-medium text-neutral-600 hover:bg-white hover:text-neutral-800 disabled:opacity-50"
          >
            다르게 재생성
          </button>
        )}
      </div>

      {/* 컷 리스트 — 소형 모바일에서 확정 버튼이 폴드 아래로 밀리지 않게 dvh 상한 */}
      <div
        className="flex max-h-[min(420px,50dvh)] flex-col gap-2 overflow-y-auto pr-1"
        role="list"
        aria-label="콘티 컷 목록"
      >
        {conti.scenes.map((scene, i) => (
          <div role="listitem" key={scene.slug}>
            <ContiCutCard
              scene={scene}
              cutNo={i + 1}
              excluded={excludedSet.has(scene.index)}
              onToggleExclude={() => onToggleExclude(scene.index)}
            />
          </div>
        ))}
      </div>

      {/* 하단 액션 — 360px 에서 랩 허용 */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className="text-sm text-neutral-500 hover:text-neutral-700 disabled:opacity-50"
        >
          ← 이전
        </button>
        <button
          type="button"
          onClick={onConfirm}
          disabled={isGenerating || includedCount === 0}
          className="rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-neutral-300"
        >
          {isGenerating ? '생성 중…' : `${includedCount}컷으로 페이지 생성`}
        </button>
      </div>
    </div>
  )
}
