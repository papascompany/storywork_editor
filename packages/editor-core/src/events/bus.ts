import mitt from 'mitt'

import type { EditorEvent, EventMap, Unsubscribe } from '../types.js'

/**
 * mitt 기반 이벤트 버스.
 * EditorEvent 만 외부에 노출한다 — fabric 내부 이벤트는 StoryCanvas 에서 정규화 후 여기에 emit.
 */
export type EditorBus = {
  emit<K extends EditorEvent>(event: K, payload: EventMap[K]): void
  on<K extends EditorEvent>(event: K, handler: (payload: EventMap[K]) => void): Unsubscribe
  off<K extends EditorEvent>(event: K, handler: (payload: EventMap[K]) => void): void
}

export function createEditorBus(): EditorBus {
  const emitter = mitt<EventMap>()

  return {
    emit<K extends EditorEvent>(event: K, payload: EventMap[K]) {
      emitter.emit(event, payload)
    },
    on<K extends EditorEvent>(event: K, handler: (payload: EventMap[K]) => void): Unsubscribe {
      emitter.on(event, handler)
      return () => emitter.off(event, handler)
    },
    off<K extends EditorEvent>(event: K, handler: (payload: EventMap[K]) => void) {
      emitter.off(event, handler)
    },
  }
}
