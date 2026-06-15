'use client'

/**
 * components/legal/ConsentCheckbox.tsx — 동의 체크박스 (LEGAL-04)
 *
 * 개인정보보호법(PIPA) 준수: 이용약관 동의와 개인정보 수집·이용 동의는 각각 별도로,
 * 명시적(opt-in) 체크로 받아야 한다. 이 컴포넌트는 [필수]/[선택] 라벨 + 정책 링크를
 * 포함한 단일 동의 항목을 렌더한다. 제어 컴포넌트(checked/onChange).
 */
import * as React from 'react'

interface ConsentCheckboxProps {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  /** true=[필수], false=[선택] */
  required?: boolean
  disabled?: boolean
  /** 미동의 상태에서 제출 시도 시 강조 */
  error?: boolean
  /** 라벨 본문(정책 링크 포함 가능) */
  children: React.ReactNode
}

export function ConsentCheckbox({
  id,
  checked,
  onChange,
  required = false,
  disabled = false,
  error = false,
  children,
}: ConsentCheckboxProps) {
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--mkt-space-xs)' }}>
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        aria-invalid={error}
        style={{
          marginTop: '3px',
          accentColor: 'var(--mkt-ink)',
          width: '16px',
          height: '16px',
          flexShrink: 0,
          cursor: disabled ? 'default' : 'pointer',
          outline: error ? '2px solid var(--mkt-sale, #d30005)' : undefined,
          outlineOffset: '2px',
          borderRadius: '2px',
        }}
      />
      <label
        htmlFor={id}
        style={{
          fontFamily: 'var(--mkt-font-sans)',
          fontSize: '13px',
          fontWeight: 330,
          lineHeight: 1.5,
          color: 'var(--mkt-ink)',
          opacity: 0.75,
          cursor: disabled ? 'default' : 'pointer',
        }}
      >
        <span
          style={{
            fontWeight: 600,
            color: required ? 'var(--mkt-sale, #d30005)' : 'var(--mkt-ink)',
            opacity: required ? 1 : 0.5,
            marginRight: '4px',
          }}
        >
          [{required ? '필수' : '선택'}]
        </span>
        {children}
      </label>
    </div>
  )
}
