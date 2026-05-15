/**
 * design-system-invariants.test.ts
 *
 * DESIGN-nike.md SSOT 의 implementation_contract 를 PR 단위로 강제한다.
 * 회귀가 발생하면 실패한 파일/라인을 그대로 노출해 즉시 픽스를 유도한다.
 *
 * 계약(요약):
 *   1. admin 표면은 `--nike-*` / `.nike-*` 만 사용. `mkt-*` 토큰 사용 금지.
 *   2. admin globals.css 에서 공유 `--color-brand-N` 토큰 override 금지
 *      (editor active-tool 회귀가 발생하기 때문).
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

const ADMIN_ROOT = path.resolve(__dirname, '..')

const SCAN_EXTENSIONS = new Set(['.ts', '.tsx', '.css'])
const IGNORE_DIRS = new Set([
  'node_modules',
  '.next',
  '.turbo',
  'dist',
  'build',
  'coverage',
  '__tests__', // 본 invariant 테스트 자체에 'mkt-' 문자열이 들어있어 자기 검출되는 것을 방지
])

async function* walk(dir: string): AsyncGenerator<string> {
  const entries = await fs.readdir(dir, { withFileTypes: true })
  for (const entry of entries) {
    if (entry.name.startsWith('.') && entry.name !== '.') continue
    if (IGNORE_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      yield* walk(full)
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      yield full
    }
  }
}

async function collectAdminFiles(): Promise<string[]> {
  const out: string[] = []
  for await (const file of walk(ADMIN_ROOT)) out.push(file)
  return out
}

describe('DESIGN-nike SSOT — admin invariants', () => {
  it('admin 코드/CSS 어디에도 mkt-* 토큰이 등장하지 않는다', async () => {
    const files = await collectAdminFiles()
    const violations: string[] = []
    const pattern = /(--mkt-[a-zA-Z0-9-]+|\bmkt-[a-zA-Z0-9-]+)/

    for (const file of files) {
      const text = await fs.readFile(file, 'utf-8')
      const lines = text.split('\n')
      lines.forEach((line, idx) => {
        if (pattern.test(line)) {
          const rel = path.relative(ADMIN_ROOT, file)
          violations.push(`${rel}:${idx + 1}  ${line.trim()}`)
        }
      })
    }

    if (violations.length > 0) {
      throw new Error(
        [
          `mkt-* 토큰이 admin 표면에서 ${violations.length}건 발견됨.`,
          'DESIGN-nike.md SSOT 에 따라 admin 은 --nike-* 만 사용해야 합니다.',
          '',
          ...violations.slice(0, 30),
          violations.length > 30 ? `... (+${violations.length - 30} more)` : '',
        ]
          .filter(Boolean)
          .join('\n'),
      )
    }
    expect(violations).toEqual([])
  })

  it('admin globals.css 에서 공유 --color-brand-N 토큰을 override 하지 않는다', async () => {
    const cssPath = path.join(ADMIN_ROOT, 'app', 'globals.css')
    const text = await fs.readFile(cssPath, 'utf-8')
    const matches: string[] = []
    const pattern = /--color-brand-\d+\s*:/g
    text.split('\n').forEach((line, idx) => {
      if (pattern.test(line)) {
        matches.push(`globals.css:${idx + 1}  ${line.trim()}`)
      }
    })
    if (matches.length > 0) {
      throw new Error(
        [
          `--color-brand-N override 가 ${matches.length}건 발견됨.`,
          'editor active-tool 회귀를 막기 위해 admin globals 에서 brand 토큰을 재정의하지 마세요.',
          '',
          ...matches,
        ].join('\n'),
      )
    }
    expect(matches).toEqual([])
  })
})
