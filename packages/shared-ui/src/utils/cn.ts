import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * 클래스명 병합 유틸
 *
 * clsx 로 조건부 클래스를 처리하고
 * tailwind-merge 로 Tailwind 클래스 충돌을 해소합니다.
 *
 * @example
 * cn('px-4 py-2', isActive && 'bg-brand-500', className)
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs))
}
