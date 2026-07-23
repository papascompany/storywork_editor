import type { PageJsonV1 } from '@storywork/schema/editor'
import type { Canvas, FabricObject, ModifiedEvent, TPointerEvent } from 'fabric'

import { createObjectData, extractObjectData } from '../data/object-meta.js'
import { createEditorBus } from '../events/bus.js'
import type { EditorBus } from '../events/bus.js'
import { deserializeFromJson } from '../serialize/fromJson.js'
import { serializeToJson } from '../serialize/toJson.js'
import type { EditorEvent, EventMap, Format, ObjectData, Unsubscribe } from '../types.js'

import { createFabricCanvas, resizeCanvas } from './adapters/fabric.js'
import { mmToPx, pxToMm } from './coords.js'

export type StoryCanvasOptions = {
  format: Format
  container?: HTMLElement | OffscreenCanvas
  backgroundColor?: string
}

// fabric v6 CollectionEvents 에서 추출한 payload 타입
type ObjectAddedPayload = { target: FabricObject }
type ObjectRemovedPayload = { target: FabricObject }
type SelectionCreatedPayload = Partial<{ e: Event }> & { selected: FabricObject[] }
type SelectionUpdatedPayload = Partial<{ e: Event }> & {
  selected: FabricObject[]
  deselected: FabricObject[]
}
type SelectionClearedPayload = Partial<{ e: Event }> & { deselected: FabricObject[] }
type AfterRenderPayload = { ctx: CanvasRenderingContext2D }
type ObjectRotatingPayload = { target: FabricObject; e: TPointerEvent }

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
  private _format: Format
  private readonly _fabric: Canvas
  private readonly _bus: EditorBus
  /** id → fabric 객체 매핑 */
  private readonly _objectMap: Map<string, FabricObject> = new Map()

  /**
   * dispose 완료 여부.
   * H2: 모든 fabric 이벤트 핸들러 첫 줄에서 이 플래그를 확인한다.
   */
  private _disposed = false

  // ─────────────────────────────────────────────
  // H1: 바운드 멤버 핸들러 (익명 화살표 → 멤버)
  // off() 시 동일 참조가 필요하므로 반드시 멤버로 고정한다.
  // ─────────────────────────────────────────────

  private readonly _onObjectAdded = (e: ObjectAddedPayload): void => {
    // H2: dispose 가드
    if (this._disposed) return
    const obj = e.target
    if (!obj) return
    const data = extractObjectData(obj as { data?: unknown })
    if (!data) return
    this._bus.emit('object:added', { id: data.id, data })
  }

  private readonly _onObjectModified = (e: ModifiedEvent): void => {
    if (this._disposed) return
    const obj = e.target
    if (!obj) return
    const data = extractObjectData(obj as { data?: unknown })
    if (!data) return
    this._bus.emit('object:changed', { id: data.id, data })
  }

  private readonly _onObjectRemoved = (e: ObjectRemovedPayload): void => {
    if (this._disposed) return
    const obj = e.target
    if (!obj) return
    const data = extractObjectData(obj as { data?: unknown })
    if (!data) return
    // objectMap 에서도 제거 (외부 remove 가 아닌 fabric 직접 제거 대응)
    this._objectMap.delete(data.id)
    this._bus.emit('object:removed', { id: data.id })
  }

  private readonly _onSelectionCreated = (e: SelectionCreatedPayload): void => {
    if (this._disposed) return
    const selected = e.selected ?? []
    const ids = selected
      .map((o: FabricObject) => extractObjectData(o as { data?: unknown })?.id)
      .filter((id: string | undefined): id is string => id !== undefined)
    this._bus.emit('selection:changed', { ids })
  }

  private readonly _onSelectionUpdated = (e: SelectionUpdatedPayload): void => {
    if (this._disposed) return
    const selected = e.selected ?? []
    const ids = selected
      .map((o: FabricObject) => extractObjectData(o as { data?: unknown })?.id)
      .filter((id: string | undefined): id is string => id !== undefined)
    this._bus.emit('selection:changed', { ids })
  }

  private readonly _onSelectionCleared = (_e: SelectionClearedPayload): void => {
    if (this._disposed) return
    this._bus.emit('selection:changed', { ids: [] })
  }

  private readonly _onAfterRender = (_e: AfterRenderPayload): void => {
    if (this._disposed) return
    this._bus.emit('render:after', undefined as unknown as void)
  }

  /**
   * H1 bound handler: 회전 15° 스냅
   * Shift 없으면 15° 단위 스냅, Shift 있으면 자유 회전.
   */
  private readonly _onObjectRotating = (e: ObjectRotatingPayload): void => {
    if (this._disposed) return
    const target = e.target
    if (!target) return
    const nativeEvent = e.e as MouseEvent | TouchEvent | undefined
    const shiftHeld = nativeEvent instanceof MouseEvent ? nativeEvent.shiftKey : false
    if (!shiftHeld) {
      const snapped = Math.round((target.angle ?? 0) / 15) * 15
      target.set({ angle: snapped })
    }
  }

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
   * H2: dispose 후 호출 및 비동기 완료 시점에도 dispose 가드를 적용한다.
   */
  async loadJson(json: PageJsonV1): Promise<void> {
    // H2: dispose 직후 호출 시 early return (fabric.clear() 도 호출하지 않음)
    if (this._disposed) return

    this._fabric.clear()
    this._objectMap.clear()

    const { objects } = await deserializeFromJson(json, this._format.dpi)
    // H2: 이미지 로드 등 비동기 완료 후 dispose 됐을 경우 silent return
    if (this._disposed) return

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

  /**
   * H1+H2: 모든 바운드 핸들러를 off() 로 해제한 뒤 _disposed 플래그를 set 한다.
   * 이후 비동기 콜백에서 이 플래그를 확인해 silent return 한다.
   */
  dispose(): void {
    if (this._disposed) return
    this._disposed = true
    this._unbindFabricEvents()
    // fabric dispose 는 .canvas-container 래퍼를 제거하면서 원본 canvas 요소를
    // 마운트 컨테이너에 복원해 남긴다. StrictMode 이중 마운트(mount→dispose→mount)에서
    // 이 잔여 canvas 가 새 마운트의 드로잉 서피스를 in-flow 로 밀어내므로,
    // dispose 완료 후 요소를 DOM 에서 제거한다.
    const el = this._fabric.lowerCanvasEl
    void Promise.resolve(this._fabric.dispose())
      .catch(() => undefined)
      .then(() => {
        el?.remove()
      })
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

  /**
   * 판형(Format)을 런타임에 변경한다.
   * - fabric 캔버스 dimensions 를 새 판형의 px 크기로 갱신
   * - mm↔px 변환 기준(dpi)도 함께 갱신
   * - 캔버스 내 기존 객체 좌표는 유지 (배치는 호출자 책임)
   *
   * FOLLOWUP-42: FormatPickerModal 에서 판형 변경 시 호출된다.
   */
  setFormat(format: Format): void {
    if (this._disposed) return
    this._format = format
    resizeCanvas(this._fabric, format)
    this._fabric.requestRenderAll()
  }

  /** @internal dispose 상태 확인 (테스트용) */
  get isDisposed(): boolean {
    return this._disposed
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

  /**
   * H1: 바운드 멤버 핸들러를 fabric 이벤트에 등록한다.
   * 핸들러가 멤버 참조이므로 _unbindFabricEvents 에서 정확히 해제할 수 있다.
   */
  private _bindFabricEvents(): void {
    this._fabric.on('object:added', this._onObjectAdded)
    this._fabric.on('object:modified', this._onObjectModified)
    this._fabric.on('object:removed', this._onObjectRemoved)
    this._fabric.on('selection:created', this._onSelectionCreated)
    this._fabric.on('selection:updated', this._onSelectionUpdated)
    this._fabric.on('selection:cleared', this._onSelectionCleared)
    this._fabric.on('after:render', this._onAfterRender)
    // H1: bound handler — 회전 15° 스냅
    this._fabric.on('object:rotating', this._onObjectRotating)
  }

  /**
   * H1: dispose 시 모든 핸들러를 정확히 제거한다.
   * 익명 함수가 아니므로 off() 에 동일 참조를 전달할 수 있다.
   */
  private _unbindFabricEvents(): void {
    this._fabric.off('object:added', this._onObjectAdded)
    this._fabric.off('object:modified', this._onObjectModified)
    this._fabric.off('object:removed', this._onObjectRemoved)
    this._fabric.off('selection:created', this._onSelectionCreated)
    this._fabric.off('selection:updated', this._onSelectionUpdated)
    this._fabric.off('selection:cleared', this._onSelectionCleared)
    this._fabric.off('after:render', this._onAfterRender)
    this._fabric.off('object:rotating', this._onObjectRotating)
  }
}
