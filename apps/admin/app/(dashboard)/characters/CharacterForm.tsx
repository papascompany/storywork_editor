'use client'

/**
 * CharacterForm — 캐릭터 생성/수정 폼 (클라이언트 컴포넌트)
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const CharacterFormSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요').max(80),
  description: z.string().max(1000).optional(),
  bodyType: z.string().min(1, '신체 유형을 선택해주세요'),
  styleTag: z.string().max(100).optional(),
  ownerType: z.enum(['system', 'creator']),
  status: z.enum(['draft', 'review', 'published', 'rejected']),
})
type CharacterFormValues = z.infer<typeof CharacterFormSchema>

interface CharacterFormProps {
  initialValues?: Partial<CharacterFormValues>
  characterId?: string
  mode: 'create' | 'edit'
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

export function CharacterForm({ initialValues, characterId, mode }: CharacterFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<CharacterFormValues>({
    resolver: zodResolver(CharacterFormSchema),
    defaultValues: {
      name: initialValues?.name ?? '',
      description: initialValues?.description ?? '',
      bodyType: initialValues?.bodyType ?? 'M',
      styleTag: initialValues?.styleTag ?? '',
      ownerType: initialValues?.ownerType ?? 'system',
      status: initialValues?.status ?? 'draft',
    },
  })

  const onSubmit = async (data: CharacterFormValues) => {
    setServerError(null)
    const url =
      mode === 'create' ? '/api/admin/characters' : `/api/admin/characters/${characterId ?? ''}`
    const method = mode === 'create' ? 'POST' : 'PATCH'

    try {
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const json = (await res.json()) as { error?: string }
        setServerError(json.error ?? '오류가 발생했습니다.')
        return
      }

      router.push('/characters')
      router.refresh()
    } catch {
      setServerError('네트워크 오류가 발생했습니다.')
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ maxWidth: '720px' }}>
      {/* 이름 */}
      <div style={fieldStyle}>
        <label htmlFor="char-name" style={labelStyle}>
          이름 *
        </label>
        <input id="char-name" type="text" style={inputStyle} {...register('name')} />
        {errors.name && <span style={errorStyle}>{errors.name.message}</span>}
      </div>

      {/* 신체 유형 */}
      <div style={fieldStyle}>
        <label htmlFor="char-bodyType" style={labelStyle}>
          신체 유형 *
        </label>
        <select id="char-bodyType" style={inputStyle} {...register('bodyType')}>
          <option value="M">남성 (M)</option>
          <option value="F">여성 (F)</option>
          <option value="child">어린이 (child)</option>
          <option value="beast">수인 (beast)</option>
        </select>
        {errors.bodyType && <span style={errorStyle}>{errors.bodyType.message}</span>}
      </div>

      {/* 소유 유형 */}
      <div style={fieldStyle}>
        <label htmlFor="char-ownerType" style={labelStyle}>
          소유 유형
        </label>
        <select id="char-ownerType" style={inputStyle} {...register('ownerType')}>
          <option value="system">시스템 (system)</option>
          <option value="creator">크리에이터 (creator)</option>
        </select>
      </div>

      {/* 스타일 태그 */}
      <div style={fieldStyle}>
        <label htmlFor="char-styleTag" style={labelStyle}>
          스타일 태그
        </label>
        <input
          id="char-styleTag"
          type="text"
          placeholder="예: 흑백 스케치, 수채화"
          style={inputStyle}
          {...register('styleTag')}
        />
      </div>

      {/* 설명 */}
      <div style={fieldStyle}>
        <label htmlFor="char-description" style={labelStyle}>
          설명
        </label>
        <textarea
          id="char-description"
          style={{ ...inputStyle, resize: 'vertical', minHeight: '100px' }}
          {...register('description')}
        />
      </div>

      {/* 상태 */}
      <div style={fieldStyle}>
        <label htmlFor="char-status" style={labelStyle}>
          상태
        </label>
        <select id="char-status" style={inputStyle} {...register('status')}>
          <option value="draft">초안 (draft)</option>
          <option value="review">검수중 (review)</option>
          <option value="published">게시됨 (published)</option>
          <option value="rejected">거절됨 (rejected)</option>
        </select>
      </div>

      {/* 서버 오류 */}
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

      {/* 버튼 */}
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
          {isSubmitting ? '저장 중...' : mode === 'create' ? '캐릭터 생성' : '수정 완료'}
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
