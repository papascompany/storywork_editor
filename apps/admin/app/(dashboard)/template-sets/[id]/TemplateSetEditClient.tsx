'use client'

/**
 * TemplateSetEditClient — 템플릿 세트 편집
 *
 * 좌측: 선택된 Template 그리드 (순서 변경 + cover 지정 + 제거)
 * 우측: 메타 폼 (이름, coverIdx)
 * "Template 추가" 버튼 → 모달로 목록에서 다중 선택
 */

import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@storywork/ui'
import { ArrowLeft, Plus, Star, Trash2 } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import type { AdminRole } from '../../../../src/lib/auth'

// ─── 타입 ────────────────────────────────────────────────────────────────────

interface TemplateSummary {
  id: string
  name: string
  thumbnail: string | null
  slotCount: number
  formatName: string
}

export interface TemplateSetData {
  id: string
  name: string
  coverIdx: number
  /** 표지 오버라이드 — null = Format 기본값 상속 */
  coverEnabled: boolean | null
  coverWidthMm: number | null
  coverHeightMm: number | null
  isActive: boolean
  templates: TemplateSummary[]
}

interface TemplateSetEditClientProps {
  set: TemplateSetData
  userRole: AdminRole
}

// ─── TemplateSetEditClient ────────────────────────────────────────────────────

export function TemplateSetEditClient({ set, userRole }: TemplateSetEditClientProps) {
  const router = useRouter()
  const [name, setName] = React.useState(set.name)
  const [templates, setTemplates] = React.useState<TemplateSummary[]>(set.templates)
  const [coverIdx, setCoverIdx] = React.useState(set.coverIdx)
  // 표지 오버라이드 — coverEnabled: 'inherit' | 'on' | 'off' (UI 3-state)
  const [coverEnabledMode, setCoverEnabledMode] = React.useState<'inherit' | 'on' | 'off'>(
    set.coverEnabled === null ? 'inherit' : set.coverEnabled ? 'on' : 'off',
  )
  const [coverWidthMm, setCoverWidthMm] = React.useState<string>(
    set.coverWidthMm == null ? '' : String(set.coverWidthMm),
  )
  const [coverHeightMm, setCoverHeightMm] = React.useState<string>(
    set.coverHeightMm == null ? '' : String(set.coverHeightMm),
  )
  const [isActive, setIsActive] = React.useState(set.isActive)
  const [isSaving, setIsSaving] = React.useState(false)
  const [saveError, setSaveError] = React.useState('')
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [addModalOpen, setAddModalOpen] = React.useState(false)
  const [allTemplates, setAllTemplates] = React.useState<TemplateSummary[]>([])
  const [addSelectedIds, setAddSelectedIds] = React.useState<string[]>([])

  const canEdit = userRole === 'superadmin' || userRole === 'curator'
  const isSuperadmin = userRole === 'superadmin'

  const safeSetTemplates = (next: TemplateSummary[], prevCoverIdx: number) => {
    setTemplates(next)
    if (next.length === 0) setCoverIdx(0)
    else if (prevCoverIdx >= next.length) setCoverIdx(next.length - 1)
  }

  const moveUp = (idx: number) => {
    if (idx === 0) return
    const next = [...templates]
    ;[next[idx - 1], next[idx]] = [next[idx], next[idx - 1]] as [(typeof next)[0], (typeof next)[0]]
    let newCover = coverIdx
    if (coverIdx === idx) newCover = idx - 1
    else if (coverIdx === idx - 1) newCover = idx
    setTemplates(next)
    setCoverIdx(newCover)
  }

  const moveDown = (idx: number) => {
    if (idx >= templates.length - 1) return
    const next = [...templates]
    ;[next[idx], next[idx + 1]] = [next[idx + 1], next[idx]] as [(typeof next)[0], (typeof next)[0]]
    let newCover = coverIdx
    if (coverIdx === idx) newCover = idx + 1
    else if (coverIdx === idx + 1) newCover = idx
    setTemplates(next)
    setCoverIdx(newCover)
  }

  const removeTemplate = (id: string) => {
    const idx = templates.findIndex((t) => t.id === id)
    const next = templates.filter((t) => t.id !== id)
    safeSetTemplates(next, idx <= coverIdx ? Math.max(0, coverIdx - 1) : coverIdx)
  }

  // 모달: 전체 템플릿 목록 로드
  const openAddModal = async () => {
    setAddSelectedIds([])
    setAddModalOpen(true)
    const res = await fetch('/api/templates?pageSize=100').catch(() => null)
    if (!res?.ok) return
    const body = (await res.json()) as {
      data?: {
        id: string
        name: string
        thumbnail: string | null
        slotCount: number
        format: { name: string }
      }[]
    }
    const currentIds = new Set(templates.map((t) => t.id))
    setAllTemplates(
      (body.data ?? [])
        .filter((t) => !currentIds.has(t.id))
        .map((t) => ({
          id: t.id,
          name: t.name,
          thumbnail: t.thumbnail,
          slotCount: t.slotCount,
          formatName: t.format?.name ?? '',
        })),
    )
  }

  const confirmAdd = () => {
    const toAdd = allTemplates.filter((t) => addSelectedIds.includes(t.id))
    setTemplates((prev) => [...prev, ...toAdd])
    setAddModalOpen(false)
  }

  const handleSave = async () => {
    if (name.length < 2) {
      setSaveError('이름은 2자 이상이어야 합니다.')
      return
    }
    if (templates.length === 0) {
      setSaveError('템플릿이 1개 이상 필요합니다.')
      return
    }
    // 표지 치수 검증 (입력된 경우 10~1500)
    const parseDim = (s: string): number | null => {
      const trimmed = s.trim()
      if (trimmed === '') return null
      return Number(trimmed)
    }
    const w = parseDim(coverWidthMm)
    const h = parseDim(coverHeightMm)
    for (const [val, label] of [
      [w, '표지 폭'],
      [h, '표지 높이'],
    ] as const) {
      if (val !== null && (Number.isNaN(val) || val < 10 || val > 1500)) {
        setSaveError(`${label}은 10~1500mm 사이의 숫자여야 합니다.`)
        return
      }
    }
    setIsSaving(true)
    setSaveError('')
    try {
      const res = await fetch(`/api/template-sets/${set.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          templateIds: templates.map((t) => t.id),
          coverIdx,
          coverEnabled:
            coverEnabledMode === 'inherit' ? null : coverEnabledMode === 'on' ? true : false,
          coverWidthMm: w,
          coverHeightMm: h,
          isActive,
        }),
      })
      if (res.ok) {
        router.refresh()
        return
      }
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      setSaveError(json.error?.message ?? '저장 중 오류가 발생했습니다.')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/template-sets/${set.id}`, { method: 'DELETE' })
      if (res.status === 204 || res.ok) {
        setDeleteDialogOpen(false)
        router.push('/template-sets')
        router.refresh()
        return
      }
      const json = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
      alert(json.error?.message ?? '삭제 중 오류가 발생했습니다.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl" style={{ fontFamily: 'var(--nike-font-text)' }}>
      {/* 뒤로 */}
      <Link
        href="/template-sets"
        className="mb-4 inline-flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 rounded"
        style={{
          fontFamily: 'var(--nike-font-text)',
          fontSize: '14px',
          fontWeight: 330,
          color: 'var(--nike-ink)',
          opacity: 0.5,
          textDecoration: 'none',
        }}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        세트 목록
      </Link>

      {/* 헤더 */}
      <div className="mt-4 flex items-start justify-between gap-4 mb-8 flex-wrap">
        <div>
          <p
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--nike-ink)',
              opacity: 0.4,
              marginBottom: '6px',
            }}
          >
            Admin / 템플릿 세트 / 편집
          </p>
          <h1
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: 'clamp(24px, 3.5vw, 32px)',
              fontWeight: 340,
              lineHeight: 1.1,
              letterSpacing: '-0.96px',
              color: 'var(--nike-ink)',
              marginBottom: '4px',
            }}
          >
            {set.name}
          </h1>
          <p
            style={{
              fontFamily: 'var(--nike-font-text)',
              fontSize: '15px',
              fontWeight: 330,
              color: 'var(--nike-ink)',
              opacity: 0.55,
            }}
          >
            템플릿 {set.templates.length}개
          </p>
        </div>
        {isSuperadmin && (
          <Button variant="destructive" size="sm" onClick={() => setDeleteDialogOpen(true)}>
            <Trash2 className="size-4" aria-hidden="true" />
            삭제
          </Button>
        )}
      </div>

      {saveError && (
        <p
          role="alert"
          style={{
            fontFamily: 'var(--nike-font-text)',
            fontSize: '13px',
            color: 'var(--nike-ink)',
            backgroundColor: 'var(--nike-card-pink)',
            borderRadius: 'var(--nike-admin-rounded-md)',
            padding: '10px 14px',
            marginBottom: '16px',
          }}
        >
          {saveError}
        </p>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* 좌측: 템플릿 목록 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <h2
              style={{
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.6px',
                textTransform: 'uppercase',
                color: 'var(--nike-ink)',
                opacity: 0.55,
              }}
            >
              포함 템플릿 ({templates.length}개)
            </h2>
            {canEdit && (
              <button
                type="button"
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '11px',
                  fontWeight: 400,
                  color: 'var(--nike-ink)',
                  opacity: 0.7,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: 'var(--nike-admin-rounded-md)',
                  backgroundColor: 'var(--nike-soft-cloud)',
                }}
              >
                <Plus className="size-3.5" aria-hidden="true" />
                템플릿 추가
              </button>
            )}
          </div>

          {templates.length === 0 ? (
            <div
              className="py-12 text-center"
              style={{
                border: '1.5px dashed var(--nike-hairline)',
                borderRadius: 'var(--nike-admin-rounded-lg)',
              }}
            >
              <p
                style={{
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                  marginBottom: '12px',
                }}
              >
                템플릿이 없습니다.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={openAddModal}
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '13px',
                    color: 'var(--nike-ink)',
                    textDecoration: 'underline',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    opacity: 0.7,
                  }}
                >
                  + 템플릿 추가
                </button>
              )}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {templates.map((t, idx) => {
                const isCover = idx === coverIdx
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 p-3"
                    style={{
                      borderRadius: 'var(--nike-admin-rounded-lg)',
                      border: '1px solid var(--nike-hairline)',
                      backgroundColor: 'var(--nike-canvas)',
                    }}
                  >
                    <span
                      className="w-4 shrink-0"
                      style={{
                        fontFamily: 'var(--nike-font-mono)',
                        fontSize: '11px',
                        color: 'var(--nike-ink)',
                        opacity: 0.4,
                      }}
                    >
                      {idx + 1}
                    </span>
                    {t.thumbnail ? (
                      <div
                        className="relative h-12 w-12 overflow-hidden shrink-0"
                        style={{
                          borderRadius: 'var(--nike-admin-rounded-sm)',
                          border: '1px solid var(--nike-hairline)',
                        }}
                      >
                        <Image
                          src={t.thumbnail}
                          alt={t.name}
                          fill
                          sizes="48px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div
                        className="h-12 w-12 shrink-0 flex items-center justify-center"
                        style={{
                          borderRadius: 'var(--nike-admin-rounded-sm)',
                          border: '1px solid var(--nike-hairline)',
                          backgroundColor: 'var(--nike-soft-cloud)',
                          fontFamily: 'var(--nike-font-mono)',
                          fontSize: '11px',
                          color: 'var(--nike-ink)',
                          opacity: 0.4,
                        }}
                      >
                        없음
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p
                        className="truncate"
                        style={{
                          fontFamily: 'var(--nike-font-text)',
                          fontSize: '14px',
                          fontWeight: 540,
                          color: 'var(--nike-ink)',
                        }}
                      >
                        {t.name}
                      </p>
                      <p
                        style={{
                          fontFamily: 'var(--nike-font-mono)',
                          fontSize: '11px',
                          color: 'var(--nike-ink)',
                          opacity: 0.4,
                        }}
                      >
                        {t.formatName} · 슬롯 {t.slotCount}개
                      </p>
                    </div>
                    {canEdit && (
                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => setCoverIdx(idx)}
                          title={isCover ? '커버 (지정됨)' : '커버로 지정'}
                          className="rounded p-1 focus-visible:outline-none focus-visible:ring-2"
                          style={{
                            color: isCover ? '#eab308' : 'var(--nike-ink)',
                            opacity: isCover ? 1 : 0.35,
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                          }}
                        >
                          <Star
                            className={`size-3.5 ${isCover ? 'fill-yellow-400' : ''}`}
                            aria-label={isCover ? '커버' : '커버로 지정'}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveUp(idx)}
                          disabled={idx === 0}
                          className="rounded focus-visible:outline-none focus-visible:ring-2"
                          style={{
                            fontFamily: 'var(--nike-font-mono)',
                            fontSize: '12px',
                            padding: '0 4px',
                            color: 'var(--nike-ink)',
                            opacity: idx === 0 ? 0.2 : 0.6,
                            cursor: idx === 0 ? 'not-allowed' : 'pointer',
                            border: 'none',
                            background: 'none',
                          }}
                          aria-label="위로"
                        >
                          ↑
                        </button>
                        <button
                          type="button"
                          onClick={() => moveDown(idx)}
                          disabled={idx === templates.length - 1}
                          className="rounded focus-visible:outline-none focus-visible:ring-2"
                          style={{
                            fontFamily: 'var(--nike-font-mono)',
                            fontSize: '12px',
                            padding: '0 4px',
                            color: 'var(--nike-ink)',
                            opacity: idx === templates.length - 1 ? 0.2 : 0.6,
                            cursor: idx === templates.length - 1 ? 'not-allowed' : 'pointer',
                            border: 'none',
                            background: 'none',
                          }}
                          aria-label="아래로"
                        >
                          ↓
                        </button>
                        <button
                          type="button"
                          onClick={() => removeTemplate(t.id)}
                          className="rounded focus-visible:outline-none focus-visible:ring-2"
                          style={{
                            fontFamily: 'var(--nike-font-mono)',
                            fontSize: '13px',
                            padding: '0 4px',
                            color: 'var(--nike-ink)',
                            opacity: 0.4,
                            border: 'none',
                            background: 'none',
                            cursor: 'pointer',
                          }}
                          aria-label="제거"
                        >
                          ×
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* 우측: 메타 폼 */}
        <div className="w-full lg:w-72 shrink-0">
          <h2
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.6px',
              textTransform: 'uppercase',
              color: 'var(--nike-ink)',
              opacity: 0.55,
              marginBottom: '12px',
            }}
          >
            세트 정보
          </h2>
          <div className="flex flex-col gap-4">
            {/* 이름 */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="edit-name"
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '11px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                }}
              >
                이름
              </label>
              <input
                id="edit-name"
                type="text"
                value={name}
                disabled={!canEdit}
                onChange={(e) => setName(e.target.value)}
                minLength={2}
                maxLength={50}
                style={{
                  height: '44px',
                  borderRadius: 'var(--nike-admin-rounded-md)',
                  border: '1px solid var(--nike-hairline)',
                  backgroundColor: 'var(--nike-canvas)',
                  padding: '0 12px',
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '14px',
                  fontWeight: 330,
                  color: 'var(--nike-ink)',
                  outline: 'none',
                  opacity: canEdit ? 1 : 0.6,
                  width: '100%',
                }}
              />
            </div>

            {/* ── 표지(Cover) 오버라이드 ── */}
            <div
              className="flex flex-col gap-4 pt-4"
              style={{ borderTop: '1px solid var(--nike-hairline)' }}
            >
              <p
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '11px',
                  fontWeight: 400,
                  letterSpacing: '0.6px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                }}
              >
                표지 오버라이드
              </p>

              {/* 표지 사용 — 3-state */}
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="cover-enabled"
                  style={{
                    fontFamily: 'var(--nike-font-mono)',
                    fontSize: '11px',
                    fontWeight: 400,
                    letterSpacing: '0.6px',
                    textTransform: 'uppercase',
                    color: 'var(--nike-ink)',
                    opacity: 0.55,
                  }}
                >
                  표지 사용
                </label>
                <select
                  id="cover-enabled"
                  value={coverEnabledMode}
                  disabled={!canEdit}
                  onChange={(e) => setCoverEnabledMode(e.target.value as 'inherit' | 'on' | 'off')}
                  style={{
                    height: '44px',
                    borderRadius: 'var(--nike-admin-rounded-md)',
                    border: '1px solid var(--nike-hairline)',
                    backgroundColor: 'var(--nike-canvas)',
                    padding: '0 12px',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '14px',
                    fontWeight: 330,
                    color: 'var(--nike-ink)',
                    outline: 'none',
                    opacity: canEdit ? 1 : 0.6,
                    width: '100%',
                  }}
                >
                  <option value="inherit">판형 기본값 상속</option>
                  <option value="on">사용</option>
                  <option value="off">미사용</option>
                </select>
              </div>

              {/* 표지 폭/높이 오버라이드 */}
              <div className="flex gap-3">
                <div className="flex flex-col gap-1.5 flex-1">
                  <label
                    htmlFor="cover-width"
                    style={{
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '11px',
                      fontWeight: 400,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: 'var(--nike-ink)',
                      opacity: 0.55,
                    }}
                  >
                    표지 폭 (mm)
                  </label>
                  <input
                    id="cover-width"
                    type="number"
                    inputMode="decimal"
                    value={coverWidthMm}
                    disabled={!canEdit}
                    placeholder="상속"
                    onChange={(e) => setCoverWidthMm(e.target.value)}
                    style={{
                      height: '44px',
                      borderRadius: 'var(--nike-admin-rounded-md)',
                      border: '1px solid var(--nike-hairline)',
                      backgroundColor: 'var(--nike-canvas)',
                      padding: '0 12px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '14px',
                      fontWeight: 330,
                      color: 'var(--nike-ink)',
                      outline: 'none',
                      opacity: canEdit ? 1 : 0.6,
                      width: '100%',
                    }}
                  />
                </div>
                <div className="flex flex-col gap-1.5 flex-1">
                  <label
                    htmlFor="cover-height"
                    style={{
                      fontFamily: 'var(--nike-font-mono)',
                      fontSize: '11px',
                      fontWeight: 400,
                      letterSpacing: '0.6px',
                      textTransform: 'uppercase',
                      color: 'var(--nike-ink)',
                      opacity: 0.55,
                    }}
                  >
                    표지 높이 (mm)
                  </label>
                  <input
                    id="cover-height"
                    type="number"
                    inputMode="decimal"
                    value={coverHeightMm}
                    disabled={!canEdit}
                    placeholder="상속"
                    onChange={(e) => setCoverHeightMm(e.target.value)}
                    style={{
                      height: '44px',
                      borderRadius: 'var(--nike-admin-rounded-md)',
                      border: '1px solid var(--nike-hairline)',
                      backgroundColor: 'var(--nike-canvas)',
                      padding: '0 12px',
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '14px',
                      fontWeight: 330,
                      color: 'var(--nike-ink)',
                      outline: 'none',
                      opacity: canEdit ? 1 : 0.6,
                      width: '100%',
                    }}
                  />
                </div>
              </div>
              <p
                style={{
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '12px',
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                  marginTop: '-6px',
                }}
              >
                비우면 판형 치수를 상속합니다 · 10~1500mm
              </p>

              {/* 세트 활성화 */}
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  id="set-active"
                  aria-checked={isActive}
                  aria-label="세트 활성화"
                  disabled={!canEdit}
                  onClick={() => setIsActive((v) => !v)}
                  className="relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    backgroundColor: isActive ? 'var(--nike-ink)' : 'var(--nike-soft-cloud)',
                    opacity: canEdit ? 1 : 0.6,
                  }}
                >
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block size-5 rounded-full bg-white shadow-sm ring-0 transition-transform ${
                      isActive ? 'translate-x-5' : 'translate-x-0'
                    }`}
                  />
                </button>
                <label
                  htmlFor="set-active"
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '14px',
                    fontWeight: 330,
                    color: 'var(--nike-ink)',
                  }}
                >
                  세트 활성화
                </label>
              </div>
            </div>

            {canEdit && (
              <button
                type="button"
                onClick={handleSave}
                disabled={isSaving}
                className="nike-btn-primary mt-2"
              >
                {isSaving ? '저장 중...' : '저장'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Template 추가 모달 */}
      <Dialog
        open={addModalOpen}
        onOpenChange={(v) => {
          if (!v) setAddModalOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>템플릿 추가</DialogTitle>
            <DialogDescription>추가할 템플릿을 선택하세요.</DialogDescription>
          </DialogHeader>
          <div className="max-h-80 overflow-y-auto">
            {allTemplates.length === 0 ? (
              <p
                className="py-4 text-center"
                style={{
                  fontFamily: 'var(--nike-font-text)',
                  fontSize: '13px',
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                }}
              >
                추가할 수 있는 템플릿이 없습니다.
              </p>
            ) : (
              <div className="flex flex-col gap-1">
                {allTemplates.map((t) => {
                  const isSelected = addSelectedIds.includes(t.id)
                  return (
                    <label
                      key={t.id}
                      className="flex items-center gap-3 cursor-pointer p-2"
                      style={{
                        borderRadius: 'var(--nike-admin-rounded-md)',
                        backgroundColor: isSelected ? 'var(--nike-card-lime)' : 'transparent',
                        transition: 'background-color 100ms ease',
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => {
                          setAddSelectedIds((prev) =>
                            prev.includes(t.id) ? prev.filter((i) => i !== t.id) : [...prev, t.id],
                          )
                        }}
                        style={{ accentColor: 'var(--nike-ink)' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p
                          className="truncate"
                          style={{
                            fontFamily: 'var(--nike-font-text)',
                            fontSize: '14px',
                            fontWeight: 540,
                            color: 'var(--nike-ink)',
                          }}
                        >
                          {t.name}
                        </p>
                        <p
                          style={{
                            fontFamily: 'var(--nike-font-mono)',
                            fontSize: '11px',
                            color: 'var(--nike-ink)',
                            opacity: 0.4,
                          }}
                        >
                          {t.formatName} · 슬롯 {t.slotCount}개
                        </p>
                      </div>
                    </label>
                  )
                })}
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="secondary" size="sm" onClick={() => setAddModalOpen(false)}>
              취소
            </Button>
            <Button size="sm" onClick={confirmAdd} disabled={addSelectedIds.length === 0}>
              추가 ({addSelectedIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* 삭제 확인 */}
      <Dialog
        open={deleteDialogOpen}
        onOpenChange={(v) => {
          if (!v) setDeleteDialogOpen(false)
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>세트 삭제</DialogTitle>
            <DialogDescription>
              <strong>&quot;{set.name}&quot;</strong> 세트를 삭제합니다. 이 작업은 되돌릴 수
              없습니다.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              취소
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDelete} disabled={isDeleting}>
              {isDeleting ? '삭제 중...' : '삭제'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
