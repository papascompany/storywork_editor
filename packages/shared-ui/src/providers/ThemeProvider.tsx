'use client'

import * as React from 'react'

/**
 * ThemeProvider
 *
 * 라이트/다크/시스템 테마를 관리합니다.
 * - localStorage 에 theme 값 저장
 * - html 요소에 .dark 클래스 토글 (Tailwind class 전략)
 * - system 선택 시 prefers-color-scheme 미디어쿼리 감지
 *
 * @example
 * // app/layout.tsx
 * <ThemeProvider defaultTheme="system" storageKey="sw-theme">
 *   {children}
 * </ThemeProvider>
 */

export type Theme = 'light' | 'dark' | 'system'

export interface ThemeProviderProps {
  children: React.ReactNode
  /** 초기 테마 (기본값: 'system') */
  defaultTheme?: Theme
  /** localStorage 저장 키 (기본값: 'sw-ui-theme') */
  storageKey?: string
}

export interface ThemeContextValue {
  theme: Theme
  resolvedTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  storageKey = 'sw-ui-theme',
}: ThemeProviderProps) {
  const [theme, setThemeState] = React.useState<Theme>(() => {
    // SSR 안전: 서버에서는 defaultTheme 사용
    if (typeof window === 'undefined') return defaultTheme
    return (localStorage.getItem(storageKey) as Theme | null) ?? defaultTheme
  })

  const [systemPrefersDark, setSystemPrefersDark] = React.useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  // 시스템 미디어쿼리 변화 감지
  React.useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setSystemPrefersDark(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  const resolvedTheme: 'light' | 'dark' =
    theme === 'system' ? (systemPrefersDark ? 'dark' : 'light') : theme

  // html.dark 클래스 동기화
  React.useEffect(() => {
    const root = document.documentElement
    if (resolvedTheme === 'dark') {
      root.classList.add('dark')
    } else {
      root.classList.remove('dark')
    }
  }, [resolvedTheme])

  const setTheme = React.useCallback(
    (newTheme: Theme) => {
      setThemeState(newTheme)
      try {
        localStorage.setItem(storageKey, newTheme)
      } catch {
        // 프라이빗 브라우징 등에서 localStorage 접근 실패 무시
      }
    },
    [storageKey],
  )

  const toggleTheme = React.useCallback(() => {
    setTheme(resolvedTheme === 'dark' ? 'light' : 'dark')
  }, [resolvedTheme, setTheme])

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme, toggleTheme }),
    [theme, resolvedTheme, setTheme, toggleTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

/**
 * 현재 테마 컨텍스트 접근 훅
 *
 * @example
 * const { theme, setTheme, toggleTheme } = useTheme()
 */
export function useTheme(): ThemeContextValue {
  const ctx = React.useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme 은 ThemeProvider 내부에서만 사용할 수 있습니다.')
  }
  return ctx
}

/**
 * 깜빡임(FOUC) 방지 인라인 스크립트
 *
 * Next.js layout.tsx 의 <head> 에 삽입:
 *   <script dangerouslySetInnerHTML={{ __html: themeScript }} />
 */
export const themeScript = `
(function() {
  try {
    var stored = localStorage.getItem('sw-ui-theme');
    var theme = stored === 'light' || stored === 'dark' ? stored
      : stored === 'system' || !stored
        ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
        : 'light';
    if (theme === 'dark') document.documentElement.classList.add('dark');
  } catch (e) {}
})();
`
