import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { FolderLicenseSchema, parseFolderLicense } from '../src/license/folder.js'
import { PoseSidecarSchema } from '../src/license/pose-sidecar.js'

// ─────────────────────────────────────────────
// LICENSE.json 파싱 테스트
// ─────────────────────────────────────────────

describe('FolderLicense', () => {
  it('data/poses/raw/LICENSE.json 파싱 성공', () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), '../../data/poses/raw/LICENSE.json'), 'utf-8'),
    )
    const result = FolderLicenseSchema.safeParse(raw)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.data.v).toBe(1)
      expect(result.data.scope).toBe('folder-default')
      expect(result.data.license.holder).toBe('StoryWork')
      expect(result.data.license.commercialUse).toBe(true)
    }
  })

  it('parseFolderLicense 유틸 함수 동작', () => {
    const raw = JSON.parse(
      readFileSync(join(process.cwd(), '../../data/poses/raw/LICENSE.json'), 'utf-8'),
    )
    const license = parseFolderLicense(raw)
    expect(license.ingest?.subfolderRules?.['중복']?.include).toBe(false)
    expect(license.ingest?.subfolderRules?.['동물']?.include).toBe(true)
    expect(license.ingest?.subfolderRules?.['사랑']?.include).toBe(true)
  })

  it('v 버전이 다르면 파싱 실패', () => {
    const result = FolderLicenseSchema.safeParse({ v: 2, scope: 'folder-default' })
    expect(result.success).toBe(false)
  })

  it('license.holder 누락 시 파싱 실패', () => {
    const result = FolderLicenseSchema.safeParse({
      v: 1,
      scope: 'folder-default',
      appliesTo: ['**/*.png'],
      license: { id: 'x', terms: 'all-rights' }, // holder 누락
      asset: { kind: 'pose', format: 'png', ownerType: 'system', defaultStatus: 'draft' },
    })
    expect(result.success).toBe(false)
  })
})

// ─────────────────────────────────────────────
// PoseSidecar 파싱 테스트
// ─────────────────────────────────────────────

describe('PoseSidecar', () => {
  const validSidecar = {
    v: 1 as const,
    format: 'png' as const,
    size: { w: 750, h: 750 },
    keypoints: [
      { name: 'head' as const, x: 0.5, y: 0.1 },
      { name: 'mouth' as const, x: 0.5, y: 0.15 },
      { name: 'center' as const, x: 0.5, y: 0.5 },
    ],
    bbox: { x: 0.1, y: 0.05, w: 0.8, h: 0.9 },
    flippable: true,
    license: { id: 'storywork-internal-2026', holder: 'StoryWork', terms: 'all-rights' },
  }

  it('정상 사이드카 파싱 성공', () => {
    const result = PoseSidecarSchema.safeParse(validSidecar)
    expect(result.success).toBe(true)
  })

  it('license 누락 시 파싱 실패 (적재 거부)', () => {
    const { license: _l, ...noLicense } = validSidecar
    const result = PoseSidecarSchema.safeParse(noLicense)
    expect(result.success).toBe(false)
  })

  it('키포인트 좌표 1.0 초과 시 실패', () => {
    const bad = {
      ...validSidecar,
      keypoints: [
        { name: 'head', x: 1.5, y: 0.1 }, // x > 1
        { name: 'mouth', x: 0.5, y: 0.15 },
        { name: 'center', x: 0.5, y: 0.5 },
      ],
    }
    const result = PoseSidecarSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('키포인트 좌표 음수 시 실패', () => {
    const bad = {
      ...validSidecar,
      keypoints: [
        { name: 'head', x: -0.1, y: 0.1 }, // x < 0
        { name: 'mouth', x: 0.5, y: 0.15 },
        { name: 'center', x: 0.5, y: 0.5 },
      ],
    }
    const result = PoseSidecarSchema.safeParse(bad)
    expect(result.success).toBe(false)
  })

  it('bbox 값이 0..1 범위 내 정상', () => {
    const result = PoseSidecarSchema.safeParse({
      ...validSidecar,
      bbox: { x: 0, y: 0, w: 1, h: 1 },
    })
    expect(result.success).toBe(true)
  })

  it('keypoints 비어있으면 실패', () => {
    const result = PoseSidecarSchema.safeParse({ ...validSidecar, keypoints: [] })
    expect(result.success).toBe(false)
  })
})
