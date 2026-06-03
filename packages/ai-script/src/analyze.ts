/**
 * analyze.ts — ai-script 메인 분석 함수
 *
 * 처리 흐름:
 *  1. 형식 자동 감지 (format='auto' 일 때)
 *  2. 형식별 1차 파싱 (rule-based)
 *  3. (LLM 활성 시) Claude API 로 메타 보강 (감정/카메라/location)
 *  4. 캐릭터 dedupe + count
 *  5. alternatives K=maxAlternatives 생성 (시드 변경)
 *
 * LLM 비용 보호:
 *  - CI: STORYWORK_LLM 환경변수 미설정 or '0' → llmEnabled=false
 *  - 로컬: STORYWORK_LLM=1 → llmEnabled=true (기본)
 *  - opts.llmEnabled 로 명시 오버라이드 가능
 */

import { detectFormat } from './parsers/detect-format.js'
import { parseNovel } from './parsers/parse-novel.js'
import { parseScreenplay } from './parsers/parse-screenplay.js'
import type {
  AnalyzeOptions,
  AnalyzeResult,
  AnalyzedScene,
  DetectedCharacter,
  ScriptInputFormat,
} from './types.js'

// ─────────────────────────────────────────────
// 환경 감지
// ─────────────────────────────────────────────

function isLlmEnabled(optOverride?: boolean): boolean {
  if (optOverride !== undefined) return optOverride
  const envVal = process.env['STORYWORK_LLM']
  return envVal === '1' || envVal === 'true'
}

// ─────────────────────────────────────────────
// 캐릭터 dedupe + count
// ─────────────────────────────────────────────

function extractCharacters(scenes: AnalyzedScene[]): DetectedCharacter[] {
  const countMap = new Map<string, number>()

  for (const scene of scenes) {
    for (const ch of scene.characters) {
      countMap.set(ch, (countMap.get(ch) ?? 0) + 1)
    }
    // 대사 화자도 수집
    for (const line of scene.lines) {
      if (line.speaker) {
        countMap.set(line.speaker, (countMap.get(line.speaker) ?? 0) + 1)
      }
    }
  }

  // 멘션 수 기준 내림차순
  return Array.from(countMap.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([name, mentionCount]) => ({
      name,
      mentionCount,
      // 간단 성별 추정 (이름에 '이', '영', '민' 등 포함 여부로 불가능, skip)
      suggestedBodyType: undefined,
    }))
}

// ─────────────────────────────────────────────
// 형식별 룰-only 파싱
// ─────────────────────────────────────────────

function parseByFormat(text: string, fmt: Exclude<ScriptInputFormat, 'auto'>): AnalyzedScene[] {
  switch (fmt) {
    case 'screenplay':
      return parseScreenplay(text)
    case 'novel':
    case 'light-novel':
    case 'essay':
    case 'diary':
      // essay/diary/light-novel 은 소설 파서 기반 + 임계값 조정
      return parseNovel(text, fmt === 'essay' ? 15 : fmt === 'diary' ? 5 : 8)
    default: {
      // exhaustive check
      const _: never = fmt
      void _
      return parseNovel(text)
    }
  }
}

// ─────────────────────────────────────────────
// LLM 보강 (stub — 환경변수 활성 시 실제 구현)
// ─────────────────────────────────────────────

async function enrichWithLlm(
  _text: string,
  scenes: AnalyzedScene[],
  _seed: number,
): Promise<AnalyzedScene[]> {
  // TODO(M4-01): Vercel AI Gateway + claude-sonnet-4-6 로 메타 보강
  // 현재는 룰-only 결과 그대로 반환
  // 구현 시:
  //   - prompt caching 활성 (CLAUDE.md §4.3)
  //   - temperature 0 + seed 고정
  //   - 각 scene 에 meta.location, meta.cameraAngle, meta.mood 채우기
  return scenes
}

// ─────────────────────────────────────────────
// 단일 시드 분석
// ─────────────────────────────────────────────

async function analyzeOnce(
  text: string,
  format: Exclude<ScriptInputFormat, 'auto'>,
  seed: number,
  llmEnabled: boolean,
): Promise<Omit<AnalyzeResult, 'alternatives'>> {
  let scenes = parseByFormat(text, format)

  if (llmEnabled && scenes.length > 0) {
    scenes = await enrichWithLlm(text, scenes, seed)
  }

  const characters = extractCharacters(scenes)
  const modelVersion = llmEnabled ? 'claude-sonnet-4-6' : 'rule-only'

  return {
    format,
    scenes,
    characters,
    seed,
    modelVersion,
  }
}

// ─────────────────────────────────────────────
// 공개 API
// ─────────────────────────────────────────────

/**
 * 대본 텍스트를 분석해 AnalyzeResult 를 반환한다.
 *
 * @param scriptRaw  원본 대본 텍스트
 * @param opts       옵션 (seed, format, maxAlternatives, llmEnabled)
 * @returns          AnalyzeResult (scenes, characters, alternatives 포함)
 */
export async function analyze(scriptRaw: string, opts?: AnalyzeOptions): Promise<AnalyzeResult> {
  const { seed = 0, format = 'auto', maxAlternatives = 5, llmEnabled: llmOpt } = opts ?? {}

  const llmEnabled = isLlmEnabled(llmOpt)

  // 1. 형식 감지
  const resolvedFormat: Exclude<ScriptInputFormat, 'auto'> =
    format === 'auto' ? detectFormat(scriptRaw) : format

  // 2. 기본 시드 분석
  const base = await analyzeOnce(scriptRaw, resolvedFormat, seed, llmEnabled)

  // 3. alternatives (시드 변경하며 N번 추가 분석)
  // alternatives 는 룰-only 모드에서는 파서 임계값 변화로 차이를 만듦
  // LLM 활성 시에는 실제로 다른 시드로 LLM 호출
  const altCount = Math.min(maxAlternatives, 4)
  const alternatives: AnalyzeResult[] = []

  if (altCount > 0 && (llmEnabled || resolvedFormat !== 'novel')) {
    for (let i = 1; i <= altCount; i++) {
      const altSeed = seed + i * 1000
      const alt = await analyzeOnce(scriptRaw, resolvedFormat, altSeed, llmEnabled)
      alternatives.push({ ...alt, alternatives: [] })
    }
  }

  return {
    ...base,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
  }
}
