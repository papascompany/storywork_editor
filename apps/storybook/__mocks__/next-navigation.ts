/**
 * next/navigation mock for Storybook (Vite, no Next.js runtime)
 */
export function usePathname(): string {
  return '/'
}

export function useRouter() {
  return {
    push: (_url: string) => undefined,
    replace: (_url: string) => undefined,
    back: () => undefined,
    forward: () => undefined,
    refresh: () => undefined,
    prefetch: (_url: string) => undefined,
  }
}

export function useSearchParams() {
  return new URLSearchParams()
}

export function useParams(): Record<string, string | string[]> {
  return {}
}
