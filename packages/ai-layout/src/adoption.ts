/**
 * adoption.ts — 자동배치 1차본 채택률 측정 (AI-ACT-04)
 *
 * ## "채택률"의 조작적 정의
 *
 * 궁극의 지표는 "사용자가 자동배치 1차본을 **손대지 않고 그대로 출판한 비율**"이다.
 * 그러나 현재는 실사용 편집 로그(PostHog/FOLLOWUP-60)가 없어 그 값을 직접 관측할 수 없다.
 * 따라서 이 모듈은 **관측 가능한 프록시**를 정의한다:
 *
 *   채택 가능(adoptable) 페이지 = "사용자가 반드시 고쳐야 하는 결함(blocker)이 0인 페이지"
 *   채택률 = adoptable 페이지 수 / 전체 페이지 수
 *
 * blocker 는 "안 고치면 결과물이 틀린 것"만 넣는다(취향 문제는 제외):
 *  - `empty-slot`     필수 슬롯이 비어 페이지가 완성되지 않음
 *  - `safe-area`      인쇄 안전영역 침범 — 재단 시 잘림(인쇄 사고)
 *  - `dpi-error`      해상도 미달 — 인쇄 품질 불가 (dpi-warning 은 blocker 아님)
 *  - `dialogue-loss`  대본의 대사가 페이지에 실리지 못하고 유실됨
 *  - `speaker-missing` 그 페이지 장면의 화자가 포즈로 배치되지 않음
 *
 * 이 중 `dialogue-loss`/`speaker-missing` 은 compose 가 경고로 내보내지 않아
 * 기존 어떤 테스트도 잡지 못하던 결함이다 — fabricJson 과 원본 장면을 대조해 직접 센다.
 *
 * ## 로그가 붙은 뒤
 * 실사용 로그가 들어오면 `AdoptionResult.adoptionRate` 를 실측 채택률로 교체하고,
 * 이 프록시는 **선행지표(leading indicator)** 로 남겨 상관을 추적한다.
 * 지표 정의를 바꿀 때는 baseline 리포트를 재생성해 비교 가능성을 유지할 것.
 *
 * 결정론: compose 결과와 원본 장면만 보는 순수 함수 — 같은 입력 → 같은 리포트.
 */

import type { AnalyzeResult } from '@storywork/ai-script'

import type { ComposeResult, FabricLayer, PageDraft } from './types.js'

// ─────────────────────────────────────────────
// blocker 분류
// ─────────────────────────────────────────────

export type BlockerKind =
  | 'empty-slot'
  | 'safe-area'
  | 'dpi-error'
  | 'dialogue-loss'
  | 'speaker-missing'

/** 취향/개선 여지일 뿐 "틀린 것"은 아닌 신호 — 채택 판정에서 제외하고 별도 집계 */
export type SoftSignalKind = 'dpi-warning' | 'low-dpi-fallback'

export interface PageAdoption {
  pageIndex: number
  /** blocker 0 이면 채택 가능 */
  adoptable: boolean
  blockers: Array<{ kind: BlockerKind; detail: string }>
  softSignals: Array<{ kind: SoftSignalKind; detail: string }>
  /** 이 페이지가 담은 장면의 대사 수 / 실제 배치된 대사 수 */
  dialogueTotal: number
  dialoguePlaced: number
}

export interface AdoptionResult {
  totalPages: number
  adoptablePages: number
  /** 0..1 — blocker 0 페이지 비율 (프록시 채택률) */
  adoptionRate: number
  /** blocker 종류별 발생 페이지 수 */
  blockerCounts: Record<BlockerKind, number>
  softSignalCounts: Record<SoftSignalKind, number>
  /** 대사 보존율 = 배치된 대사 / 전체 대사 (1.0 이 이상) */
  dialogueRetention: number
  pages: PageAdoption[]
}

// ─────────────────────────────────────────────
// 경고 문자열 → blocker 매핑
// ─────────────────────────────────────────────

/**
 * compose 가 만드는 경고 문자열은 접두 태그로 종류를 구분한다.
 * (`[safe-area] …`, `[slot-empty] …`, `[lowDpi] … dpi-error …`)
 * 문자열 파싱이지만 생성처가 한 곳(ai-layout)이라 계약이 안정적이다.
 */
function classifyWarning(w: string): { kind: BlockerKind | SoftSignalKind; soft: boolean } | null {
  if (w.includes('[safe-area]')) return { kind: 'safe-area', soft: false }
  if (w.includes('[slot-empty]')) return { kind: 'empty-slot', soft: false }
  if (w.includes('[lowDpi]')) {
    // lowDpi 경고는 등급이 섞여 있다 — error 만 blocker
    if (w.includes('dpi-error') || w.includes('size-violation')) {
      return { kind: 'dpi-error', soft: false }
    }
    if (w.includes('폴백')) return { kind: 'low-dpi-fallback', soft: true }
    return { kind: 'dpi-warning', soft: true }
  }
  return null
}

// ─────────────────────────────────────────────
// fabricJson 내용 검사 — 경고가 잡지 못하는 결함
// ─────────────────────────────────────────────

function layerText(layer: FabricLayer): string {
  const meta = (layer.data.meta ?? {}) as { text?: string }
  const fabricText = layer.fabric['text']
  return (meta.text ?? (typeof fabricText === 'string' ? fabricText : '') ?? '').trim()
}

/** 페이지에 실제로 실린 대사 텍스트 집합 */
function placedDialogues(page: PageDraft): Set<string> {
  const out = new Set<string>()
  for (const layer of page.fabricJson.layers) {
    if (layer.kind !== 'bubble' && layer.kind !== 'text') continue
    const t = layerText(layer)
    if (t) out.add(t)
  }
  return out
}

/** 페이지에 포즈로 배치된 캐릭터 이름 집합 */
function placedCharacters(page: PageDraft): Set<string> {
  const out = new Set<string>()
  for (const layer of page.fabricJson.layers) {
    if (layer.kind !== 'pose') continue
    const meta = (layer.data.meta ?? {}) as { characterName?: string }
    if (meta.characterName) out.add(meta.characterName)
  }
  return out
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

export interface AdoptionOptions {
  /**
   * 화자 배치 검사 시, 장면 화자 중 몇 명까지 없어도 봐줄지.
   * 템플릿 포즈 슬롯 수가 화자 수보다 적으면 물리적으로 다 못 넣는다 —
   * 슬롯 수를 초과하는 인원은 결함으로 세지 않는다(기본 동작).
   */
  strictSpeakers?: boolean
}

/**
 * compose 결과 + 원본 분석 결과를 대조해 채택률 리포트를 만든다.
 */
export function measureAdoption(
  analyzed: AnalyzeResult,
  composed: ComposeResult,
  opts: AdoptionOptions = {},
): AdoptionResult {
  const sceneByIndex = new Map(analyzed.scenes.map((s) => [s.index, s]))
  const pages: PageAdoption[] = []

  const blockerCounts: Record<BlockerKind, number> = {
    'empty-slot': 0,
    'safe-area': 0,
    'dpi-error': 0,
    'dialogue-loss': 0,
    'speaker-missing': 0,
  }
  const softSignalCounts: Record<SoftSignalKind, number> = {
    'dpi-warning': 0,
    'low-dpi-fallback': 0,
  }

  let dialogueTotalAll = 0
  let dialoguePlacedAll = 0

  for (const page of composed.pages) {
    const blockers: PageAdoption['blockers'] = []
    const softSignals: PageAdoption['softSignals'] = []

    // 1. compose 경고 분류
    const seenBlocker = new Set<BlockerKind>()
    const seenSoft = new Set<SoftSignalKind>()
    for (const w of page.warnings) {
      const c = classifyWarning(w)
      if (!c) continue
      if (c.soft) {
        softSignals.push({ kind: c.kind as SoftSignalKind, detail: w })
        seenSoft.add(c.kind as SoftSignalKind)
      } else {
        blockers.push({ kind: c.kind as BlockerKind, detail: w })
        seenBlocker.add(c.kind as BlockerKind)
      }
    }

    // 2. 대사 유실 — 원본 장면의 대사가 페이지에 실렸는가
    const placed = placedDialogues(page)
    const sceneLines = page.sceneIndices.flatMap((i) => sceneByIndex.get(i)?.lines ?? [])
    const dialogueTotal = sceneLines.length
    let dialoguePlaced = 0
    for (const line of sceneLines) {
      const t = line.text.trim()
      // 배치 시 잘릴 수 있으므로 접두 일치도 허용
      if (placed.has(t) || [...placed].some((p) => p.startsWith(t) || t.startsWith(p))) {
        dialoguePlaced++
      }
    }
    if (dialogueTotal > 0 && dialoguePlaced < dialogueTotal) {
      blockers.push({
        kind: 'dialogue-loss',
        detail: `대사 ${dialogueTotal - dialoguePlaced}/${dialogueTotal} 유실`,
      })
      seenBlocker.add('dialogue-loss')
    }
    dialogueTotalAll += dialogueTotal
    dialoguePlacedAll += dialoguePlaced

    // 3. 화자 미배치 — 장면 화자가 포즈로 들어갔는가
    const placedChars = placedCharacters(page)
    const poseSlotCount = page.fabricJson.layers.filter((l) => l.kind === 'pose').length
    const sceneChars = new Set(
      page.sceneIndices.flatMap((i) => sceneByIndex.get(i)?.characters ?? []),
    )
    if (sceneChars.size > 0) {
      const missing = [...sceneChars].filter((c) => !placedChars.has(c))
      // 슬롯이 부족해 물리적으로 못 넣는 인원은 제외 (strictSpeakers 면 전부 결함)
      const capacityShortfall = opts.strictSpeakers
        ? 0
        : Math.max(0, sceneChars.size - poseSlotCount)
      const realMissing = missing.length - capacityShortfall
      if (realMissing > 0) {
        blockers.push({
          kind: 'speaker-missing',
          detail: `화자 미배치: ${missing.slice(0, realMissing).join(', ')}`,
        })
        seenBlocker.add('speaker-missing')
      }
    }

    for (const k of seenBlocker) blockerCounts[k]++
    for (const k of seenSoft) softSignalCounts[k]++

    pages.push({
      pageIndex: page.pageIndex,
      adoptable: blockers.length === 0,
      blockers,
      softSignals,
      dialogueTotal,
      dialoguePlaced,
    })
  }

  const totalPages = pages.length
  const adoptablePages = pages.filter((p) => p.adoptable).length

  return {
    totalPages,
    adoptablePages,
    adoptionRate: totalPages > 0 ? adoptablePages / totalPages : 0,
    blockerCounts,
    softSignalCounts,
    dialogueRetention: dialogueTotalAll > 0 ? dialoguePlacedAll / dialogueTotalAll : 1,
    pages,
  }
}

/** 여러 대본의 리포트를 하나로 합산 (코퍼스 전체 baseline 용) */
export function aggregateAdoption(results: AdoptionResult[]): AdoptionResult {
  const merged: AdoptionResult = {
    totalPages: 0,
    adoptablePages: 0,
    adoptionRate: 0,
    blockerCounts: {
      'empty-slot': 0,
      'safe-area': 0,
      'dpi-error': 0,
      'dialogue-loss': 0,
      'speaker-missing': 0,
    },
    softSignalCounts: { 'dpi-warning': 0, 'low-dpi-fallback': 0 },
    dialogueRetention: 1,
    pages: [],
  }

  let dTotal = 0
  let dPlaced = 0
  for (const r of results) {
    merged.totalPages += r.totalPages
    merged.adoptablePages += r.adoptablePages
    for (const k of Object.keys(merged.blockerCounts) as BlockerKind[]) {
      merged.blockerCounts[k] += r.blockerCounts[k]
    }
    for (const k of Object.keys(merged.softSignalCounts) as SoftSignalKind[]) {
      merged.softSignalCounts[k] += r.softSignalCounts[k]
    }
    for (const p of r.pages) {
      dTotal += p.dialogueTotal
      dPlaced += p.dialoguePlaced
    }
    merged.pages.push(...r.pages)
  }

  merged.adoptionRate = merged.totalPages > 0 ? merged.adoptablePages / merged.totalPages : 0
  merged.dialogueRetention = dTotal > 0 ? dPlaced / dTotal : 1
  return merged
}
