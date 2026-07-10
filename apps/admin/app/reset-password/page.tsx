'use client'

import { Sparkles } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { type CSSProperties, type FocusEvent, type FormEvent, useEffect, useState } from 'react'

import { createAdminBrowserClient } from '../../src/lib/supabase/client'

type PageState = 'loading' | 'ready' | 'error' | 'success'

const INPUT_STYLE: CSSProperties = {
  backgroundColor: 'var(--nike-canvas)',
  border: '1px solid var(--nike-hairline)',
  borderRadius: 'var(--nike-rounded-md)',
  padding: '12px 16px',
  fontFamily: 'var(--nike-font-text)',
  fontSize: '16px',
  fontWeight: 400,
  color: 'var(--nike-ink)',
  outline: 'none',
  width: '100%',
  transition: 'border-color 150ms ease',
}

function handleInputFocus(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--nike-ink)'
  e.currentTarget.style.boxShadow = '0 0 0 4px var(--nike-soft-cloud)'
}

function handleInputBlur(e: FocusEvent<HTMLInputElement>) {
  e.currentTarget.style.borderColor = 'var(--nike-hairline)'
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
    if (newPassword.length < 10) return '비밀번호는 10자 이상이어야 합니다.'
    if (!/[A-Za-z]/.test(newPassword) || !/[0-9]/.test(newPassword))
      return '비밀번호는 영문과 숫자를 모두 포함해야 합니다.'
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
      style={{ backgroundColor: 'var(--nike-soft-cloud)', fontFamily: 'var(--nike-font-text)' }}
    >
      {/* 카드 컨테이너 */}
      <div
        className="w-full max-w-md"
        style={{
          backgroundColor: 'var(--nike-canvas)',
          borderRadius: 'var(--nike-rounded-lg)',
          border: '1px solid var(--nike-hairline-soft)',
          padding: '48px 40px',
        }}
      >
        {/* 로고 영역 */}
        <div className="mb-8 flex flex-col items-start gap-1">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="size-6" aria-hidden="true" style={{ color: 'var(--nike-ink)' }} />
            <span
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '18px',
                fontWeight: 500,
                letterSpacing: '-0.26px',
                color: 'var(--nike-ink)',
              }}
            >
              StoryWork Admin
            </span>
          </div>
          <h1
            style={{
              fontFamily: 'var(--nike-font-display)',
              fontSize: 'clamp(28px, 4vw, 36px)',
              fontWeight: 500,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--nike-ink)',
            }}
          >
            비밀번호 재설정
          </h1>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '16px',
              fontWeight: 400,
              lineHeight: 1.45,
              letterSpacing: '-0.14px',
              color: 'var(--nike-mute)',
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
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              color: 'var(--nike-stone)',
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
                borderRadius: 'var(--nike-rounded-sm)',
                backgroundColor: 'var(--nike-card-pink)',
                border: '1px solid #e0b0b0',
                padding: '10px 14px',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '14px',
                fontWeight: 400,
                color: '#8b2222',
              }}
            >
              {sessionError}
            </div>
            <Link
              href="/login"
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '14px',
                fontWeight: 500,
                color: 'var(--nike-ink)',
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
              borderRadius: 'var(--nike-rounded-sm)',
              backgroundColor: 'var(--nike-card-mint)',
              border: '1px solid #a7f3c0',
              padding: '10px 14px',
              fontFamily: 'var(--nike-font-text)',
              fontSize: '14px',
              fontWeight: 400,
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
                  borderRadius: 'var(--nike-rounded-sm)',
                  backgroundColor: 'var(--nike-card-pink)',
                  border: '1px solid #e0b0b0',
                  padding: '10px 14px',
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '14px',
                  fontWeight: 400,
                  color: '#8b2222',
                }}
              >
                {formError}
              </div>
            )}

            {/* 새 비밀번호 */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="nike-label">
                새 비밀번호
              </label>
              <input
                id="new-password"
                type="password"
                name="new-password"
                autoComplete="new-password"
                placeholder="10자 이상, 영문+숫자"
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
              <label htmlFor="confirm-password" className="nike-label">
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
              className="nike-btn-primary"
              style={{
                width: '100%',
                marginTop: '8px',
                justifyContent: 'center',
                opacity: loading ? 0.6 : undefined,
              }}
            >
              {loading ? '변경 중...' : '비밀번호 변경'}
            </button>

            {/* 로그인으로 돌아가기 */}
            <p
              style={{
                textAlign: 'center',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '13px',
                fontWeight: 400,
                color: 'var(--nike-stone)',
              }}
            >
              <Link
                href="/login"
                style={{
                  color: 'var(--nike-ink)',
                  fontWeight: 500,
                  textDecoration: 'underline',
                  textUnderlineOffset: '3px',
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
          fontFamily: 'var(--nike-font-text)',
          fontSize: '11px',
          fontWeight: 500,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--nike-stone)',
        }}
      >
        StoryWork Admin Console — 권한 없는 접근 시 자동 차단
      </p>
    </main>
  )
}
