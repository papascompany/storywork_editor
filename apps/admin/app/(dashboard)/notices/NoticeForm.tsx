'use client'

/**
 * NoticeForm — 공지사항 생성/수정 폼 (클라이언트 컴포넌트)
 */
import { zodResolver } from '@hookform/resolvers/zod'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { useForm } from 'react-hook-form'
import { z } from 'zod'

const NoticeFormSchema = z.object({
  title: z.string().min(1, '제목을 입력해주세요').max(200),
  body: z.string().min(1, '내용을 입력해주세요'),
  isPinned: z.boolean(),
  publish: z.boolean(), // true = 즉시 게시, false = draft
})
type NoticeFormValues = z.infer<typeof NoticeFormSchema>

interface NoticeFormProps {
  initialValues?: Partial<NoticeFormValues>
  noticeId?: string
  mode: 'create' | 'edit'
}

export function NoticeForm({ initialValues, noticeId, mode }: NoticeFormProps) {
  const router = useRouter()
  const [serverError, setServerError] = React.useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NoticeFormValues>({
    resolver: zodResolver(NoticeFormSchema),
    defaultValues: {
      title: initialValues?.title ?? '',
      body: initialValues?.body ?? '',
      isPinned: initialValues?.isPinned ?? false,
      publish: initialValues?.publish ?? false,
    },
  })

  const onSubmit = async (data: NoticeFormValues) => {
    setServerError(null)
    const url = mode === 'create' ? '/api/admin/notices' : `/api/admin/notices/${noticeId ?? ''}`
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

      router.push('/notices')
      router.refresh()
    } catch {
      setServerError('네트워크 오류가 발생했습니다.')
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
    <form onSubmit={handleSubmit(onSubmit)} noValidate style={{ maxWidth: '720px' }}>
      {/* 제목 */}
      <div style={fieldStyle}>
        <label htmlFor="notice-title" style={labelStyle}>
          제목 *
        </label>
        <input id="notice-title" type="text" style={inputStyle} {...register('title')} />
        {errors.title && <span style={errorStyle}>{errors.title.message}</span>}
      </div>

      {/* 본문 */}
      <div style={fieldStyle}>
        <label htmlFor="notice-body" style={labelStyle}>
          내용 *
        </label>
        <textarea
          id="notice-body"
          style={{ ...inputStyle, resize: 'vertical', minHeight: '240px' }}
          {...register('body')}
        />
        {errors.body && <span style={errorStyle}>{errors.body.message}</span>}
      </div>

      {/* 옵션 */}
      <div
        style={{
          display: 'flex',
          gap: '24px',
          marginBottom: '24px',
          flexWrap: 'wrap',
        }}
      >
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-ink)',
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" {...register('isPinned')} />핀 고정 (최상단 노출)
        </label>
        <label
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-ink)',
            cursor: 'pointer',
          }}
        >
          <input type="checkbox" {...register('publish')} />
          즉시 게시 (미체크 시 초안)
        </label>
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
          {isSubmitting ? '저장 중...' : mode === 'create' ? '공지 작성' : '수정 완료'}
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
