/* eslint-disable no-console */
/**
 * validate-filename-dict.ts
 * M2-03a — 파일명 사전 검증 도구
 *
 * 실행:
 *   pnpm tsx scripts/validate-filename-dict.ts
 *   pnpm tsx scripts/validate-filename-dict.ts --src data/poses/raw --top 30
 */

import fs from 'node:fs'
import path from 'node:path'

import { Command } from 'commander'
import pc from 'picocolors'

// ─────────────────────────────────────────────
// 사전 스키마 타입 (filename-tagger.ts 와 동일)
// ─────────────────────────────────────────────

type MatchType = 'contains' | 'prefix' | 'suffix' | 'regex'

interface DictRule {
  id: string
  patterns: string[]
  matchType: MatchType
  action: string | null
  bodyType: string | null
  view: string | null
  mood: string | null
  confidence: number
}

interface SubfolderTagEntry {
  bodyType?: string
  action?: string
  tags?: string[]
  skip?: boolean
}

interface ViewHint {
  patterns: string[]
  view: string
  confidence: number
}

interface FilenameDictionary {
  v: number
  version: string
  description: string
  rules: DictRule[]
  subfolderTags: Record<string, SubfolderTagEntry>
  viewHints: ViewHint[]
}

interface FilenameTagResult {
  action: string | undefined
  bodyType: string | undefined
  view: string | undefined
  mood: string | undefined
  styleVariants: string[]
  tags: string[]
  confidence: number
  matched: boolean
}

// ─────────────────────────────────────────────
// 매칭 헬퍼 (filename-tagger.ts 로직 인라인)
// ─────────────────────────────────────────────

function matchPattern(normalized: string, pattern: string, matchType: MatchType): boolean {
  const p = pattern.toLowerCase()
  switch (matchType) {
    case 'contains':
      return normalized.includes(p)
    case 'prefix':
      return normalized.startsWith(p)
    case 'suffix':
      return normalized.endsWith(p)
    case 'regex': {
      try {
        return new RegExp(pattern, 'i').test(normalized)
      } catch {
        return false
      }
    }
  }
}

function ruleMatches(normalized: string, rule: DictRule): boolean {
  return rule.patterns.some((pat) => matchPattern(normalized, pat, rule.matchType))
}

function extractStyleVariants(filenameWithoutExt: string): string[] {
  const match = /_([1-9])$/.exec(filenameWithoutExt)
  if (match?.[1]) return [match[1]]
  return []
}

function applyViewHints(normalized: string, hints: ViewHint[]): string | null {
  const sorted = [...hints].sort((a, b) => b.confidence - a.confidence)
  for (const hint of sorted) {
    for (const pat of hint.patterns) {
      if (normalized.includes(pat.toLowerCase())) {
        return hint.view
      }
    }
  }
  return null
}

function tagFromFilename(
  filename: string,
  subfolder: string | null,
  dictionary: FilenameDictionary,
): FilenameTagResult {
  const withoutExt = filename.replace(/\.[^.]+$/, '')
  const normalized = withoutExt.normalize('NFC').toLowerCase()

  const matchedRuleIds: string[] = []
  let action: string | undefined
  let bodyType: string | undefined
  let view: string | undefined
  let mood: string | undefined
  let maxConfidence = 0
  let matchCount = 0
  let subfolderMatched = false

  for (const rule of dictionary.rules) {
    if (!ruleMatches(normalized, rule)) continue

    matchedRuleIds.push(rule.id)
    matchCount++

    if (rule.confidence >= maxConfidence) {
      maxConfidence = rule.confidence
      if (
        rule.action !== null &&
        (action === undefined || rule.confidence > maxConfidence - 0.01)
      ) {
        action = rule.action
      }
      if (rule.bodyType !== null && bodyType === undefined) {
        bodyType = rule.bodyType
      }
      if (rule.view !== null && view === undefined) {
        view = rule.view
      }
      if (rule.mood !== null && mood === undefined) {
        mood = rule.mood
      }
    }
  }

  if (subfolder) {
    // macOS NFD → NFC 정규화 (파일시스템이 NFD로 저장)
    const subfolderNFC = subfolder.normalize('NFC')
    const subEntry = dictionary.subfolderTags[subfolderNFC]
    if (subEntry) {
      if (subEntry.skip) {
        return {
          action: undefined,
          bodyType: undefined,
          view: undefined,
          mood: undefined,
          styleVariants: [],
          tags: [],
          confidence: 0,
          matched: false,
        }
      }
      if (subEntry.bodyType && !bodyType) {
        bodyType = subEntry.bodyType
        subfolderMatched = true
      }
      if (subEntry.action && !action) {
        action = subEntry.action
        subfolderMatched = true
      }
      if (subEntry.tags) {
        matchedRuleIds.push(...subEntry.tags)
        subfolderMatched = true
      }
    }
  }

  if (!view) {
    const hinted = applyViewHints(normalized, dictionary.viewHints)
    if (hinted) view = hinted
  }

  const styleVariants = extractStyleVariants(withoutExt.normalize('NFC'))
  const confidence = matchCount > 0 ? maxConfidence : subfolderMatched ? 0.65 : 0
  const tags = [...new Set(matchedRuleIds)]

  return {
    action,
    bodyType,
    view,
    mood,
    styleVariants,
    tags,
    confidence,
    matched: matchCount > 0 || subfolderMatched,
  }
}

// ─────────────────────────────────────────────
// 파일 스캔
// ─────────────────────────────────────────────

interface ScannedFile {
  filename: string
  subfolder: string | null
}

function scanPngFiles(srcDir: string): ScannedFile[] {
  const results: ScannedFile[] = []

  function walk(dir: string, subfolder: string | null): void {
    let entries: fs.Dirent[]
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
      return
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue
      if (entry.name === 'LICENSE.json') continue

      const fullPath = path.join(dir, entry.name)

      if (entry.isDirectory()) {
        walk(fullPath, entry.name)
        continue
      }

      if (!entry.isFile()) continue
      if (!entry.name.toLowerCase().endsWith('.png')) continue

      results.push({ filename: entry.name, subfolder })
    }
  }

  walk(srcDir, null)
  return results
}

// ─────────────────────────────────────────────
// 집계
// ─────────────────────────────────────────────

interface ValidationResult {
  total: number
  matched: number
  unmatched: number
  matchRate: number
  actionDist: Record<string, number>
  viewDist: Record<string, number>
  bodyTypeDist: Record<string, number>
  unmatchedFiles: string[]
  matchedFiles: Array<{ filename: string; result: FilenameTagResult }>
}

function runValidation(files: ScannedFile[], dict: FilenameDictionary): ValidationResult {
  const actionDist: Record<string, number> = {}
  const viewDist: Record<string, number> = {}
  const bodyTypeDist: Record<string, number> = {}
  const unmatchedFiles: string[] = []
  const matchedFiles: Array<{ filename: string; result: FilenameTagResult }> = []

  for (const { filename, subfolder } of files) {
    const result = tagFromFilename(filename, subfolder, dict)

    if (result.matched) {
      matchedFiles.push({ filename, result })
      if (result.action) actionDist[result.action] = (actionDist[result.action] ?? 0) + 1
      if (result.view) viewDist[result.view] = (viewDist[result.view] ?? 0) + 1
      if (result.bodyType) bodyTypeDist[result.bodyType] = (bodyTypeDist[result.bodyType] ?? 0) + 1
    } else {
      unmatchedFiles.push(filename)
    }
  }

  const total = files.length
  const matched = matchedFiles.length
  const unmatched = unmatchedFiles.length

  return {
    total,
    matched,
    unmatched,
    matchRate: total > 0 ? matched / total : 0,
    actionDist,
    viewDist,
    bodyTypeDist,
    unmatchedFiles,
    matchedFiles,
  }
}

// ─────────────────────────────────────────────
// 출력 포맷
// ─────────────────────────────────────────────

function printValidationResult(result: ValidationResult, topN: number): void {
  const divider = '─'.repeat(64)
  const pct = (result.matchRate * 100).toFixed(1)
  const pctColored = result.matchRate >= 0.7 ? pc.green(`${pct}%`) : pc.red(`${pct}%`)

  console.log('\n' + divider)
  console.log(pc.bold(pc.cyan('  파일명 사전 검증 — filename-action-dict.ko.json')))
  console.log(divider)
  console.log(`  전체 파일:     ${pc.bold(String(result.total))} 개`)
  console.log(`  매칭 성공:     ${pc.green(String(result.matched))} 개`)
  console.log(`  매칭 실패:     ${pc.red(String(result.unmatched))} 개`)
  console.log(`  매칭률:        ${pctColored}  (목표 ≥ 70%)`)

  if (result.matchRate >= 0.7) {
    console.log(pc.green('  [OK] DoD 매칭률 70%+ 달성'))
  } else {
    console.log(pc.red('  [FAIL] 매칭률 70% 미달 — 사전 보강 필요'))
  }

  // action 분포
  console.log('\n' + pc.bold('  Action 분포 (상위 20개):'))
  const actionEntries = Object.entries(result.actionDist).sort((a, b) => b[1] - a[1])
  for (const [action, count] of actionEntries.slice(0, 20)) {
    const bar = '█'.repeat(Math.min(Math.round(count / 5), 30))
    console.log(`    ${action.padEnd(30)} ${String(count).padStart(4)}  ${pc.cyan(bar)}`)
  }

  // view 분포
  console.log('\n' + pc.bold('  View 분포:'))
  for (const [view, count] of Object.entries(result.viewDist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${view.padEnd(20)} ${String(count).padStart(4)}`)
  }

  // bodyType 분포
  console.log('\n' + pc.bold('  BodyType 분포:'))
  for (const [bt, count] of Object.entries(result.bodyTypeDist).sort((a, b) => b[1] - a[1])) {
    console.log(`    ${bt.padEnd(20)} ${String(count).padStart(4)}`)
  }

  // 매칭 안 된 파일명 상위 N개
  console.log('\n' + pc.bold(`  매칭 실패 파일명 (상위 ${topN}개) — M2-03b Claude API 처리 대상:`))
  for (const filename of result.unmatchedFiles.slice(0, topN)) {
    console.log(`    ${pc.red('x')} ${filename}`)
  }
  if (result.unmatchedFiles.length > topN) {
    console.log(pc.gray(`    ... 외 ${result.unmatchedFiles.length - topN}개`))
  }

  // 미매칭 패턴 분석
  if (result.unmatchedFiles.length > 0) {
    console.log('\n' + pc.bold('  미매칭 파일명 접두사 분포 (상위 15개 패턴):'))
    const prefixCount: Record<string, number> = {}
    for (const f of result.unmatchedFiles) {
      const withoutExt = f.replace(/\.[^.]+$/, '')
      const prefix = withoutExt.split(/[_\-\s]/)[0] ?? withoutExt
      prefixCount[prefix] = (prefixCount[prefix] ?? 0) + 1
    }
    const sortedPrefixes = Object.entries(prefixCount).sort((a, b) => b[1] - a[1])
    for (const [prefix, count] of sortedPrefixes.slice(0, 15)) {
      console.log(`    "${prefix}" — ${count}개`)
    }
    console.log(pc.gray('\n  위 패턴들이 M2-03b 에서 Claude API 2차 태깅 대상입니다.'))
  }

  console.log(divider + '\n')
}

// ─────────────────────────────────────────────
// 메인
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const program = new Command()
  program
    .name('validate-filename-dict')
    .description('파일명 사전 매칭률 검증 — 1,260개 PNG 파일명 대상')
    .option('--src <path>', '소스 디렉토리', 'data/poses/raw')
    .option('--top <n>', '미매칭 파일명 상위 N개 출력', (v) => parseInt(v, 10), 30)
    .option(
      '--dict <path>',
      '사전 파일 경로 (기본: packages/ai-recommend/data/filename-action-dict.ko.json)',
    )
    .parse(process.argv)

  const opts = program.opts() as { src: string; top: number; dict?: string }

  const srcDir = path.resolve(process.cwd(), opts.src)
  if (!fs.existsSync(srcDir)) {
    console.error(pc.red(`소스 디렉토리 없음: ${srcDir}`))
    process.exit(1)
  }

  const dictPath =
    opts.dict ??
    path.resolve(process.cwd(), 'packages/ai-recommend/data/filename-action-dict.ko.json')

  if (!fs.existsSync(dictPath)) {
    console.error(pc.red(`사전 파일 없음: ${dictPath}`))
    process.exit(1)
  }

  console.log(pc.bold('\n사전 파일 로드 중...'))
  const dict = JSON.parse(fs.readFileSync(dictPath, 'utf-8')) as FilenameDictionary
  console.log(
    pc.green(
      `  사전 v${dict.v} 로드 완료 — 룰 ${dict.rules.length}개, 뷰힌트 ${dict.viewHints.length}개`,
    ),
  )

  console.log(pc.bold(`\n파일 스캔 중: ${srcDir}`))
  const files = scanPngFiles(srcDir)
  console.log(pc.green(`  ${files.length}개 PNG 발견`))

  console.log(pc.bold('\n매칭 실행 중...'))
  const result = runValidation(files, dict)

  printValidationResult(result, opts.top)
}

main().catch((err: unknown) => {
  console.error(pc.red('오류:'), String(err))
  process.exit(1)
})
