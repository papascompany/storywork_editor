'use client'

/**
 * SaveLoginGateModal — 저장/공유 시 로그인 유도 모달
 *
 * 익명 편집 후 저장을 시도할 때 표시한다.
 * 닫아도 작품은 sessionStorage 에 보존되어 있으므로 로그인 후 복원 가능.
 *
 * CTA:
 *   - 회원가입으로 시작 → /signup?next=/editor
 *   - 로그인           → /login?next=/editor
 *   - 닫기             → 모달만 닫음 (작품 보존)
 *
 * 접근성:
 *   - 첫 CTA 버튼에 autoFocus
 *   - ESC 로 닫힘 (Dialog 기본 동작)
 *   - 외부 클릭으로 닫힘
 */

import { cn } from '@storywork/ui'
import { BookOpen, Lock, X } from 'lucide-react'
import React, { useEffect, useRef } from 'react'

// ─── Props ────────────────────────────────────────────────────────────────────

export type SaveLoginGateModalProps = {
  open: boolean
  onClose: () => void
}

// ─── 컴포넌트 ─────────────────────────────────────────────────────────────────

export function SaveLoginGateModal({ open, onClose }: SaveLoginGateModalProps) {
  const primaryBtnRef = useRef<HTMLButtonElement>(null)
  const backdropRef = useRef<HTMLDivElement>(null)

  // 열릴 때 첫 CTA 에 포커스
  useEffect(() => {
    if (open) {
      // 약간의 delay 로 애니메이션 완료 후 포커스
      const t = setTimeout(() => primaryBtnRef.current?.focus(), 60)
      return () => clearTimeout(t)
    }
  }, [open])

  // ESC 키로 닫기
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // body 스크롤 잠금
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
      return () => {
        document.body.style.overflow = ''
      }
    }
  }, [open])

  if (!open) return null

  const handleSignup = () => {
    window.location.href = '/signup?next=/editor'
  }

  const handleLogin = () => {
    window.location.href = '/login?next=/editor'
  }

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === backdropRef.current) {
      onClose()
    }
  }

  return (
    // 백드롭
    <div
      ref={backdropRef}
      className={cn(
        'fixed inset-0 z-[200]',
        'flex items-center justify-center',
        'bg-black/50 backdrop-blur-sm',
        'px-4',
      )}
      onClick={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="save-gate-title"
      aria-describedby="save-gate-desc"
    >
      {/* 모달 패널 */}
      <div
        className={cn(
          'relative w-full max-w-md',
          'rounded-[var(--radius-lg,1rem)]',
          'bg-[var(--color-surface)]',
          'border border-[var(--color-border)]',
          'shadow-[var(--elevation-e3,0_8px_32px_rgba(0,0,0,0.18))]',
          'p-6',
          'flex flex-col items-center gap-5',
        )}
        // 클릭 이벤트가 백드롭까지 버블링되지 않도록
        onClick={(e) => e.stopPropagation()}
      >
        {/* 닫기 버튼 */}
        <button
          type="button"
          onClick={onClose}
          aria-label="모달 닫기"
          className={cn(
            'absolute right-4 top-4',
            'flex items-center justify-center',
            'size-8 rounded-full',
            'text-[var(--color-text-muted)]',
            'hover:bg-[var(--color-surface-muted)] hover:text-[var(--color-text)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)]',
          )}
        >
          <X className="size-4" aria-hidden="true" />
        </button>

        {/* 일러스트 아이콘 */}
        <div
          className={cn(
            'flex items-center justify-center',
            'size-16 rounded-full',
            'bg-[var(--color-brand-50,#f0f0ff)]',
          )}
          aria-hidden="true"
        >
          <div className="relative">
            <BookOpen className="size-8 text-[var(--color-brand-400,#7c7cf0)]" aria-hidden="true" />
            <Lock
              className={cn(
                'absolute -bottom-0.5 -right-1',
                'size-4',
                'text-[var(--color-brand-600,#5b5bd6)]',
                'bg-[var(--color-brand-50,#f0f0ff)]',
                'rounded-full p-0.5',
              )}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* 제목 */}
        <div className="text-center">
          <h2
            id="save-gate-title"
            className={cn('text-lg font-bold leading-snug', 'text-[var(--color-text)]', 'mb-2')}
          >
            지금 작품을 저장하려면 로그인이 필요해요
          </h2>
          <p
            id="save-gate-desc"
            className={cn('text-sm leading-relaxed', 'text-[var(--color-text-muted)]')}
          >
            익명으로 편집은 자유롭게 하셨어요.
            <br />
            <strong className="font-medium text-[var(--color-text)]">저장 · 공유 · PDF 출력</strong>
            은 가입한 회원만 가능합니다.
            <br />
            <span className="text-[var(--color-text-subtle,var(--color-text-muted))]">
              (닫으면 작품은 그대로 보존됩니다)
            </span>
          </p>
        </div>

        {/* CTA 버튼 그룹 */}
        <div className="flex w-full flex-col gap-2.5">
          {/* 회원가입 (primary pill) */}
          <button
            ref={primaryBtnRef}
            type="button"
            onClick={handleSignup}
            className={cn(
              'w-full',
              'rounded-full',
              'bg-[var(--color-brand-500,#6b6bf0)]',
              'px-6 py-3',
              'text-sm font-semibold text-white',
              'shadow-sm',
              'hover:bg-[var(--color-brand-600,#5b5bd6)]',
              'active:scale-[0.98]',
              'transition-all duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
              // 터치 타겟
              'min-h-[2.75rem]',
            )}
          >
            회원가입으로 시작
          </button>

          {/* 로그인 (secondary) */}
          <button
            type="button"
            onClick={handleLogin}
            className={cn(
              'w-full',
              'rounded-full',
              'border border-[var(--color-border)]',
              'bg-[var(--color-surface-muted)]',
              'px-6 py-3',
              'text-sm font-medium text-[var(--color-text)]',
              'hover:bg-[var(--color-surface)] hover:border-[var(--color-brand-300,#a5a5f7)]',
              'active:scale-[0.98]',
              'transition-all duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2',
              'min-h-[2.75rem]',
            )}
          >
            이미 계정이 있어요 — 로그인
          </button>

          {/* 닫기 (text) */}
          <button
            type="button"
            onClick={onClose}
            className={cn(
              'w-full py-2',
              'text-sm text-[var(--color-text-muted)]',
              'hover:text-[var(--color-text)]',
              'transition-colors duration-[var(--duration-fast)]',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-brand-500)] focus-visible:ring-offset-2 rounded',
              'min-h-[2.75rem]',
            )}
          >
            지금은 괜찮아요, 계속 편집할게요
          </button>
        </div>
      </div>
    </div>
  )
}
