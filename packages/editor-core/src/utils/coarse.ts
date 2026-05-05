/**
 * isCoarsePointer — 터치/스타일러스 등 굵은 포인터 장치 여부를 감지한다.
 *
 * - SSR 안전: window 가 없는 환경(Node/jsdom)에서 false 반환
 * - matchMedia 지원 여부도 확인해 오래된 브라우저에 대비
 * - 결과는 런타임에 매번 평가(캐싱 X) — 테스트 환경에서 mock 이 쉽도록
 */
export function isCoarsePointer(): boolean {
  if (typeof window === 'undefined') return false
  if (typeof window.matchMedia !== 'function') return false
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}
