'use client'

/**
 * ResourceEditClient — 리소스 메타 편집 + 키포인트 보정
 */

import { ArrowLeft, Check, Trash2, X } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import * as React from 'react'

import { KeypointEditor } from '../../../../src/components/keypoint-editor/KeypointEditor'
import type { AdminRole } from '../../../../src/lib/auth'
import type { Keypoint } from '../../../../src/lib/schemas/resource'

// ─── 타입 ────────────────────────────────────────────────────────────────────

export interface ResourceDetail {
  id: string
  slug: string
  originalFilename: string
  kind: string
  format: string
  ownerType: string
  ownerId: string | null
  fileUrl: string
  thumbUrl: string | null
  variants: Record<string, string> | null
  width: number | null
  height: number | null
  masterDpi: number | null
  lowDpi: boolean
  meta: Record<string, unknown>
  tags: string[]
  status: string
  createdAt: string
  updatedAt: string
}

interface ResourceEditClientProps {
  resource: ResourceDetail
  userRole: AdminRole
}

// ─── 상태 배지 ───────────────────────────────────────────────────────────────

const STATUS_INFO: Record<string, { label: string; className: string }> = {
  draft: {
    label: '초안',
    className:
      'bg-[var(--color-surface-muted)] text-[var(--color-text-muted)] border border-[var(--color-border)]',
  },
  review: { label: '검수중', className: 'bg-amber-100 text-amber-700' },
  published: { label: '게시됨', className: 'bg-green-100 text-green-700' },
  rejected: { label: '거절됨', className: 'bg-red-100 text-red-700' },
}

const KIND_LABELS: Record<string, string> = {
  pose: '포즈',
  background: '배경',
  'mise-en-scene': '미장센',
  prop: '소품',
  'speech-bubble': '말풍선',
  'word-fx': '워드효과',
  decoration: '꾸미기',
}

// ─── ResourceEditClient ───────────────────────────────────────────────────────

export function ResourceEditClient({ resource, userRole }: ResourceEditClientProps) {
  const router = useRouter()
  const canEdit = userRole === 'superadmin' || userRole === 'curator'
  const canDelete = userRole === 'superadmin'

  // ── 상태 ──
  const [tags, setTags] = React.useState<string[]>(resource.tags)
  const [tagInput, setTagInput] = React.useState('')
  const [keypoints, setKeypoints] = React.useState<Keypoint[]>(
    (resource.meta['keypoints'] as Keypoint[] | undefined) ?? [],
  )

  // 포즈 메타
  const poseMeta = resource.meta as {
    bodyType?: string
    view?: string
    action?: string
    flippable?: boolean
    rejectionReason?: string
  }
  const [bodyType, setBodyType] = React.useState(poseMeta.bodyType ?? '')
  const [view, setView] = React.useState(poseMeta.view ?? '')
  const [action, setAction] = React.useState(poseMeta.action ?? '')
  const [flippable, setFlippable] = React.useState(poseMeta.flippable !== false)

  // ── UI 상태 ──
  const [isSaving, setIsSaving] = React.useState(false)
  const [isSavingKp, setIsSavingKp] = React.useState(false)
  const [isPublishing, setIsPublishing] = React.useState(false)
  const [isRejecting, setIsRejecting] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [rejectReason, setRejectReason] = React.useState('')
  const [showRejectModal, setShowRejectModal] = React.useState(false)
  const [message, setMessage] = React.useState<{ text: string; type: 'success' | 'error' } | null>(
    null,
  )
  const [currentStatus, setCurrentStatus] = React.useState(resource.status)

  const showMsg = (text: string, type: 'success' | 'error') => {
    setMessage({ text, type })
    setTimeout(() => setMessage(null), 3000)
  }

  const addTag = (tag: string) => {
    const t = tag.trim()
    if (t && !tags.includes(t) && tags.length < 20) setTags((prev) => [...prev, t])
    setTagInput('')
  }

  // ── 메타 저장 ──
  const handleSaveMeta = async () => {
    setIsSaving(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tags,
          meta:
            resource.kind === 'pose'
              ? {
                  bodyType: bodyType || undefined,
                  view: view || undefined,
                  action: action || undefined,
                  flippable,
                }
              : {},
        }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? '저장 실패')
      }
      showMsg('저장되었습니다.', 'success')
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '저장 중 오류', 'error')
    } finally {
      setIsSaving(false)
    }
  }

  // ── 키포인트 저장 ──
  const handleSaveKeypoints = async () => {
    if (keypoints.length === 0) {
      showMsg('키포인트가 없습니다.', 'error')
      return
    }
    setIsSavingKp(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}/keypoints`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ keypoints }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? '키포인트 저장 실패')
      }
      showMsg('키포인트가 저장되었습니다.', 'success')
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '저장 중 오류', 'error')
    } finally {
      setIsSavingKp(false)
    }
  }

  // ── 게시 ──
  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}/publish`, { method: 'POST' })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? '게시 실패')
      }
      setCurrentStatus('published')
      showMsg('게시되었습니다.', 'success')
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '게시 중 오류', 'error')
    } finally {
      setIsPublishing(false)
    }
  }

  // ── 거절 ──
  const handleRejectConfirm = async () => {
    if (!rejectReason.trim() || rejectReason.trim().length < 5) {
      showMsg('거절 사유는 5자 이상이어야 합니다.', 'error')
      return
    }
    setIsRejecting(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectReason }),
      })
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? '거절 실패')
      }
      setCurrentStatus('rejected')
      setShowRejectModal(false)
      showMsg('거절되었습니다.', 'success')
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '거절 중 오류', 'error')
    } finally {
      setIsRejecting(false)
    }
  }

  // ── 삭제 ──
  const handleDelete = async () => {
    if (!confirm(`"${resource.slug}" 을(를) 삭제합니까? 이 작업은 되돌릴 수 없습니다.`)) return
    setIsDeleting(true)
    try {
      const res = await fetch(`/api/resources/${resource.id}`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) {
        const err = (await res.json().catch(() => ({}))) as { error?: { message?: string } }
        throw new Error(err.error?.message ?? '삭제 실패')
      }
      router.push('/resources')
    } catch (err) {
      showMsg(err instanceof Error ? err.message : '삭제 중 오류', 'error')
      setIsDeleting(false)
    }
  }

  const canTransition = ['draft', 'review'].includes(currentStatus)
  const imageUrl =
    resource.variants?.['webp2x'] ?? resource.variants?.['webp1x'] ?? resource.fileUrl

  return (
    <div className="p-6 lg:p-8">
      {/* 헤더 */}
      <div className="mb-6 flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            href="/resources"
            className="text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded"
            aria-label="목록으로"
          >
            <ArrowLeft className="size-5" />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-[var(--color-text)] font-mono">
              {resource.slug}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-[var(--color-text-muted)]">
                {KIND_LABELS[resource.kind] ?? resource.kind}
              </span>
              <span className="text-xs text-[var(--color-text-disabled)]">·</span>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_INFO[currentStatus]?.className ?? ''}`}
              >
                {STATUS_INFO[currentStatus]?.label ?? currentStatus}
              </span>
              {resource.lowDpi && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">
                  저해상도
                </span>
              )}
            </div>
          </div>
        </div>

        {/* 액션 버튼 */}
        <div className="flex items-center gap-2 flex-wrap">
          {canEdit && canTransition && (
            <>
              <button
                type="button"
                onClick={() => void handlePublish()}
                disabled={isPublishing}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-500"
              >
                <Check className="size-4" aria-hidden="true" />
                {isPublishing ? '처리 중...' : '게시'}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                <X className="size-4" aria-hidden="true" />
                거절
              </button>
            </>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={isDeleting}
              className="inline-flex items-center gap-2 rounded-[var(--radius-md)] border border-red-300 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
            >
              <Trash2 className="size-4" aria-hidden="true" />
              {isDeleting ? '삭제 중...' : '삭제'}
            </button>
          )}
        </div>
      </div>

      {/* 알림 */}
      {message && (
        <div
          role="alert"
          className={`mb-4 px-4 py-3 rounded-[var(--radius-md)] text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}
        >
          {message.text}
        </div>
      )}

      {/* 거절 사유 표시 */}
      {currentStatus === 'rejected' && poseMeta.rejectionReason && (
        <div className="mb-4 px-4 py-3 rounded-[var(--radius-md)] bg-red-50 border border-red-200 text-sm text-red-700">
          거절 사유: {poseMeta.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 좌측: 이미지 + 키포인트 */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold text-[var(--color-text)] mb-3">키포인트 편집</h2>
            <KeypointEditor
              imageUrl={imageUrl}
              width={resource.width ?? 750}
              height={resource.height ?? 750}
              keypoints={keypoints}
              onChange={setKeypoints}
              readonly={!canEdit}
            />
            {canEdit && (
              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  onClick={() => void handleSaveKeypoints()}
                  disabled={isSavingKp}
                  className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-4 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
                >
                  {isSavingKp ? '저장 중...' : '키포인트 저장'}
                </button>
              </div>
            )}
          </div>

          {/* 파일 정보 */}
          <div className="rounded-[var(--radius-lg)] border border-[var(--color-border)] p-4 bg-[var(--color-surface)] text-sm">
            <h3 className="font-medium text-[var(--color-text)] mb-3">파일 정보</h3>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
              <dt className="text-[var(--color-text-muted)]">원본 파일명</dt>
              <dd className="text-[var(--color-text)] font-mono truncate">
                {resource.originalFilename}
              </dd>
              <dt className="text-[var(--color-text-muted)]">크기</dt>
              <dd className="text-[var(--color-text)]">
                {resource.width ?? '?'} × {resource.height ?? '?'} px
              </dd>
              <dt className="text-[var(--color-text-muted)]">추정 DPI</dt>
              <dd className="text-[var(--color-text)]">{resource.masterDpi ?? '-'}</dd>
              <dt className="text-[var(--color-text-muted)]">포맷</dt>
              <dd className="text-[var(--color-text)] uppercase">{resource.format}</dd>
              <dt className="text-[var(--color-text-muted)]">등록일</dt>
              <dd className="text-[var(--color-text)]">
                {new Date(resource.createdAt).toLocaleDateString('ko-KR')}
              </dd>
            </dl>
          </div>
        </div>

        {/* 우측: 메타 폼 */}
        <div className="flex flex-col gap-6">
          <h2 className="text-base font-semibold text-[var(--color-text)]">메타 편집</h2>

          {/* 태그 */}
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--color-text)]">태그</label>
            <div
              className={`flex flex-wrap gap-1.5 min-h-[2.75rem] rounded-[var(--radius-md)] border bg-[var(--color-surface)] px-3 py-2 focus-within:ring-2 focus-within:ring-[var(--color-brand-500)] ${!canEdit ? 'opacity-60' : 'border-[var(--color-border)]'}`}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full bg-[var(--color-brand-100)] text-[var(--color-brand-700)]"
                >
                  {tag}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`태그 ${tag} 삭제`}
                      className="focus-visible:outline-none"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
              {canEdit && (
                <input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault()
                      addTag(tagInput)
                    }
                  }}
                  onBlur={() => {
                    if (tagInput.trim()) addTag(tagInput)
                  }}
                  placeholder={tags.length === 0 ? '태그 입력 후 Enter' : ''}
                  className="flex-1 min-w-[4rem] bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus:outline-none"
                />
              )}
            </div>
          </div>

          {/* 포즈 메타 */}
          {resource.kind === 'pose' && (
            <fieldset className="flex flex-col gap-4 p-4 rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-surface-muted)]">
              <legend className="text-sm font-medium text-[var(--color-text)] px-2">
                포즈 메타
              </legend>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-bodyType" className="text-sm text-[var(--color-text-muted)]">
                    신체 유형
                  </label>
                  <select
                    id="edit-bodyType"
                    value={bodyType}
                    onChange={(e) => canEdit && setBodyType(e.target.value)}
                    disabled={!canEdit}
                    className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
                  >
                    <option value="">선택 안 함</option>
                    <option value="M">남성 (M)</option>
                    <option value="F">여성 (F)</option>
                    <option value="child">어린이</option>
                    <option value="beast">동물/괴물</option>
                    <option value="unknown">미분류</option>
                  </select>
                </div>
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-view" className="text-sm text-[var(--color-text-muted)]">
                    시점
                  </label>
                  <select
                    id="edit-view"
                    value={view}
                    onChange={(e) => canEdit && setView(e.target.value)}
                    disabled={!canEdit}
                    className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
                  >
                    <option value="">선택 안 함</option>
                    <option value="front">정면</option>
                    <option value="side">측면</option>
                    <option value="back">후면</option>
                    <option value="three-quarter">3/4</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="edit-action" className="text-sm text-[var(--color-text-muted)]">
                  액션 키
                </label>
                <input
                  id="edit-action"
                  type="text"
                  value={action}
                  onChange={(e) => canEdit && setAction(e.target.value)}
                  disabled={!canEdit}
                  placeholder="예: 걷기, 놀람, 싸움"
                  className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] disabled:opacity-60"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={flippable}
                  onClick={() => canEdit && setFlippable((v) => !v)}
                  disabled={!canEdit}
                  className={`relative inline-flex h-6 w-11 rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 disabled:opacity-60 ${flippable ? 'bg-[var(--color-brand-500)]' : 'bg-[var(--color-surface-muted)]'}`}
                >
                  <span
                    className={`inline-block size-5 rounded-full bg-white shadow-sm transition-transform ${flippable ? 'translate-x-5' : 'translate-x-0'}`}
                  />
                </button>
                <span className="text-sm text-[var(--color-text-muted)]">
                  좌우 반전 허용 (flippable)
                </span>
              </div>
            </fieldset>
          )}

          {canEdit && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => void handleSaveMeta()}
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-[var(--radius-md)] bg-[var(--color-brand-500)] px-5 py-2 text-sm font-medium text-white hover:bg-[var(--color-brand-600)] disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]"
              >
                {isSaving ? '저장 중...' : '메타 저장'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 거절 모달 */}
      {showRejectModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="거절 사유 입력"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
        >
          <div className="bg-[var(--color-surface)] rounded-[var(--radius-lg)] p-6 shadow-xl w-full max-w-md mx-4">
            <h3 className="text-base font-semibold text-[var(--color-text)] mb-4">
              거절 사유 입력
            </h3>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) void handleRejectConfirm()
                if (e.key === 'Escape') setShowRejectModal(false)
              }}
              placeholder="거절 사유를 입력하세요 (최소 5자)"
              rows={4}
              autoFocus
              className="w-full rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-disabled)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] resize-y min-h-[7rem]"
            />
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">Ctrl+Enter 로 확인</p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="px-4 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] rounded-[var(--radius-md)]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleRejectConfirm()}
                disabled={isRejecting || rejectReason.trim().length < 5}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-[var(--radius-md)] hover:bg-red-700 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500"
              >
                {isRejecting ? '처리 중...' : '거절 확정'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
