/**
 * 쿠키 동의 저장소 + 배너 (LEGAL-03)
 */
import { act, fireEvent, render, screen } from '@testing-library/react'
import * as React from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { CookieConsentBanner, CookieSettingsButton } from '@/components/legal/CookieConsentBanner'
import {
  CONSENT_STORAGE_KEY,
  CONSENT_VERSION,
  hasAnalyticsConsent,
  onConsentChange,
  openCookieSettings,
  readConsent,
  writeConsent,
} from '@/lib/consent'

const BANNER = 'cookie-consent-banner'

beforeEach(() => {
  window.localStorage.clear()
})

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('consent 저장소', () => {
  it('기록이 없으면 null · 분석 동의 false (기본 거부)', () => {
    expect(readConsent()).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
  })

  it('writeConsent 저장 → readConsent 복원 + 변경 이벤트', () => {
    const seen: (boolean | undefined)[] = []
    const off = onConsentChange((r) => seen.push(r?.analytics))
    writeConsent(true)
    expect(readConsent()?.analytics).toBe(true)
    expect(hasAnalyticsConsent()).toBe(true)
    writeConsent(false)
    expect(hasAnalyticsConsent()).toBe(false)
    off()
    writeConsent(true)
    expect(seen).toEqual([true, false])
  })

  it('버전이 다르거나 깨진 기록은 무시 (다시 묻는다)', () => {
    window.localStorage.setItem(
      CONSENT_STORAGE_KEY,
      JSON.stringify({ v: CONSENT_VERSION + 1, analytics: true, ts: 'x' }),
    )
    expect(readConsent()).toBeNull()
    window.localStorage.setItem(CONSENT_STORAGE_KEY, '{not json')
    expect(readConsent()).toBeNull()
  })
})

describe('CookieConsentBanner', () => {
  it('분석 도구 미설정이면 자동으로 뜨지 않는다', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    render(<CookieConsentBanner />)
    expect(screen.queryByTestId(BANNER)).toBeNull()
  })

  it('미설정이어도 쿠키 설정을 열면 필수 쿠키 안내 + 확인만', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', '')
    render(<CookieConsentBanner />)
    act(() => openCookieSettings())
    expect(screen.getByTestId(BANNER)).toHaveTextContent('필수 쿠키만 사용합니다')
    expect(screen.queryByRole('button', { name: '모두 허용' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '확인' }))
    expect(screen.queryByTestId(BANNER)).toBeNull()
    expect(readConsent()).toBeNull() // 동의 대상이 없으니 기록도 남기지 않는다
  })

  it('분석 도구 설정 + 기록 없음 → 첫 방문에 노출, 두 선택지는 같은 스타일', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    render(<CookieConsentBanner />)
    expect(screen.getByTestId(BANNER)).toBeInTheDocument()
    const reject = screen.getByRole('button', { name: '필수만 허용' })
    const accept = screen.getByRole('button', { name: '모두 허용' })
    expect(reject.className).toBe(accept.className)
  })

  it('필수만 허용 → 분석 거부 저장 후 닫힘, 재방문 시 다시 묻지 않음', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    const { unmount } = render(<CookieConsentBanner />)
    fireEvent.click(screen.getByRole('button', { name: '필수만 허용' }))
    expect(screen.queryByTestId(BANNER)).toBeNull()
    expect(hasAnalyticsConsent()).toBe(false)
    expect(readConsent()).not.toBeNull()
    unmount()
    render(<CookieConsentBanner />)
    expect(screen.queryByTestId(BANNER)).toBeNull()
  })

  it('푸터 쿠키 설정으로 다시 열어 동의를 철회할 수 있다 (현재 상태 표시 · Esc 닫기)', () => {
    vi.stubEnv('NEXT_PUBLIC_POSTHOG_KEY', 'phc_test')
    writeConsent(true)
    render(
      <>
        <CookieSettingsButton />
        <CookieConsentBanner />
      </>,
    )
    expect(screen.queryByTestId(BANNER)).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: '쿠키 설정' }))
    expect(screen.getByTestId('cookie-consent-current')).toHaveTextContent('허용')
    expect(screen.getByRole('button', { name: '필수만 허용' })).toHaveFocus()
    fireEvent.click(screen.getByRole('button', { name: '필수만 허용' }))
    expect(hasAnalyticsConsent()).toBe(false)

    fireEvent.click(screen.getByRole('button', { name: '쿠키 설정' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByTestId(BANNER)).toBeNull()
  })
})
