'use client'

/**
 * ContestSeasonForm — 공모전 시즌 생성/수정 폼
 */
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { z } from 'zod'

const FormSchema = z.object({
  name: z.string().min(1, '시즌 이름을 입력해주세요').max(200),
  opensAt: z.string().min(1, '시작일을 설정해주세요'),
  closesAt: z.string().min(1, '종료일을 설정해주세요'),
  resultsAt: z.string().optional(),
  rules: z.string().min(1, '공모전 규정을 입력해주세요'),
})

type FormValues = z.infer<typeof FormSchema>

function toLocalDatetimeStr(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

interface ContestSeasonFormProps {
  mode: 'create' | 'edit'
  seasonId?: string
  initialValues?: Partial<{
    name: string
    opensAt: Date
    closesAt: Date
    resultsAt: Date | null
    rules: string
  }>
}

export function ContestSeasonForm({ mode, seasonId, initialValues }: ContestSeasonFormProps) {
  const router = useRouter()
  const [values, setValues] = React.useState<FormValues>({
    name: initialValues?.name ?? '',
    opensAt: initialValues?.opensAt ? toLocalDatetimeStr(initialValues.opensAt) : '',
    closesAt: initialValues?.closesAt ? toLocalDatetimeStr(initialValues.closesAt) : '',
    resultsAt: initialValues?.resultsAt ? toLocalDatetimeStr(initialValues.resultsAt) : '',
    rules: initialValues?.rules ?? '',
  })
  const [errors, setErrors] = React.useState<Partial<Record<keyof FormValues, string>>>({})
  const [serverError, setServerError] = React.useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const handleChange = (k: keyof FormValues, v: string) => {
    setValues((prev) => ({ ...prev, [k]: v }))
    setErrors((prev) => ({ ...prev, [k]: undefined }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const parsed = FormSchema.safeParse(values)
    if (!parsed.success) {
      const fieldErrors: Partial<Record<keyof FormValues, string>> = {}
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormValues
        if (key) fieldErrors[key] = issue.message
      }
      setErrors(fieldErrors)
      return
    }

    setServerError(null)
    setIsSubmitting(true)

    const url = mode === 'create' ? '/api/admin/contests' : `/api/admin/contests/${seasonId ?? ''}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...parsed.data,
          opensAt: new Date(parsed.data.opensAt).toISOString(),
          closesAt: new Date(parsed.data.closesAt).toISOString(),
          resultsAt: parsed.data.resultsAt ? new Date(parsed.data.resultsAt).toISOString() : null,
        }),
      })
      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setServerError(json.error ?? '오류가 발생했습니다.')
        return
      }
      router.push('/contests')
      router.refresh()
    } catch {
      setServerError('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const fieldStyle: React.CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '20px',
  }
  const labelStyle: React.CSSProperties = {
    fontFamily: 'var(--nike-font-text)',
    fontSize: '12px',
    fontWeight: 500,
    color: 'var(--nike-stone)',
    textTransform: 'uppercase',
    letterSpacing: '0.4px',
  }
  const inputStyle: React.CSSProperties = {
    fontFamily: 'var(--nike-font-text)',
    fontSize: '14px',
    color: 'var(--nike-ink)',
    backgroundColor: 'var(--nike-canvas)',
    border: '1px solid var(--nike-hairline-soft)',
    borderRadius: '6px',
    padding: '9px 12px',
    width: '100%',
    boxSizing: 'border-box',
    outline: 'none',
  }
  const errorStyle: React.CSSProperties = {
    fontFamily: 'var(--nike-font-text)',
    fontSize: '11px',
    color: 'var(--nike-sale)',
  }

  return (
    <form onSubmit={handleSubmit} noValidate style={{ maxWidth: '720px' }}>
      <div style={fieldStyle}>
        <label style={labelStyle}>시즌 이름 *</label>
        <input
          type="text"
          value={values.name}
          onChange={(e) => handleChange('name', e.target.value)}
          style={inputStyle}
        />
        {errors.name && <span style={errorStyle}>{errors.name}</span>}
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '16px',
          marginBottom: '20px',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>시작일시 *</label>
          <input
            type="datetime-local"
            value={values.opensAt}
            onChange={(e) => handleChange('opensAt', e.target.value)}
            style={inputStyle}
          />
          {errors.opensAt && <span style={errorStyle}>{errors.opensAt}</span>}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label style={labelStyle}>종료일시 *</label>
          <input
            type="datetime-local"
            value={values.closesAt}
            onChange={(e) => handleChange('closesAt', e.target.value)}
            style={inputStyle}
          />
          {errors.closesAt && <span style={errorStyle}>{errors.closesAt}</span>}
        </div>
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>결과 발표일시 (선택)</label>
        <input
          type="datetime-local"
          value={values.resultsAt ?? ''}
          onChange={(e) => handleChange('resultsAt', e.target.value)}
          style={inputStyle}
        />
      </div>
      <div style={fieldStyle}>
        <label style={labelStyle}>공모전 규정 *</label>
        <textarea
          value={values.rules}
          onChange={(e) => handleChange('rules', e.target.value)}
          style={{ ...inputStyle, resize: 'vertical', minHeight: '200px' }}
        />
        {errors.rules && <span style={errorStyle}>{errors.rules}</span>}
      </div>

      {serverError && (
        <div
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-sale)',
            marginBottom: '16px',
            padding: '8px 12px',
            backgroundColor: '#fff3f3',
            borderRadius: '4px',
          }}
          role="alert"
        >
          {serverError}
        </div>
      )}

      <div style={{ display: 'flex', gap: '12px' }}>
        <button
          type="submit"
          disabled={isSubmitting}
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            fontWeight: 500,
            color: 'var(--nike-canvas)',
            backgroundColor: 'var(--nike-ink)',
            border: 'none',
            borderRadius: '6px',
            padding: '9px 20px',
            cursor: isSubmitting ? 'wait' : 'pointer',
            opacity: isSubmitting ? 0.6 : 1,
          }}
        >
          {isSubmitting ? '저장 중...' : mode === 'create' ? '시즌 등록' : '수정 완료'}
        </button>
        <button
          type="button"
          onClick={() => router.back()}
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-stone)',
            backgroundColor: 'transparent',
            border: '1px solid var(--nike-hairline-soft)',
            borderRadius: '6px',
            padding: '9px 20px',
            cursor: 'pointer',
          }}
        >
          취소
        </button>
      </div>
    </form>
  )
}
