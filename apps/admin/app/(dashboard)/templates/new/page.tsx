'use client'

/**
 * (dashboard)/templates/new/page.tsx — 새 템플릿 생성
 *
 * 1단계: Format 선택 + 이름 입력
 * 저장 → /templates/[id] 로 이동
 */

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

export default function NewTemplatePage() {
  const router = useRouter()
  const [formats, setFormats] = React.useState<{ id: string; name: string }[]>([])
  const [formatId, setFormatId] = React.useState('')
  const [name, setName] = React.useState('')
  const [isLoading, setIsLoading] = React.useState(false)
  const [error, setError] = React.useState('')

  React.useEffect(() => {
    fetch('/api/formats')
      .then((r) => r.json())
      .then((body: { data?: { id: string; name: string }[] }) => {
        setFormats(body.data ?? [])
        if (body.data && body.data.length > 0 && body.data[0]) {
          setFormatId(body.data[0].id)
        }
      })
      .catch(() => setError('판형 목록을 불러오지 못했습니다.'))
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formatId) {
      setError('판형을 선택해주세요.')
      return
    }
    if (name.length < 2) {
      setError('이름은 2자 이상 입력해주세요.')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, formatId, slots: [], fabricJson: {}, status: 'draft' }),
      })

      if (res.status === 201) {
        const template = (await res.json()) as { id: string }
        router.push(`/templates/${template.id}`)
        return
      }

      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      setError(json.error?.message ?? '생성 중 오류가 발생했습니다.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="p-6 lg:p-10 max-w-lg" style={{ fontFamily: 'var(--mkt-font-sans)' }}>
      <Link
        href="/templates"
        className="mb-6 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '14px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.5,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        템플릿 목록
      </Link>

      <p
        style={{
          fontFamily: 'var(--mkt-font-mono)',
          fontSize: '11px',
          fontWeight: 400,
          letterSpacing: '0.6px',
          textTransform: 'uppercase',
          color: 'var(--mkt-ink)',
          opacity: 0.4,
          marginBottom: '6px',
        }}
      >
        Admin / 템플릿 / 새 등록
      </p>
      <h1
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: 'clamp(24px, 3.5vw, 32px)',
          fontWeight: 340,
          lineHeight: 1.1,
          letterSpacing: '-0.96px',
          color: 'var(--mkt-ink)',
          marginBottom: '6px',
        }}
      >
        새 템플릿 만들기
      </h1>
      <p
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '15px',
          fontWeight: 330,
          color: 'var(--mkt-ink)',
          opacity: 0.55,
          marginBottom: '32px',
        }}
      >
        판형을 선택하고 이름을 입력한 뒤 저장하면 슬롯 편집 화면으로 이동합니다.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5">
        {/* 판형 선택 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-format"
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.55,
            }}
          >
            판형 선택 <span aria-hidden="true">*</span>
          </label>
          <select
            id="template-format"
            value={formatId}
            onChange={(e) => setFormatId(e.target.value)}
            required
            style={{
              height: '44px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-canvas)',
              padding: '0 12px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              outline: 'none',
            }}
          >
            <option value="">판형을 선택하세요</option>
            {formats.map((f) => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
          {formats.length === 0 && (
            <p
              style={{
                fontFamily: 'var(--mkt-font-sans)',
                fontSize: '12px',
                color: 'var(--mkt-ink)',
                opacity: 0.55,
              }}
            >
              판형이 없습니다.{' '}
              <Link href="/formats/new" style={{ textDecoration: 'underline' }}>
                판형을 먼저 등록하세요
              </Link>
            </p>
          )}
        </div>

        {/* 이름 입력 */}
        <div className="flex flex-col gap-1.5">
          <label
            htmlFor="template-name"
            style={{
              fontFamily: 'var(--mkt-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--mkt-ink)',
              opacity: 0.55,
            }}
          >
            템플릿 이름 <span aria-hidden="true">*</span>
          </label>
          <input
            id="template-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            minLength={2}
            maxLength={50}
            placeholder="예: 기본 2컷 레이아웃"
            autoFocus
            style={{
              height: '44px',
              borderRadius: 'var(--mkt-rounded-md)',
              border: '1px solid var(--mkt-hairline)',
              backgroundColor: 'var(--mkt-canvas)',
              padding: '0 12px',
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '14px',
              fontWeight: 330,
              color: 'var(--mkt-ink)',
              outline: 'none',
            }}
          />
        </div>

        {/* 에러 */}
        {error && (
          <p
            role="alert"
            style={{
              fontFamily: 'var(--mkt-font-sans)',
              fontSize: '13px',
              color: 'var(--mkt-ink)',
              backgroundColor: 'var(--mkt-block-pink)',
              borderRadius: 'var(--mkt-rounded-md)',
              padding: '10px 14px',
            }}
          >
            {error}
          </p>
        )}

        {/* 버튼 */}
        <div className="flex items-center gap-3">
          <button type="submit" disabled={isLoading} className="mkt-btn-primary">
            {isLoading ? '생성 중...' : '템플릿 만들기 및 슬롯 편집'}
          </button>
          <Link href="/templates" className="mkt-btn-secondary">
            취소
          </Link>
        </div>
      </form>
    </div>
  )
}
