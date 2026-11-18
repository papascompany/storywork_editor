/**
 * lib/consent.ts — 쿠키(분석) 동의 저장소 (LEGAL-03)
 *
 * 필수 저장소(로그인 쿠키·테마·자동저장)는 동의 대상이 아니다. 동의는 "분석용"만 받는다.
 * 분석 도구는 아직 미연동(FOLLOWUP-60)이므로, 배너는 분석 도구 env 가 설정됐을 때만 띄운다.
 * FOLLOWUP-60 은 PostHog 초기화 전에 `hasAnalyticsConsent()` 를 확인하고
 * `onConsentChange` 로 철회·변경에 반응해야 한다.
 *
 * 저장: localStorage `sw-consent` = { v, analytics, ts }. 서버로 보내지 않는다(쿠키 아님).
 * 정책이 바뀌어 다시 물어야 하면 CONSENT_VERSION 을 올린다 — 이전 버전 기록은 무시된다.
 */

export const CONSENT_STORAGE_KEY = 'sw-consent'
export const CONSENT_VERSION = 1
/** 동의가 바뀌었을 때(같은 탭) */
export const CONSENT_CHANGE_EVENT = 'sw-consent-change'
/** 푸터 '쿠키 설정' 등에서 배너를 다시 열 때 */
export const OPEN_COOKIE_SETTINGS_EVENT = 'sw-open-cookie-settings'

export interface ConsentRecord {
  v: number
  analytics: boolean
  /** ISO 시각 — 동의 시점 증빙(로컬) */
  ts: string
}

/** 동의를 받아야 하는 분석 도구가 켜져 있는가. NEXT_PUBLIC_* 는 빌드에 인라인된다. */
export function isAnalyticsConfigured(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POSTHOG_KEY)
}

export function readConsent(): ConsentRecord | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<ConsentRecord>
    if (parsed.v !== CONSENT_VERSION || typeof parsed.analytics !== 'boolean') return null
    return { v: parsed.v, analytics: parsed.analytics, ts: String(parsed.ts ?? '') }
  } catch {
    // 사파리 프라이빗 모드 등 storage 접근 불가 → 미동의로 취급
    return null
  }
}

export function writeConsent(analytics: boolean): ConsentRecord {
  const record: ConsentRecord = { v: CONSENT_VERSION, analytics, ts: new Date().toISOString() }
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record))
  } catch {
    // 저장 실패해도 이번 세션 동안은 이벤트로 반영된다
  }
  window.dispatchEvent(new CustomEvent<ConsentRecord>(CONSENT_CHANGE_EVENT, { detail: record }))
  return record
}

/** 분석 도구를 켜도 되는가 — 명시적 동의가 있을 때만 true (기본값 거부) */
export function hasAnalyticsConsent(): boolean {
  return readConsent()?.analytics === true
}

/** 동의 변경 구독 (같은 탭 이벤트 + 다른 탭 storage 이벤트). 해제 함수를 돌려준다. */
export function onConsentChange(listener: (record: ConsentRecord | null) => void): () => void {
  const onLocal = (e: Event) => listener((e as CustomEvent<ConsentRecord>).detail)
  const onStorage = (e: StorageEvent) => {
    if (e.key === CONSENT_STORAGE_KEY) listener(readConsent())
  }
  window.addEventListener(CONSENT_CHANGE_EVENT, onLocal)
  window.addEventListener('storage', onStorage)
  return () => {
    window.removeEventListener(CONSENT_CHANGE_EVENT, onLocal)
    window.removeEventListener('storage', onStorage)
  }
}

export function openCookieSettings(): void {
  window.dispatchEvent(new Event(OPEN_COOKIE_SETTINGS_EVENT))
}
