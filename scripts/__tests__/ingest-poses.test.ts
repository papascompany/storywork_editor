/**
 * M2-01 — 인입 파이프라인 단위 테스트
 */

import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

import { describe, it, expect, beforeEach } from 'vitest'

// 테스트 대상 (순수 함수만 직접 임포트)
import { slugifyFilename } from '../../packages/shared-utils/src/slug.js'
import {
  validatePngMagicBytes,
  calcMasterDpi,
  bootstrapTagsFromFilename,
  scanAssets,
} from '../ingest-poses.js'

// ─────────────────────────────────────────────
// 헬퍼
// ─────────────────────────────────────────────

function writeTempFile(content: Buffer): string {
  const tmpPath = path.join(os.tmpdir(), `test-${Date.now()}-${Math.random()}.png`)
  fs.writeFileSync(tmpPath, content)
  return tmpPath
}

function pngMagic(): Buffer {
  return Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00])
}

function fakeBuf(): Buffer {
  return Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46]) // JPEG 매직
}

// ─────────────────────────────────────────────
// 1. 매직바이트 검증
// ─────────────────────────────────────────────

describe('validatePngMagicBytes', () => {
  it('PNG 파일은 true 반환', () => {
    const p = writeTempFile(pngMagic())
    try {
      expect(validatePngMagicBytes(p)).toBe(true)
    } finally {
      fs.unlinkSync(p)
    }
  })

  it('JPEG 파일(PNG 위장)은 false 반환', () => {
    const p = writeTempFile(fakeBuf())
    try {
      expect(validatePngMagicBytes(p)).toBe(false)
    } finally {
      fs.unlinkSync(p)
    }
  })

  it('존재하지 않는 파일은 false 반환', () => {
    expect(validatePngMagicBytes('/nonexistent/file.png')).toBe(false)
  })

  it('빈 파일은 false 반환', () => {
    const p = writeTempFile(Buffer.alloc(0))
    try {
      expect(validatePngMagicBytes(p)).toBe(false)
    } finally {
      fs.unlinkSync(p)
    }
  })
})

// ─────────────────────────────────────────────
// 2. Slug 정규화 케이스 (shared-utils/slug.ts)
// ─────────────────────────────────────────────

describe('slugifyFilename', () => {
  it('영어 파일명 → 소문자 하이픈', () => {
    expect(slugifyFilename('Fight-bow_03_1.png')).toBe('fight-bow-03-1')
  })

  it('한글 포함 → 음역 + 소문자 (NFC/NFD 모두 처리)', () => {
    // NFC 완성형
    const slugNfc = slugifyFilename('01_서기_01.png')
    expect(slugNfc).toMatch(/^[a-z0-9-]+$/)
    expect(slugNfc).toContain('seogi')
    // NFD 분해형 (macOS 파일시스템 형식)
    const nfdFilename = '01_서기_01.png'.normalize('NFD')
    const slugNfd = slugifyFilename(nfdFilename)
    expect(slugNfd).toMatch(/^[a-z0-9-]+$/)
    expect(slugNfd).toContain('seogi')
  })

  it('괄호 포함 한글 → 괄호 제거 + 음역', () => {
    const slug = slugifyFilename('Fight-ax(도끼)_01_1.png')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug).not.toContain('(')
    expect(slug).not.toContain(')')
  })

  it('공백 포함 → 하이픈으로 치환', () => {
    const slug = slugifyFilename('12_비스듬히 팔은 정면_1.png')
    expect(slug).toMatch(/^[a-z0-9-]+$/)
    expect(slug).not.toContain(' ')
  })

  it('연속 하이픈 → 단일 하이픈', () => {
    const slug = slugifyFilename('test__double___hyphen.png')
    expect(slug).not.toContain('--')
  })

  it('앞뒤 하이픈 제거', () => {
    const slug = slugifyFilename('_leading_trailing_.png')
    expect(slug).not.toMatch(/^-/)
    expect(slug).not.toMatch(/-$/)
  })
})

// ─────────────────────────────────────────────
// 3. masterDpi 계산 + lowDpi 임계
// ─────────────────────────────────────────────

describe('calcMasterDpi', () => {
  it('750×750 자산 → lowDpi=true (B5 기준)', () => {
    const { masterDpi, lowDpi } = calcMasterDpi(750, 750)
    // 750 / 257 * 25.4 ≈ 74 dpi
    expect(masterDpi).toBeLessThan(200)
    expect(lowDpi).toBe(true)
  })

  it('2000×2000 자산 → lowDpi 확인', () => {
    const { masterDpi } = calcMasterDpi(2000, 2000)
    // 2000 / 257 * 25.4 ≈ 197 → 여전히 낮음
    expect(typeof masterDpi).toBe('number')
    // 2560×2560 케이스 — 200dpi 이상
    const big = calcMasterDpi(2560, 2560)
    expect(big.lowDpi).toBe(false)
    expect(big.masterDpi).toBeGreaterThanOrEqual(200)
  })

  it('비정사각 자산 → min(w, h) 기준', () => {
    const { masterDpi } = calcMasterDpi(3000, 750)
    const { masterDpi: expected } = calcMasterDpi(750, 750)
    expect(masterDpi).toBe(expected)
  })

  it('lowDpi=true 임계는 200dpi', () => {
    // 200dpi 분기점: 200 * 257 / 25.4 ≈ 2020px
    // 2020px → Math.round(2020/257*25.4) = 200dpi → lowDpi=false
    const borderline = calcMasterDpi(2020, 2020)
    expect(borderline.lowDpi).toBe(false)
    // 2010px → Math.round(2010/257*25.4) = 199dpi → lowDpi=true
    const below = calcMasterDpi(2010, 2010)
    expect(below.lowDpi).toBe(true)
  })
})

// ─────────────────────────────────────────────
// 4. 파일명 키워드 1차 태깅
// ─────────────────────────────────────────────

describe('bootstrapTagsFromFilename', () => {
  it('영어 액션 키워드 매칭', () => {
    const result = bootstrapTagsFromFilename('Fight-bow_03_1.png')
    // "fight" 또는 "bow" 중 하나 매칭
    expect(result.tags.length).toBeGreaterThanOrEqual(1)
    expect(result.confidence).toBeGreaterThan(0)
  })

  it('한글 키워드 매칭', () => {
    const result = bootstrapTagsFromFilename('01_서기_01.png')
    expect(result.tags).toContain('stand')
    expect(result.action).toBe('stand')
  })

  it('매칭 없으면 confidence=0, tags 빈 배열', () => {
    const result = bootstrapTagsFromFilename('unknown_xyz_999.png')
    expect(result.confidence).toBe(0)
    expect(result.tags).toHaveLength(0)
  })

  it('animal 폴더 파일명 → beast bodyType', () => {
    const result = bootstrapTagsFromFilename('animal-01.png')
    expect(result.bodyType).toBe('beast')
  })
})

// ─────────────────────────────────────────────
// 5. subfolder 규칙 적용 (scanAssets)
// ─────────────────────────────────────────────

describe('scanAssets — subfolder rules', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ingest-test-'))

    // 구조 생성
    fs.writeFileSync(path.join(tmpDir, 'LICENSE.json'), '{}')
    fs.writeFileSync(path.join(tmpDir, 'root.png'), pngMagic())
    fs.mkdirSync(path.join(tmpDir, '동물'))
    fs.writeFileSync(path.join(tmpDir, '동물', 'animal-01.png'), pngMagic())
    fs.mkdirSync(path.join(tmpDir, '중복'))
    fs.writeFileSync(path.join(tmpDir, '중복', 'dup-01.png'), pngMagic())
    fs.writeFileSync(path.join(tmpDir, 'Thumbs.db'), Buffer.from('junk'))
  })

  it('루트 png 포함, Thumbs.db 제외', () => {
    const assets = scanAssets(tmpDir, ['Thumbs.db', '.DS_Store', '*.tmp'], {})
    const names = assets.map((a) => path.basename(a.filePath))
    expect(names).toContain('root.png')
    expect(names).not.toContain('Thumbs.db')
  })

  it('중복 폴더는 exclude 처리', () => {
    const assets = scanAssets(tmpDir, ['Thumbs.db', '.DS_Store', '*.tmp'], {
      중복: { include: false, reason: '중복' },
    })
    const names = assets.map((a) => path.basename(a.filePath))
    expect(names).not.toContain('dup-01.png')
  })

  it('동물 폴더는 include + categoryTag=animal', () => {
    const assets = scanAssets(tmpDir, ['Thumbs.db', '.DS_Store', '*.tmp'], {
      동물: { include: true, categoryTag: 'animal' },
    })
    const animalAsset = assets.find((a) => path.basename(a.filePath) === 'animal-01.png')
    expect(animalAsset).toBeDefined()
    expect(animalAsset?.categoryTags).toContain('animal')
  })

  it('LICENSE.json 은 포함 안 됨', () => {
    const assets = scanAssets(tmpDir, ['Thumbs.db'], {})
    const names = assets.map((a) => path.basename(a.filePath))
    expect(names).not.toContain('LICENSE.json')
  })
})

// ─────────────────────────────────────────────
// 6. LICENSE.json 없으면 거부 (parseFolderLicense)
// ─────────────────────────────────────────────

describe('parseFolderLicense', () => {
  it('유효한 LICENSE.json 파싱 성공', async () => {
    const { parseFolderLicense } =
      await import('../../packages/shared-schema/src/license/folder.js')
    const raw = {
      v: 1,
      scope: 'folder-default',
      appliesTo: ['**/*.png'],
      license: {
        id: 'test-license',
        holder: 'TestCo',
        terms: 'all-rights',
        commercialUse: true,
        attributionRequired: false,
      },
      asset: {
        kind: 'pose',
        format: 'png',
        ownerType: 'system',
        defaultStatus: 'draft',
      },
    }
    expect(() => parseFolderLicense(raw)).not.toThrow()
  })

  it('license 누락 시 Zod 에러', async () => {
    const { parseFolderLicense } =
      await import('../../packages/shared-schema/src/license/folder.js')
    expect(() => parseFolderLicense({ v: 1, scope: 'folder-default' })).toThrow()
  })
})
