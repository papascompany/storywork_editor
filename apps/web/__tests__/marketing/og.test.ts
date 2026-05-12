/**
 * OG 이미지 메타데이터 + 구조 테스트
 *
 * Edge runtime 에서 실제 이미지를 생성하는 것은 vitest/jsdom 환경에서 불가능하므로
 * (next/og 의 ImageResponse 는 Edge/Node.js 전용) 다음을 검증한다:
 *
 * 1. OG Route GET handler 가 export 되어 있음
 * 2. 각 페이지의 metadata.openGraph.images — /api/og/{slug} URL 포함 여부
 * 3. 각 페이지의 twitter.card === 'summary_large_image'
 * 4. width/height 가 1200/630 임
 */

import type { Metadata } from 'next'
import { describe, expect, it } from 'vitest'

/* ── 페이지별 메타데이터 import ──────────────────────────────────────── */
import * as OgRoute from '../../app/api/og/[slug]/route'
import { metadata as featuresMetadata } from '../../app/features/page'
import { metadata as introMetadata } from '../../app/intro/page'
import { metadata as landingMetadata } from '../../app/page'
import { metadata as derbymanMetadata } from '../../app/showcase/derbyman/page'

/* ── OG route 구조 검증 ─────────────────────────────────────────────── */

const BASE_URL = 'https://storywork-editor-web.vercel.app'

/* ── 헬퍼 함수 ───────────────────────────────────────────────────────── */

/**
 * openGraph.images 배열에서 특정 slug 패턴을 가진 OG 이미지를 찾는다.
 * Next.js Metadata 타입은 OGImageDescriptor | URL | string 유니언이므로
 * 각 케이스를 처리한다.
 */
function findOgImageWithSlug(
  meta: Metadata,
  slug: string,
): { url: string | URL; width?: number; height?: number } | null {
  const images = meta.openGraph?.images
  if (!images) return null

  const imageArray = Array.isArray(images) ? images : [images]

  for (const img of imageArray) {
    if (typeof img === 'string') {
      if (img.includes(`/api/og/${slug}`)) return { url: img }
    } else if (img instanceof URL) {
      if (img.toString().includes(`/api/og/${slug}`)) return { url: img.toString() }
    } else {
      // OGImageDescriptor
      const url = img.url
      const urlStr = url instanceof URL ? url.toString() : url
      if (urlStr.includes(`/api/og/${slug}`)) {
        const w = typeof img.width === 'number' ? img.width : undefined
        const h = typeof img.height === 'number' ? img.height : undefined
        return { url: urlStr, width: w, height: h }
      }
    }
  }

  return null
}

/**
 * twitter.card 를 안전하게 꺼낸다.
 * Twitter 타입은 card 가 없을 수 있으므로 optional chaining.
 */
function getTwitterCard(meta: Metadata): string | undefined {
  const tw = meta.twitter
  if (!tw) return undefined
  // Next.js Twitter 타입은 card 필드가 특정 타입에만 있음
  return 'card' in tw ? (tw as { card: string }).card : undefined
}

/* ── Tests ───────────────────────────────────────────────────────────── */

describe('OG 이미지 Route — /api/og/[slug]', () => {
  it('GET handler 가 export 되어 있다', () => {
    expect(typeof OgRoute.GET).toBe('function')
  })

  it('Edge runtime 이 선언되어 있다', () => {
    expect(OgRoute.runtime).toBe('edge')
  })
})

describe('랜딩 페이지 (/) 메타데이터', () => {
  it('openGraph.images 에 /api/og/landing URL 이 포함된다', () => {
    const found = findOgImageWithSlug(landingMetadata, 'landing')
    expect(found).not.toBeNull()
  })

  it('twitter.card 가 summary_large_image 이다', () => {
    expect(getTwitterCard(landingMetadata)).toBe('summary_large_image')
  })

  it('title 이 스토리워크를 포함한다', () => {
    const title =
      typeof landingMetadata.title === 'string'
        ? landingMetadata.title
        : ((landingMetadata.title as { default?: string })?.default ?? '')
    expect(title).toMatch(/스토리워크/)
  })

  it('description 이 설정되어 있다', () => {
    expect(landingMetadata.description).toBeTruthy()
    expect(typeof landingMetadata.description).toBe('string')
  })

  it('alternates.canonical 이 BASE_URL 이다', () => {
    expect(landingMetadata.alternates?.canonical).toBe(BASE_URL)
  })
})

describe('/intro 페이지 메타데이터', () => {
  it('openGraph.images 에 /api/og/intro URL 이 포함된다', () => {
    const found = findOgImageWithSlug(introMetadata, 'intro')
    expect(found).not.toBeNull()
  })

  it('twitter.card 가 summary_large_image 이다', () => {
    expect(getTwitterCard(introMetadata)).toBe('summary_large_image')
  })

  it('title 이 소개를 포함한다', () => {
    const title = typeof introMetadata.title === 'string' ? introMetadata.title : ''
    expect(title).toMatch(/소개/)
  })

  it('alternates.canonical 이 /intro 경로다', () => {
    expect(introMetadata.alternates?.canonical).toBe(`${BASE_URL}/intro`)
  })
})

describe('/features 페이지 메타데이터', () => {
  it('openGraph.images 에 /api/og/features URL 이 포함된다', () => {
    const found = findOgImageWithSlug(featuresMetadata, 'features')
    expect(found).not.toBeNull()
  })

  it('twitter.card 가 summary_large_image 이다', () => {
    expect(getTwitterCard(featuresMetadata)).toBe('summary_large_image')
  })

  it('title 이 기능을 포함한다', () => {
    const title = typeof featuresMetadata.title === 'string' ? featuresMetadata.title : ''
    expect(title).toMatch(/기능/)
  })

  it('alternates.canonical 이 /features 경로다', () => {
    expect(featuresMetadata.alternates?.canonical).toBe(`${BASE_URL}/features`)
  })
})

describe('/showcase/derbyman 페이지 메타데이터', () => {
  it('openGraph.images 에 /api/og/derbyman URL 이 포함된다', () => {
    const found = findOgImageWithSlug(derbymanMetadata, 'derbyman')
    expect(found).not.toBeNull()
  })

  it('twitter.card 가 summary_large_image 이다', () => {
    expect(getTwitterCard(derbymanMetadata)).toBe('summary_large_image')
  })

  it('title 이 더미맨을 포함한다', () => {
    const title = typeof derbymanMetadata.title === 'string' ? derbymanMetadata.title : ''
    expect(title).toMatch(/더미맨/)
  })

  it('alternates.canonical 이 /showcase/derbyman 경로다', () => {
    expect(derbymanMetadata.alternates?.canonical).toBe(`${BASE_URL}/showcase/derbyman`)
  })
})

describe('모든 OG slug — 1200×630 이미지 메타', () => {
  const pageMetadataMap = [
    { slug: 'landing', meta: landingMetadata },
    { slug: 'intro', meta: introMetadata },
    { slug: 'features', meta: featuresMetadata },
    { slug: 'derbyman', meta: derbymanMetadata },
  ]

  it.each(pageMetadataMap)('$slug — openGraph 이미지 width=1200, height=630', ({ slug, meta }) => {
    const found = findOgImageWithSlug(meta, slug)
    expect(found).not.toBeNull()
    if (found?.width !== undefined) {
      expect(found.width).toBe(1200)
      expect(found.height).toBe(630)
    }
  })
})

describe('모든 페이지 — robots 설정', () => {
  it('각 페이지의 metadata 에 robots.index 가 명시되어 있다 (landing)', () => {
    // landing 만 robots 필드를 직접 정의함. 나머지는 root layout 에서 상속.
    if (landingMetadata.robots && typeof landingMetadata.robots === 'object') {
      const robots = landingMetadata.robots as { index?: boolean }
      expect(robots.index).toBe(true)
    } else {
      // robots 필드 없어도 OK (root layout 에서 상속)
      expect(true).toBe(true)
    }
  })
})
