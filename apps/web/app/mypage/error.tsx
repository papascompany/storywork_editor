'use client'

/**
 * apps/web/app/mypage/error.tsx
 *
 * 마이페이지 에러 경계.
 * 예상치 못한 오류 발생 시 "다시 시도" 버튼과 함께 안내 메시지를 표시.
 */
import { AlertCircle } from 'lucide-react'
import Link from 'next/link'
import * as React from 'react'

interface ErrorProps {
  error: Error & { digest?: string }
  reset: () => void
}

export default function MyPageError({ error, reset }: ErrorProps) {
  React.useEffect(() => {
    // 에러 로깅 (Sentry 연동 시 captureException 호출)
    console.error('[MyPage Error]', error)
  }, [error])

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: 'var(--mkt-surface-soft)',
        fontFamily: 'var(--mkt-font-sans)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'var(--mkt-space-xl)',
      }}
      role="alert"
      aria-live="assertive"
    >
      <div
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          border: '1px solid var(--mkt-hairline)',
          borderRadius: 'var(--mkt-rounded-lg)',
          padding: '40px 36px',
          maxWidth: '480px',
          width: '100%',
          textAlign: 'center',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 'var(--mkt-space-md)',
        }}
      >
        {/* 아이콘 */}
        <div
          aria-hidden="true"
          style={{
            width: '56px',
            height: '56px',
            borderRadius: 'var(--mkt-rounded-full)',
            backgroundColor: 'var(--mkt-block-pink)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <AlertCircle
            style={{ width: '24px', height: '24px', color: 'var(--mkt-ink)', opacity: 0.7 }}
          />
        </div>

        {/* 메시지 */}
        <div>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '18px',
              fontWeight: 540,
              letterSpacing: '-0.26px',
              color: 'var(--mkt-ink)',
              margin: '0 0 8px',
            }}
          >
            페이지를 불러오지 못했어요
          </p>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              opacity: 0.5,
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            일시적인 오류가 발생했습니다.
            <br />
            잠시 후 다시 시도해 주세요.
          </p>
        </div>

        {/* 액션 버튼들 */}
        <div
          style={{
            display: 'flex',
            gap: 'var(--mkt-space-sm)',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          <button
            type="button"
            onClick={reset}
            style={{
              height: '44px',
              padding: '0 20px',
              borderRadius: 'var(--mkt-rounded-md)',
              backgroundColor: 'var(--mkt-ink)',
              color: 'var(--mkt-canvas)',
              border: 'none',
              cursor: 'pointer',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 480,
              transition: 'opacity 150ms ease',
            }}
            onMouseEnter={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '0.82'
            }}
            onMouseLeave={(e) => {
              ;(e.currentTarget as HTMLButtonElement).style.opacity = '1'
            }}
          >
            다시 시도
          </button>

          <Link
            href="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '44px',
              padding: '0 20px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'transparent',
              color: 'var(--mkt-ink)',
              textDecoration: 'none',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '15px',
              fontWeight: 480,
              opacity: 0.65,
            }}
          >
            홈으로
          </Link>
        </div>

        {/* 에러 다이제스트 (디버그용) */}
        {error.digest && (
          <p
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.3px',
              color: 'var(--mkt-ink)',
              opacity: 0.3,
              margin: 0,
            }}
          >
            {error.digest}
          </p>
        )}
      </div>
    </div>
  )
}
