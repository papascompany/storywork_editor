/**
 * __tests__/preflight/profiles.test.ts
 *
 * 프로필 구조 + 기본값 검증 (5+)
 */

import { describe, it, expect } from 'vitest'

import {
  PROFILES,
  PROFILE_BOOKPRINT_KOREA,
  PROFILE_INSTAPRINT,
  PROFILE_COMICMAKER,
  getProfileById,
} from '../../src/preflight/profiles.js'

describe('PROFILES', () => {
  it('3개 프로필이 등록됨', () => {
    expect(PROFILES).toHaveLength(3)
  })

  it('각 프로필에 필수 필드 존재', () => {
    for (const profile of PROFILES) {
      expect(typeof profile.id).toBe('string')
      expect(typeof profile.name).toBe('string')
      expect(typeof profile.bleedMm.min).toBe('number')
      expect(typeof profile.bleedMm.max).toBe('number')
      expect(typeof profile.safeMm.min).toBe('number')
      expect(typeof profile.imageDpi.minPose).toBe('number')
      expect(typeof profile.imageDpi.minBg).toBe('number')
      expect(typeof profile.fontEmbedRequired).toBe('boolean')
      expect(Array.isArray(profile.colorSpace)).toBe(true)
    }
  })

  it('getProfileById 정상 조회', () => {
    const profile = getProfileById('bookprint-korea')
    expect(profile).toBe(PROFILE_BOOKPRINT_KOREA)
  })

  it('getProfileById 존재하지 않는 ID → undefined', () => {
    expect(getProfileById('nonexistent')).toBeUndefined()
  })
})

describe('PROFILE_BOOKPRINT_KOREA', () => {
  it('bleedMm.min=3, max=5', () => {
    expect(PROFILE_BOOKPRINT_KOREA.bleedMm.min).toBe(3)
    expect(PROFILE_BOOKPRINT_KOREA.bleedMm.max).toBe(5)
  })

  it('safeMm.min=5', () => {
    expect(PROFILE_BOOKPRINT_KOREA.safeMm.min).toBe(5)
  })

  it('minPose=300, minBg=150', () => {
    expect(PROFILE_BOOKPRINT_KOREA.imageDpi.minPose).toBe(300)
    expect(PROFILE_BOOKPRINT_KOREA.imageDpi.minBg).toBe(150)
  })

  it('fontEmbedRequired=true', () => {
    expect(PROFILE_BOOKPRINT_KOREA.fontEmbedRequired).toBe(true)
  })

  it('CMYK 선호 (colorSpace[0]=cmyk)', () => {
    expect(PROFILE_BOOKPRINT_KOREA.colorSpace[0]).toBe('cmyk')
  })
})

describe('PROFILE_INSTAPRINT', () => {
  it('maxPages=1', () => {
    expect(PROFILE_INSTAPRINT.maxPages).toBe(1)
  })

  it('RGB 선호', () => {
    expect(PROFILE_INSTAPRINT.colorSpace[0]).toBe('rgb')
  })

  it('bleedMm.min=2', () => {
    expect(PROFILE_INSTAPRINT.bleedMm.min).toBe(2)
  })
})

describe('PROFILE_COMICMAKER', () => {
  it('maxPages=200', () => {
    expect(PROFILE_COMICMAKER.maxPages).toBe(200)
  })

  it('배경 minBg=72 (lowDpi 허용)', () => {
    expect(PROFILE_COMICMAKER.imageDpi.minBg).toBe(72)
  })

  it('formats 빈 배열 = 모든 판형 허용', () => {
    expect(PROFILE_COMICMAKER.formats).toHaveLength(0)
  })
})
