'use client'

/**
 * EntityForm — Zod 스키마 → 자동 폼 컴포넌트
 *
 * react-hook-form + @hookform/resolvers/zod 기반.
 * Zod 타입으로부터 위젯 자동 추론 + fieldMeta 오버라이드 지원.
 * 더티 가드: unsaved 변경 시 beforeunload + router 이탈 confirm.
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Input, cn } from '@storywork/ui'
import * as React from 'react'
import { Controller, useForm, type DefaultValues } from 'react-hook-form'
import type { z } from 'zod'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export type WidgetType =
  | 'input'
  | 'textarea'
  | 'number'
  | 'select'
  | 'switch'
  | 'checkbox'
  | 'colorPicker'
  | 'date'
  | 'tags'

export interface FieldMeta {
  label?: string
  helpText?: string
  widget?: WidgetType
  options?: { value: string; label: string }[]
  placeholder?: string
  autoFocus?: boolean
}

export interface EntityFormProps<TSchema extends z.ZodObject<z.ZodRawShape>> {
  schema: TSchema
  defaultValues?: DefaultValues<z.input<TSchema>>
  /** 필드 메타 — label/helpText/widget 힌트 */
  fieldMeta?: Partial<Record<string & keyof z.input<TSchema>, FieldMeta>>
  onSubmit: (values: z.output<TSchema>) => Promise<void> | void
  /** 서버 에러 매핑 (key=fieldName, value=메시지) */
  serverErrors?: Record<string, string>
  submitLabel?: string
  onCancel?: () => void
  /** 더티 가드: true 면 unsavedChanges 시 router 이탈 시 confirm */
  dirtyGuard?: boolean
  className?: string
}

// ─── Zod v4 내부 타입 헬퍼 ──────────────────────────────────────────────────
// Zod v4는 _def.type (string/number/boolean/enum/array 등) 을 사용.
// _def.innerType 로 Optional/Nullable 언래핑 가능.
// checks는 _def.checks[] 이며 각 check._zod.def.check / _zod.def.minimum 으로 접근.

type AnyZodDef = {
  type?: string
  innerType?: z.ZodTypeAny
  checks?: Array<{ _zod?: { def?: { check?: string; minimum?: number } } }>
}

function unwrapZodType(zodType: z.ZodTypeAny): z.ZodTypeAny {
  const def = zodType._def as AnyZodDef
  if (def.type === 'optional' || def.type === 'nullable') {
    return unwrapZodType(def.innerType ?? zodType)
  }
  return zodType
}

// ─── 위젯 추론 ────────────────────────────────────────────────────────────────

/** @internal — 단독 export 는 테스트용 */
export function inferWidget(zodType: z.ZodTypeAny, meta?: FieldMeta): WidgetType {
  if (meta?.widget) return meta.widget

  const t = unwrapZodType(zodType)
  const def = t._def as AnyZodDef
  const typeName = def.type ?? ''

  if (typeName === 'boolean') return 'switch'
  if (typeName === 'number') return 'number'
  if (typeName === 'enum') return 'select'
  if (typeName === 'array') return 'tags'
  if (typeName === 'string') {
    // Zod v4: checks[].${_zod.def.check === 'min_length'} && _zod.def.minimum >= 50
    const checks = def.checks ?? []
    const hasLongMin = checks.some((c) => {
      const checkDef = c._zod?.def
      return checkDef?.check === 'min_length' && (checkDef?.minimum ?? 0) >= 50
    })
    return hasLongMin ? 'textarea' : 'input'
  }
  return 'input'
}

// ─── 개별 필드 위젯 ──────────────────────────────────────────────────────────

interface FieldWidgetProps {
  name: string
  widget: WidgetType
  meta: FieldMeta
  // react-hook-form controller field props
  value: unknown
  onChange: (val: unknown) => void
  onBlur: () => void
  error?: string
  autoFocus?: boolean
}

function FieldWidget({
  name,
  widget,
  meta,
  value,
  onChange,
  onBlur,
  error,
  autoFocus,
}: FieldWidgetProps) {
  const fieldId = `field-${name}`
  const descId = (error ?? meta.helpText) ? `${fieldId}-desc` : undefined
  const label = meta.label ?? name
  const placeholder = meta.placeholder ?? ''

  const commonInputProps = {
    id: fieldId,
    'aria-describedby': descId,
    'aria-invalid': error ? ('true' as const) : undefined,
    autoFocus,
    onBlur,
    placeholder,
  }

  if (widget === 'switch' || widget === 'checkbox') {
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-3 min-h-[2.75rem]">
          {/* 스위치 토글 */}
          <button
            type="button"
            role="switch"
            id={fieldId}
            aria-checked={Boolean(value)}
            aria-label={label}
            aria-describedby={descId}
            onBlur={onBlur}
            onClick={() => onChange(!value)}
            className={cn(
              'relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full',
              'border-2 border-transparent transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2',
              'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
              'focus-visible:ring-offset-[var(--color-surface)]',
              value ? 'bg-[var(--color-brand-500)]' : 'bg-[var(--color-surface-muted)]',
            )}
          >
            <span
              aria-hidden="true"
              className={cn(
                'pointer-events-none inline-block size-5 rounded-full',
                'bg-white shadow-sm ring-0',
                'transition-transform duration-[var(--duration-fast)]',
                value ? 'translate-x-5' : 'translate-x-0',
              )}
            />
          </button>
          <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-text)]">
            {label}
          </label>
        </div>
        {(error ?? meta.helpText) && (
          <p
            id={descId}
            role={error ? 'alert' : undefined}
            className={cn(
              'text-xs',
              error ? 'text-[var(--color-error-500)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            {error ?? meta.helpText}
          </p>
        )}
      </div>
    )
  }

  if (widget === 'textarea') {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        <textarea
          {...commonInputProps}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          className={cn(
            'flex w-full min-h-[7rem]',
            'rounded-[var(--radius-md)] border bg-[var(--color-surface)]',
            'px-3 py-2 text-base text-[var(--color-text)]',
            'placeholder:text-[var(--color-text-disabled)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-[var(--color-surface)]',
            'disabled:cursor-not-allowed disabled:opacity-50 resize-y',
            error
              ? 'border-[var(--color-error-500)] focus-visible:ring-[var(--color-error-500)]'
              : 'border-[var(--color-border)]',
          )}
        />
        {(error ?? meta.helpText) && (
          <p
            id={descId}
            role={error ? 'alert' : undefined}
            className={cn(
              'text-xs',
              error ? 'text-[var(--color-error-500)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            {error ?? meta.helpText}
          </p>
        )}
      </div>
    )
  }

  if (widget === 'select') {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        <select
          {...commonInputProps}
          value={String(value ?? '')}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'flex w-full h-11',
            'rounded-[var(--radius-md)] border bg-[var(--color-surface)]',
            'px-3 py-2 text-base text-[var(--color-text)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            'focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-[var(--color-surface)]',
            'disabled:cursor-not-allowed disabled:opacity-50',
            error
              ? 'border-[var(--color-error-500)] focus-visible:ring-[var(--color-error-500)]'
              : 'border-[var(--color-border)]',
          )}
        >
          {!value && <option value="">선택하세요</option>}
          {(meta.options ?? []).map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {(error ?? meta.helpText) && (
          <p
            id={descId}
            role={error ? 'alert' : undefined}
            className={cn(
              'text-xs',
              error ? 'text-[var(--color-error-500)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            {error ?? meta.helpText}
          </p>
        )}
      </div>
    )
  }

  if (widget === 'tags') {
    const tags: string[] = Array.isArray(value) ? (value as string[]) : []
    const [inputVal, setInputVal] = React.useState('')

    const addTag = (tag: string) => {
      const trimmed = tag.trim()
      if (trimmed && !tags.includes(trimmed)) {
        onChange([...tags, trimmed])
      }
      setInputVal('')
    }

    const removeTag = (tag: string) => {
      onChange(tags.filter((t) => t !== tag))
    }

    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        <div
          className={cn(
            'flex flex-wrap gap-1.5 min-h-[2.75rem]',
            'rounded-[var(--radius-md)] border bg-[var(--color-surface)]',
            'px-3 py-2',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-within:ring-2 focus-within:ring-offset-2',
            'focus-within:ring-[var(--color-brand-500)] focus-within:ring-offset-[var(--color-surface)]',
            error ? 'border-[var(--color-error-500)]' : 'border-[var(--color-border)]',
          )}
        >
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                aria-label={`태그 ${tag} 삭제`}
                className="text-[var(--color-brand-500)] hover:text-[var(--color-brand-700)] focus-visible:outline-none"
              >
                ×
              </button>
            </span>
          ))}
          <input
            id={fieldId}
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onBlur={() => {
              if (inputVal.trim()) addTag(inputVal)
              onBlur()
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ',') {
                e.preventDefault()
                addTag(inputVal)
              } else if (e.key === 'Backspace' && !inputVal && tags.length > 0) {
                const lastTag = tags[tags.length - 1]
                if (lastTag) removeTag(lastTag)
              }
            }}
            placeholder={tags.length === 0 ? placeholder || '태그 입력 후 Enter' : ''}
            className="flex-1 min-w-[4rem] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus:outline-none"
          />
        </div>
        {(error ?? meta.helpText) && (
          <p
            id={descId}
            role={error ? 'alert' : undefined}
            className={cn(
              'text-xs',
              error ? 'text-[var(--color-error-500)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            {error ?? meta.helpText}
          </p>
        )}
      </div>
    )
  }

  if (widget === 'colorPicker') {
    return (
      <div className="flex flex-col gap-1.5">
        <label htmlFor={fieldId} className="text-sm font-medium text-[var(--color-text)]">
          {label}
        </label>
        <div className="flex items-center gap-3">
          <input
            {...commonInputProps}
            type="color"
            value={String(value ?? '#000000')}
            onChange={(e) => onChange(e.target.value)}
            className={cn(
              'h-11 w-20 rounded-[var(--radius-md)] border cursor-pointer',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
              error ? 'border-[var(--color-error-500)]' : 'border-[var(--color-border)]',
            )}
          />
          <span className="text-sm text-[var(--color-text-muted)]">{String(value ?? '')}</span>
        </div>
        {(error ?? meta.helpText) && (
          <p
            id={descId}
            role={error ? 'alert' : undefined}
            className={cn(
              'text-xs',
              error ? 'text-[var(--color-error-500)]' : 'text-[var(--color-text-muted)]',
            )}
          >
            {error ?? meta.helpText}
          </p>
        )}
      </div>
    )
  }

  if (widget === 'date') {
    return (
      <Input
        {...commonInputProps}
        type="date"
        label={label}
        helperText={error ? undefined : meta.helpText}
        errorText={error}
        variant={error ? 'error' : 'default'}
        value={String(value ?? '')}
        onChange={(e) => onChange(e.target.value)}
      />
    )
  }

  // number / input (default)
  return (
    <Input
      {...commonInputProps}
      type={widget === 'number' ? 'number' : 'text'}
      label={label}
      helperText={error ? undefined : meta.helpText}
      errorText={error}
      variant={error ? 'error' : 'default'}
      value={String(value ?? '')}
      onChange={(e) =>
        onChange(widget === 'number' ? e.target.valueAsNumber || '' : e.target.value)
      }
    />
  )
}

// ─── EntityForm 본체 ─────────────────────────────────────────────────────────

export function EntityForm<TSchema extends z.ZodObject<z.ZodRawShape>>({
  schema,
  defaultValues,
  fieldMeta,
  onSubmit,
  serverErrors,
  submitLabel = '저장',
  onCancel,
  dirtyGuard = false,
  className,
}: EntityFormProps<TSchema>) {
  type TInput = z.input<TSchema>
  type TOutput = z.output<TSchema>

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
  } = (useForm as (opts: Record<string, unknown>) => ReturnType<typeof useForm<TInput>>)({
    resolver: zodResolver(schema),
    defaultValues,
  })

  // 서버 에러 자동 매핑
  const prevServerErrors = React.useRef<Record<string, string>>({})
  React.useEffect(() => {
    if (!serverErrors) return
    for (const [key, message] of Object.entries(serverErrors)) {
      if (prevServerErrors.current[key] !== message) {
        setError(key as Parameters<typeof setError>[0], { type: 'server', message })
      }
    }
    prevServerErrors.current = serverErrors
  }, [serverErrors, setError])

  // 더티 가드 — beforeunload
  React.useEffect(() => {
    if (!dirtyGuard || !isDirty) return
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [dirtyGuard, isDirty])

  // 필드 목록 추출
  const shape = schema.shape as Record<string, z.ZodTypeAny>
  const fieldNames = Object.keys(shape)

  const handleFormSubmit = handleSubmit(async (values) => {
    await onSubmit(values as unknown as TOutput)
  })

  return (
    <form
      onSubmit={handleFormSubmit}
      noValidate
      className={cn('flex flex-col gap-6', className)}
      aria-label="엔티티 폼"
    >
      <div className="flex flex-col gap-5">
        {fieldNames.map((name, idx) => {
          const zodType = shape[name]
          if (!zodType) return null
          const meta = (fieldMeta as Record<string, FieldMeta> | undefined)?.[name] ?? {}
          const widget = inferWidget(zodType, meta)
          const fieldError = (errors as Record<string, { message?: string }>)[name]?.message

          return (
            <Controller
              key={name}
              name={name as Parameters<typeof control.register>[0]}
              control={control}
              render={({ field }) => (
                <FieldWidget
                  name={name}
                  widget={widget}
                  meta={meta}
                  value={field.value}
                  onChange={field.onChange}
                  onBlur={field.onBlur}
                  error={fieldError}
                  autoFocus={meta.autoFocus ?? idx === 0}
                />
              )}
            />
          )
        })}
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" variant="default" size="md" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : submitLabel}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="secondary"
            size="md"
            onClick={() => {
              if (dirtyGuard && isDirty) {
                if (!window.confirm('저장되지 않은 변경사항이 있습니다. 나가겠습니까?')) return
              }
              onCancel()
            }}
          >
            취소
          </Button>
        )}
      </div>
    </form>
  )
}

EntityForm.displayName = 'EntityForm'
