'use client'

/**
 * (dashboard)/printers/new/page.tsx — 새 인쇄소 프로필 등록
 *
 * EntityForm (RHF + Zod) 으로 구성.
 * 커스텀 경고 목록은 동적 추가/제거 지원.
 */

import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { PrinterProfileForm } from '../PrinterProfileForm'
import type { PrinterProfileFormValues } from '../PrinterProfileForm'

export default function NewPrinterPage() {
  const router = useRouter()
  const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})

  const handleSubmit = async (values: PrinterProfileFormValues) => {
    setServerErrors({})

    const res = await fetch('/api/admin/printers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(values),
    })

    if (res.status === 201) {
      router.push('/printers')
      router.refresh()
      return
    }

    const json = (await res.json().catch(() => ({}))) as {
      error?: {
        code?: string
        message?: string
        details?: { fieldErrors?: Record<string, string[]> }
      }
    }

    if (json.error?.code === 'CONFLICT') {
      setServerErrors({ slug: json.error.message ?? '이미 사용 중인 슬러그입니다.' })
      return
    }

    if (json.error?.code === 'VALIDATION_ERROR' && json.error.details?.fieldErrors) {
      const fe: Record<string, string> = {}
      for (const [k, msgs] of Object.entries(json.error.details.fieldErrors)) {
        fe[k] = Array.isArray(msgs) ? (msgs[0] ?? '오류') : String(msgs)
      }
      setServerErrors(fe)
      return
    }

    setServerErrors({ slug: json.error?.message ?? '서버 오류가 발생했습니다.' })
  }

  return (
    <div className="p-6 lg:p-10 max-w-2xl" style={{ fontFamily: 'var(--nike-font-text)' }}>
      <Link
        href="/printers"
        className="mb-6 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
        style={{
          fontSize: '14px',
          fontWeight: 400,
          color: 'var(--nike-mute)',
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        인쇄소 프로필 목록
      </Link>

      <header className="mb-8">
        <h1 className="nike-heading-xl">새 인쇄소 등록</h1>
        <p className="nike-caption-md mt-1">인쇄소 사양을 등록합니다.</p>
      </header>

      <PrinterProfileForm
        mode="create"
        serverErrors={serverErrors}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/printers')}
      />
    </div>
  )
}
