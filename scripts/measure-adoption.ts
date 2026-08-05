/* eslint-disable no-console */
/**
 * measure-adoption.ts — 자동배치 채택률 baseline 측정 (AI-ACT-04)
 *
 * 평가 코퍼스(`data/eval/scripts/**.txt`)를 전 파이프라인
 * (analyze → recommend → compose)에 통과시켜 채택률 리포트를 만든다.
 *
 * 실행:
 *   pnpm adoption:measure                # 요약 출력
 *   pnpm adoption:measure -- --verbose   # 페이지별 blocker 상세
 *   pnpm adoption:baseline               # data/eval/adoption-baseline.json 갱신
 *
 * 지표 정의는 packages/ai-layout/src/adoption.ts 의 문서 주석이 정본이다.
 * (요약: blocker 0 페이지 비율 = 프록시 채택률. 실사용 로그 도입 시 교체 예정)
 *
 * 비용: LLM 미사용(llmEnabled:false), DB 미사용(룰 기반 폴백) — 키 없이 재현 가능.
 */

import fs from 'node:fs'
import path from 'node:path'

import { aggregateAdoption, compose, measureAdoption } from '@storywork/ai-layout'
import type { AdoptionResult, LayoutFormat } from '@storywork/ai-layout'
import { recommend } from '@storywork/ai-recommend'
import { analyze } from '@storywork/ai-script'

// ─────────────────────────────────────────────
// 설정
// ─────────────────────────────────────────────

const CORPUS_DIR = path.join(process.cwd(), 'data/eval/scripts')

/** 평가 판형 — B5 단행본 (기본 출판 판형) */
const FORMAT: LayoutFormat = {
  id: 'preset-b5-novel',
  widthMm: 128,
  heightMm: 182,
  dpi: 350,
  bleedMm: 3,
  safeMm: 5,
}

interface FileReport {
  file: string
  format: string
  scenes: number
  pages: number
  adoptablePages: number
  adoptionRate: number
  dialogueRetention: number
  adoption: AdoptionResult
}

// ─────────────────────────────────────────────
// 코퍼스 로드
// ─────────────────────────────────────────────

function loadCorpus(): Array<{ file: string; text: string }> {
  if (!fs.existsSync(CORPUS_DIR)) {
    console.error(`[adoption] 코퍼스 디렉터리가 없습니다: ${CORPUS_DIR}`)
    process.exit(2)
  }
  const out: Array<{ file: string; text: string }> = []
  const walk = (dir: string): void => {
    for (const entry of fs
      .readdirSync(dir, { withFileTypes: true })
      .sort((a, b) => a.name.localeCompare(b.name))) {
      const p = path.join(dir, entry.name)
      if (entry.isDirectory()) walk(p)
      else if (entry.name.endsWith('.txt')) {
        out.push({ file: path.relative(CORPUS_DIR, p), text: fs.readFileSync(p, 'utf-8') })
      }
    }
  }
  walk(CORPUS_DIR)
  return out
}

// ─────────────────────────────────────────────
// 단일 대본 측정
// ─────────────────────────────────────────────

async function measureOne(file: string, text: string): Promise<FileReport> {
  // 1. 분석 (룰 only — 키 불필요·결정론)
  const analyzed = await analyze(text, { format: 'auto', llmEnabled: false, maxAlternatives: 0 })

  // 2. 추천 (DB 없이 룰 기반 폴백)
  const recommended = await recommend(analyzed, {
    seed: 0,
    characterMapping: {},
    candidatesPerCharacter: 5,
    llmEnabled: false,
  })

  // 3. 배치
  const composed = await compose(analyzed, recommended, {
    formatId: FORMAT.id,
    format: FORMAT,
    seed: 0,
  })

  const adoption = measureAdoption(analyzed, composed)
  return {
    file,
    format: analyzed.format,
    scenes: analyzed.scenes.length,
    pages: adoption.totalPages,
    adoptablePages: adoption.adoptablePages,
    adoptionRate: adoption.adoptionRate,
    dialogueRetention: adoption.dialogueRetention,
    adoption,
  }
}

// ─────────────────────────────────────────────
// 출력
// ─────────────────────────────────────────────

function pct(v: number): string {
  return `${(v * 100).toFixed(1)}%`
}

function printReport(reports: FileReport[], overall: AdoptionResult, verbose: boolean): void {
  const totalScenes = reports.reduce((a, r) => a + r.scenes, 0)
  const line = '─'.repeat(72)

  console.log(`\n${line}`)
  console.log('  자동배치 채택률 baseline (AI-ACT-04)')
  console.log(line)
  console.log(`  대본:        ${reports.length} 편`)
  console.log(`  장면:        ${totalScenes} 개`)
  console.log(`  페이지:      ${overall.totalPages} 개`)
  console.log('')
  console.log(`  채택 가능:   ${overall.adoptablePages}/${overall.totalPages}`)
  console.log(`  ▶ 채택률:    ${pct(overall.adoptionRate)}   (blocker 0 페이지 비율)`)
  console.log(`  ▶ 대사 보존: ${pct(overall.dialogueRetention)}`)
  console.log('')
  console.log('  blocker 발생 페이지 수:')
  for (const [k, v] of Object.entries(overall.blockerCounts)) {
    const bar = '█'.repeat(Math.min(Math.round((v / Math.max(overall.totalPages, 1)) * 40), 40))
    console.log(`    ${k.padEnd(18)} ${String(v).padStart(4)}  ${bar}`)
  }
  console.log('  soft signal (채택 비차단):')
  for (const [k, v] of Object.entries(overall.softSignalCounts)) {
    console.log(`    ${k.padEnd(18)} ${String(v).padStart(4)}`)
  }

  console.log(`\n${line}`)
  console.log('  대본별')
  console.log(line)
  for (const r of reports) {
    console.log(
      `  ${r.file.padEnd(34)} ${r.format.padEnd(12)} 장면 ${String(r.scenes).padStart(3)} · ` +
        `페이지 ${String(r.pages).padStart(3)} · 채택 ${pct(r.adoptionRate).padStart(6)} · 대사 ${pct(r.dialogueRetention).padStart(6)}`,
    )
    if (verbose) {
      for (const p of r.adoption.pages.filter((x) => !x.adoptable)) {
        console.log(
          `      p${p.pageIndex}: ${p.blockers.map((b) => `${b.kind}(${b.detail})`).join(' | ')}`,
        )
      }
    }
  }
  console.log('')
}

// ─────────────────────────────────────────────
// main
// ─────────────────────────────────────────────

async function main(): Promise<void> {
  const args = process.argv.slice(2)
  const verbose = args.includes('--verbose')
  const jsonIdx = args.indexOf('--json')
  const jsonOut = jsonIdx >= 0 ? args[jsonIdx + 1] : undefined

  const corpus = loadCorpus()
  if (corpus.length === 0) {
    console.error('[adoption] 코퍼스가 비어 있습니다.')
    process.exit(2)
  }

  const reports: FileReport[] = []
  for (const { file, text } of corpus) {
    try {
      reports.push(await measureOne(file, text))
    } catch (err) {
      console.error(`[adoption] ${file} 측정 실패:`, err)
    }
  }

  const overall = aggregateAdoption(reports.map((r) => r.adoption))
  printReport(reports, overall, verbose)

  if (jsonOut) {
    const payload = {
      generatedBy: 'scripts/measure-adoption.ts',
      metric: 'proxy-adoption-rate (blocker-free page ratio)',
      format: FORMAT.id,
      corpusFiles: reports.length,
      totalScenes: reports.reduce((a, r) => a + r.scenes, 0),
      totalPages: overall.totalPages,
      adoptionRate: overall.adoptionRate,
      dialogueRetention: overall.dialogueRetention,
      blockerCounts: overall.blockerCounts,
      softSignalCounts: overall.softSignalCounts,
      perFile: reports.map((r) => ({
        file: r.file,
        format: r.format,
        scenes: r.scenes,
        pages: r.pages,
        adoptionRate: r.adoptionRate,
        dialogueRetention: r.dialogueRetention,
      })),
    }
    fs.mkdirSync(path.dirname(jsonOut), { recursive: true })
    fs.writeFileSync(jsonOut, `${JSON.stringify(payload, null, 2)}\n`, 'utf-8')
    console.log(`  리포트 저장: ${jsonOut}\n`)
  }
}

void main()
