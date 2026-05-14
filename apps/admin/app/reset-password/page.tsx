'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { type CSSProperties, type FocusEvent, type FormEvent, useEffect, useState } from 'react'

import { createAdminBrowserClient } from '../../src/lib/supabase/client'

type PageState = 'loading' | 'ready' | 'error' | 'success'

const INPUT_STYLE: CSSProperties = {
  backgroundColor: 'var(--mkt-canvas)',
  border: '1px solid var(--mkt-hairline)',
  borderRadius: 'var(--mkt-rounded-md)',
  padding: '12px 14px',
  fontFamily: 'var(--mkt-font-sans)',
  fontSize: '16px',
  fontWeight: 320,
  color: 'var(--mkt-ink)',
  outline: 'none',
  width: '100%',
  transition: 'border-color 150ms ease',
}

function handleInputFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-ink)'
  e.currentTarget.style.boxShadow = '0 0 0 3px rgba(0,0,0,0.08)'
}

function handleInputBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--mkt-hairline)'
  e.currentTarget.style.boxShadow = 'none'
}

export default function ResetPasswordPage() {
  const router = useRouter()

  const [pageState, setPageState] = useState<PageState>('loading')
  const [sessionError, setSessionError] = useState('')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [formError, setFormError] = useState('')
  const [loading, setLoading] = useState(false)

  // hash fragment 파싱 → setSession
  useEffect(() => {
    const hash = window.location.hash.substring(1)
    const params = new URLSearchParams(hash)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const type = params.get('type')

    if (type !== 'recovery' || !accessToken || !refreshToken) {
      setSessionError('유효하지 않은 재설정 링크입니다. 링크가 만료되었거나 올바르지 않습니다.')
      setPageState('error')
      return
    }

    const supabase = createAdminBrowserClient()
    supabase.auth
      .setSession({ access_token: accessToken, refresh_token: refreshToken })
      .then(({ error }) => {
        if (error) {
          setSessionError(`세션 복원 실패: ${error.message}`)
          setPageState('error')
        } else {
          setPageState('ready')
        }
      })
      .catch(() => {
        setSessionError('세션 복원 중 오류가 발생했습니다.')
        setPageState('error')
      })
  }, [])

  const validate = (): string => {
    if (newPassword.length < 8) return '비밀번호는 8자 이상이어야 합니다.'
    if (newPassword !== confirmPassword) return '비밀번호가 일치하지 않습니다.'
    return ''
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setFormError('')

    const validationMessage = validate()
    if (validationMessage) {
      setFormError(validationMessage)
      return
    }

    setLoading(true)
    try {
      const supabase = createAdminBrowserClient()
      const { error } = await supabase.auth.updateUser({ password: newPassword })
      if (error) {
        setFormError(`비밀번호 변경 실패: ${error.message}`)
        return
      }
      setPageState('success')
      // 2초 후 로그인 페이지로 이동
      setTimeout(() => {
        router.push('/login')
      }, 2000)
    } catch {
      setFormError('비밀번호 변경 중 오류가 발생했습니다. 다시 시도하세요.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <main
      className="flex min-h-dvh flex-col items-center justify-center px-4 py-16"
      style={{ backgroundColor: 'var(--mkt-surface-soft)', fontFamily: 'var(--mkt-font-sans)' }}
    >
      {/* 카드 컨테이너 */}
      <div
        className="w-full max-w-md"
        style={{
          backgroundColor: 'var(--mkt-canvas)',
          borderRadius: 'var(--mkt-rounded-lg)',
          border: '1px solid var(--mkt-hairline)',
          padding: '48px 40px',
        }}
      >
        {/* 로고 영역 */}
        <div className="mb-8 flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-6" aria-hidden="true" style={{ color: 'var(--mkt-ink)' }} />
            <span
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '18px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--mkt-ink)',
              }}
            >
              StoryWork Admin
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--mkt-ink)',
            }}
          >
            비밀번호 재설정
          </h1>
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '16px',
              fontWeight: 330,
              lineHeight: 1.45,
              letterSpacing: '-0.14px',
              color: 'var(--mkt-ink)',
              opacity: 0.6,
              marginTop: '4px',
            }}
          >
            {pageState === 'success'
              ? '비밀번호가 변경되었습니다. 로그인 페이지로 이동합니다...'
              : '새 비밀번호를 입력하세요.'}
          </p>
        </div>

        {/* 로딩 상태 */}
        {pageState === 'loading' && (
          <p
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              color: 'var(--mkt-ink)',
              opacity: 0.5,
            }}
          >
            링크 확인 중...
          </p>
        )}

        {/* 에러 상태 (세션 복원 실패) */}
        {pageState === 'error' && (
          <div className="flex flex-col gap-4">
            <div
              role="alert"
              style={{
                borderRadius: 'var(--mkt-rounded-md)',
                backgroundColor: 'var(--mkt-block-pink)',
                border: '1px solid #e0b0b0',
                padding: '10px 14px',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 330,
                color: '#8b2222',
              }}
            >
              {sessionError}
            </div>
            <Link
              href="/login"
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '14px',
                fontWeight: 480,
                color: 'var(--mkt-ink)',
                textDecoration: 'underline',
                textUnderlineOffset: '3px',
              }}
            >
              로그인 페이지로 돌아가기
            </Link>
          </div>
        )}

        {/* 성공 상태 */}
        {pageState === 'success' && (
          <div
            role="status"
            style={{
              borderRadius: 'var(--mkt-rounded-md)',
              backgroundColor: '#f0fdf4',
              border: '1px solid #a7f3c0',
              padding: '10px 14px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: '#166534',
            }}
          >
            비밀번호가 성공적으로 변경되었습니다.
          </div>
        )}

        {/* 비밀번호 변경 폼 */}
        {pageState === 'ready' && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4" noValidate>
            {/* 폼 에러 메시지 */}
            {formError && (
              <div
                role="alert"
                style={{
                  borderRadius: 'var(--mkt-rounded-md)',
                  backgroundColor: 'var(--mkt-block-pink)',
                  border: '1px solid #e0b0b0',
                  padding: '10px 14px',
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: '#8b2222',
                }}
              >
                {formError}
              </div>
            )}

            {/* 새 비밀번호 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="new-password"
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 480,
                  letterSpacing: '-0.10px',
                  color: 'var(--mkt-ink)',
                }}
              >
                새 비밀번호
              </label>
              <input
                id="new-password"
                type="password"
                name="new-password"
                autoComplete="new-password"
                placeholder="8자 이상 입력"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                disabled={loading}
                style={INPUT_STYLE}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            {/* 비밀번호 확인 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="confirm-password"
                style={{
                  fontFamily: 'var(--mkt-font-sans)',
                  fontSize: '14px',
                  fontWeight: 480,
                  letterSpacing: '-0.10px',
                  color: 'var(--mkt-ink)',
                }}
              >
                비밀번호 확인
              </label>
              <input
                id="confirm-password"
                type="password"
                name="confirm-password"
                autoComplete="new-password"
                placeholder="비밀번호를 다시 입력"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                disabled={loading}
                style={INPUT_STYLE}
                onFocus={handleInputFocus}
                onBlur={handleInputBlur}
              />
            </div>

            {/* 제출 버튼 */}
            <button
              type="submit"
              disabled={loading}
              className="mkt-btn-primary"
              style={{ width: '100%', marginTop: '8px', opacity: loading ? 0.6 : undefined }}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>

            {/* 로그인으로 돌아가기 */}
            <p
              style={{
                textAlign: 'center',
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '13px',
                fontWeight: 330,
                color: 'var(--mkt-ink)',
                opacity: 0.5,
              }}
            >
              <Link
                href="/login"
                style={{
                  color: 'var(--mkt-ink)',
                  fontWeight: 480,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
                  opacity: 1,
                }}
              >
                로그인으로 돌아가기
              </Link>
            </p>
          </form>
        )}
      </div>

      <p
        style={{
          marginTop: '24px',
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--mkt-ink)',
          opacity: 0.3,
        }}
      >
        StoryWork Admin Console — 권한 없는 접근 시 자동 차단
      </p>
    </main>
  )
}
