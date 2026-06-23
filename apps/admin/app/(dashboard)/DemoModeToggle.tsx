'use client'

/**
 * DemoModeToggle — 데모 모드 런타임 토글 (대시보드).
 *
 * ON 이면 web 의 /editor + 포즈검색이 로그인 없이 익명 허용된다(인증 우회 시연).
 * 반영까지 web 캐시 TTL(~30초). 시연 후 반드시 OFF.
 * GET/PATCH /api/admin/demo-mode (curator+).
 */
import * as React from 'react'

type State = 'loading' | 'idle' | 'saving' | 'error'

export function DemoModeToggle() {
  const [enabled, setEnabled] = React.useState(false)
  const [state, setState] = React.useState<State>('loading')
  const [msg, setMsg] = React.useState<string | null>(null)

  React.useEffect(() => {
    let alive = true
    fetch('/api/admin/demo-mode')
      .then((r) => r.json())
      .then((d: { enabled?: boolean }) => {
        if (!alive) return
        setEnabled(d.enabled === true)
        setState('idle')
      })
      .catch(() => alive && setState('error'))
    return () => {
      alive = false
    }
  }, [])

  async function toggle() {
    const next = !enabled
    if (
      next &&
      !window.confirm(
        '데모 모드를 켜면 /editor 와 포즈검색이 로그인 없이 누구나 접근 가능해집니다. 시연 후 반드시 끄세요. 계속할까요?',
      )
    ) {
      return
    }
    setState('saving')
    setMsg(null)
    try {
      const res = await fetch('/api/admin/demo-mode', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled: next }),
      })
      const data: { enabled?: boolean; error?: { message?: string } } = await res
        .json()
        .catch(() => ({}))
      if (!res.ok) {
        setState('error')
        setMsg(data.error?.message ?? '토글에 실패했습니다.')
        return
      }
      setEnabled(data.enabled === true)
      setState('idle')
      setMsg(next ? '데모 모드 ON — web 반영까지 최대 ~30초. 시연 후 꺼주세요.' : '데모 모드 OFF.')
    } catch {
      setState('error')
      setMsg('네트워크 오류로 토글에 실패했습니다.')
    }
  }

  const on = enabled
  return (
    <section
      aria-label="데모 모드"
      style={{
        marginBottom: '40px',
        borderRadius: '12px',
        padding: '20px 24px',
        border: `1px solid ${on ? 'var(--nike-sale)' : 'var(--nike-hairline-soft)'}`,
        backgroundColor: on ? 'var(--nike-card-pink)' : 'var(--nike-canvas)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
        <span className="nike-heading-md">
          데모 모드 {state === 'loading' ? '' : on ? '· ON' : '· OFF'}
        </span>
        <span className="nike-caption-md" style={{ color: 'var(--nike-mute)' }}>
          켜면 로그인 없이 /editor·포즈검색 익명 허용(시연용). 시연 후 반드시 OFF.
        </span>
        {msg && (
          <span
            role="status"
            className="nike-caption-sm"
            style={{
              color: state === 'error' ? 'var(--nike-sale)' : 'var(--nike-ink)',
              marginTop: '2px',
            }}
          >
            {msg}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={toggle}
        disabled={state === 'loading' || state === 'saving'}
        className={on ? 'nike-btn-secondary' : 'nike-btn-primary'}
        style={{ flexShrink: 0, opacity: state === 'saving' ? 0.6 : 1 }}
      >
        {state === 'saving' ? '저장 중…' : on ? '데모 모드 끄기' : '데모 모드 켜기'}
      </button>
    </section>
  )
}
