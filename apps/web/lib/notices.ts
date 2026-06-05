/**
 * apps/web/lib/notices.ts
 *
 * /notices 페이지용 공지사항 목록 로더. 캐시 전략:
 *   - next/cache unstable_cache + revalidate 3600 (1시간)
 *   - admin POST/PATCH/DELETE 시 revalidateTag('notices') 호출 → 즉시 무효화
 *
 * 단일 findMany 로 모든 published notice 를 가져온 뒤 호출부에서 split/paginate.
 * (company-info.ts 와 동일한 패턴)
 */

import { unstable_cache } from 'next/cache'

import { prisma } from './prisma'

export interface PublishedNoticeListItem {
  id: string
  title: string
  publishedAt: Date | null
  isPinned: boolean
}

/**
 * publishedAt <= now 인 공지사항을 isPinned DESC, publishedAt DESC 로 정렬해 반환.
 * 1시간 캐시 + 'notices' 태그.
 */
export const getPublishedNotices = unstable_cache(
  async (): Promise<PublishedNoticeListItem[]> => {
    try {
      const now = new Date()
      const rows = await prisma.notice.findMany({
        where: { publishedAt: { lte: now, not: null } },
        orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
        select: { id: true, title: true, publishedAt: true, isPinned: true },
      })
      return rows
    } catch {
      // DB 미연결 환경 (CI 빌드, SSG prerender) — 빈 목록으로 graceful fallback
      return []
    }
  },
  ['notices-list'],
  { revalidate: 3600, tags: ['notices'] },
)
