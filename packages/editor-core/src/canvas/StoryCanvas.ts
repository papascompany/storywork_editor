import type { PageJsonV1 } from '@storywork/schema/editor'
import type { Canvas, FabricObject } from 'fabric'

import { createObjectData, extractObjectData } from '../data/object-meta.js'
import { createEditorBus } from '../events/bus.js'
import type { EditorBus } from '../events/bus.js'
import { deserializeFromJson } from '../serialize/fromJson.js'
import { serializeToJson } from '../serialize/toJson.js'
import type { EditorEvent, EventMap, Format, ObjectData, Unsubscribe } from '../types.js'

import { createFabricCanvas } from './adapters/fabric.js'
import { mmToPx, pxToMm } from './coords.js'

export type StoryCanvasOptions = {
  format: Format
  container?: HTMLElement | OffscreenCanvas
  backgroundColor?: string
}

/**
 * StoryCanvas — @storywork/editor-core 의 핵심 클래스.
 *
 * 책임:
 * - fabric.Canvas 인스턴스 수명 관리
 * - mm↔px 좌표 변환 (format.dpi 기반)
 * - 외부 이벤트 버스 (EditorEvent) 정규화
 * - PageJsonV1 라운드트립 직렬화/역직렬화
 *
 * 비책임:
 * - UI, 단축키, 영속화
 * - 다른 editor-* 패키지의 도메인 로직
 */
export class StoryCanvas {
  private readonly _format: Format
  private readonly _fabric: Canvas
  private readonly _bus: EditorBus
  /** id → fabric 객체 매핑 */
  private readonly _objectMap: Map<string, FabricObject> = new Map()

  constructor(opts: StoryCanvasOptions) {
    this._format = opts.format
    this._bus = createEditorBus()
    this._fabric = createFabricCanvas({
      format: opts.format,
      container: opts.container,
      backgroundColor: opts.backgroundColor,
    })

    this._bindFabricEvents()
  }

  // ─────────────────────────────────────────────
  // 직렬화
  // ─────────────────────────────────────────────

  /**
   * PageJsonV1 을 로드한다. 기존 캔버스 내용은 모두 지워진다.
   */
  async loadJson(json: PageJsonV1): Promise<void> {
    this._fabric.clear()
    this._objectMap.clear()

    const { objects } = await deserializeFromJson(json, this._format.dpi)
    for (const obj of objects) {
      this._addFabricObject(obj)
    }
    this._fabric.renderAll()
  }

  /**
   * 현재 캔버스 상태를 PageJsonV1 으로 직렬화한다.
   */
  toJson(): PageJsonV1 {
    return serializeToJson(this._fabric, this._format, this._format.dpi)
  }

  // ─────────────────────────────────────────────
  // 객체 조작
  // ─────────────────────────────────────────────

  /**
   * 캔버스에 fabric 객체를 추가하고 ObjectData 메타를 할당한다.
   * @returns 할당된 객체 id
   */
  addObject(
    dataOverrides: Pick<ObjectData, 'kind'> & Partial<ObjectData>,
    fabricObj: FabricObject,
  ): string {
    const data = createObjectData(dataOverrides)
    // @ts-expect-error fabric data property
    fabricObj.data = data
    this._addFabricObject(fabricObj)
    this._fabric.renderAll()
    return data.id
  }

  /**
   * id 로 캔버스에서 객체를 제거한다.
   * fabric 의 object:removed 이벤트가 버스에 relay 되므로 여기서는 직접 emit 하지 않는다.
   */
  removeObject(id: string): void {
    const obj = this._objectMap.get(id)
    if (!obj) return
    this._objectMap.delete(id)
    this._fabric.remove(obj)
    this._fabric.renderAll()
  }

  /**
   * id 로 fabric 객체를 조회한다.
   */
  getObject(id: string): FabricObject | undefined {
    return this._objectMap.get(id)
  }

  /**
   * id 로 ObjectData 를 조회한다.
   */
  getObjectData(id: string): ObjectData | undefined {
    const obj = this._objectMap.get(id)
    if (!obj) return undefined
    return extractObjectData(obj as { data?: unknown })
  }

  // ─────────────────────────────────────────────
  // 좌표 변환
  // ─────────────────────────────────────────────

  mmToPx(mm: number): number {
    return mmToPx(mm, this._format.dpi)
  }

  pxToMm(px: number): number {
    return pxToMm(px, this._format.dpi)
  }

  // ─────────────────────────────────────────────
  // 이벤트
  // ─────────────────────────────────────────────

  on<K extends EditorEvent>(event: K, handler: (payload: EventMap[K]) => void): Unsubscribe {
    return this._bus.on(event, handler)
  }

  // ─────────────────────────────────────────────
  // 수명
  // ─────────────────────────────────────────────

  dispose(): void {
    this._fabric.dispose()
    this._objectMap.clear()
  }

  // ─────────────────────────────────────────────
  // 내부 노출 (테스트/플러그인용 — 외부 사용 비권장)
  // ─────────────────────────────────────────────

  /** @internal 직접 접근 시 책임은 호출자에게 있다 */
  get _fabricCanvas(): Canvas {
    return this._fabric
  }

  get format(): Format {
    return this._format
  }

  // ─────────────────────────────────────────────
  // 내부 구현
  // ─────────────────────────────────────────────

  private _addFabricObject(obj: FabricObject): void {
    const data = extractObjectData(obj as { data?: unknown })
    if (!data) {
      console.warn('[editor-core] addObject: fabric 객체에 ObjectData 가 없습니다. 무시합니다.')
      return
    }
    this._objectMap.set(data.id, obj)
    this._fabric.add(obj)
  }

  private _bindFabricEvents(): void {
    // fabric → EditorEvent 정규화
    this._fabric.on('object:added', (e) => {
      const obj = e.target
      if (!obj) return
      const data = extractObjectData(obj as { data?: unknown })
      if (!data) return
      this._bus.emit('object:added', { id: data.id, data })
    })

    this._fabric.on('object:modified', (e) => {
      const obj = e.target
      if (!obj) return
      const data = extractObjectData(obj as { data?: unknown })
      if (!data) return
      this._bus.emit('object:changed', { id: data.id, data })
    })

    this._fabric.on('object:removed', (e) => {
      const obj = e.target
      if (!obj) return
      const data = extractObjectData(obj as { data?: unknown })
      if (!data) return
      // objectMap 에서도 제거 (외부 remove 가 아닌 fabric 직접 제거 대응)
      this._objectMap.delete(data.id)
      this._bus.emit('object:removed', { id: data.id })
    })

    this._fabric.on('selection:created', (e) => {
      const selected = e.selected ?? []
      const ids = selected
        .map((o) => extractObjectData(o as { data?: unknown })?.id)
        .filter((id): id is string => id !== undefined)
      this._bus.emit('selection:changed', { ids })
    })

    this._fabric.on('selection:updated', (e) => {
      const selected = e.selected ?? []
      const ids = selected
        .map((o) => extractObjectData(o as { data?: unknown })?.id)
        .filter((id): id is string => id !== undefined)
      this._bus.emit('selection:changed', { ids })
    })

    this._fabric.on('selection:cleared', () => {
      this._bus.emit('selection:changed', { ids: [] })
    })

    this._fabric.on('after:render', () => {
      this._bus.emit('render:after', undefined as unknown as void)
    })
  }
}
