'use client'

/**
 * ShowcaseGallery — 무한 스크롤 갤러리
 *
 * 정렬 옵션: 최신(createdAt desc) / 좋아요(likes desc)
 * IntersectionObserver 로 페이지 하단 감지 → 다음 페이지 로드.
 */
import Image from 'next/image'
import Link from 'next/link'
import * as React from 'react'

export interface ShowcaseItem {
  id: string
  title: string
  thumbnail: string | null
  ownerName: string
  likes: number
  reactionCount: number
  commentCount: number
  createdAt: string
  mode: string
  contestId: string | null
}

interface ShowcaseGalleryProps {
  initialItems: ShowcaseItem[]
}

type SortBy = 'latest' | 'likes'

export function ShowcaseGallery({ initialItems }: ShowcaseGalleryProps) {
  const [items, setItems] = React.useState<ShowcaseItem[]>(initialItems)
  const [sortBy, setSortBy] = React.useState<SortBy>('latest')
  const [cursor, setCursor] = React.useState<string | null>(
    initialItems[initialItems.length - 1]?.id ?? null,
  )
  const [isLoading, setIsLoading] = React.useState(false)
  const [hasMore, setHasMore] = React.useState(initialItems.length === 20)
  const sentinelRef = React.useRef<HTMLDivElement>(null)

  // 정렬 변경 → 전체 리셋
  const handleSortChange = React.useCallback(
    async (newSort: SortBy) => {
      if (newSort === sortBy && items === initialItems) return
      setSortBy(newSort)
      setIsLoading(true)
      try {
        const res = await fetch(`/api/showcase?sort=${newSort}&limit=20`)
        if (!res.ok) return
        const json = (await res.json()) as { items: ShowcaseItem[]; nextCursor: string | null }
        setItems(json.items)
        setCursor(json.nextCursor)
        setHasMore(json.items.length === 20)
      } finally {
        setIsLoading(false)
      }
    },
    [sortBy, items, initialItems],
  )

  // IntersectionObserver 무한 스크롤
  React.useEffect(() => {
    if (!sentinelRef.current || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && !isLoading && hasMore) {
          void loadMore()
        }
      },
      { rootMargin: '200px' },
    )

    observer.observe(sentinelRef.current)
    return () => observer.disconnect()
  })

  const loadMore = async () => {
    if (!cursor || isLoading || !hasMore) return
    setIsLoading(true)
    try {
      const res = await fetch(`/api/showcase?sort=${sortBy}&cursor=${cursor}&limit=20`)
      if (!res.ok) return
      const json = (await res.json()) as { items: ShowcaseItem[]; nextCursor: string | null }
      setItems((prev) => [...prev, ...json.items])
      setCursor(json.nextCursor)
      setHasMore(json.items.length === 20)
    } finally {
      setIsLoading(false)
    }
  }

  const btnBase: React.CSSProperties = {
    fontFamily: 'var(--mkt-font-sans)',
    fontSize: '13px',
    fontWeight: 500,
    padding: '6px 14px',
    borderRadius: '6px',
    border: '1px solid var(--mkt-hairline)',
    cursor: 'pointer',
    transition: 'all 120ms ease',
  }

  return (
    <div>
      {/* 정렬 버튼 */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
        <button
          style={{
            ...btnBase,
            backgroundColor: sortBy === 'latest' ? 'var(--mkt-ink)' : 'var(--mkt-canvas)',
            color: sortBy === 'latest' ? 'var(--mkt-canvas)' : 'var(--mkt-ink)',
          }}
          onClick={() => void handleSortChange('latest')}
          aria-pressed={sortBy === 'latest'}
        >
          최신순
        </button>
        <button
          style={{
            ...btnBase,
            backgroundColor: sortBy === 'likes' ? 'var(--mkt-ink)' : 'var(--mkt-canvas)',
            color: sortBy === 'likes' ? 'var(--mkt-canvas)' : 'var(--mkt-ink)',
          }}
          onClick={() => void handleSortChange('likes')}
          aria-pressed={sortBy === 'likes'}
        >
          좋아요순
        </button>
      </div>

      {/* 빈 상태 */}
      {items.length === 0 && !isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: '80px 0',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            color: 'var(--mkt-ink)',
            opacity: 0.35,
          }}
        >
          아직 갤러리 작품이 없습니다.
        </div>
      )}

      {/* 갤러리 그리드 */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
          gap: '20px',
        }}
      >
        {items.map((item) => (
          <Link key={item.id} href={`/showcase/${item.id}`} style={{ textDecoration: 'none' }}>
            <div
              style={{
                border: '1px solid var(--mkt-hairline)',
                borderRadius: '10px',
                overflow: 'hidden',
                backgroundColor: 'var(--mkt-surface-soft)',
                transition: 'box-shadow 120ms ease',
              }}
              className="showcase-card"
            >
              {/* 썸네일 */}
              <div
                style={{
                  aspectRatio: '3/4',
                  position: 'relative',
                  backgroundColor: 'var(--mkt-surface-soft)',
                }}
              >
                {item.thumbnail ? (
                  <Image
                    src={item.thumbnail}
                    alt={item.title}
                    fill
                    sizes="220px"
                    style={{ objectFit: 'cover' }}
                  />
                ) : (
                  <div
                    style={{
                      width: '100%',
                      height: '100%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontFamily: 'var(--mkt-font-mono)',
                      fontSize: '11px',
                      color: 'var(--mkt-ink)',
                      opacity: 0.25,
                    }}
                    aria-hidden="true"
                  >
                    작품
                  </div>
                )}
                {/* 공모전 뱃지 */}
                {item.mode === 'contest' && (
                  <div
                    style={{
                      position: 'absolute',
                      top: '8px',
                      left: '8px',
                      backgroundColor: 'rgba(0,0,0,0.65)',
                      color: '#fff',
                      fontFamily: 'var(--mkt-font-mono)',
                      fontSize: '9px',
                      padding: '2px 6px',
                      borderRadius: '3px',
                    }}
                    aria-label="공모전 출품작"
                  >
                    공모전
                  </div>
                )}
              </div>

              {/* 메타 */}
              <div style={{ padding: '12px' }}>
                <p
                  style={{
                    fontFamily: 'var(--mkt-font-sans)',
                    fontSize: '13px',
                    fontWeight: 500,
                    color: 'var(--mkt-ink)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    marginBottom: '4px',
                  }}
                >
                  {item.title}
                </p>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                  }}
                >
                  <span
                    style={{
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '11px',
                      color: 'var(--mkt-ink)',
                      opacity: 0.45,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '60%',
                    }}
                  >
                    {item.ownerName}
                  </span>
                  <span
                    style={{
                      fontFamily: 'var(--mkt-font-mono)',
                      fontSize: '11px',
                      color: 'var(--mkt-ink)',
                      opacity: 0.4,
                    }}
                    aria-label={`좋아요 ${item.likes}개`}
                  >
                    ♥ {item.likes}
                  </span>
                </div>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* 로딩 인디케이터 */}
      {isLoading && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            color: 'var(--mkt-ink)',
            opacity: 0.4,
          }}
          aria-live="polite"
        >
          불러오는 중...
        </div>
      )}

      {/* 모두 로드 메시지 */}
      {!hasMore && items.length > 0 && (
        <div
          style={{
            textAlign: 'center',
            padding: '32px',
            fontFamily: 'var(--mkt-font-mono)',
            fontSize: '12px',
            color: 'var(--mkt-ink)',
            opacity: 0.3,
          }}
        >
          모든 작품을 불러왔습니다.
        </div>
      )}

      {/* IntersectionObserver 센티넬 */}
      <div ref={sentinelRef} style={{ height: '1px' }} aria-hidden="true" />

      <style>{`
        .showcase-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.1); }
      `}</style>
    </div>
  )
}
