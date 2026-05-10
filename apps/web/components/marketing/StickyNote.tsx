import Image from 'next/image'
import * as React from 'react'

/**
 * StickyNote — 4컷 콘티 카드 컴포넌트
 *
 * DESIGN.md §Sticky-note style component thumbnails:
 * - 파스텔 배경, rounded-sm (6px) 모서리
 * - 살짝 기울어진 collage 느낌
 * - figmaMono caption 으로 장면 번호/캡션 표시
 *
 * imageUrl 이 제공되면 실 자산(next/image) 을 렌더링한다.
 * 제공되지 않으면 기존 placeholderColor/placeholderLabel 박스를 사용한다.
 */

interface StickyNoteProps {
  number: number
  scene: string
  caption: string
  /** 실 포즈 이미지 URL (Supabase Storage thumb.png) */
  imageUrl?: string
  /** imageUrl 이 없을 때 쓰는 placeholder 색상 박스 */
  placeholderColor?: string
  placeholderLabel?: string
  rotation?: number
  className?: string
}

const bgColors = [
  'var(--mkt-block-cream)',
  'var(--mkt-block-mint)',
  'var(--mkt-block-lilac)',
  'var(--mkt-block-pink)',
]

export function StickyNote({
  number,
  scene,
  caption,
  imageUrl,
  placeholderColor,
  placeholderLabel,
  rotation = 0,
  className = '',
}: StickyNoteProps) {
  const bg = bgColors[(number - 1) % bgColors.length]

  return (
    <article
      className={className}
      aria-label={`컷 ${number}: ${scene}`}
      style={{
        backgroundColor: bg,
        borderRadius: 'var(--mkt-rounded-sm)',
        padding: 'var(--mkt-space-lg)',
        transform: `rotate(${rotation}deg)`,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--mkt-space-sm)',
      }}
    >
      {/* 장면 번호 eyebrow */}
      <span className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.6 }}>
        CUT {number}
      </span>

      {/* 포즈 이미지 또는 placeholder 영역 */}
      <div
        style={{
          borderRadius: 'var(--mkt-rounded-md)',
          aspectRatio: '1 / 1',
          overflow: 'hidden',
          position: 'relative',
          backgroundColor: placeholderColor ?? 'var(--mkt-canvas)',
        }}
      >
        {imageUrl ? (
          <Image
            src={imageUrl}
            alt={caption}
            fill
            sizes="(max-width: 640px) 40vw, 200px"
            style={{ objectFit: 'contain', padding: '8px' }}
            placeholder="empty"
          />
        ) : (
          <div
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
            }}
            aria-hidden="true"
          >
            {placeholderLabel && (
              <span
                style={{
                  fontFamily: 'var(--mkt-font-mono)',
                  fontSize: '11px',
                  color: 'var(--mkt-ink)',
                  opacity: 0.5,
                  textAlign: 'center',
                  padding: '8px',
                }}
              >
                {placeholderLabel}
              </span>
            )}
          </div>
        )}
      </div>

      {/* 장면 제목 */}
      <p
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '16px',
          fontWeight: '540',
          lineHeight: '1.35',
          color: 'var(--mkt-ink)',
        }}
      >
        {scene}
      </p>

      {/* 캡션 */}
      <p className="mkt-caption" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
        {caption}
      </p>
    </article>
  )
}
