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

const STATUS_INFO: Record<string, { label: string; blockColor: string }> = {
  draft: { label: '초안', blockColor: 'var(--nike-hairline-soft)' },
  review: { label: '검수중', blockColor: 'var(--nike-card-cream)' },
  published: { label: '게시됨', blockColor: 'var(--nike-card-mint)' },
  rejected: { label: '거절됨', blockColor: 'var(--nike-card-pink)' },
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

const INPUT_STYLE: React.CSSProperties = {
  height: '40px',
  borderRadius: 'var(--nike-admin-rounded-md)',
  border: '1px solid var(--nike-hairline)',
  backgroundColor: 'var(--nike-canvas)',
  padding: '0 12px',
  fontFamily: 'var(--nike-font-text)',
  fontSize: '14px',
  fontWeight: 320,
  color: 'var(--nike-ink)',
  outline: 'none',
  width: '100%',
}

const LABEL_STYLE: React.CSSProperties = {
  fontFamily: 'var(--nike-font-mono)',
  fontSize: '11px',
  fontWeight: 400,
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
  color: 'var(--nike-ink)',
  opacity: 0.55,
  marginBottom: '6px',
  display: 'block',
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

  const statusInfo = STATUS_INFO[currentStatus]

  return (
    <div className="nike-page" style={{ fontFamily: 'var(--nike-font-text)' }}>
      {/* 헤더 */}
      <div className="mb-8 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <Link
            href="/resources"
            className="mb-4 inline-flex items-center gap-1.5 focus-visible:outline-none focus-visible:ring-2 rounded"
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
            리소스 목록
          </Link>
          <p
            className="nike-eyebrow"
            style={{
              color: 'var(--nike-ink)',
              opacity: 0.4,
              marginBottom: 'var(--nike-admin-space-xs)',
              fontSize: '12px',
            }}
          >
            ADMIN / RESOURCES / EDIT
          </p>
          <h1
            className="nike-heading-lg"
            style={{
              color: 'var(--nike-ink)',
              marginBottom: 'var(--nike-admin-space-xs)',
              fontFamily: 'var(--nike-font-mono)',
            }}
          >
            {resource.slug}
          </h1>
          <div className="flex items-center gap-2 flex-wrap">
            <span
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '13px',
                fontWeight: 330,
                color: 'var(--nike-ink)',
                opacity: 0.55,
              }}
            >
              {KIND_LABELS[resource.kind] ?? resource.kind}
            </span>
            <span style={{ color: 'var(--nike-hairline)' }}>·</span>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                padding: '2px 8px',
                borderRadius: 'var(--nike-rounded-full)',
                backgroundColor: statusInfo?.blockColor ?? 'var(--nike-hairline-soft)',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '12px',
                fontWeight: 480,
                color: 'var(--nike-ink)',
              }}
            >
              {statusInfo?.label ?? currentStatus}
            </span>
            {resource.lowDpi && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '2px 8px',
                  borderRadius: 'var(--nike-rounded-full)',
                  backgroundColor: 'var(--nike-card-coral)',
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '11px',
                  color: 'var(--nike-ink)',
                }}
              >
                저해상도
              </span>
            )}
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
                className="nike-btn-primary focus-visible:outline-none focus-visible:ring-2"
                style={{
                  gap: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  backgroundColor: 'var(--nike-success)',
                  opacity: isPublishing ? 0.6 : undefined,
                }}
              >
                <Check className="size-4" aria-hidden="true" />
                {isPublishing ? '처리 중...' : '게시'}
              </button>
              <button
                type="button"
                onClick={() => setShowRejectModal(true)}
                className="nike-btn-secondary focus-visible:outline-none focus-visible:ring-2"
                style={{
                  gap: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  borderColor: 'var(--nike-sale)',
                  color: 'var(--nike-sale)',
                }}
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
              className="nike-btn-secondary focus-visible:outline-none focus-visible:ring-2"
              style={{
                gap: '8px',
                display: 'inline-flex',
                alignItems: 'center',
                borderColor: 'var(--nike-sale)',
                color: 'var(--nike-sale)',
                opacity: isDeleting ? 0.6 : undefined,
              }}
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
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--nike-admin-rounded-md)',
            backgroundColor:
              message.type === 'success' ? 'var(--nike-card-mint)' : 'var(--nike-card-pink)',
            border:
              message.type === 'success'
                ? '1px solid color-mix(in srgb, var(--nike-success) 28%, var(--nike-canvas))'
                : '1px solid color-mix(in srgb, var(--nike-sale) 28%, var(--nike-canvas))',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 330,
            color: message.type === 'success' ? 'var(--nike-success)' : 'var(--nike-sale-deep)',
          }}
        >
          {message.text}
        </div>
      )}

      {/* 거절 사유 표시 */}
      {currentStatus === 'rejected' && poseMeta.rejectionReason && (
        <div
          style={{
            marginBottom: '16px',
            padding: '10px 14px',
            borderRadius: 'var(--nike-admin-rounded-md)',
            backgroundColor: 'var(--nike-card-pink)',
            border: '1px solid color-mix(in srgb, var(--nike-sale) 28%, var(--nike-canvas))',
            fontFamily: 'var(--nike-font-text)',
            fontSize: '14px',
            fontWeight: 330,
            color: 'var(--nike-sale-deep)',
          }}
        >
          거절 사유: {poseMeta.rejectionReason}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* 좌측: 이미지 + 키포인트 */}
        <div className="flex flex-col gap-6">
          <div>
            <h2
              style={{
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'var(--nike-ink)',
                opacity: 0.55,
                marginBottom: '12px',
              }}
            >
              키포인트 편집
            </h2>
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
                  className="nike-btn-primary focus-visible:outline-none focus-visible:ring-2"
                  style={{
                    gap: '8px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    opacity: isSavingKp ? 0.6 : undefined,
                  }}
                >
                  {isSavingKp ? '저장 중...' : '키포인트 저장'}
                </button>
              </div>
            )}
          </div>

          {/* 파일 정보 */}
          <div
            style={{
              borderRadius: 'var(--nike-admin-rounded-lg)',
              border: '1px solid var(--nike-hairline)',
              padding: '16px',
              backgroundColor: 'var(--nike-canvas)',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '11px',
                fontWeight: 400,
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                color: 'var(--nike-ink)',
                opacity: 0.55,
                marginBottom: '12px',
              }}
            >
              파일 정보
            </h3>
            <dl
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '8px 16px',
              }}
            >
              {[
                { label: '원본 파일명', value: resource.originalFilename, mono: true },
                {
                  label: '크기',
                  value: `${resource.width ?? '?'} × ${resource.height ?? '?'} px`,
                  mono: false,
                },
                { label: '추정 DPI', value: String(resource.masterDpi ?? '-'), mono: false },
                { label: '포맷', value: resource.format.toUpperCase(), mono: false },
                {
                  label: '등록일',
                  value: new Date(resource.createdAt).toLocaleDateString('ko-KR'),
                  mono: false,
                },
              ].map(({ label, value, mono }) => (
                <React.Fragment key={label}>
                  <dt
                    style={{
                      fontFamily: 'var(--nike-font-text)',
                      fontSize: '12px',
                      fontWeight: 330,
                      color: 'var(--nike-ink)',
                      opacity: 0.45,
                    }}
                  >
                    {label}
                  </dt>
                  <dd
                    style={{
                      fontFamily: mono ? 'var(--nike-font-mono)' : 'var(--nike-font-text)',
                      fontSize: '12px',
                      fontWeight: mono ? 400 : 330,
                      color: 'var(--nike-ink)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {value}
                  </dd>
                </React.Fragment>
              ))}
            </dl>
          </div>
        </div>

        {/* 우측: 메타 폼 */}
        <div className="flex flex-col gap-6">
          <h2
            style={{
              fontFamily: 'var(--nike-font-mono)',
              fontSize: '11px',
              fontWeight: 400,
              letterSpacing: '0.5px',
              textTransform: 'uppercase',
              color: 'var(--nike-ink)',
              opacity: 0.55,
            }}
          >
            메타 편집
          </h2>

          {/* 태그 */}
          <div className="flex flex-col gap-1.5">
            <label style={LABEL_STYLE}>태그</label>
            <div
              className="flex flex-wrap gap-1.5 focus-within:ring-2"
              style={{
                minHeight: '44px',
                borderRadius: 'var(--nike-admin-rounded-md)',
                border: '1px solid var(--nike-hairline)',
                backgroundColor: 'var(--nike-canvas)',
                padding: '8px 12px',
                opacity: !canEdit ? 0.6 : 1,
              }}
            >
              {tags.map((tag) => (
                <span
                  key={tag}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 8px',
                    borderRadius: 'var(--nike-rounded-full)',
                    backgroundColor: 'var(--nike-card-lime)',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '12px',
                    fontWeight: 480,
                    color: 'var(--nike-ink)',
                  }}
                >
                  {tag}
                  {canEdit && (
                    <button
                      type="button"
                      onClick={() => setTags((prev) => prev.filter((t) => t !== tag))}
                      aria-label={`태그 ${tag} 삭제`}
                      style={{
                        background: 'none',
                        border: 'none',
                        cursor: 'pointer',
                        color: 'var(--nike-ink)',
                        opacity: 0.6,
                        padding: 0,
                        lineHeight: 1,
                      }}
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
                  style={{
                    flex: 1,
                    minWidth: '64px',
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '14px',
                    fontWeight: 320,
                    color: 'var(--nike-ink)',
                  }}
                />
              )}
            </div>
          </div>

          {/* 포즈 메타 */}
          {resource.kind === 'pose' && (
            <fieldset
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                padding: '20px',
                borderRadius: 'var(--nike-admin-rounded-lg)',
                border: '1px solid var(--nike-hairline)',
                backgroundColor: 'var(--nike-soft-cloud)',
              }}
            >
              <legend
                style={{
                  fontFamily: 'var(--nike-font-mono)',
                  fontSize: '11px',
                  fontWeight: 400,
                  letterSpacing: '0.5px',
                  textTransform: 'uppercase',
                  color: 'var(--nike-ink)',
                  opacity: 0.55,
                  padding: '0 4px',
                }}
              >
                포즈 메타
              </legend>

              <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="edit-bodyType" style={LABEL_STYLE}>
                    신체 유형
                  </label>
                  <select
                    id="edit-bodyType"
                    value={bodyType}
                    onChange={(e) => canEdit && setBodyType(e.target.value)}
                    disabled={!canEdit}
                    style={{ ...INPUT_STYLE, opacity: !canEdit ? 0.6 : 1 }}
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
                  <label htmlFor="edit-view" style={LABEL_STYLE}>
                    시점
                  </label>
                  <select
                    id="edit-view"
                    value={view}
                    onChange={(e) => canEdit && setView(e.target.value)}
                    disabled={!canEdit}
                    style={{ ...INPUT_STYLE, opacity: !canEdit ? 0.6 : 1 }}
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
                <label htmlFor="edit-action" style={LABEL_STYLE}>
                  액션 키
                </label>
                <input
                  id="edit-action"
                  type="text"
                  value={action}
                  onChange={(e) => canEdit && setAction(e.target.value)}
                  disabled={!canEdit}
                  placeholder="예: 걷기, 놀람, 싸움"
                  style={{ ...INPUT_STYLE, opacity: !canEdit ? 0.6 : 1 }}
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={flippable}
                  onClick={() => canEdit && setFlippable((v) => !v)}
                  disabled={!canEdit}
                  className="focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  style={{
                    position: 'relative',
                    display: 'inline-flex',
                    height: '24px',
                    width: '44px',
                    borderRadius: 'var(--nike-rounded-full)',
                    border: '2px solid transparent',
                    backgroundColor: flippable ? 'var(--nike-ink)' : 'var(--nike-hairline)',
                    transition: 'background-color 150ms ease',
                    cursor: canEdit ? 'pointer' : 'not-allowed',
                    flexShrink: 0,
                    opacity: !canEdit ? 0.6 : 1,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: '20px',
                      height: '20px',
                      borderRadius: 'var(--nike-rounded-full)',
                      backgroundColor: 'var(--nike-canvas)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                      transform: flippable ? 'translateX(20px)' : 'translateX(0)',
                      transition: 'transform 150ms ease',
                    }}
                  />
                </button>
                <span
                  style={{
                    fontFamily: 'var(--nike-font-text)',
                    fontSize: '14px',
                    fontWeight: 330,
                    color: 'var(--nike-ink)',
                    opacity: 0.7,
                  }}
                >
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
                className="nike-btn-primary focus-visible:outline-none focus-visible:ring-2"
                style={{
                  gap: '8px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: isSaving ? 0.6 : undefined,
                }}
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
          className="fixed inset-0 z-50 flex items-center justify-center"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
        >
          <div
            style={{
              backgroundColor: 'var(--nike-canvas)',
              borderRadius: 'var(--nike-admin-rounded-lg)',
              padding: '24px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              width: '100%',
              maxWidth: '420px',
              margin: '0 16px',
            }}
          >
            <h3
              style={{
                fontFamily: 'var(--nike-font-text)',
                fontSize: '18px',
                fontWeight: 540,
                letterSpacing: '-0.26px',
                color: 'var(--nike-ink)',
                marginBottom: '16px',
              }}
            >
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
              style={{
                width: '100%',
                borderRadius: 'var(--nike-admin-rounded-md)',
                border: '1px solid var(--nike-hairline)',
                backgroundColor: 'var(--nike-canvas)',
                padding: '10px 12px',
                fontFamily: 'var(--nike-font-text)',
                fontSize: '14px',
                fontWeight: 320,
                color: 'var(--nike-ink)',
                outline: 'none',
                resize: 'vertical',
                minHeight: '112px',
              }}
              className="focus-visible:ring-2"
            />
            <p
              style={{
                fontFamily: 'var(--nike-font-mono)',
                fontSize: '11px',
                color: 'var(--nike-ink)',
                opacity: 0.4,
                marginTop: '4px',
                letterSpacing: '0.3px',
              }}
            >
              Ctrl+Enter 로 확인
            </p>
            <div className="mt-4 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowRejectModal(false)}
                className="nike-btn-secondary focus-visible:outline-none focus-visible:ring-2"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => void handleRejectConfirm()}
                disabled={isRejecting || rejectReason.trim().length < 5}
                className="nike-btn-primary focus-visible:outline-none focus-visible:ring-2"
                style={{
                  backgroundColor: 'var(--nike-sale)',
                  opacity: isRejecting || rejectReason.trim().length < 5 ? 0.5 : undefined,
                }}
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
