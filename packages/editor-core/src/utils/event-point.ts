/**
 * getEventPoint — Mouse / Touch / Pointer 이벤트에서 좌표를 안전하게 추출한다.
 *
 * 규칙:
 * - PointerEvent / MouseEvent: clientX/clientY 직접 사용
 * - TouchEvent: touches[0] 우선, changedTouches[0] 폴백
 * - null / undefined 입력: { x:0, y:0, altKey:false } 반환
 *
 * React 의존 없음 (editor-core 는 headless). DOM Event 타입만 사용.
 *
 * @see FABRIC_EDITOR_GUIDE §13.2 — TouchEvent 좌표 함정
 * @see STORIGE_GUIDE §4 BUG-014
 */
export type EventPoint = {
  x: number
  y: number
  altKey: boolean
}

export function getEventPoint(
  e: MouseEvent | TouchEvent | PointerEvent | null | undefined,
): EventPoint {
  if (!e) return { x: 0, y: 0, altKey: false }

  // PointerEvent 또는 MouseEvent — touches 속성이 없다
  if (!('touches' in e)) {
    const me = e as MouseEvent | PointerEvent
    return {
      x: me.clientX,
      y: me.clientY,
      altKey: !!me.altKey,
    }
  }

  // TouchEvent — touches 배열 우선, 핑거 리프트 시 changedTouches 폴백
  const te = e as TouchEvent
  const touch = te.touches[0] ?? te.changedTouches[0]
  if (touch) {
    return {
      x: touch.clientX,
      y: touch.clientY,
      altKey: false, // TouchEvent 에는 altKey 가 없다
    }
  }

  return { x: 0, y: 0, altKey: false }
}
