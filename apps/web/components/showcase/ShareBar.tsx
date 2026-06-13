'use client'

/**
 * components/showcase/ShareBar.tsx — SNS 공유 바 (M8-04)
 *
 * 무의존 채널만 구현: Web Share API(모바일 네이티브 시트) · X · Facebook · 링크 복사.
 * 카카오톡 공유는 Kakao JS SDK + NEXT_PUBLIC_KAKAO_JS_KEY(외부 앱키) 필요 → 후속(FOLLOWUP-66).
 *
 * - navigator.share 지원 시 "공유" 버튼으로 네이티브 시트 노출(피처 디텍션, hydration-safe).
 * - 항상 X / Facebook / 링크 복사 버튼 노출(데스크톱 폴백).
 * - 링크 복사 성공/실패는 토스트로 피드백.
 */
import { showToast } from '@storywork/ui'
import { Link2, Share2 } from 'lucide-react'
import * as React from 'react'

interface ShareBarProps {
  /** 공유 제목 */
  title: string
  /** 공유 설명(선택) */
  text?: string
  /**
   * 공유 URL. 미지정 시 현재 페이지(window.location.href).
   * SSR/하이드레이션 시점엔 비어 있을 수 있어 클릭 시점에 평가한다.
   */
  url?: string
  /** 라벨(접근성) — 무엇을 공유하는지. 예: "작품" | "공모전" */
  subjectLabel?: string
}

const BTN = 40

function iconBtnStyle(): React.CSSProperties {
  return {
    width: BTN,
    height: BTN,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 'var(--mkt-rounded-full)',
    border: '1px solid var(--mkt-hairline)',
    backgroundColor: 'var(--mkt-canvas)',
    color: 'var(--mkt-ink)',
    cursor: 'pointer',
    transition: 'background-color 120ms ease, transform 120ms ease',
    padding: 0,
  }
}

function hoverIn(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget
  el.style.backgroundColor = 'var(--mkt-surface-soft)'
  el.style.transform = 'translateY(-1px)'
}
function hoverOut(e: React.MouseEvent<HTMLButtonElement>) {
  const el = e.currentTarget
  el.style.backgroundColor = 'var(--mkt-canvas)'
  el.style.transform = 'translateY(0)'
}

export function ShareBar({ title, text, url, subjectLabel = '페이지' }: ShareBarProps) {
  const [canNativeShare, setCanNativeShare] = React.useState(false)

  React.useEffect(() => {
    // 하이드레이션 불일치 방지 — 마운트 후 피처 디텍션
    setCanNativeShare(typeof navigator !== 'undefined' && typeof navigator.share === 'function')
  }, [])

  const resolveUrl = React.useCallback(
    () => url ?? (typeof window !== 'undefined' ? window.location.href : ''),
    [url],
  )

  async function handleNative() {
    try {
      await navigator.share({ title, text, url: resolveUrl() })
    } catch {
      // 사용자 취소/미지원 — 무시
    }
  }

  function openPopup(shareUrl: string) {
    window.open(shareUrl, '_blank', 'noopener,noreferrer,width=600,height=520')
  }

  function shareX() {
    openPopup(
      `https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(resolveUrl())}`,
    )
  }

  function shareFacebook() {
    openPopup(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(resolveUrl())}`)
  }

  async function copyLink() {
    const link = resolveUrl()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(link)
      } else {
        // 폴백: 임시 textarea
        const ta = document.createElement('textarea')
        ta.value = link
        ta.style.position = 'fixed'
        ta.style.opacity = '0'
        document.body.appendChild(ta)
        ta.select()
        document.execCommand('copy')
        document.body.removeChild(ta)
      }
      showToast('링크를 복사했습니다.', 'success')
    } catch {
      showToast('링크 복사에 실패했습니다.', 'error')
    }
  }

  return (
    <div
      role="group"
      aria-label={`${subjectLabel} 공유`}
      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
    >
      {canNativeShare && (
        <button
          type="button"
          onClick={handleNative}
          onMouseEnter={hoverIn}
          onMouseLeave={hoverOut}
          aria-label={`${subjectLabel} 공유하기`}
          style={iconBtnStyle()}
        >
          <Share2 size={18} aria-hidden="true" />
        </button>
      )}

      <button
        type="button"
        onClick={shareX}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        aria-label="X(트위터)에 공유"
        style={iconBtnStyle()}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={shareFacebook}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        aria-label="Facebook 에 공유"
        style={iconBtnStyle()}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
        </svg>
      </button>

      <button
        type="button"
        onClick={copyLink}
        onMouseEnter={hoverIn}
        onMouseLeave={hoverOut}
        aria-label="링크 복사"
        style={iconBtnStyle()}
      >
        <Link2 size={17} aria-hidden="true" />
      </button>
    </div>
  )
}
