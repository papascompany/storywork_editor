/**
 * apps/web/app/api/_lib/search-types.ts
 *
 * 포즈 검색 관련 공유 타입 정의.
 * route.ts 와 search-query.ts 의 순환 의존 방지를 위해 분리.
 */

export interface ResourceSummary {
  id: string
  slug: string
  thumbUrl: string | null
  width: number | null
  height: number | null
  masterDpi: number | null
  lowDpi: boolean
  meta: {
    action?: string
    view?: string
    bodyType?: string
  }
  tags: string[]
  score?: number
}

export interface SearchPosesResponse {
  results: ResourceSummary[]
  total: number
  took_ms: number
}
