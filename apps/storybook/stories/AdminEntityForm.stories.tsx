/**
 * Admin / EntityForm 스토리
 *
 * M3-02 EntityForm — Zod 스키마 → 자동 폼 데모.
 * Resource 스키마 하나로 위젯 자동 생성 과정을 시연.
 */

import type { Meta, StoryObj } from '@storybook/react'
import * as React from 'react'
import { z } from 'zod'

import { EntityForm } from '../../admin/src/components/entity-form/EntityForm'

// ─── 리소스 Zod 스키마 예시 ──────────────────────────────────────────────────

const resourceSchema = z.object({
  name: z.string().min(1, '이름은 필수입니다'),
  description: z.string().min(50, '설명은 50자 이상 입력하세요'),
  kind: z.enum(['pose', 'background', 'prop', 'speech-bubble', 'word-fx', 'decoration']),
  status: z.enum(['draft', 'published', 'rejected']),
  tags: z.array(z.string()),
  flippable: z.boolean(),
  masterDpi: z.number().min(72, '최소 72 DPI'),
})

const fieldMeta: Parameters<typeof EntityForm>[0]['fieldMeta'] = {
  name: { label: '리소스 이름', placeholder: '예: 놀란 여자 정면', autoFocus: true },
  description: { label: '설명', placeholder: '리소스에 대한 자세한 설명 (50자 이상)' },
  kind: {
    label: '종류',
    options: [
      { value: 'pose', label: '포즈' },
      { value: 'background', label: '배경' },
      { value: 'prop', label: '소품' },
      { value: 'speech-bubble', label: '말풍선' },
      { value: 'word-fx', label: '워드효과' },
      { value: 'decoration', label: '꾸미기' },
    ],
  },
  status: {
    label: '상태',
    options: [
      { value: 'draft', label: '초안' },
      { value: 'published', label: '게시됨' },
      { value: 'rejected', label: '거절됨' },
    ],
  },
  tags: { label: '태그', placeholder: 'Enter 로 추가' },
  flippable: { label: '좌우 반전 허용' },
  masterDpi: { label: '마스터 DPI', placeholder: '72~600' },
}

// ─── Meta ─────────────────────────────────────────────────────────────────────

const meta = {
  title: 'Admin/EntityForm',
  component: EntityForm,
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'Zod 스키마 → 위젯 자동 추론 폼. string → input/textarea, number → number, boolean → switch, enum → select, array(string) → tags.',
      },
    },
  },
  tags: ['autodocs'],
} satisfies Meta<typeof EntityForm<typeof resourceSchema>>

export default meta
type Story = StoryObj<typeof meta>

// ─── 스토리 1: Resource Schema 자동 생성 폼 ────────────────────────────────

export const ResourceSchema: Story = {
  name: 'Resource Schema — 자동 생성된 폼',
  render: () => {
    const [lastValues, setLastValues] = React.useState<Record<string, unknown> | null>(null)

    return (
      <div className="max-w-xl p-6">
        <h2 className="text-xl font-bold mb-6 text-[var(--color-text)]">리소스 등록</h2>
        <EntityForm
          schema={resourceSchema}
          defaultValues={{
            name: '',
            description: '',
            kind: 'pose',
            status: 'draft',
            tags: [],
            flippable: false,
            masterDpi: 96,
          }}
          fieldMeta={fieldMeta}
          onSubmit={async (values) => {
            await new Promise((r) => setTimeout(r, 800))
            setLastValues(values as Record<string, unknown>)
          }}
          submitLabel="리소스 등록"
          onCancel={() => window.alert('취소')}
          dirtyGuard
        />
        {lastValues && (
          <pre className="mt-6 p-4 bg-[var(--color-surface-muted)] rounded-[var(--radius-md)] text-xs overflow-auto">
            {JSON.stringify(lastValues, null, 2)}
          </pre>
        )}
      </div>
    )
  },
}

// ─── 스토리 2: 서버 에러 주입 ───────────────────────────────────────────────

export const WithServerErrors: Story = {
  name: 'Server Errors — 에러 주입',
  render: () => {
    const [serverErrors, setServerErrors] = React.useState<Record<string, string>>({})

    return (
      <div className="max-w-xl p-6">
        <h2 className="text-xl font-bold mb-2 text-[var(--color-text)]">서버 에러 시뮬레이션</h2>
        <p className="text-sm text-[var(--color-text-muted)] mb-6">
          저장 시 서버가 이름 중복 에러를 반환하는 상황을 시뮬레이션합니다.
        </p>
        <EntityForm
          schema={resourceSchema}
          defaultValues={{
            name: '기존 리소스',
            description: '',
            kind: 'pose',
            status: 'draft',
            tags: [],
            flippable: false,
            masterDpi: 96,
          }}
          fieldMeta={fieldMeta}
          serverErrors={serverErrors}
          onSubmit={async () => {
            await new Promise((r) => setTimeout(r, 500))
            setServerErrors({ name: '이미 사용 중인 리소스 이름입니다' })
          }}
          submitLabel="저장 (서버 에러 시뮬레이션)"
        />
      </div>
    )
  },
}

// ─── 스토리 3: 간단한 스키마 ─────────────────────────────────────────────────

const simpleSchema = z.object({
  title: z.string().min(1, '제목 필수'),
  isActive: z.boolean(),
  count: z.number().min(0),
})

export const SimpleSchema: Story = {
  name: 'Simple Schema — 3필드',
  render: () => (
    <div className="max-w-md p-6">
      <EntityForm
        schema={simpleSchema}
        defaultValues={{ title: '', isActive: true, count: 0 }}
        fieldMeta={{
          title: { label: '제목', autoFocus: true },
          isActive: { label: '활성화' },
          count: { label: '수량' },
        }}
        onSubmit={async (v) => {
          window.alert(JSON.stringify(v))
        }}
        submitLabel="확인"
      />
    </div>
  ),
}
