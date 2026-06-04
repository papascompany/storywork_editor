'use client'

/**
 * PrinterProfileForm — 인쇄소 프로필 등록/편집 폼
 *
 * RHF + Zod.
 * 섹션:
 *   1. 기본 정보 (name/slug/description)
 *   2. 지원 판형 (formats — 텍스트 입력, 쉼표 구분)
 *   3. bleed/safe 사양 (bleedMin/Max/safeMin mm)
 *   4. 이미지 dpi (pose/bg 최소)
 *   5. 폰트/컬러 (embed/colorspaces 체크박스)
 *   6. 페이지 제한 (maxPages optional)
 *   7. 커스텀 경고 (string list — 동적 추가/삭제)
 *   8. isActive 토글
 *
 * isSystem=true 인 프로필은 isActive 토글만 허용 (다른 필드 readonly).
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Input, cn } from '@storywork/ui'
import { Plus, X } from 'lucide-react'
import * as React from 'react'
import { Controller, useFieldArray, useForm } from 'react-hook-form'
import { z } from 'zod'

import type { PrinterProfileOutput } from '../../../src/lib/schemas/printer-profile'

export type PrinterProfileFormValues = PrinterProfileOutput

// ─── 섹션 헤더 ────────────────────────────────────────────────────────────────

function SectionHeader({ children }: { children: React.ReactNode }) {
  return (
    <h2
      style={{
        fontFamily: 'var(--nike-font-text)',
        fontSize: '12px',
        fontWeight: 540,
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--nike-ink)',
        opacity: 0.55,
        marginBottom: '12px',
      }}
    >
      {children}
    </h2>
  )
}

// ─── 필드 래퍼 ────────────────────────────────────────────────────────────────

function Field({
  label,
  helpText,
  error,
  children,
}: {
  label: string
  helpText?: string
  error?: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <label
        style={{
          fontFamily: 'var(--nike-font-text)',
          fontSize: '13px',
          fontWeight: 500,
          color: 'var(--nike-ink)',
        }}
      >
        {label}
      </label>
      {children}
      {helpText && !error && (
        <span
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-mute)',
          }}
        >
          {helpText}
        </span>
      )}
      {error && (
        <span
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '12px',
            color: 'var(--nike-sale)',
          }}
        >
          {error}
        </span>
      )}
    </div>
  )
}

// ─── 확장 스키마 (customWarnings 배열용) ─────────────────────────────────────
// useFieldArray 는 { value: string }[] 형태를 요구하므로 변환 레이어 추가

type FormRaw = {
  slug: string
  name: string
  description?: string
  formats: string[]
  bleedMinMm: number
  bleedMaxMm: number
  safeMinMm: number
  imageDpiMinPose: number
  imageDpiMinBg: number
  fontEmbedRequired: boolean
  colorSpaces: Array<'rgb' | 'cmyk'>
  maxPages?: number | null
  customWarningsRaw: Array<{ value: string }>
  isActive: boolean
}

// ─── Props ───────────────────────────────────────────────────────────────────

interface PrinterProfileFormProps {
  mode: 'create' | 'edit'
  isSystem?: boolean
  defaultValues?: Partial<PrinterProfileFormValues>
  serverErrors?: Record<string, string>
  onSubmit: (values: PrinterProfileFormValues) => Promise<void>
  onCancel?: () => void
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function PrinterProfileForm({
  mode,
  isSystem = false,
  defaultValues,
  serverErrors = {},
  onSubmit,
  onCancel,
}: PrinterProfileFormProps) {
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  // customWarnings → useFieldArray 형태로 변환
  const toRaw = (vals?: Partial<PrinterProfileFormValues>): Partial<FormRaw> => ({
    slug: vals?.slug ?? '',
    name: vals?.name ?? '',
    description: vals?.description ?? '',
    formats: vals?.formats ?? [],
    bleedMinMm: vals?.bleedMinMm ?? 3,
    bleedMaxMm: vals?.bleedMaxMm ?? 5,
    safeMinMm: vals?.safeMinMm ?? 5,
    imageDpiMinPose: vals?.imageDpiMinPose ?? 300,
    imageDpiMinBg: vals?.imageDpiMinBg ?? 150,
    fontEmbedRequired: vals?.fontEmbedRequired ?? true,
    colorSpaces: (vals?.colorSpaces as Array<'rgb' | 'cmyk'>) ?? ['rgb'],
    maxPages: vals?.maxPages ?? null,
    customWarningsRaw: (vals?.customWarnings ?? []).map((v) => ({ value: v })),
    isActive: vals?.isActive ?? true,
  })

  const {
    register,
    control,
    handleSubmit,
    formState: { errors, isDirty },
    setError,
    watch,
  } = useForm<FormRaw>({
    resolver: zodResolver(
      z.object({
        slug: z
          .string()
          .min(1, '슬러그를 입력하세요')
          .max(100)
          .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'URL-safe 슬러그만 허용'),
        name: z.string().min(1, '이름을 입력하세요').max(200),
        description: z.string().max(2000).optional(),
        formats: z.array(z.string()).default([]),
        bleedMinMm: z.coerce.number().nonnegative(),
        bleedMaxMm: z.coerce.number().nonnegative(),
        safeMinMm: z.coerce.number().nonnegative(),
        imageDpiMinPose: z.coerce.number().positive(),
        imageDpiMinBg: z.coerce.number().positive(),
        fontEmbedRequired: z.boolean().default(true),
        colorSpaces: z.array(z.enum(['rgb', 'cmyk'])).min(1, '색공간을 최소 1개 선택하세요'),
        maxPages: z.coerce.number().int().positive().nullable().optional(),
        customWarningsRaw: z.array(z.object({ value: z.string().max(500) })).default([]),
        isActive: z.boolean().default(true),
      }),
    ),
    defaultValues: toRaw(defaultValues) as Partial<FormRaw>,
  })

  const {
    fields: warningFields,
    append,
    remove,
  } = useFieldArray({ control, name: 'customWarningsRaw' })

  // 서버 에러 → 폼 에러로 매핑
  React.useEffect(() => {
    for (const [k, msg] of Object.entries(serverErrors)) {
      setError(k as keyof FormRaw, { type: 'server', message: msg })
    }
  }, [serverErrors, setError])

  const colorSpaces = watch('colorSpaces') ?? []

  // 더티 가드
  React.useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [isDirty])

  const onFormSubmit = handleSubmit(async (raw) => {
    setIsSubmitting(true)
    try {
      const payload: PrinterProfileFormValues = {
        slug: raw.slug,
        name: raw.name,
        description: raw.description,
        formats: raw.formats,
        bleedMinMm: raw.bleedMinMm,
        bleedMaxMm: raw.bleedMaxMm,
        safeMinMm: raw.safeMinMm,
        imageDpiMinPose: raw.imageDpiMinPose,
        imageDpiMinBg: raw.imageDpiMinBg,
        fontEmbedRequired: raw.fontEmbedRequired,
        colorSpaces: raw.colorSpaces,
        maxPages: raw.maxPages ?? null,
        customWarnings: raw.customWarningsRaw.map((w) => w.value).filter(Boolean),
        isActive: raw.isActive,
      }
      await onSubmit(payload)
    } finally {
      setIsSubmitting(false)
    }
  })

  const readonlyAll = isSystem
  const fieldStyle = (disabled: boolean): React.CSSProperties =>
    disabled ? { opacity: 0.5, pointerEvents: 'none' } : {}

  return (
    <form onSubmit={(e) => void onFormSubmit(e)} className="flex flex-col gap-8" noValidate>
      {/* ── 섹션 1: 기본 정보 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>기본 정보</SectionHeader>
        <div className="flex flex-col gap-4" style={fieldStyle(readonlyAll)}>
          <Field label="인쇄소 이름 *" error={errors.name?.message}>
            <Input
              {...register('name')}
              placeholder="예: BookPrint Korea"
              aria-invalid={!!errors.name}
              readOnly={readonlyAll}
            />
          </Field>
          <Field
            label="슬러그 *"
            helpText="URL/import 키 (영소문자, 숫자, 하이픈)"
            error={errors.slug?.message}
          >
            <Input
              {...register('slug')}
              placeholder="예: bookprint-korea"
              aria-invalid={!!errors.slug}
              readOnly={readonlyAll}
            />
          </Field>
          <Field label="설명" error={errors.description?.message}>
            <textarea
              {...register('description')}
              rows={3}
              readOnly={readonlyAll}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: 'var(--nike-admin-rounded-md)',
                border: '1.5px solid var(--nike-hairline)',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '14px',
                resize: 'vertical',
                outline: 'none',
                backgroundColor: 'var(--nike-canvas)',
                color: 'var(--nike-ink)',
              }}
              placeholder="인쇄소 사양에 대한 설명"
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 2: 지원 판형 ── */}
      <section className="nike-block nike-block-cream" style={fieldStyle(readonlyAll)}>
        <SectionHeader>지원 판형</SectionHeader>
        <Field
          label="판형 ID 목록"
          helpText="쉼표(,)로 구분. 비워두면 모든 판형 허용."
          error={errors.formats?.message}
        >
          <Controller
            control={control}
            name="formats"
            render={({ field }) => (
              <Input
                value={field.value.join(', ')}
                onChange={(e) =>
                  field.onChange(
                    e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="예: b5, a5, b5-format"
                readOnly={readonlyAll}
              />
            )}
          />
        </Field>
      </section>

      {/* ── 섹션 3: bleed/safe 사양 ── */}
      <section className="nike-block nike-block-cream" style={fieldStyle(readonlyAll)}>
        <SectionHeader>Bleed / Safe 사양</SectionHeader>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <Field label="Bleed 최소 (mm)" error={errors.bleedMinMm?.message}>
            <Input
              type="number"
              step="0.5"
              min="0"
              {...register('bleedMinMm', { valueAsNumber: true })}
              readOnly={readonlyAll}
            />
          </Field>
          <Field label="Bleed 최대 (mm)" error={errors.bleedMaxMm?.message}>
            <Input
              type="number"
              step="0.5"
              min="0"
              {...register('bleedMaxMm', { valueAsNumber: true })}
              readOnly={readonlyAll}
            />
          </Field>
          <Field label="Safe Area 최소 (mm)" error={errors.safeMinMm?.message}>
            <Input
              type="number"
              step="0.5"
              min="0"
              {...register('safeMinMm', { valueAsNumber: true })}
              readOnly={readonlyAll}
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 4: 이미지 DPI ── */}
      <section className="nike-block nike-block-cream" style={fieldStyle(readonlyAll)}>
        <SectionHeader>이미지 DPI</SectionHeader>
        <div className="grid grid-cols-2 gap-4">
          <Field label="포즈/인물 최소 DPI" error={errors.imageDpiMinPose?.message}>
            <Input
              type="number"
              step="1"
              min="1"
              {...register('imageDpiMinPose', { valueAsNumber: true })}
              readOnly={readonlyAll}
            />
          </Field>
          <Field label="배경 최소 DPI" error={errors.imageDpiMinBg?.message}>
            <Input
              type="number"
              step="1"
              min="1"
              {...register('imageDpiMinBg', { valueAsNumber: true })}
              readOnly={readonlyAll}
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 5: 폰트/컬러 ── */}
      <section className="nike-block nike-block-cream" style={fieldStyle(readonlyAll)}>
        <SectionHeader>폰트 / 색공간</SectionHeader>
        <div className="flex flex-col gap-4">
          <Field label="폰트 임베드 필수">
            <Controller
              control={control}
              name="fontEmbedRequired"
              render={({ field }) => (
                <label
                  className="flex items-center gap-2 cursor-pointer"
                  style={{ fontSize: '14px' }}
                >
                  <input
                    type="checkbox"
                    checked={field.value}
                    onChange={(e) => field.onChange(e.target.checked)}
                    disabled={readonlyAll}
                    className="size-4"
                  />
                  폰트 임베드 필수
                </label>
              )}
            />
          </Field>

          <Field
            label="허용 색공간 *"
            error={errors.colorSpaces?.message}
            helpText="순서대로 선호도 높음"
          >
            <Controller
              control={control}
              name="colorSpaces"
              render={({ field }) => (
                <div className="flex gap-4">
                  {(['rgb', 'cmyk'] as const).map((cs) => (
                    <label
                      key={cs}
                      className="flex items-center gap-2 cursor-pointer"
                      style={{ fontSize: '14px' }}
                    >
                      <input
                        type="checkbox"
                        checked={colorSpaces.includes(cs)}
                        disabled={readonlyAll}
                        onChange={(e) => {
                          const next = e.target.checked
                            ? [...field.value, cs]
                            : field.value.filter((v) => v !== cs)
                          field.onChange(next)
                        }}
                        className="size-4"
                      />
                      {cs.toUpperCase()}
                    </label>
                  ))}
                </div>
              )}
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 6: 페이지 제한 ── */}
      <section className="nike-block nike-block-cream" style={fieldStyle(readonlyAll)}>
        <SectionHeader>페이지 제한</SectionHeader>
        <Field
          label="최대 페이지 수"
          helpText="비워두면 제한 없음"
          error={errors.maxPages?.message}
        >
          <Controller
            control={control}
            name="maxPages"
            render={({ field }) => (
              <Input
                type="number"
                step="1"
                min="1"
                value={field.value == null ? '' : String(field.value)}
                onChange={(e) =>
                  field.onChange(e.target.value === '' ? null : Number(e.target.value))
                }
                placeholder="예: 200 (비워두면 제한 없음)"
                readOnly={readonlyAll}
              />
            )}
          />
        </Field>
      </section>

      {/* ── 섹션 7: 커스텀 경고 ── */}
      <section className="nike-block nike-block-cream" style={fieldStyle(readonlyAll)}>
        <SectionHeader>커스텀 경고 메시지</SectionHeader>
        <div className="flex flex-col gap-2">
          {warningFields.map((f, idx) => (
            <div key={f.id} className="flex gap-2 items-center">
              <Input
                {...register(`customWarningsRaw.${idx}.value`)}
                placeholder="경고 메시지"
                className="flex-1"
                readOnly={readonlyAll}
              />
              {!readonlyAll && (
                <button
                  type="button"
                  onClick={() => remove(idx)}
                  className="nike-btn-secondary"
                  style={{ padding: '6px', minWidth: 'auto' }}
                  aria-label="경고 메시지 삭제"
                >
                  <X className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          ))}
          {!readonlyAll && (
            <button
              type="button"
              onClick={() => append({ value: '' })}
              className="nike-btn-secondary"
              style={{ alignSelf: 'flex-start', marginTop: '4px' }}
            >
              <Plus className="size-4" aria-hidden="true" />
              경고 추가
            </button>
          )}
        </div>
      </section>

      {/* ── 섹션 8: 활성 상태 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>활성 상태</SectionHeader>
        <Controller
          control={control}
          name="isActive"
          render={({ field }) => (
            <label
              className={cn(
                'flex items-center gap-3 cursor-pointer',
                isSystem ? 'opacity-100' : '',
              )}
              style={{ fontSize: '14px', fontFamily: 'var(--nike-font-text)' }}
            >
              <div
                onClick={() => field.onChange(!field.value)}
                style={{
                  width: '40px',
                  height: '22px',
                  borderRadius: '11px',
                  backgroundColor: field.value ? 'var(--nike-lime)' : 'var(--nike-hairline)',
                  position: 'relative',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s',
                  flexShrink: 0,
                }}
                role="switch"
                aria-checked={field.value}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === ' ' || e.key === 'Enter') {
                    e.preventDefault()
                    field.onChange(!field.value)
                  }
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    top: '3px',
                    left: field.value ? '21px' : '3px',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    backgroundColor: 'white',
                    transition: 'left 0.15s',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.15)',
                  }}
                />
              </div>
              <span style={{ color: 'var(--nike-ink)' }}>
                {field.value ? '활성 (사용자에게 노출)' : '비활성 (숨김)'}
              </span>
            </label>
          )}
        />
      </section>

      {/* ── 버튼 영역 ── */}
      <div className="flex gap-3 justify-end pt-2">
        {onCancel && (
          <button
            type="button"
            className="nike-btn-secondary"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            취소
          </button>
        )}
        <button type="submit" className="nike-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : mode === 'create' ? '등록' : '저장'}
        </button>
      </div>
    </form>
  )
}
