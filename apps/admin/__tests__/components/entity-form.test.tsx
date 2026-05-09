/**
 * EntityForm 단위 테스트
 *
 * 위젯 자동 추론(string/number/boolean/enum/array), Zod 검증, 서버 에러 매핑, 더티 가드
 */

import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import * as React from 'react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { z } from 'zod'

import { EntityForm, inferWidget } from '../../src/components/entity-form/EntityForm'

// ─── inferWidget 단위 테스트 ─────────────────────────────────────────────────

describe('inferWidget', () => {
  it('ZodString → input', () => {
    expect(inferWidget(z.string())).toBe('input')
  })

  it('ZodString with min(50) → textarea', () => {
    expect(inferWidget(z.string().min(50))).toBe('textarea')
  })

  it('ZodNumber → number', () => {
    expect(inferWidget(z.number())).toBe('number')
  })

  it('ZodBoolean → switch', () => {
    expect(inferWidget(z.boolean())).toBe('switch')
  })

  it('ZodEnum → select', () => {
    expect(inferWidget(z.enum(['a', 'b', 'c']))).toBe('select')
  })

  it('ZodArray → tags', () => {
    expect(inferWidget(z.array(z.string()))).toBe('tags')
  })

  it('fieldMeta widget 가 있으면 override', () => {
    expect(inferWidget(z.string(), { widget: 'textarea' })).toBe('textarea')
    expect(inferWidget(z.number(), { widget: 'colorPicker' })).toBe('colorPicker')
  })

  it('ZodOptional 언래핑 후 타입 추론', () => {
    expect(inferWidget(z.string().optional())).toBe('input')
    expect(inferWidget(z.boolean().optional())).toBe('switch')
  })
})

// ─── EntityForm 렌더 테스트 ───────────────────────────────────────────────────

describe('EntityForm 렌더', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  const simpleSchema = z.object({
    name: z.string().min(1, '이름은 필수입니다'),
    description: z.string().min(50, '50자 이상 입력'),
    count: z.number().min(0),
    active: z.boolean(),
    status: z.enum(['draft', 'published', 'rejected']),
    tags: z.array(z.string()),
  })

  it('string 필드는 input 으로 렌더된다', () => {
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{ name: { label: '이름' }, description: { label: '설명' } }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByLabelText('이름')).toBeInTheDocument()
  })

  it('string(min 50) 필드는 textarea 로 렌더된다', () => {
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{ description: { label: '설명' } }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByRole('textbox', { name: '설명' })).toHaveAttribute('rows')
  })

  it('number 필드는 type=number input 으로 렌더된다', () => {
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{ count: { label: '개수' } }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByLabelText('개수')).toHaveAttribute('type', 'number')
  })

  it('boolean 필드는 role=switch 로 렌더된다', () => {
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{ active: { label: '활성화' } }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByRole('switch', { name: '활성화' })).toBeInTheDocument()
  })

  it('enum 필드는 select 로 렌더된다', () => {
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{
          status: {
            label: '상태',
            options: [
              { value: 'draft', label: '초안' },
              { value: 'published', label: '게시됨' },
              { value: 'rejected', label: '거절됨' },
            ],
          },
        }}
        onSubmit={onSubmit}
      />,
    )
    expect(screen.getByLabelText('상태')).toBeInTheDocument()
    // select 요소 확인
    const select = screen.getByLabelText('상태')
    expect(select.tagName).toBe('SELECT')
  })

  it('배열 필드는 태그 입력 영역으로 렌더된다', () => {
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{ tags: { label: '태그' } }}
        onSubmit={onSubmit}
      />,
    )
    const tagInput = screen.getByPlaceholderText('태그 입력 후 Enter')
    expect(tagInput).toBeInTheDocument()
  })

  // Zod 검증
  it('필수 필드 비워서 submit 하면 onSubmit 이 호출되지 않는다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    render(
      <EntityForm
        schema={simpleSchema}
        defaultValues={{
          name: '',
          description: '',
          count: 0,
          active: false,
          status: 'draft',
          tags: [],
        }}
        fieldMeta={{ name: { label: '이름' } }}
        onSubmit={onSubmit}
      />,
    )
    const submitBtn = screen.getByRole('button', { name: '저장' })

    // ZodError 가 unhandled rejection 으로 나올 수 있으므로 catch
    const origHandler = window.onunhandledrejection
    window.onunhandledrejection = () => false
    try {
      await user.click(submitBtn)
    } finally {
      window.onunhandledrejection = origHandler
    }

    // 어떤 경우든 onSubmit 은 호출되지 않아야 함
    await waitFor(() => {
      expect(onSubmit).not.toHaveBeenCalled()
    })
  })

  it('유효한 값으로 submit 하면 onSubmit 이 호출된다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn().mockResolvedValue(undefined)

    const minimalSchema = z.object({
      name: z.string().min(1),
    })

    render(
      <EntityForm
        schema={minimalSchema}
        defaultValues={{ name: '' }}
        fieldMeta={{ name: { label: '이름' } }}
        onSubmit={onSubmit}
      />,
    )

    const nameInput = screen.getByLabelText('이름')
    await user.type(nameInput, '테스트 이름')

    const submitBtn = screen.getByRole('button', { name: '저장' })
    await user.click(submitBtn)

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({ name: '테스트 이름' })
    })
  })

  // 서버 에러 매핑
  it('serverErrors prop 이 있으면 해당 필드에 에러가 표시된다', async () => {
    const onSubmit = vi.fn()
    const minimalSchema = z.object({
      name: z.string(),
    })

    const { rerender } = render(
      <EntityForm
        schema={minimalSchema}
        defaultValues={{ name: '기존 이름' }}
        fieldMeta={{ name: { label: '이름' } }}
        onSubmit={onSubmit}
        serverErrors={{}}
      />,
    )

    rerender(
      <EntityForm
        schema={minimalSchema}
        defaultValues={{ name: '기존 이름' }}
        fieldMeta={{ name: { label: '이름' } }}
        onSubmit={onSubmit}
        serverErrors={{ name: '이미 사용 중인 이름입니다' }}
      />,
    )

    await waitFor(() => {
      expect(screen.getByText('이미 사용 중인 이름입니다')).toBeInTheDocument()
    })
  })

  // 취소 버튼
  it('onCancel 이 있으면 취소 버튼이 렌더되고 클릭 시 호출된다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()
    const onCancel = vi.fn()

    const minimalSchema = z.object({ name: z.string() })
    render(
      <EntityForm
        schema={minimalSchema}
        defaultValues={{ name: '' }}
        onSubmit={onSubmit}
        onCancel={onCancel}
      />,
    )

    const cancelBtn = screen.getByRole('button', { name: '취소' })
    await user.click(cancelBtn)
    expect(onCancel).toHaveBeenCalled()
  })

  // 더티 가드 — beforeunload mock
  it('dirtyGuard=true 이고 isDirty 이면 beforeunload 이벤트를 막는다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    const minimalSchema = z.object({ name: z.string() })
    render(
      <EntityForm
        schema={minimalSchema}
        defaultValues={{ name: '' }}
        fieldMeta={{ name: { label: '이름' } }}
        onSubmit={onSubmit}
        dirtyGuard
      />,
    )

    const nameInput = screen.getByLabelText('이름')
    await user.type(nameInput, '변경됨')

    // beforeunload 이벤트 시뮬레이션
    const event = new Event('beforeunload', { bubbles: true, cancelable: true })
    const preventDefaultSpy = vi.spyOn(event, 'preventDefault')
    window.dispatchEvent(event)

    expect(preventDefaultSpy).toHaveBeenCalled()
  })

  // submitLabel
  it('submitLabel prop 이 반영된다', () => {
    const onSubmit = vi.fn()
    const minimalSchema = z.object({ name: z.string() })
    render(
      <EntityForm
        schema={minimalSchema}
        defaultValues={{ name: '' }}
        onSubmit={onSubmit}
        submitLabel="등록하기"
      />,
    )
    expect(screen.getByRole('button', { name: '등록하기' })).toBeInTheDocument()
  })
})
