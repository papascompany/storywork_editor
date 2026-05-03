import { render } from '@testing-library/react'
import * as React from 'react'
import { describe, expect, it, beforeEach, afterEach } from 'vitest'

import { ThemeProvider, useTheme } from '../src/providers/ThemeProvider.js'

// localStorage mock
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
    removeItem: (key: string) => {
      delete store[key]
    },
    clear: () => {
      store = {}
    },
  }
})()

Object.defineProperty(window, 'localStorage', { value: localStorageMock })

const TestConsumer = () => {
  const { resolvedTheme, toggleTheme } = useTheme()
  return (
    <div>
      <span data-testid="theme">{resolvedTheme}</span>
      <button onClick={toggleTheme}>토글</button>
    </div>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => localStorageMock.clear())

  afterEach(() => {
    document.documentElement.classList.remove('dark')
  })

  it('기본값이 light 입니다 (시스템 미디어쿼리 없는 환경)', () => {
    const { getByTestId } = render(
      <ThemeProvider defaultTheme="light">
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(getByTestId('theme').textContent).toBe('light')
  })

  it('dark 테마 시 html.dark 클래스가 추가됩니다', () => {
    render(
      <ThemeProvider defaultTheme="dark">
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('light 테마 시 html.dark 클래스가 없습니다', () => {
    render(
      <ThemeProvider defaultTheme="light">
        <TestConsumer />
      </ThemeProvider>,
    )
    expect(document.documentElement.classList.contains('dark')).toBe(false)
  })

  it('ThemeProvider 외부에서 useTheme 사용 시 에러를 던집니다', () => {
    const consoleError = console.error
    console.error = () => {} // suppress error boundary output
    expect(() => {
      render(<TestConsumer />)
    }).toThrow('ThemeProvider 내부에서만')
    console.error = consoleError
  })
})
