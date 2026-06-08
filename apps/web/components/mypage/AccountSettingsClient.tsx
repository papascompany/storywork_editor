'use client'

/**
 * components/mypage/AccountSettingsClient.tsx
 *
 * 계정 설정 클라이언트 컴포넌트.
 * - 데이터 다운로드
 * - 마케팅 동의 토글
 * - 회원 탈퇴 (2단계 모달)
 *
 * LEGAL-OPS-03
 */

import * as React from 'react'

type DeletionReason = '비용' | '사용성' | '기능 부족' | '기타'

const DELETION_REASONS: DeletionReason[] = ['비용', '사용성', '기능 부족', '기타']

interface AccountSettingsClientProps {
  email: string
  marketingConsent: boolean
}

export function AccountSettingsClient({
  email,
  marketingConsent: initialConsent,
}: AccountSettingsClientProps) {
  // ─── 마케팅 동의 ──────────────────────────────────────────────────────────────
  const [consent, setConsent] = React.useState(initialConsent)
  const [consentLoading, setConsentLoading] = React.useState(false)
  const [consentMsg, setConsentMsg] = React.useState<string | null>(null)

  async function handleConsentToggle() {
    setConsentLoading(true)
    setConsentMsg(null)
    try {
      const res = await fetch('/api/account/marketing-consent', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ consent: !consent }),
      })
      const data: unknown = await res.json()
      if (res.ok && data && typeof data === 'object' && 'marketingConsent' in data) {
        setConsent((data as { marketingConsent: boolean }).marketingConsent)
        setConsentMsg('동의 설정이 저장되었습니다.')
      } else {
        setConsentMsg('저장 중 오류가 발생했습니다.')
      }
    } catch {
      setConsentMsg('네트워크 오류가 발생했습니다.')
    } finally {
      setConsentLoading(false)
    }
  }

  // ─── 탈퇴 모달 ──────────────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [deleteStep, setDeleteStep] = React.useState<1 | 2>(1)
  const [deleteEmail, setDeleteEmail] = React.useState('')
  const [deletePassword, setDeletePassword] = React.useState('')
  const [deleteReason, setDeleteReason] = React.useState<DeletionReason | ''>('')
  const [deleteLoading, setDeleteLoading] = React.useState(false)
  const [deleteError, setDeleteError] = React.useState<string | null>(null)

  function openDeleteModal() {
    setDeleteStep(1)
    setDeleteEmail('')
    setDeletePassword('')
    setDeleteReason('')
    setDeleteError(null)
    setShowDeleteModal(true)
  }

  function closeDeleteModal() {
    if (deleteLoading) return
    setShowDeleteModal(false)
  }

  async function handleDeleteSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (deleteStep === 1) {
      setDeleteStep(2)
      return
    }

    // Step 2: 실제 탈퇴 요청
    setDeleteLoading(true)
    setDeleteError(null)
    try {
      const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: deleteEmail,
          password: deletePassword,
          ...(deleteReason ? { reason: deleteReason } : {}),
        }),
      })
      const data: unknown = await res.json()
      if (res.ok) {
        // 탈퇴 성공 → goodbye 페이지로
        window.location.href = '/goodbye'
        return
      }
      const errMsg =
        data && typeof data === 'object' && 'error' in data
          ? String((data as { error: unknown }).error)
          : '탈퇴 처리 중 오류가 발생했습니다.'
      setDeleteError(errMsg)
    } catch {
      setDeleteError('네트워크 오류가 발생했습니다.')
    } finally {
      setDeleteLoading(false)
    }
  }

  // ─── 데이터 다운로드 ─────────────────────────────────────────────────────────
  const [downloadLoading, setDownloadLoading] = React.useState(false)

  async function handleDataDownload() {
    setDownloadLoading(true)
    try {
      const res = await fetch('/api/account/export')
      if (!res.ok) {
        alert('데이터 다운로드 중 오류가 발생했습니다.')
        return
      }
      const blob = await res.blob()
      const cd = res.headers.get('content-disposition') ?? ''
      const nameMatch = /filename="([^"]+)"/.exec(cd)
      const filename = nameMatch?.[1] ?? 'storywork-user-data.json'
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      alert('다운로드 중 오류가 발생했습니다.')
    } finally {
      setDownloadLoading(false)
    }
  }

  return (
    <>
      <div
        style={{
          maxWidth: '640px',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--mkt-space-xxl)',
        }}
      >
        {/* ─── 헤더 ──────────────────────────────────────────────────────────── */}
        <div>
          <h1
            className="mkt-display-sm"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-sm)' }}
          >
            계정 설정
          </h1>
          <p className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.55 }}>
            {email}
          </p>
        </div>

        {/* ─── 데이터 다운로드 ────────────────────────────────────────────────── */}
        <section
          style={{
            border: '1px solid var(--mkt-hairline)',
            borderRadius: 'var(--mkt-rounded-lg)',
            padding: 'var(--mkt-space-xl)',
          }}
        >
          <h2
            className="mkt-headline"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-sm)' }}
          >
            내 데이터 다운로드
          </h2>
          <p
            className="mkt-body-sm"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.65,
              marginBottom: 'var(--mkt-space-lg)',
            }}
          >
            개인정보보호법 제35조에 따른 이동권. 프로필, 작품, 구독 이력 등 모든 데이터를 JSON
            형식으로 다운로드합니다.
          </p>
          <button
            type="button"
            onClick={handleDataDownload}
            disabled={downloadLoading}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '40px',
              padding: '0 var(--mkt-space-lg)',
              backgroundColor: 'var(--mkt-surface-soft)',
              border: '1px solid var(--mkt-hairline)',
              borderRadius: 'var(--mkt-rounded-md)',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 540,
              color: 'var(--mkt-ink)',
              cursor: downloadLoading ? 'not-allowed' : 'pointer',
              opacity: downloadLoading ? 0.5 : 1,
            }}
          >
            {downloadLoading ? '다운로드 중...' : '내 데이터 JSON 다운로드'}
          </button>
        </section>

        {/* ─── 마케팅 동의 ────────────────────────────────────────────────────── */}
        <section
          style={{
            border: '1px solid var(--mkt-hairline)',
            borderRadius: 'var(--mkt-rounded-lg)',
            padding: 'var(--mkt-space-xl)',
          }}
        >
          <h2
            className="mkt-headline"
            style={{ color: 'var(--mkt-ink)', marginBottom: 'var(--mkt-space-sm)' }}
          >
            마케팅 수신 동의
          </h2>
          <p
            className="mkt-body-sm"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.65,
              marginBottom: 'var(--mkt-space-lg)',
            }}
          >
            서비스 업데이트, 이벤트, 혜택 정보를 이메일로 수신합니다. 언제든지 변경할 수 있습니다.
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--mkt-space-md)' }}>
            <button
              type="button"
              role="switch"
              aria-checked={consent}
              onClick={handleConsentToggle}
              disabled={consentLoading}
              style={{
                position: 'relative',
                width: '44px',
                height: '24px',
                borderRadius: '12px',
                border: 'none',
                backgroundColor: consent ? 'var(--mkt-ink)' : 'var(--mkt-hairline)',
                cursor: consentLoading ? 'not-allowed' : 'pointer',
                transition: 'background-color 200ms ease',
                flexShrink: 0,
                outline: 'none',
              }}
              onFocus={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 2px var(--mkt-ink)'
              }}
              onBlur={(e) => {
                ;(e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  top: '3px',
                  left: consent ? '23px' : '3px',
                  width: '18px',
                  height: '18px',
                  borderRadius: '9px',
                  backgroundColor: 'white',
                  transition: 'left 200ms ease',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </button>
            <span className="mkt-body-sm" style={{ color: 'var(--mkt-ink)', opacity: 0.75 }}>
              {consent ? '수신 동의 중' : '수신 거부'}
            </span>
          </div>
          {consentMsg && (
            <p
              className="mkt-body-sm"
              style={{ color: 'var(--mkt-ink)', opacity: 0.55, marginTop: 'var(--mkt-space-sm)' }}
            >
              {consentMsg}
            </p>
          )}
        </section>

        {/* ─── 회원 탈퇴 ────────────────────────────────────────────────────── */}
        <section
          style={{
            border: '1px solid #fecaca',
            borderRadius: 'var(--mkt-rounded-lg)',
            padding: 'var(--mkt-space-xl)',
            backgroundColor: '#fff5f5',
          }}
        >
          <h2
            className="mkt-headline"
            style={{ color: '#dc2626', marginBottom: 'var(--mkt-space-sm)' }}
          >
            회원 탈퇴
          </h2>
          <p
            className="mkt-body-sm"
            style={{
              color: 'var(--mkt-ink)',
              opacity: 0.65,
              marginBottom: 'var(--mkt-space-lg)',
            }}
          >
            탈퇴 즉시 모든 작품과 데이터에 접근할 수 없습니다. 30일 후 영구 삭제됩니다.
          </p>

          {/* 개인정보 파기 안내 (개인정보 보호법 / 전자상거래법) — 개인정보처리방침 §3 요약 */}
          <div
            role="note"
            aria-label="탈퇴 시 개인정보 파기 안내"
            style={{
              border: '1px solid var(--mkt-hairline)',
              borderRadius: 'var(--mkt-rounded-md)',
              backgroundColor: 'var(--mkt-canvas)',
              padding: 'var(--mkt-space-md) var(--mkt-space-lg)',
              marginBottom: 'var(--mkt-space-lg)',
            }}
          >
            <p
              className="mkt-body-sm"
              style={{
                color: 'var(--mkt-ink)',
                fontWeight: 540,
                marginBottom: 'var(--mkt-space-sm)',
              }}
            >
              탈퇴 시 개인정보 파기 안내
            </p>
            <p
              className="mkt-body-sm"
              style={{
                color: 'var(--mkt-ink)',
                opacity: 0.7,
                marginBottom: 'var(--mkt-space-sm)',
              }}
            >
              탈퇴 시 회원님의 개인정보는 「개인정보 보호법」에 따라 파기됩니다. 다만 관계 법령에
              따라 아래 정보는 일정 기간 보관 후 파기됩니다.
            </p>
            <ul
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--mkt-space-xs)',
                paddingLeft: 'var(--mkt-space-lg)',
                marginBottom: 'var(--mkt-space-sm)',
                listStyleType: 'disc',
              }}
            >
              {[
                '회원 계정 정보: 탈퇴 후 30일간 보관(분쟁 대비) 후 파기',
                '접속 로그: 3개월',
                '전자상거래 관련 기록(계약·결제 등): 5년 (전자상거래법)',
                '작품 데이터: 탈퇴 즉시 삭제',
              ].map((item) => (
                <li
                  key={item}
                  className="mkt-body-sm"
                  style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}
                >
                  {item}
                </li>
              ))}
            </ul>
            <a
              href="/legal/privacy"
              target="_blank"
              rel="noopener noreferrer"
              className="mkt-body-sm"
              style={{
                color: 'var(--mkt-ink)',
                fontWeight: 540,
                textDecoration: 'underline',
              }}
            >
              개인정보처리방침에서 자세히 보기
            </a>
          </div>

          <button
            type="button"
            onClick={openDeleteModal}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              height: '40px',
              padding: '0 var(--mkt-space-lg)',
              backgroundColor: 'transparent',
              border: '1px solid #dc2626',
              borderRadius: 'var(--mkt-rounded-md)',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 540,
              color: '#dc2626',
              cursor: 'pointer',
            }}
          >
            회원 탈퇴 신청
          </button>
        </section>
      </div>

      {/* ─── 탈퇴 모달 ────────────────────────────────────────────────────────── */}
      {showDeleteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 100,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 'var(--mkt-space-lg)',
          }}
        >
          {/* 백드롭 */}
          <div
            aria-hidden="true"
            onClick={closeDeleteModal}
            style={{
              position: 'absolute',
              inset: 0,
              backgroundColor: 'rgba(0,0,0,0.5)',
            }}
          />

          {/* 모달 박스 */}
          <div
            style={{
              position: 'relative',
              width: '100%',
              maxWidth: '480px',
              backgroundColor: 'var(--mkt-canvas)',
              borderRadius: 'var(--mkt-rounded-xl)',
              padding: 'var(--mkt-space-xxl)',
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--mkt-space-lg)',
            }}
          >
            {/* 닫기 버튼 */}
            <button
              type="button"
              onClick={closeDeleteModal}
              disabled={deleteLoading}
              aria-label="닫기"
              style={{
                position: 'absolute',
                top: 'var(--mkt-space-lg)',
                right: 'var(--mkt-space-lg)',
                width: '32px',
                height: '32px',
                border: 'none',
                background: 'transparent',
                cursor: deleteLoading ? 'not-allowed' : 'pointer',
                fontSize: '20px',
                color: 'var(--mkt-ink)',
                opacity: 0.45,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              &#x2715;
            </button>

            <div>
              <p
                className="mkt-caption"
                style={{ color: 'var(--mkt-ink)', opacity: 0.4, marginBottom: '4px' }}
              >
                {deleteStep === 1 ? '단계 1/2' : '단계 2/2'}
              </p>
              <h2
                id="delete-modal-title"
                className="mkt-headline"
                style={{ color: 'var(--mkt-ink)' }}
              >
                {deleteStep === 1 ? '정말 탈퇴하시겠습니까?' : '본인 확인'}
              </h2>
            </div>

            {/* Step 1: 안내 + 사유 선택 */}
            {deleteStep === 1 && (
              <form onSubmit={handleDeleteSubmit}>
                <div
                  style={{
                    backgroundColor: 'var(--mkt-surface-soft)',
                    borderRadius: 'var(--mkt-rounded-md)',
                    padding: 'var(--mkt-space-md) var(--mkt-space-lg)',
                    marginBottom: 'var(--mkt-space-lg)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--mkt-space-sm)',
                  }}
                >
                  {[
                    '탈퇴 즉시 모든 작품/데이터에 접근할 수 없습니다.',
                    '30일 후 영구 삭제됩니다. 그 전에는 관리자 문의로 복원 가능합니다.',
                    '구독 중이면 자동 해지됩니다.',
                  ].map((text) => (
                    <p
                      key={text}
                      className="mkt-body-sm"
                      style={{ color: 'var(--mkt-ink)', opacity: 0.7 }}
                    >
                      &#x2022; {text}
                    </p>
                  ))}
                </div>

                {/* 탈퇴 사유 */}
                <div style={{ marginBottom: 'var(--mkt-space-lg)' }}>
                  <label
                    htmlFor="delete-reason"
                    className="mkt-body-sm"
                    style={{
                      display: 'block',
                      color: 'var(--mkt-ink)',
                      marginBottom: 'var(--mkt-space-sm)',
                      fontWeight: 540,
                    }}
                  >
                    탈퇴 사유 (선택)
                  </label>
                  <select
                    id="delete-reason"
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value as DeletionReason | '')}
                    style={{
                      width: '100%',
                      height: '40px',
                      padding: '0 12px',
                      border: '1px solid var(--mkt-hairline)',
                      borderRadius: 'var(--mkt-rounded-md)',
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '14px',
                      backgroundColor: 'var(--mkt-canvas)',
                      color: 'var(--mkt-ink)',
                    }}
                  >
                    <option value="">-- 선택 안 함 --</option>
                    {DELETION_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div style={{ display: 'flex', gap: 'var(--mkt-space-md)' }}>
                  <button
                    type="button"
                    onClick={closeDeleteModal}
                    style={{
                      flex: 1,
                      height: '44px',
                      border: '1px solid var(--mkt-hairline)',
                      borderRadius: 'var(--mkt-rounded-md)',
                      backgroundColor: 'transparent',
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '14px',
                      fontWeight: 540,
                      color: 'var(--mkt-ink)',
                      cursor: 'pointer',
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="submit"
                    style={{
                      flex: 1,
                      height: '44px',
                      border: 'none',
                      borderRadius: 'var(--mkt-rounded-md)',
                      backgroundColor: '#dc2626',
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '14px',
                      fontWeight: 540,
                      color: 'white',
                      cursor: 'pointer',
                    }}
                  >
                    다음 단계
                  </button>
                </div>
              </form>
            )}

            {/* Step 2: 본인 확인 */}
            {deleteStep === 2 && (
              <form onSubmit={handleDeleteSubmit}>
                <p
                  className="mkt-body-sm"
                  style={{
                    color: 'var(--mkt-ink)',
                    opacity: 0.65,
                    marginBottom: 'var(--mkt-space-lg)',
                  }}
                >
                  본인 확인을 위해 이메일과 비밀번호를 입력해주세요.
                </p>

                {deleteError && (
                  <div
                    role="alert"
                    style={{
                      backgroundColor: '#fef2f2',
                      border: '1px solid #fecaca',
                      borderRadius: 'var(--mkt-rounded-md)',
                      padding: 'var(--mkt-space-md)',
                      marginBottom: 'var(--mkt-space-md)',
                    }}
                  >
                    <p className="mkt-body-sm" style={{ color: '#dc2626' }}>
                      {deleteError}
                    </p>
                  </div>
                )}

                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 'var(--mkt-space-md)',
                    marginBottom: 'var(--mkt-space-lg)',
                  }}
                >
                  <div>
                    <label
                      htmlFor="delete-email"
                      className="mkt-body-sm"
                      style={{
                        display: 'block',
                        color: 'var(--mkt-ink)',
                        marginBottom: '6px',
                        fontWeight: 540,
                      }}
                    >
                      이메일
                    </label>
                    <input
                      id="delete-email"
                      type="email"
                      required
                      autoComplete="email"
                      value={deleteEmail}
                      onChange={(e) => setDeleteEmail(e.target.value)}
                      placeholder={email}
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        border: '1px solid var(--mkt-hairline)',
                        borderRadius: 'var(--mkt-rounded-md)',
                        fontFamily: 'var(--mkt-font-sans)',
                        fontSize: '14px',
                        backgroundColor: 'var(--mkt-canvas)',
                        color: 'var(--mkt-ink)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="delete-password"
                      className="mkt-body-sm"
                      style={{
                        display: 'block',
                        color: 'var(--mkt-ink)',
                        marginBottom: '6px',
                        fontWeight: 540,
                      }}
                    >
                      비밀번호
                    </label>
                    <input
                      id="delete-password"
                      type="password"
                      required
                      autoComplete="current-password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      style={{
                        width: '100%',
                        height: '40px',
                        padding: '0 12px',
                        border: '1px solid var(--mkt-hairline)',
                        borderRadius: 'var(--mkt-rounded-md)',
                        fontFamily: 'var(--mkt-font-sans)',
                        fontSize: '14px',
                        backgroundColor: 'var(--mkt-canvas)',
                        color: 'var(--mkt-ink)',
                        boxSizing: 'border-box',
                      }}
                    />
                  </div>
                </div>

                <div style={{ display: 'flex', gap: 'var(--mkt-space-md)' }}>
                  <button
                    type="button"
                    onClick={() => setDeleteStep(1)}
                    disabled={deleteLoading}
                    style={{
                      flex: 1,
                      height: '44px',
                      border: '1px solid var(--mkt-hairline)',
                      borderRadius: 'var(--mkt-rounded-md)',
                      backgroundColor: 'transparent',
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '14px',
                      fontWeight: 540,
                      color: 'var(--mkt-ink)',
                      cursor: deleteLoading ? 'not-allowed' : 'pointer',
                      opacity: deleteLoading ? 0.5 : 1,
                    }}
                  >
                    이전
                  </button>
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    style={{
                      flex: 1,
                      height: '44px',
                      border: 'none',
                      borderRadius: 'var(--mkt-rounded-md)',
                      backgroundColor: '#dc2626',
                      fontFamily: 'var(--mkt-font-sans)',
                      fontSize: '14px',
                      fontWeight: 540,
                      color: 'white',
                      cursor: deleteLoading ? 'not-allowed' : 'pointer',
                      opacity: deleteLoading ? 0.7 : 1,
                    }}
                  >
                    {deleteLoading ? '처리 중...' : '탈퇴 확정'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
