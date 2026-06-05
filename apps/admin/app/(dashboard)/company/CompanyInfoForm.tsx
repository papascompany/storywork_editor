'use client'

/**
 * CompanyInfoForm — 회사정보 관리 폼 (싱글톤)
 *
 * RHF + Zod.
 * 섹션:
 *   1. 기본 정보 (companyName / ceoName)
 *   2. 법적 등록 (businessRegistrationNo / mailOrderBusinessNo)
 *   3. 주소·연락처 (address / phone / email / faxNo)
 *   4. 개인정보보호 (privacyOfficerName / privacyOfficerEmail)
 *   5. 운영 정보 (customerServiceHours / hostingProvider)
 *   6. 공개 설정 (isPublished 토글)
 *
 * isPublished=true 허용 조건: companyName, ceoName, address, phone, email 모두 입력
 */

import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@storywork/ui'
import { AlertCircle, CheckCircle2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import * as React from 'react'
import { Controller, useForm } from 'react-hook-form'
import { z } from 'zod'

// ─── 폼 스키마 ────────────────────────────────────────────────────────────────

const formSchema = z.object({
  companyName: z.string().max(200, '200자 이하로 입력하세요'),
  ceoName: z.string().max(100, '100자 이하로 입력하세요'),
  businessRegistrationNo: z
    .string()
    .optional()
    .refine(
      (v) => !v || /^\d{3}-\d{2}-\d{5}$/.test(v),
      '사업자등록번호 형식이 올바르지 않습니다 (000-00-00000)',
    ),
  mailOrderBusinessNo: z.string().max(100).optional().or(z.literal('')),
  address: z.string().max(500, '500자 이하로 입력하세요'),
  phone: z.string().max(50, '50자 이하로 입력하세요'),
  email: z
    .string()
    .max(200)
    .refine((v) => !v || /\S+@\S+\.\S+/.test(v), '올바른 이메일을 입력하세요'),
  faxNo: z.string().max(50).optional().or(z.literal('')),
  privacyOfficerName: z.string().max(100).optional().or(z.literal('')),
  privacyOfficerEmail: z
    .string()
    .max(200)
    .refine((v) => !v || /\S+@\S+\.\S+/.test(v), '올바른 이메일을 입력하세요')
    .optional()
    .or(z.literal('')),
  customerServiceHours: z.string().max(200).optional().or(z.literal('')),
  hostingProvider: z.string().max(200).default('Vercel · Supabase'),
  isPublished: z.boolean().default(false),
})

type FormValues = z.infer<typeof formSchema>

// ─── 타입 ─────────────────────────────────────────────────────────────────────

export interface CompanyInfoData {
  id: string
  companyName: string
  ceoName: string
  businessRegistrationNo: string | null
  mailOrderBusinessNo: string | null
  address: string
  phone: string
  email: string
  faxNo: string | null
  privacyOfficerName: string | null
  privacyOfficerEmail: string | null
  customerServiceHours: string | null
  hostingProvider: string
  isPublished: boolean
}

// ─── UI 컴포넌트 ───────────────────────────────────────────────────────────────

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

function Field({
  label,
  required,
  helpText,
  error,
  children,
}: {
  label: string
  required?: boolean
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
        {required && (
          <span style={{ color: 'var(--nike-sale)', marginLeft: '2px' }} aria-hidden="true">
            *
          </span>
        )}
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

// ─── 주요 컴포넌트 ────────────────────────────────────────────────────────────

interface CompanyInfoFormProps {
  initialData: CompanyInfoData
}

export function CompanyInfoForm({ initialData }: CompanyInfoFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = React.useState(false)
  const [saveStatus, setSaveStatus] = React.useState<'idle' | 'success' | 'error'>('idle')
  const [saveMessage, setSaveMessage] = React.useState('')

  const {
    register,
    control,
    handleSubmit,
    watch,
    formState: { errors, isDirty },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      companyName: initialData.companyName,
      ceoName: initialData.ceoName,
      businessRegistrationNo: initialData.businessRegistrationNo ?? '',
      mailOrderBusinessNo: initialData.mailOrderBusinessNo ?? '',
      address: initialData.address,
      phone: initialData.phone,
      email: initialData.email,
      faxNo: initialData.faxNo ?? '',
      privacyOfficerName: initialData.privacyOfficerName ?? '',
      privacyOfficerEmail: initialData.privacyOfficerEmail ?? '',
      customerServiceHours: initialData.customerServiceHours ?? '',
      hostingProvider: initialData.hostingProvider,
      isPublished: initialData.isPublished,
    },
  })

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

  // isPublished 토글 활성화 조건 확인
  const watchedValues = watch(['companyName', 'ceoName', 'address', 'phone', 'email'])
  const canPublish = watchedValues.every((v) => v && v.trim().length > 0)

  const onSubmit = handleSubmit(async (values) => {
    setIsSubmitting(true)
    setSaveStatus('idle')

    try {
      // 빈 string 을 null 로 변환
      const payload = {
        ...values,
        businessRegistrationNo: values.businessRegistrationNo || null,
        mailOrderBusinessNo: values.mailOrderBusinessNo || null,
        faxNo: values.faxNo || null,
        privacyOfficerName: values.privacyOfficerName || null,
        privacyOfficerEmail: values.privacyOfficerEmail || null,
        customerServiceHours: values.customerServiceHours || null,
      }

      const res = await fetch('/api/admin/company', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: { message?: string } }
        setSaveStatus('error')
        setSaveMessage(data.error?.message ?? '저장에 실패했습니다.')
        return
      }

      setSaveStatus('success')
      setSaveMessage('저장되었습니다.')
      router.refresh()
    } catch {
      setSaveStatus('error')
      setSaveMessage('네트워크 오류가 발생했습니다.')
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <form onSubmit={(e) => void onSubmit(e)} className="flex flex-col gap-8" noValidate>
      {/* ── 안내 배너 ── */}
      <div
        className="nike-block"
        style={{
          backgroundColor: 'var(--nike-block-cream)',
          borderRadius: 'var(--nike-admin-rounded-md)',
          padding: '12px 16px',
          display: 'flex',
          gap: '10px',
          alignItems: 'flex-start',
        }}
      >
        <AlertCircle
          style={{
            width: '16px',
            height: '16px',
            color: 'var(--nike-mute)',
            flexShrink: 0,
            marginTop: '1px',
          }}
          aria-hidden="true"
        />
        <div>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              fontWeight: 540,
              color: 'var(--nike-ink)',
            }}
          >
            실제 사업자 정보 입력 후 &ldquo;Footer 에 공개&rdquo; 활성화
          </p>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '12px',
              color: 'var(--nike-mute)',
              marginTop: '2px',
            }}
          >
            isPublished 를 켜면 서비스 footer · 약관 · 개인정보처리방침에 즉시 반영됩니다.
            개인정보보호법 및 전자상거래법 상 필수 표시 정보입니다.
          </p>
        </div>
      </div>

      {/* ── 섹션 1: 기본 정보 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>기본 정보</SectionHeader>
        <div className="flex flex-col gap-4">
          <Field label="회사명" required error={errors.companyName?.message}>
            <Input
              {...register('companyName')}
              placeholder="예: 주식회사 스토리워크"
              aria-invalid={!!errors.companyName}
            />
          </Field>
          <Field label="대표자명" required error={errors.ceoName?.message}>
            <Input
              {...register('ceoName')}
              placeholder="예: 홍길동"
              aria-invalid={!!errors.ceoName}
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 2: 법적 등록 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>법적 등록 정보</SectionHeader>
        <div className="flex flex-col gap-4">
          <Field
            label="사업자등록번호"
            helpText="형식: 000-00-00000 (입력 선택)"
            error={errors.businessRegistrationNo?.message}
          >
            <Input
              {...register('businessRegistrationNo')}
              placeholder="예: 123-45-67890"
              aria-invalid={!!errors.businessRegistrationNo}
            />
          </Field>
          <Field
            label="통신판매업신고번호"
            helpText="형식: 2026-서울-00000 (입력 선택)"
            error={errors.mailOrderBusinessNo?.message}
          >
            <Input
              {...register('mailOrderBusinessNo')}
              placeholder="예: 2026-서울-00000"
              aria-invalid={!!errors.mailOrderBusinessNo}
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 3: 주소·연락처 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>주소 · 연락처</SectionHeader>
        <div className="flex flex-col gap-4">
          <Field label="사업장 주소" required error={errors.address?.message}>
            <textarea
              {...register('address')}
              rows={2}
              aria-invalid={!!errors.address}
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
              placeholder="예: 서울특별시 강남구 테헤란로 123, 4층"
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="전화번호" required error={errors.phone?.message}>
              <Input
                {...register('phone')}
                placeholder="예: 02-0000-0000"
                aria-invalid={!!errors.phone}
              />
            </Field>
            <Field label="이메일" required error={errors.email?.message}>
              <Input
                {...register('email')}
                type="email"
                placeholder="예: help@storywork.io"
                aria-invalid={!!errors.email}
              />
            </Field>
          </div>
          <Field label="팩스번호" helpText="선택 항목" error={errors.faxNo?.message}>
            <Input
              {...register('faxNo')}
              placeholder="예: 02-0000-0001"
              aria-invalid={!!errors.faxNo}
            />
          </Field>
        </div>
      </section>

      {/* ── 섹션 4: 개인정보보호 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>개인정보보호</SectionHeader>
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              label="개인정보보호책임자 이름"
              helpText="선택 항목"
              error={errors.privacyOfficerName?.message}
            >
              <Input {...register('privacyOfficerName')} placeholder="예: 홍길동" />
            </Field>
            <Field
              label="개인정보보호책임자 이메일"
              helpText="선택 항목"
              error={errors.privacyOfficerEmail?.message}
            >
              <Input
                {...register('privacyOfficerEmail')}
                type="email"
                placeholder="예: privacy@storywork.io"
              />
            </Field>
          </div>
        </div>
      </section>

      {/* ── 섹션 5: 운영 정보 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>운영 정보</SectionHeader>
        <div className="flex flex-col gap-4">
          <Field
            label="고객센터 운영시간"
            helpText="선택 항목"
            error={errors.customerServiceHours?.message}
          >
            <Input
              {...register('customerServiceHours')}
              placeholder="예: 평일 10:00 ~ 18:00 (점심 12:00~13:00 제외)"
            />
          </Field>
          <Field
            label="호스팅 제공자"
            helpText="개인정보처리방침 처리 위탁 명시용"
            error={errors.hostingProvider?.message}
          >
            <Input {...register('hostingProvider')} placeholder="예: Vercel · Supabase" />
          </Field>
        </div>
      </section>

      {/* ── 섹션 6: 공개 설정 ── */}
      <section className="nike-block nike-block-cream">
        <SectionHeader>공개 설정</SectionHeader>
        <div className="flex flex-col gap-3">
          <Controller
            control={control}
            name="isPublished"
            render={({ field }) => (
              <div className="flex items-center gap-3">
                <div
                  onClick={() => canPublish && field.onChange(!field.value)}
                  style={{
                    width: '40px',
                    height: '22px',
                    borderRadius: '11px',
                    backgroundColor: field.value ? 'var(--nike-lime)' : 'var(--nike-hairline)',
                    position: 'relative',
                    cursor: canPublish ? 'pointer' : 'not-allowed',
                    opacity: canPublish ? 1 : 0.45,
                    transition: 'background-color 0.15s',
                    flexShrink: 0,
                  }}
                  role="switch"
                  aria-checked={field.value}
                  aria-disabled={!canPublish}
                  tabIndex={canPublish ? 0 : -1}
                  onKeyDown={(e) => {
                    if (canPublish && (e.key === ' ' || e.key === 'Enter')) {
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
                <div>
                  <p
                    style={{
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '14px',
                      fontWeight: 500,
                      color: 'var(--nike-ink)',
                    }}
                  >
                    {field.value
                      ? 'Footer 에 공개 (즉시 반영)'
                      : 'Footer 에 숨김 (placeholder 유지)'}
                  </p>
                  {!canPublish && (
                    <p
                      style={{
                        fontFamily: 'var(--nike-font-text)',
                        fontSize: '12px',
                        color: 'var(--nike-mute)',
                        marginTop: '2px',
                      }}
                    >
                      공개하려면 회사명·대표자·주소·전화·이메일을 모두 입력하세요.
                    </p>
                  )}
                </div>
              </div>
            )}
          />
        </div>
      </section>

      {/* ── 저장 결과 메시지 ── */}
      {saveStatus !== 'idle' && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: 'var(--nike-admin-rounded-md)',
            backgroundColor:
              saveStatus === 'success'
                ? 'color-mix(in srgb, var(--nike-lime) 15%, transparent)'
                : 'color-mix(in srgb, var(--nike-sale) 12%, transparent)',
          }}
        >
          {saveStatus === 'success' ? (
            <CheckCircle2
              style={{ width: '16px', height: '16px', color: 'var(--nike-lime)', flexShrink: 0 }}
              aria-hidden="true"
            />
          ) : (
            <AlertCircle
              style={{ width: '16px', height: '16px', color: 'var(--nike-sale)', flexShrink: 0 }}
              aria-hidden="true"
            />
          )}
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '13px',
              color: 'var(--nike-ink)',
            }}
          >
            {saveMessage}
          </p>
        </div>
      )}

      {/* ── 버튼 영역 ── */}
      <div className="flex gap-3 justify-end pt-2">
        <button type="submit" className="nike-btn-primary" disabled={isSubmitting}>
          {isSubmitting ? '저장 중...' : '저장'}
        </button>
      </div>
    </form>
  )
}
