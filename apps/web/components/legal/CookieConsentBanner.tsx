'use client'

/**
 * components/legal/CookieConsentBanner.tsx — 쿠키 동의 배너 (LEGAL-03)
 *
 * - 분석 도구(env)가 설정됐고 아직 선택 기록이 없을 때만 자동으로 뜬다. 지금은 분석 도구가
 *   없어(FOLLOWUP-60 전) 자동 노출되지 않는다 — 동의받을 대상이 없는데 묻지 않는다.
 * - 푸터 '쿠키 설정'으로 언제든 다시 열어 변경할 수 있다(동의 철회 경로).
 * - [필수만 허용]과 [모두 허용]은 같은 스타일·크기 — 한쪽을 강조하는 다크패턴 금지.
 * - 서버에서는 렌더하지 않는다(localStorage 기반 → hydration 불일치 방지).
 */
import Link from 'next/link'
import * as React from 'react'

import {
  OPEN_COOKIE_SETTINGS_EVENT,
  isAnalyticsConfigured,
  openCookieSettings,
  readConsent,
  writeConsent,
} from '../../lib/consent'
import type { ConsentRecord } from '../../lib/consent'

export function CookieConsentBanner() {
  const [open, setOpen] = React.useState(false)
  const [reopened, setReopened] = React.useState(false)
  const [current, setCurrent] = React.useState<ConsentRecord | null>(null)
  const firstButtonRef = React.useRef<HTMLButtonElement>(null)
  const configured = isAnalyticsConfigured()

  React.useEffect(() => {
    const saved = readConsent()
    setCurrent(saved)
    if (configured && !saved) setOpen(true)

    const onOpen = () => {
      setCurrent(readConsent())
      setReopened(true)
      setOpen(true)
    }
    window.addEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen)
    return () => window.removeEventListener(OPEN_COOKIE_SETTINGS_EVENT, onOpen)
  }, [configured])

  // 사용자가 직접 연 경우에만 포커스를 옮긴다(첫 방문 자동 노출은 읽던 흐름을 끊지 않게)
  React.useEffect(() => {
    if (open && reopened) firstButtonRef.current?.focus()
  }, [open, reopened])

  React.useEffect(() => {
    if (!open || !reopened) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, reopened])

  if (!open) return null

  const choose = (analytics: boolean) => {
    setCurrent(writeConsent(analytics))
    setOpen(false)
  }

  return (
    <section
      role="region"
      aria-labelledby="cookie-consent-title"
      data-testid="cookie-consent-banner"
      style={{
        position: 'fixed',
        left: '16px',
        right: '16px',
        bottom: '16px',
        zIndex: 1000,
        maxWidth: '720px',
        margin: '0 auto',
        backgroundColor: 'var(--mkt-canvas)',
        color: 'var(--mkt-ink)',
        border: '2px solid var(--mkt-ink)',
        borderRadius: 'var(--mkt-rounded-md)',
        boxShadow: '4px 4px 0 var(--mkt-shadow-ink)',
        padding: '16px 20px',
        display: 'flex',
        flexWrap: 'wrap',
        alignItems: 'center',
        gap: '12px 20px',
      }}
    >
      <div style={{ flex: '1 1 320px', minWidth: 0 }}>
        <h2
          id="cookie-consent-title"
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '15px',
            fontWeight: 600,
            marginBottom: '4px',
          }}
        >
          쿠키 설정
        </h2>
        <p
          style={{
            fontFamily: 'var(--mkt-font-sans)',
            fontSize: '13px',
            lineHeight: 1.55,
            opacity: 0.8,
            overflowWrap: 'anywhere',
          }}
        >
          {configured
            ? '스토리워크는 로그인·설정 유지용 필수 쿠키와, 동의하시면 서비스 개선용 분석 쿠키를 사용합니다.'
            : '스토리워크는 로그인·설정 유지용 필수 쿠키만 사용합니다. 분석 쿠키는 사용하지 않습니다.'}{' '}
          {configured && current && (
            <span data-testid="cookie-consent-current">
              현재: 분석 쿠키 {current.analytics ? '허용' : '거부'}.{' '}
            </span>
          )}
          <Link href="/legal/privacy" style={{ color: 'inherit', textDecoration: 'underline' }}>
            개인정보처리방침
          </Link>
        </p>
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', flex: '0 1 auto' }}>
        {configured ? (
          <>
            <button
              ref={firstButtonRef}
              type="button"
              className="mkt-btn-secondary"
              style={{ flex: '1 1 auto' }}
              onClick={() => choose(false)}
            >
              필수만 허용
            </button>
            <button
              type="button"
              className="mkt-btn-secondary"
              style={{ flex: '1 1 auto' }}
              onClick={() => choose(true)}
            >
              모두 허용
            </button>
          </>
        ) : (
          <button
            ref={firstButtonRef}
            type="button"
            className="mkt-btn-secondary"
            onClick={() => setOpen(false)}
          >
            확인
          </button>
        )}
      </div>
    </section>
  )
}

/** 푸터 등에서 배너를 다시 여는 링크형 버튼 */
export function CookieSettingsButton({ style }: { style?: React.CSSProperties }) {
  return (
    <button
      type="button"
      onClick={openCookieSettings}
      className="hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 rounded"
      style={{
        background: 'none',
        border: 0,
        padding: 0,
        cursor: 'pointer',
        textAlign: 'left',
        ...style,
      }}
    >
      쿠키 설정
    </button>
  )
}
