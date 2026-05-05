# Fabric.js 5.x 캔버스 편집기 완전 개발 가이드

> Storige 프로젝트(papascompany/storige-book-editor)에서 92+ commit, 모바일 사이클 PR #1~#10, 6차 P0 핫픽스 사이클을 거치며 얻은 모든 패턴·교훈·실수를 정리한 문서.
> 새 프로젝트에서 같은 시행착오를 반복하지 않기 위해 작성.
> 최종 갱신: 2026-05-05.

---

## 📋 목차

### Part 1 — 기초
1. [아키텍처 개요](#1-아키텍처-개요)
2. [의존 패키지 & 버전 고정](#2-의존-패키지--버전-고정)
3. [캔버스 초기화 레시피](#3-캔버스-초기화-레시피)
4. [플러그인 시스템](#4-플러그인-시스템)
5. [커스텀 프로퍼티 직렬화](#5-커스텀-프로퍼티-직렬화)
6. [객체 타입 및 생성 패턴](#6-객체-타입-및-생성-패턴)

### Part 2 — 핵심 시스템
7. [History / Undo-Redo (offHistory 패턴)](#7-history--undo-redo-offhistory-패턴)
8. [상태 관리 (Zustand + Canvas)](#8-상태-관리-zustand--canvas)
9. [이미지 처리 (CORS, OpenCV, SVG)](#9-이미지-처리-cors-opencv-svg)
10. [텍스트 & 한글 폰트](#10-텍스트--한글-폰트)
11. [표지 편집 (Separated / Composite / Spread)](#11-표지-편집-separated--composite--spread)
12. [Workspace, 가이드라인, ClipPath](#12-workspace-가이드라인-clippath)
13. [Drag·Pan·Zoom](#13-dragpanzoom)
14. [정렬·그룹·잠금·복사](#14-정렬그룹잠금복사)

### Part 3 — 모바일·안정성
15. [모바일 메모리 카드](#15-모바일-메모리-카드)
16. [터치 UX 시스템](#16-터치-ux-시스템)
17. [ResizeObserver 무한 루프 방지](#17-resizeobserver-무한-루프-방지)
18. [crash 복구 (ErrorBoundary + localStorage 백업)](#18-crash-복구-errorboundary--localstorage-백업)
19. [성능 최적화 (RenderOptimizer, CacheManager)](#19-성능-최적화-renderoptimizer-cachemanager)
20. [메모리 누수 방지 패턴](#20-메모리-누수-방지-패턴)

### Part 4 — 운영
21. [저장/복원 파이프라인](#21-저장복원-파이프라인)
22. [Vercel/CDN 배포 함정](#22-vercelcdn-배포-함정)
23. [PDF 합성 (Saddle Stitch 2-up 등)](#23-pdf-합성-saddle-stitch-2-up-등)

### Part 5 — 디버깅·금기
24. [버그 수정 이력 (16건)](#24-버그-수정-이력-16건)
25. [절대 하지 말아야 할 것들](#25-절대-하지-말아야-할-것들)
26. [부록 빠른참조](#26-부록-빠른참조)

---

# Part 1 — 기초

## 1. 아키텍처 개요

### 1.1 패키지 분리 원칙

```
packages/canvas-core/          ← Fabric.js 래퍼 (프레임워크 독립)
  src/
    Editor.ts                  ← 플러그인 오케스트레이터
    plugin.ts                  ← PluginBase 추상 클래스
    plugins/                   ← 기능별 플러그인 (20+개)
    spread/                    ← 책 펼침면 레이아웃 엔진 (순수 함수)
    converters/                ← SVG ↔ path, glyph 검증
    effects/                   ← 금박/엠보스/재단 효과
    utils/
      factory.ts               ← createFabricCanvas, configureFabricDefaults
      canvas.ts                ← core.* 고수준 API + extendFabricOption
      render.ts                ← RenderOptimizer, CacheManager, TextSizeCalculator
      history.ts               ← fabric.Canvas.prototype 확장 (offHistory/onHistory)
      svg.ts, math.ts          ← 좌표 변환, mm↔px

apps/editor/src/
  utils/createCanvas.ts        ← 플러그인 조합 진입점
  views/EditorView.tsx         ← 마운트, ResizeObserver, cleanup
  stores/                      ← Zustand (canvas/editor/save/settings/ui)
  hooks/                       ← useAutoSave, useCanvasLocalBackup, useCoverRegion 등
  tools/                       ← 객체 추가 UI (AppText, AppImage, AppElement, ...)
  controls/                    ← 선택 객체 속성 편집 패널
  components/editor/           ← ControlBar, FeatureSidebar, EditorHeader
```

### 1.2 핵심 설계 원칙

- **canvas-core는 React 의존성 없음** — Vue/Svelte에서도 재사용 가능
- **모든 기능 = 플러그인** — 코어에 직접 코드 추가 금지
- **canvas-core dist를 git commit** — editor가 직접 import (모노레포 워크플로)
- **`canvas-core/src` 변경 시 반드시 `pnpm --filter @storige/canvas-core build` 후 commit** — 안 하면 editor가 변경을 못 봄
- **Zustand 스토어가 canvas 인스턴스를 소유** — React state에 canvas 넣지 말 것
- **fabric은 동적 import** — `const fabricModule = await import('fabric')` 으로 번들 분리

### 1.3 빌드 의존 순서 (모노레포)

```bash
pnpm --filter @storige/types build           # 1. 타입 패키지 먼저
pnpm --filter @storige/canvas-core build     # 2. canvas-core 다음
pnpm --filter @storige/editor build          # 3. 에디터 마지막
```

`@storige/types`를 안 빌드하면 다른 패키지 빌드 시 타입 에러 발생.

---

## 2. 의존 패키지 & 버전 고정

### 2.1 핵심 의존성

```json
{
  "fabric": "^5.x",                      // 6.x는 API 대폭 변경, 마이그레이션 비용 큼
  "fabric-history": "extension via prototype",
  "lodash-es": "^4.x",                    // debounce, throttle (트리쉐이킹)
  "uuid": "^9.x",                         // v4 ID 생성
  "zustand": "^4.x",                      // canvas 인스턴스 + 상태
  "fontfaceobserver": "^2.x",             // 폰트 로드 폴백 (CSS Font Loading API 우선)
  "@techstark/opencv-js": "lazy",         // 이미지 처리 (10MB WASM)
  "@imgly/background-removal": "lazy",    // 배경 제거 (24MB ONNX)
  "lucide-react": "^0.400.0"              // 아이콘 (sideEffects:false 자동 트리쉐이킹)
}
```

### 2.2 환경 변수 (Feature Flag)

```bash
# 무거운 기능 비활성화 (번들 크기 / 메모리 절감)
VITE_ENABLE_IMAGE_PROCESSING=false   # OpenCV 비활성화
VITE_ENABLE_RULER=false              # 룰러 비활성화 (성능)

# 디버그 로그
VITE_DEBUG_FONT=1                    # FontPlugin 상세 로그
VITE_DEBUG_HISTORY=1                 # 히스토리 추적
```

### 2.3 Node 22 LTS 사용

`canvas` (node-canvas) dead dependency는 제거. server-side 렌더링 필요 시 별도 워커로 분리.

---

## 3. 캔버스 초기화 레시피

### 3.1 createFabricCanvas 핵심 옵션 (factory.ts)

```typescript
const defaultOptions = {
  fireRightClick: false,
  stopContextMenu: true,           // 우클릭 메뉴 차단
  controlsAboveOverlay: true,
  selection: true,
  preserveObjectStacking: true,    // ★ z-order 보존 (필수)
  imageSmoothingEnabled: true,
  enableRetinaScaling: !isCoarsePointer(), // ★ 모바일 끄기 (메모리 9배 절감)
  renderOnAddRemove: false,        // ★ 수동 렌더 (성능)
  skipOffscreen: true,             // 화면 밖 객체 렌더 스킵
  allowTouchScrolling: false       // 터치 스크롤 충돌 방지
}

const canvas = new fabric.Canvas(canvasId, {
  ...defaultOptions,
  ...userOptions,
  id: uuid()                        // 캔버스도 고유 ID 부여
})
```

### 3.2 configureFabricDefaults (앱 전체 1회만 실행)

```typescript
// 객체 캐싱 설정
fabric.Object.prototype.objectCaching = true
fabric.Object.prototype.statefullCache = false   // dirty 플래그 수동 관리
fabric.Object.prototype.noScaleCache = false
fabric.Object.prototype.cacheProperties = [
  'fill', 'stroke', 'strokeWidth', 'strokeDashArray',
  'width', 'height', 'strokeLineCap', 'strokeDashOffset',
  'strokeLineJoin', 'strokeMiterLimit', 'fillRule',
  'backgroundColor', 'clipPath'
]

// 모바일: 터치 hit-area 확대 (★ Apple HIG 44×44 / Material 48×48)
if (isCoarsePointer()) {
  fabric.Object.prototype.cornerSize = 16          // default 13
  ;(fabric.Object.prototype as any).touchCornerSize = 36  // 터치 전용
  fabric.Object.prototype.padding = 8
  fabric.Object.prototype.borderScaleFactor = 2
}
```

`defaultsConfigured` 플래그로 중복 호출 방지.

### 3.3 isCoarsePointer 감지 (SSR 안전)

```typescript
function isCoarsePointer(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return false
  try {
    return window.matchMedia('(pointer: coarse)').matches
  } catch {
    return false
  }
}
```

**폭(viewport width) 기준이 아니라 pointer 종류 기준.** 외장 마우스 연결된 태블릿이나 큰 폰에서도 정확하게 동작.

### 3.4 React에서 사용 (useIsCoarsePointer hook)

```typescript
export function useIsCoarsePointer(): boolean {
  const [isCoarse, setIsCoarse] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    try { return window.matchMedia('(pointer: coarse)').matches } catch { return false }
  })

  useEffect(() => {
    const mql = window.matchMedia('(pointer: coarse)')
    const onChange = (e: { matches: boolean }) => setIsCoarse(e.matches)
    // Safari < 14 폴백
    if (typeof mql.addEventListener === 'function') {
      mql.addEventListener('change', onChange)
      return () => mql.removeEventListener('change', onChange)
    }
    ;(mql as any).addListener?.(onChange)
    return () => (mql as any).removeListener?.(onChange)
  }, [])

  return isCoarse
}
```

**TOUCH_ENV 패턴** — React hook을 못 쓰는 store/유틸에서는 모듈 로드 시점에 한 번만 평가:

```typescript
function isTouchEnv(): boolean {
  if (typeof window === 'undefined') return false
  try { return window.matchMedia('(pointer: coarse)').matches } catch { return false }
}
const TOUCH_ENV = isTouchEnv()  // 모듈 상수
```

### 3.5 DOM 구조 주의 (Fabric의 wrapper 재배치)

Fabric.js는 초기화 시 canvas 엘리먼트를 자체 wrapper div 안으로 이동시킨다.

```typescript
// createCanvas.ts 패턴
const canvasElement = document.createElement('canvas')
canvasElement.id = canvasId

const customContainer = document.createElement('div')
customContainer.className = 'canvas-container'
customContainer.style.cssText = 'width:100%; height:100%; position:relative; user-select:none;'

customContainer.appendChild(canvasElement)
canvasContainer.appendChild(customContainer)

// Fabric Canvas 인스턴스화 (이 시점에 Fabric이 자기 wrapper 생성)
const canvas = await createFabricCanvas(canvasId, options)

// Fabric의 wrapper를 우리 container로 재조립
const fabricWrapper = canvasElement.parentElement
if (fabricWrapper && fabricWrapper !== customContainer) {
  canvasContainer.removeChild(customContainer)
  customContainer.innerHTML = ''
  customContainer.appendChild(canvas.lowerCanvasEl)
  customContainer.appendChild(canvas.upperCanvasEl)
  canvasContainer.appendChild(customContainer)
  canvas.wrapperEl = customContainer  // ★ wrapperEl 재지정 필수
}
```

### 3.6 React Strict Mode 이중 마운트 대응

```typescript
export const createCanvas = async (
  customSettings: Partial<CanvasSettings>,
  containerElement?: HTMLElement,
  initId?: string  // ★ 초기화 세션 ID
): Promise<fabric.Canvas> => {
  // ... 캔버스 생성 ...
  appStore.init(canvas, editor, initId)  // 같은 initId면 두 번째 호출 무시
}
```

### 3.7 다중 캔버스 (페이지/스프레드)

```typescript
// 다중 페이지: index 기반으로 한 컨테이너에 여러 canvas-container div를 넣고
// display:none/block으로 전환
const customContainer = document.createElement('div')
customContainer.style.display = index === 0 ? 'block' : 'none'

// 페이지 전환 시
prevContainer.style.display = 'none'
nextContainer.style.display = 'block'
appStore.setPage(index)  // canvas 포인터 업데이트
```

---

## 4. 플러그인 시스템

### 4.1 PluginBase 표준 패턴

```typescript
class MyPlugin extends PluginBase {
  name = 'MyPlugin'
  events = ['myEvent']        // editor.emit으로 공개할 이벤트 이름들
  hotkeys: CanvasHotkey[] = []

  // ★ 모든 이벤트 핸들러 참조를 멤버 변수로 저장 (cleanup용)
  private _boundHandler: ((e: fabric.IEvent) => void) | null = null

  constructor(canvas: fabric.Canvas, editor: Editor, options: PluginOption) {
    super(canvas, editor, options)
    this._boundHandler = this.handleSomething.bind(this)
    this._canvas.on('object:modified', this._boundHandler)
  }

  // ★ destroyed()에서 모든 핸들러 제거 — 안 하면 메모리 누수
  destroyed(): Promise<void> {
    if (this._boundHandler) {
      this._canvas.off('object:modified', this._boundHandler)
      this._boundHandler = null
    }
    return Promise.resolve()
  }

  // 라이프사이클 훅 (필요한 것만 구현)
  mounted(): Promise<void> { return super.mounted() }
  beforeLoad(...args): Promise<void> { return super.beforeLoad(...args) }
  afterLoad(...args): Promise<void> { return super.afterLoad(...args) }
  beforeSave(...args): Promise<void> { return super.beforeSave(...args) }
  afterSave(...args): Promise<void> { return super.afterSave(...args) }
}
```

### 4.2 플러그인 등록 순서 (★ 매우 중요)

```typescript
const editor = new Editor()
editor.init(canvas)

// 1. WorkspacePlugin 먼저 — 다른 플러그인이 workspace 객체를 찾아야 함
editor.use(workspace)

// 2. SpreadPlugin은 workspace 다음 (workspace 위에 가이드/라벨 그림)
if (spread) editor.use(spread)

// 3. 객체 조작 / Z-order
editor.use(object)
editor.use(controls)

// 4. 그룹 / 히스토리 / 복사
editor.use(group)
editor.use(history)
editor.use(copy)

// 5. 정렬 / 드래그 / 폰트
editor.use(align)
editor.use(drag)
editor.use(font)

// 6. 효과 / 필터
editor.use(filter)
editor.use(effect)

// 7. 보조 기능
editor.use(image)        // ImageProcessingPlugin (OpenCV) — 옵션
editor.use(material)     // AccessoryPlugin
editor.use(preview)
editor.use(template)
editor.use(service)

// 8. 명시적 init (workspace 내부 객체 생성)
workspace.init()
if (spread) spread.init()
```

### 4.3 플러그인 간 통신

```typescript
// ✅ 에디터 이벤트로 통신 (느슨한 결합)
this._editor.emit('layerChanged')
this._editor.on('layerChanged', () => { ... })

// ✅ 다른 플러그인 직접 호출 (필요할 때만)
const filterPlugin = this._editor.getPlugin('FilterPlugin') as FilterPlugin
if (filterPlugin?.createLowResClipPath) {
  await filterPlugin.createLowResClipPath(obj)
}

// ❌ 직접 import해서 type 의존 만들지 말 것 (순환참조 위험)
```

### 4.4 라이프사이클 훅 활용

| 훅 | 용도 |
|---|---|
| `mounted` | 등록 직후 — workspace 객체 등록 (`workspace.init()` 분리됨) |
| `beforeLoad` | `loadFromJSON` 직전 — 폰트 사전 로드 |
| `afterLoad` | `loadFromJSON` 완료 후 — 후처리 (history 클리어, 가이드 복원) |
| `beforeSave` | `toJSON` 직전 — 저장 제외할 객체 일시 숨김 |
| `afterSave` | `toJSON` 완료 후 — 숨긴 것 복원 |
| `destroyed` | `editor.destroy()` 시 — 모든 리스너 제거 |

**beforeSave/afterSave 예시** (인쇄 가이드선 색상 처리):
```typescript
beforeSave() {
  const pageOutline = canvas.getObjects().find(o => o.id === 'page-outline')
  pageOutline?.set({ stroke: 'transparent' })  // 저장 시 보이지 않게
  return Promise.resolve()
}
afterSave() {
  const pageOutline = canvas.getObjects().find(o => o.id === 'page-outline')
  pageOutline?.set({ stroke: '#ff6b6b' })  // 화면에서는 다시 보이게
  return Promise.resolve()
}
```

---

## 5. 커스텀 프로퍼티 직렬화

### 5.1 extendFabricOption (★ 매우 중요)

Fabric.js는 자기가 아는 속성만 JSON에 저장한다. 커스텀 속성은 **반드시** 이 배열에 추가해야 `loadFromJSON` 후에도 복원된다.

```typescript
// canvas-core/src/utils/canvas.ts → core.extendFabricOption
export const extendFabricOption = [
  // === 기본 식별 ===
  'id',                 // ★ 모든 객체 고유 ID (필수)
  'extensionType',      // 시스템 객체 분류 ('overlay' | 'outline' | ...)
  'name',               // 사용자 라벨

  // === 권한 / 잠금 ===
  'selectable',
  'evented',
  'editable',
  'hasControls',
  'hasBorders',
  'lockMovementX', 'lockMovementY',
  'lockRotation',
  'lockScalingX', 'lockScalingY',
  'preventAutoResize',
  'lockLayerOrder',     // 레이어 순서 단독 이동 금지
  'parentLayerId',      // fillImage 등의 부모 객체 ID

  // === 텍스트 / 곡선 ===
  'styles',             // ★ 텍스트 per-character 스타일 (색상, stroke 등)
  'curveRadius',        // 원호 텍스트 반경
  'curveDirection',
  'pathAlign',
  'charSpacing',

  // === 색상 / 효과 ===
  'fillOpacity',
  'strokeOpacity',
  'gradientAngle',
  'fillImage',
  'effects',            // 금박/엠보스 효과 배열
  'filters',
  'cmykFill',           // ★ CMYK 원본 보존 (RGB 변환 손실 방지)
  'cmykStroke',
  'originalFill',
  'effectType',
  'overlayType',

  // === 기능 플래그 ===
  'hasCutting',         // 재단선 기능
  'hasMolding',         // 모양틀 기능
  'hasBinding',
  'movingPath',
  'alwaysTop',          // 항상 최상위
  'accessory',
  'extension',

  // === 그룹 / 인덱스 ===
  'index',
  'displayOrder',
  'isNestedGroup',
  'originalIndex',
  'parentIndex',
  'nestedIndex',

  // === 링크 / 메타 ===
  'linkData',           // 외부 콘텐츠 참조 ID
  'meta',               // ObjectAnchor 등 임의 메타
]
```

### 5.2 toJSON / loadFromJSON 올바른 사용법

```typescript
// 저장 — extendFabricOption 전달 필수
const json = canvas.toJSON(extendFabricOption)
// 또는 toObject 사용:
const obj = canvas.toObject(extendFabricOption)

// 복원
await canvas.loadFromJSON(json, () => {
  canvas.requestRenderAll()
})
// loadFromJSON 후에는 반드시 clearHistory() 호출
canvas.clearHistory()
```

### 5.3 새 커스텀 속성 추가 시 체크리스트

- [ ] `extendFabricOption` 배열에 추가
- [ ] TypeScript 타입 확장 (`fabric.Object` interface augmentation)
- [ ] 기존 저장 데이터에서 누락 시 fallback 로직
- [ ] 저장 → 복원 round-trip 테스트

### 5.4 `meta` 필드 — 임의 데이터 저장

타입 의존 없이 추가 데이터 보존하려면 `meta` 필드 활용:

```typescript
obj.set('meta', {
  anchor: { kind: 'region', xNorm: 0.5, yNorm: 0.3 },  // SpreadRegion 위치
  system: false,
  customField: 'whatever',
})
```

`meta`도 `extendFabricOption`에 포함되어 있어야 한다.

---

## 6. 객체 타입 및 생성 패턴

### 6.1 모든 객체에 id 부여 (★ 필수)

```typescript
import { v4 as uuid } from 'uuid'

const rect = new fabric.Rect({
  id: uuid(),  // 없으면 overlay 연결, history 후처리, 다중 선택 등 전부 깨짐
  // ...
})
```

### 6.2 텍스트 추가 (정형 패턴)

```typescript
// AppText.tsx 패턴
const handleAddText = useCallback(async () => {
  canvas.offHistory()                          // ① history 일시 정지

  const fabricModule = await import('fabric')
  const fabric = fabricModule.fabric ?? fabricModule.default ?? fabricModule

  const workspace = canvas.getObjects().find(o => o.id === 'workspace')
  const center = workspace.getCenterPoint()

  const text = new fabric.IText('TEXT', {
    id: uuid(),
    fontFamily: DEFAULT_FONT_FAMILY,
    fontSize: getDefaultFontSizeInPixels(),
    originX: 'center',
    originY: 'center',
    left: center.x,
    top: center.y,
  })

  // ② 폰트 로드 보장
  const fontPlugin = editor.getPlugin('FontPlugin') as FontPlugin
  await fontPlugin?.applyFont(DEFAULT_FONT_FAMILY, text)

  canvas.onHistory()                           // ③ history 재개
  canvas.add(text)
  canvas.setActiveObject(text)
  canvas.requestRenderAll()                    // ★ renderOnAddRemove:false라 필수

  // ④ 모바일 사이드바 자동 닫기 (캔버스 노출)
  if (isCoarsePointer) tapMenu(null)
}, [canvas, getPlugin, isCoarsePointer, tapMenu])
```

### 6.3 이미지 추가 (CORS, 스케일 자동)

```typescript
export function createFabricImage(
  canvas: fabric.Canvas,
  src: string,
  imagePlugin?: ImageProcessingPlugin | null
): Promise<fabric.Image> {
  return new Promise((resolve, reject) => {
    const imgEl = document.createElement('img')
    imgEl.crossOrigin = 'anonymous'  // ★ CORS 필수
    imgEl.src = src
    imgEl.onload = () => {
      // 알파 채널이 있으면 ImageProcessingPlugin이 처리
      if (imagePlugin?.tellHasAlpha?.(imgEl)) {
        const processed = imagePlugin.processImage(imgEl)
        fabric.Image.fromURL(processed, (img) => {
          finalize(img, canvas, imgEl, resolve)
        })
      } else {
        const img = new fabric.Image(imgEl, baseOptions(canvas, imgEl))
        img.setCoords()
        resolve(img)
      }
    }
    imgEl.onerror = () => reject(new Error('Failed to load image'))
  })
}

function getScale(canvas, imgEl): number {
  const workspace = getWorkspace(canvas)
  if (!workspace) return 0.5
  const ww = workspace.width * (workspace.scaleX || 1)
  const wh = workspace.height * (workspace.scaleY || 1)
  // 워크스페이스의 40% 이하, 최대 0.5
  return Math.min((ww * 0.4) / imgEl.naturalWidth, (wh * 0.4) / imgEl.naturalHeight, 0.5)
}
```

**`fabric.Image.fromURL()`보다 `new Image() → new fabric.Image(imgEl)` 방식이 CORS·에러 처리에서 더 안정적.**

### 6.4 SVG 로드 (Group으로 묶기)

```typescript
// canvas-core 동기 helper
const loaded = await new Promise<fabric.Object>((resolve, reject) => {
  fabric.loadSVGFromURL(url, (objects, options) => {
    if (!objects?.length) return reject(new Error('SVG empty'))
    if (objects.length > 1) {
      const group = fabric.util.groupSVGElements(objects, options)
      group.set({ id: uuid() })
      resolve(group)
    } else {
      objects[0].set({ id: uuid() })
      resolve(objects[0])
    }
  }, undefined, { crossOrigin: 'anonymous' })
})
```

### 6.5 SVG vs Raster 분기 (★ 사용자 보고 핫픽스)

`useImageStore.upload`에서 SVG 파일을 `fabric.Image.fromURL` 경로로 보내면 fabric의 `t.indexOf` 에러로 화면이 freeze된다. 반드시 분기:

```typescript
const isSvgFile = file.type === 'image/svg+xml' || /\.svg$/i.test(file.name)

if (isSvgFile) {
  // SVG는 항상 loadSVGFromURL 경로
  const svgObj = await loadSVGFromURL(url)
  canvas.add(svgObj)
} else {
  // Raster는 createFabricImage 경로
  const img = await createFabricImage(canvas, url, imagePlugin)
  canvas.add(img)
}
canvas.requestRenderAll()
```

### 6.6 객체 필터링 (사용자 객체만)

```typescript
function getEditableObjects(canvas: fabric.Canvas): fabric.Object[] {
  return canvas.getObjects().filter(obj =>
    !obj.excludeFromExport &&
    obj.type !== 'GuideLine' &&
    obj.id !== 'workspace' &&
    obj.extensionType !== 'printguide' &&
    obj.extensionType !== 'template-element'
  )
}

// 사용자 객체 판단 inline 헬퍼
const isUserObject =
  obj?.extensionType !== 'background' &&
  obj?.extensionType !== 'clipping' &&
  obj?.extensionType !== 'guideline' &&
  obj?.id !== 'workspace'
```

### 6.7 extensionType 예약어 (★ 표준)

| 값 | 의미 | 효과 |
|---|---|---|
| (없음) | 일반 사용자 객체 | 정상 처리 |
| `'background'` | 배경 색/이미지 | ControlBar 표시 안 함, sendToBack |
| `'clipping'` | 클리핑 마스크 | 사용자 선택 제외 |
| `'guideline'` | 정렬 가이드라인 | 시스템 객체, 저장 제외 |
| `'overlay'` | 효과 오버레이 (금박, 엠보스) | 줌 시 숨김, undo 후 realign 필요 |
| `'outline'` | 재단선/모양틀 외곽선 | clipPath 적용 제외 |
| `'printguide'` | 인쇄 가이드 (cut/safe border) | 항상 최상위, 저장 제외 |
| `'template-element'` | 템플릿 잠금 요소 | 편집 불가, clipPath 적용 제외 |
| `'frame'` | 이미지 프레임 | workspace와 다른 처리 |
| `'moldIcon'` | 모양틀 + 아이콘 | 동적 생성/삭제 |
| `'fillImage'` | 모양 안에 채워진 이미지 | parentLayerId로 부모 추적 |
| `'cutline-template'` | 커스텀 재단선 SVG | cut-border 자동 비활성 |
| `'lid'` | 봉투 뚜껑 | editMode일 때만 편집 가능 |

### 6.8 객체 ID 예약어

| ID | 역할 |
|---|---|
| `'workspace'` | 배경 Rect (페이지) |
| `'cut-border'` | 재단선 (주황 점선) |
| `'safe-zone-border'` | 안전 영역선 (파란 점선) |
| `'template-background'` | 템플릿 배경 이미지 |
| `'template-mockup'` | 목업 이미지 |
| `'template-outline'` | 템플릿 클립 영역 |
| `'page-outline'` | 페이지 외곽선 (봉투 등) |
| `'page-outline-clip'` | page-outline 복제 (clipPath용) |
| `'cutline-template'` | 커스텀 재단선 SVG |
| `{id}_outline` | 객체별 외곽선 |
| `{id}_moldIcon` | 객체별 모양틀 + 아이콘 |
| `{id}_gold`, `{id}_emboss` | 효과 오버레이 |

---

# Part 2 — 핵심 시스템

## 7. History / Undo-Redo (offHistory 패턴)

### 7.1 fabric-history 확장 메서드

`canvas-core/src/utils/history.ts`에서 `fabric.Canvas.prototype`을 확장:

```typescript
declare module 'fabric' {
  namespace fabric {
    interface Canvas {
      historyUndo: string[]
      historyRedo: string[]
      historyNextState: string
      historyProcessing: boolean
      historyMaxSteps: number
      isHistoryReady: boolean

      undo(callback?: () => void): void
      redo(callback?: () => void): void
      clearHistory(type?: string): void
      onHistory(): void          // 기록 ON
      offHistory(): void         // 기록 OFF
      canUndo(): boolean
      canRedo(): boolean
    }
  }
}
```

### 7.2 historyMaxSteps 모바일 절감

```typescript
// 모바일: 15, 데스크톱: 50
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
this.historyMaxSteps = isCoarsePointer ? 15 : 50
```

50 → 15 줄여서 메모리 ~70% 절감 (각 step마다 toJSON 직렬화 길이만큼 차지).

### 7.3 offHistory / onHistory 패턴 (★ 가장 자주 사용)

**모든 internal 변경은 try/finally로 보호:**

```typescript
canvas.offHistory()
try {
  // 내부 변경 (사용자 명시 작업이 아닌 시스템 변경)
  realignOverlays()
  ensureGuideElements()
} finally {
  canvas.onHistory()
}
```

**이 패턴이 적용된 곳들** (실제 코드):
- `HistoryPlugin.undo/redo` 후처리 — undo 후 overlay/guide 동기화
- `ObjectPlugin.up/down/del` — 레이어 순서 변경 시 fillImage 자동 따라가기
- `GroupPlugin.group/unGroup` — 그룹 객체 직접 수정
- `AlignPlugin` — 정렬 시 다중 객체 좌표 수정
- `LockPlugin` — 잠금 토글
- `FilterPlugin` — 필터 적용 중간 단계
- `ServicePlugin` — 저장/복원 중
- `DraggingPlugin` — 패닝 중 (사용자 액션이 아니므로)
- `moveObjectToCanvas` — cross-canvas 이동

### 7.4 Undo 후 필수 후처리 (★)

```typescript
canvas.undo(async () => {
  canvas.offHistory()  // 후처리는 history에 들어가면 안 됨

  // ① 효과 overlay 위치 재정렬 (원본과 분리되어 있음)
  realignOverlays()

  // ② 가이드선 재생성 (printguide 객체 사라졌을 수 있음)
  ensureGuideElements()

  // ③ 모양틀 이벤트 재바인딩 (hasMolding 동적 바인딩)
  await rebindMoldFeatures()

  // ★ historyProcessing 플래그와 historyNextState 수동 동기화
  ;(canvas as any).historyProcessing = false
  ;(canvas as any).historyNextState = (canvas as any)._historyNext()

  this.historyUpdate()  // editor.emit('historyUpdate', undoLen, redoLen)
})
```

**`historyProcessing` / `historyNextState`를 동기화 안 하면 다음 `object:modified` 이벤트가 잘못된 baseline과 비교해 false positive history 항목 생성.**

### 7.5 realignOverlays (효과 동기화)

금박·엠보스 같은 효과는 원본 객체 위에 별도 overlay 객체로 그려진다. undo 시 overlay가 분리되므로 ID 규칙으로 찾아 동기화:

```typescript
private realignOverlays() {
  const all = this._canvas.getObjects()
  const overlays = all.filter(o => o.extensionType === 'overlay')

  for (const overlay of overlays) {
    if (!overlay.id) continue
    // ID 규칙: "{원본id}_gold", "{원본id}_emboss"
    const originalId = overlay.id.split('_')[0]
    const original = all.find(o => o.id === originalId)
    if (!original) continue

    overlay.set({
      left: original.left,
      top: original.top,
      angle: original.angle,
      flipX: original.flipX, flipY: original.flipY,
      skewX: original.skewX, skewY: original.skewY,
      width: original.width * original.scaleX,
      height: original.height * original.scaleY,
      scaleX: 1, scaleY: 1,
      visible: true,
    })
    this.updateClipPathAsync(overlay, original)  // 비동기 클립패스 갱신
  }

  this._canvas.requestRenderAll()
}
```

### 7.6 ensureGuideElements (가이드선 복원)

```typescript
private ensureGuideElements() {
  const objects = this._canvas.getObjects()
  const hasCut = objects.some(o => o.id === 'cut-border')
  const hasSafe = objects.some(o => o.id === 'safe-zone-border')
  if (!hasCut || !hasSafe) {
    const ws = this._editor.getPlugin('WorkspacePlugin') as WorkspacePlugin
    ws?.restoreGuideElements()
  }
}
```

### 7.7 history 핫키

```typescript
hotkeys: CanvasHotkey[] = [
  {
    name: 'Undo',
    input: ['ctrl+z', '⌘+z'],
    onlyForActiveObject: false,
    callback: () => this.undo(),
    hideContext: true
  },
  {
    name: 'Redo',
    input: ['ctrl+shift+z', '⌘+shift+z'],
    onlyForActiveObject: false,
    callback: () => this.redo(),
    hideContext: true
  }
]
```

### 7.8 beforeunload 경고

```typescript
this._beforeUnloadHandler = (e: BeforeUnloadEvent) => {
  if (this._canvas.historyUndo.length > 0) {
    ;(e || window.event).returnValue = 'cannot back'  // 미저장 변경 경고
  }
}
window.addEventListener('beforeunload', this._beforeUnloadHandler)
```

`destroyed()`에서 반드시 `removeEventListener` 해제.

---

## 8. 상태 관리 (Zustand + Canvas)

### 8.1 핵심 원칙

- **canvas 인스턴스를 React state에 넣지 말 것** — useState/useEffect 의존성에 들어가면 무한 리렌더
- **Zustand 스토어가 canvas 인스턴스 owner** — `useAppStore.getState().canvas`로 어디서든 접근
- **canvas 이벤트 → Zustand 액션 → React re-render** 단방향 흐름
- **Selector로 부분 구독** — `useAppStore(s => s.canvas)`만 변할 때 리렌더

### 8.2 스토어 구조 (참고 인터페이스)

```typescript
// useAppStore — 캔버스/에디터 인스턴스
interface AppStore {
  allCanvas: fabric.Canvas[]    // 모든 페이지 캔버스
  allEditors: Editor[]
  canvas: fabric.Canvas | null  // 현재 활성
  editor: Editor | null
  activeSelection: fabric.Object | null
  isSpreadMode: boolean

  init: (canvas, editor, initId?: string) => void
  setPage: (index: number) => void
  reorderByIndex: (order: number[]) => void  // 페이지 재배열
  takeCanvasScreenshot: () => Promise<string>  // 모바일에선 placeholder
  reset: () => void
}

// useEditorStore — 세션 / 페이지 데이터
interface EditorStore {
  sessionId: string | null
  session: EditSession | null
  pages: EditPage[]
  currentPageIndex: number
  status: 'DRAFT' | 'REVIEW' | 'SUBMITTED'
  isLocked: boolean
}

// useSettingsStore — 캔버스 설정
interface SettingsStore {
  unit: 'mm' | 'px'
  dpi: number  // 보통 150
  size: { width, height, cutSize, safeSize }
  renderType: 'bounded' | 'noBounded' | 'mockup' | 'envelope'
  spreadConfig?: SpreadConfig
}

// useSaveStore — 저장 상태
interface SaveStore {
  isDirty: boolean
  isSaving: boolean
  lastSavedAt: Date | null
  isOnline: boolean
  autoSaveEnabled: boolean
  autoSaveInterval: number
}

// useUiPrefStore — UI 설정 (persist + version 마이그레이션)
interface UiPrefStore {
  theme: 'light' | 'dark' | 'system'
  sidebarCollapsed: boolean
  recentColors: string[]
  coverEditMode: 'auto' | 'separated' | 'composite'
  // ...
}
```

### 8.3 Zustand persist + version 마이그레이션

```typescript
const useUiPrefStore = create<UiPrefStore>()(
  persist(
    (set) => ({ ... }),
    {
      name: 'storige-ui-pref',
      version: 7,
      migrate: (persistedState: any, version: number) => {
        if (version < 4) persistedState.coverEditMode = 'auto'
        if (version < 5) persistedState.recentColors = []
        if (version < 6) persistedState.autoSaveToastEnabled = true
        if (version < 7) persistedState.autoSaveSnapshots = []
        return persistedState
      },
    }
  )
)
```

새 필드 추가할 때 반드시 version + migrate 추가.

### 8.4 canvas 이벤트 → 스토어 동기화

```typescript
canvas.on('selection:created', (e) => {
  useAppStore.getState().setActiveSelection(e.target)
})
canvas.on('selection:cleared', () => {
  useAppStore.getState().setActiveSelection(null)
})
canvas.on('object:modified', () => {
  useSaveStore.getState().markDirty()
})
```

### 8.5 모바일 스크린샷 디바운스

```typescript
const SCREENSHOT_DEBOUNCE_MS = TOUCH_ENV ? 2000 : 200

const takeCanvasScreenshot = debounce(async () => {
  if (TOUCH_ENV) {
    // 모바일: toDataURL 자체 스킵, placeholder만
    return PLACEHOLDER_THUMBNAIL_DATA_URL
  }
  return canvas.toDataURL({ format: 'png', multiplier: 0.5 })
}, SCREENSHOT_DEBOUNCE_MS)
```

---

## 9. 이미지 처리 (CORS, OpenCV, SVG)

### 9.1 OpenCV 동적 로드

```typescript
// openCv.ts (신규 모듈)
let cvPromise: Promise<any> | null = null

export function getCv(): Promise<any> {
  if (!cvPromise) {
    cvPromise = import('@techstark/opencv-js').then(m => m.default || m)
  }
  return cvPromise
}

// 백그라운드 warmup (★ Chrome 확장 충돌 위험 — 사용 시 검증 필수)
export function warmupOpenCv() {
  if ('requestIdleCallback' in window) {
    ;(window as any).requestIdleCallback(() => getCv())
  } else {
    setTimeout(() => getCv(), 1000)
  }
}
```

### 9.2 ImageProcessingPlugin Feature Flag

```typescript
const ENABLE_IMAGE_PROCESSING = import.meta.env.VITE_ENABLE_IMAGE_PROCESSING !== 'false'
const image = ENABLE_IMAGE_PROCESSING ? new ImageProcessingPlugin(canvas, editor) : null
```

OpenCV는 ~10MB WASM, 첫 로드 시 5~10초 메인 스레드 점유. 모바일에선 비권장.

### 9.3 알파 채널 감지 (작은 샘플)

```typescript
function tellHasAlpha(imgEl: HTMLImageElement): boolean {
  const offscreen = document.createElement('canvas')
  offscreen.width = Math.min(imgEl.naturalWidth, 100)
  offscreen.height = Math.min(imgEl.naturalHeight, 100)
  const ctx = offscreen.getContext('2d')!
  ctx.drawImage(imgEl, 0, 0, offscreen.width, offscreen.height)
  const data = ctx.getImageData(0, 0, offscreen.width, offscreen.height).data
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] < 255) return true
  }
  return false
}
```

전체 이미지를 검사하면 큰 이미지에서 메인 스레드 freeze. 100×100 샘플이면 충분.

### 9.4 모바일 4MB 업로드 가드

```typescript
function checkMobileFileSize(file: File): boolean {
  if (!TOUCH_ENV) return true
  const MAX_MOBILE_SIZE = 4 * 1024 * 1024
  if (file.size > MAX_MOBILE_SIZE) {
    showToast(`모바일에서는 ${MAX_MOBILE_SIZE / 1024 / 1024}MB 이하 파일만 업로드 가능합니다`, 'warning')
    return false
  }
  return true
}

// 모든 upload 진입점에서 호출
async upload(file: File) {
  if (!checkMobileFileSize(file)) return
  // ...
}
```

---

## 10. 텍스트 & 한글 폰트

### 10.1 텍스트 객체 타입 선택

| 타입 | 용도 |
|---|---|
| `fabric.Text` | 정적 텍스트 (편집 불가, 미리보기/썸네일) |
| `fabric.IText` | 인라인 편집 가능 텍스트 (★ 일반 편집기) |
| `fabric.Textbox` | 자동 줄바꿈 (너비 고정) |

### 10.2 IText는 항상 lockUniScaling

ControlsPlugin에서 자동 적용 — 텍스트는 종횡비 비례 스케일만:

```typescript
this._canvas.on('object:added', (evt) => {
  const target = evt.target as fabric.Object
  if (target?.type === 'i-text') {
    target.set({ lockUniScaling: true })
    this._canvas.requestRenderAll()
  }
})
```

### 10.3 한글 NFC/NFD 정규화 (★ 필수)

macOS 파일 시스템은 NFD(자소 분리), Windows/대부분 시스템은 NFC(완성형) 사용. 폰트명 매칭 시 두 형태가 충돌:

```typescript
const normalizeToNFC = (text: string) => text.normalize('NFC')
const normalizeToNFD = (text: string) => text.normalize('NFD')

// 매칭용 — 양쪽 변형 모두 반환
const getNormalizedVariants = (text: string): string[] => {
  const nfc = normalizeToNFC(text.trim())
  const nfd = normalizeToNFD(text.trim())
  return nfc === nfd ? [nfc] : [nfc, nfd]
}

// 폰트 이름 매칭 (NFC ↔ NFD 교차 비교)
const findFontVariantMatch = (target: string, loadedFonts: Map<string, any>): string | null => {
  const targetVariants = getNormalizedVariants(target)
  for (const [loadedName] of loadedFonts) {
    const loadedVariants = getNormalizedVariants(loadedName)
    for (const tv of targetVariants) {
      for (const lv of loadedVariants) {
        if (tv === lv) return loadedName  // 매칭 성공
      }
    }
  }
  return null
}
```

**서버와 일관성 위해 저장 시점에는 NFD를 기본으로** (`normalizeFontName`).

### 10.4 폰트 로드 — CSS Font Loading API 우선

```typescript
async function loadFontNative(fontName: string): Promise<void> {
  if (!document.fonts) {
    // 폴백: FontFaceObserver
    const observer = new FontFaceObserver(fontName)
    await observer.load(testText, 5000)
    return
  }

  const testText = 'ABC가나다字体テスト🔤'
  const fontSpec = `40px "${fontName}"`

  // ① 로드 요청
  await document.fonts.load(fontSpec, testText)

  // ② 사용 가능 검증
  if (!document.fonts.check(fontSpec)) {
    throw new Error(`로드 완료됐으나 사용 불가: ${fontName}`)
  }

  // ③ 메트릭 계산 시간 확보 (★ 매우 중요)
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => setTimeout(r, 30))

  // ④ 최종 검증
  if (!document.fonts.check(fontSpec)) {
    throw new Error(`최종 검증 실패: ${fontName}`)
  }
}
```

**`document.fonts.load`만 await하면 메트릭이 아직 계산 안 됐을 수 있어 텍스트 width가 잘못 측정됨.** RAF 2번 + 30ms 대기 패턴 필수.

### 10.5 폰트 적용 후 객체 크기 재계산

```typescript
public async applyFontToObject(object: fabric.Object, name: string): Promise<void> {
  const matched = findFontVariantMatch(name, this.fontLoadingStatus)
  const target = matched || normalizeFontName(name)

  if (this.fontLoadingStatus.get(target) !== 'loaded') {
    await this.ensureFontLoaded(target)
  }

  object.set('fontFamily', target)

  // 메트릭 계산 시간
  await new Promise(r => requestAnimationFrame(r))
  await new Promise(r => requestAnimationFrame(r))

  // ★ 크기 재계산 (폰트 변경 시 필수)
  ;(object as any).initDimensions?.()
  object.dirty = true
  object.setCoords()

  this._canvas.requestRenderAll()
}
```

### 10.6 폰트 로딩 큐 (중복 방지)

```typescript
private fontLoadingStatus = new Map<string, 'loading' | 'loaded' | 'failed'>()
private loadingQueue = new Map<string, Array<{ object, resolve, reject }>>()

loadFont(font: FontSource): Promise<void> {
  const name = normalizeFontName(font.name)

  if (this.fontLoadingStatus.get(name) === 'loaded') return Promise.resolve()
  if (this.fontLoadingStatus.get(name) === 'loading') {
    // 이미 로딩 중이면 큐에 대기
    return new Promise((resolve, reject) => {
      if (!this.loadingQueue.has(name)) this.loadingQueue.set(name, [])
      this.loadingQueue.get(name)!.push({ object: null, resolve, reject })
    })
  }
  // ... 새로 로드 후 큐 처리
}
```

### 10.7 PDF 변환 시 텍스트 → Path

PDF로 내보낼 때 폰트가 없는 환경(서버)에서도 정확한 글리프를 보장하기 위해 텍스트를 SVG path로 변환:

```typescript
// canvas-core/src/converters/svgTextToPath.ts
import { convertSvgTextToPath } from '@storige/canvas-core'
const pathSvg = await convertSvgTextToPath(textSvg, { fontFamily, fontWeight })
```

WOFF2 → TTF 변환 후 opentype.js로 글리프 path 추출. TTF buffer는 fontFamily별 캐시.

---

## 11. 표지 편집 (Separated / Composite / Spread)

### 11.1 3가지 모드

| 모드 | 데이터 구조 | 책등 | 용도 |
|---|---|---|---|
| **Separated** | 다중 캔버스 (`allCanvas[i]`마다 별도 페이지) | 가변 (소프트커버) | 기본. 영역마다 독립 편집 |
| **Composite** | Separated와 같은 다중 캔버스 + UX 상 펼친 모양 시각화 | 가변 | CoverFocusBar 미니맵 + cross-canvas 이동 |
| **Spread** | 단일 펼침면 캔버스 + 영역 메타 | 고정 (양장, 포토북) | 펼침면 1개 캔버스 |

### 11.2 결정 트리

```
TemplateSet.editorMode === BOOK
  ├─ 첫 Template.type === SPREAD?
  │   YES → Spread 모드 (SpreadPagePanel + SpreadPlugin)
  └─ 첫 Template.type ∈ {COVER, SPINE, WING}?
      YES → useUiPrefStore.coverEditMode
            ├─ 'auto' (기본): 시스템 자동
            ├─ 'separated': 분리 편집
            └─ 'composite': 합쳐진 미니맵 + cross-canvas

TemplateSet.editorMode === SINGLE
  └─ PagePanel + 단일 캔버스
```

### 11.3 SpreadPlugin 핵심 API

```typescript
// SpreadSpec — 책 펼침면 명세
interface SpreadSpec {
  totalWidthMm: number       // 뒷날개+뒷표지+책등+앞표지+앞날개 전체
  totalHeightMm: number
  spineWidthMm: number       // 책등 폭 (가변)
  wingWidthMm?: number       // 날개 폭 (있을 때)
  cutSizeMm: number
  safeSizeMm: number
}

// 영역 위치 (5개)
type SpreadRegionPosition = 'back-wing' | 'back-cover' | 'spine' | 'front-cover' | 'front-wing'

// 객체 anchor
type ObjectAnchor =
  | { kind: 'region'; xNorm: number; yNorm: number }   // region 내부 정규화 좌표
  | { kind: 'canvas'; x: number; y: number }            // 캔버스 절대 좌표

// SpreadPlugin 메서드
plugin.init(spec)                                       // 초기 레이아웃
await plugin.resizeSpine(newSpineWidthMm)               // 책등 가변 (atomic)
plugin.getRegionAtX(x): SpreadRegion                    // X 좌표 → 영역
```

### 11.4 책등 가변 시 객체 자동 재배치

```typescript
async resizeSpine(newSpineWidthMm: number) {
  this.isLayoutTransaction = true
  try {
    this._canvas.renderOnAddRemove = false

    // ① 새 레이아웃 계산
    const newLayout = computeResizedLayout(
      this.currentLayout, this.currentSpec, newSpineWidthMm
    )

    // ② Workspace 크기 변경 (size 객체 통째로 전달!)
    const ws = this._editor.getPlugin('WorkspacePlugin')
    await ws?.setOptions({
      size: {
        width: newLayout.totalWidthMm,
        height: newLayout.totalHeightMm,
        cutSize: this.currentSpec.cutSizeMm,
        safeSize: this.currentSpec.safeSizeMm,
      },
    })

    // ③ region anchor 객체들 재배치
    this.repositionObjects(this.currentLayout, newLayout)

    // ④ 이탈 객체 알림
    const outOfBounds = this.checkObjectsOutOfBounds()
    if (outOfBounds.length > 0) {
      this._editor.emit('spreadObjectsOutOfBounds', {
        count: outOfBounds.length,
        objects: outOfBounds,
      })
    }

    // ⑤ 가이드/라벨 재렌더
    this.clearGuides()
    this.renderGuides(newLayout)
  } finally {
    this.isLayoutTransaction = false
    this._canvas.renderOnAddRemove = true
    this._canvas.requestRenderAll()
  }
}
```

### 11.5 객체 region 인식 (히스테리시스 90%/70%)

```typescript
// resolveRegionRef — 객체가 어느 region에 속하는지 판정 + 히스테리시스
function resolveRegionRef(
  regions: SpreadRegion[],
  boundingRect: { left, top, width, height },
  currentRegionRef: SpreadRegionRef | null
): SpreadRegionRef {
  // 1. 각 region과의 overlap 계산
  // 2. 현재 region 유지 조건: overlap >= 70%
  // 3. 새 region 승격 조건: overlap >= 90%
  // 4. 둘 다 만족 안 하면 'canvas' anchor (자유)
}
```

이 히스테리시스가 없으면 객체를 경계에 살짝 걸치게 둘 때 region이 깜빡거림.

### 11.6 cross-canvas 객체 이동 (moveObjectToCanvas)

```typescript
async function moveObjectToCanvas(
  obj: fabric.Object,
  source: fabric.Canvas,
  target: fabric.Canvas,
  options: { center?: boolean; xNorm?: number; yNorm?: number } = {}
): Promise<fabric.Object | null> {
  if (source === target) return null
  if (obj.id === 'workspace' || obj.extensionType === 'printguide') return null

  // ★ 양 캔버스 history 동시 정지 (atomic)
  source.offHistory()
  target.offHistory()

  try {
    // ① 클론 (extendFabricOption 포함)
    const cloned = await new Promise<fabric.Object>((resolve) => {
      obj.clone((c: fabric.Object) => resolve(c), extendFabricOption)
    })
    cloned.set('id', uuid())

    // ② meta 깊은 복사 (참조 분리)
    if ((obj as any).meta) {
      cloned.set('meta', JSON.parse(JSON.stringify((obj as any).meta)))
    }

    // ③ 위치 계산
    if (options.xNorm !== undefined && options.yNorm !== undefined) {
      const tgtBox = getWorkspaceBox(target)
      cloned.set({
        left: tgtBox.left + tgtBox.width * options.xNorm,
        top: tgtBox.top + tgtBox.height * options.yNorm,
      })
    } else if (options.center) {
      const tgtCenter = getWorkspace(target)?.getCenterPoint()
      cloned.set({ left: tgtCenter.x, top: tgtCenter.y })
    }

    // ④ source 제거, target 추가
    source.remove(obj)
    target.add(cloned)
    cloned.setCoords()

    return cloned
  } finally {
    source.onHistory()
    target.onHistory()
    target.requestRenderAll()
  }
}
```

### 11.7 cross-canvas 이동 되돌리기

```typescript
// useCrossCanvasMoveStore — 30초 윈도우, LRU 1
interface CrossCanvasMoveRecord {
  ts: number
  sourceCanvasIndex: number
  targetCanvasIndex: number
  count?: number  // 다중 선택 시 N
}

// "방금 이동 되돌리기" 버튼
function undoMove(record: CrossCanvasMoveRecord) {
  const target = allCanvas[record.targetCanvasIndex]
  const source = allCanvas[record.sourceCanvasIndex]
  for (let i = 0; i < (record.count || 1); i++) {
    target.undo()
    source.undo()
  }
}
```

---

## 12. Workspace, 가이드라인, ClipPath

### 12.1 Workspace 객체

```typescript
const workspace = new fabric.Rect({
  id: 'workspace',
  width: effectiveWidth,
  height: effectiveHeight,
  originX: 'center',
  originY: 'center',
  top: 0, left: 0,
  fill: '#fff',
  selectable: false,
  hasControls: false,
  hasBorders: false,
  lockMovementX: true,
  lockMovementY: true,
  moveCursor: 'default',
  hoverCursor: 'default',
})
canvas.clipPath = workspace  // 워크스페이스 영역으로 클리핑
```

`renderType === 'noBounded'` 또는 `'mockup'`일 때는 clipPath 설정하지 않음.

### 12.2 가이드라인 Z-order 유지

`object:added/modified/removed` 이벤트마다 가이드선 최상위 유지:

```typescript
this._canvas.on('object:added', this._boundEnsureTemplateBackgroundZOrder)
this._canvas.on('object:removed', this._boundEnsureTemplateBackgroundZOrder)
this._canvas.on('object:modified', this._boundEnsureTemplateBackgroundZOrder)

private bringBordersToFront() {
  if (!this._canvas?.getContext()) return  // ★ disposed 가드
  this.cutBorder?.bringToFront()
  this.safeSizeBorder?.bringToFront()
  this._canvas.requestRenderAll()
}
```

### 12.3 Template Background Z-order

`template-background`는 workspace 바로 위 + 사용자 객체 아래:

```typescript
private ensureTemplateBackgroundZOrder() {
  const workspace = this._getWorkspace()
  const templateBg = canvas.getObjects().find(o => o.id === 'template-background')
  if (!templateBg || !workspace) return

  const wsIndex = canvas.getObjects().indexOf(workspace)
  const desiredIndex = Math.max(0, wsIndex + 1)
  if (canvas.getObjects().indexOf(templateBg) !== desiredIndex) {
    ;(templateBg as any).moveTo(desiredIndex)
  }
  this.bringBordersToFront()
}
```

### 12.4 page-outline ClipPath 시스템 (봉투/비규칙 형태)

봉투 같은 비규칙 형태는 `canvas.clipPath` 대신 각 객체에 개별 clipPath 적용:

```typescript
// page-outline 추가 시 모든 객체에 clipPath 적용
canvas.on('object:added', (e) => {
  if (e.target?.id === 'page-outline') {
    canvas.getObjects().forEach(obj => applyPageOutlineClipPath(obj))
  }
})

private async applyPageOutlineClipPath(obj: fabric.Object) {
  if (!obj || obj.excludeFromExport) return
  // outline/printguide/overlay/template-element 제외
  if (['outline', 'printguide', 'overlay', 'template-element'].includes(obj.extensionType)) return
  if (obj.id === 'page-outline' || obj.id === 'template-background') return

  const pageOutline = canvas.getObjects().find(o => o.id === 'page-outline')
  if (!pageOutline) return

  const clone = await this.cloneOutlineForClipPath(pageOutline)
  obj.clipPath = clone
  canvas.requestRenderAll()
}

private cloneOutlineForClipPath(outline): Promise<fabric.Object> {
  return new Promise((resolve) => {
    outline.clone((cloned) => {
      cloned.set({
        absolutePositioned: true,  // ★ 필수
        id: 'page-outline-clip',
        fill: 'white',
        extensionType: 'template-element',
      })
      resolve(cloned)
    })
  })
}
```

`absolutePositioned: true`가 없으면 clipPath가 객체 변환을 따라가서 깨진다.

### 12.5 가이드선 생성 (Cut Border, Safe Zone)

```typescript
this.cutBorder = new fabric.Path(pathData, {
  fill: 'transparent',
  stroke: '#e8943a',           // 주황
  strokeWidth: 0.5,
  opacity: 0.8,
  strokeDashArray: [12, 12],   // 점선
  selectable: false,
  hasControls: false,
  evented: false,
  hoverCursor: 'default',
  strokeUniform: true,         // ★ 줌해도 선 두께 유지
  id: 'cut-border',
  extensionType: 'printguide',
  editable: false,
  absolutePositioned: true,
  excludeFromExport: true,     // 저장 JSON에서 제외
  visible: this._options.showCutBorder,
})
```

### 12.6 cutline-template 우선순위

커스텀 SVG 재단선이 있으면 기본 cut-border 생성 스킵:

```typescript
private async createOrUpdateCutBorder() {
  if (this.cutBorder) {
    this._canvas.remove(this.cutBorder)
    this.cutBorder = null
  }
  // ★ cutline-template이 있으면 기본 cut-border 생성하지 않음
  if (this._canvas.getObjects().find(o => o.id === 'cutline-template')) return
  // ... 일반 사각형 cut-border 생성 로직
}
```

---

## 13. Drag·Pan·Zoom

### 13.1 Pan (Space-bar / Alt-drag)

```typescript
class DraggingPlugin extends PluginBase {
  dragMode = false  // Space로 토글

  private setDragMode = (e: KeyboardEvent) => {
    if (e.code === 'Space' && e.type === 'keydown' && !this.dragMode) {
      this.startDragging()
    } else if (e.code === 'Space' && e.type === 'keyup' && this.dragMode) {
      this.endDragging()
    }
  }

  private startDragging() {
    if (!this._canvas?.getContext() || (this._canvas as any).disposed) return
    if (!this.isCanvasVisible()) return  // ★ 숨겨진 캔버스 무시

    this.dragMode = true
    this._canvas.defaultCursor = 'grab'
    this._canvas.skipTargetFind = true  // ★ workspace의 hoverCursor 덮어쓰기 방지
    this._editor.emit('startDragging')
  }

  // ★ 다중 캔버스에서 숨겨진 것은 드래그 모드 진입 안 함
  private isCanvasVisible(): boolean {
    const el = this._canvas.wrapperEl || this._canvas.getElement()?.parentElement
    if (!el) return false
    return el.offsetParent !== null && getComputedStyle(el).display !== 'none'
  }
}
```

### 13.2 TouchEvent 안전한 좌표 추출

`MouseEvent.clientX`만 보면 TouchEvent에서 `undefined`. 다음 헬퍼 필수:

```typescript
const getEventPoint = (e: any): { x: number; y: number; altKey: boolean } => {
  if (!e) return { x: 0, y: 0, altKey: false }
  if (typeof e.clientX === 'number') {
    return { x: e.clientX, y: e.clientY, altKey: !!e.altKey }
  }
  // TouchEvent
  const t = e.touches?.[0] ?? e.changedTouches?.[0]
  if (t) return { x: t.clientX, y: t.clientY, altKey: !!e.altKey }
  return { x: 0, y: 0, altKey: false }
}
```

### 13.3 Zoom (휠) — overlay 깜빡임 방지

```typescript
private bindWheel() {
  let isZooming = false

  this._afterZoomDebounced = debounce(() => {
    isZooming = false
    if (!this._canvas?.getContext()) return

    // 줌 완료 후 overlay 다시 보이게
    this._canvas.getObjects().forEach(obj => {
      if (obj.extensionType === 'overlay') obj.visible = true
    })
    this._canvas.requestRenderAll()
  }, 300)

  this._boundMouseWheel = function (this: fabric.Canvas, opt: IEvent<WheelEvent>) {
    // 줌 시작 시 overlay 일시 숨김 (★ 깜빡임 방지)
    if (!isZooming) {
      isZooming = true
      this.getObjects().forEach(obj => {
        if (obj.extensionType === 'overlay') obj.visible = false
      })
    }

    let zoom = this.getZoom()
    zoom *= 0.999 ** opt.e.deltaY
    zoom = Math.max(0.01, Math.min(20, zoom))
    const center = this.getCenter()
    this.zoomToPoint(new fabric.Point(center.left, center.top), zoom)

    opt.e.preventDefault()
    opt.e.stopPropagation()
    this.requestRenderAll()
    afterZoomDebounced()
  }
  this._canvas.on('mouse:wheel', this._boundMouseWheel)
}
```

### 13.4 Zoom Auto Fit

```typescript
setZoomAuto(scale?: number) {
  const wrapper = document.querySelector('#canvas-wrapper') as HTMLElement
  if (!wrapper || !this._canvas?.getContext()) return

  const wrect = wrapper.getBoundingClientRect()
  this._canvas.setWidth(wrect.width)
  this._canvas.setHeight(wrect.height)

  const workspace = this._getWorkspace()
  if (!workspace) return

  // viewport 초기화
  this._canvas.setViewportTransform(fabric.iMatrix.concat())

  // findScaleToFit + 약간의 여백 (98%)
  const adapted = fabric.util.findScaleToFit(workspace, {
    width: wrect.width, height: wrect.height,
  }) * (scale ?? 0.8) * 0.98

  // wrapper 중앙 기준 줌
  const wcx = wrect.width / 2
  const wcy = wrect.height / 2
  workspace.setCoords()
  const wsCenter = workspace.getCenterPoint()

  this._canvas.zoomToPoint(new fabric.Point(wcx, wcy), adapted)
  if (this._canvas.viewportTransform) {
    this._canvas.viewportTransform[4] = wcx - wsCenter.x * adapted
    this._canvas.viewportTransform[5] = wcy - wsCenter.y * adapted
    this._canvas.setViewportTransform(this._canvas.viewportTransform)
  }

  this._canvas.forEachObject(obj => obj.setCoords())
  this._canvas.requestRenderAll()
}
```

### 13.5 화살표 키 객체 이동 (ControlsPlugin)

```typescript
private handleArrowKeyMovement = (e: KeyboardEvent) => {
  // ★ 입력 필드 포커스 시 무시
  const target = e.target as HTMLElement
  if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

  const active = this._canvas.getActiveObject()
  if (!active) return

  const moveDistance = e.shiftKey ? 10 : 1  // Shift로 10px

  let shouldMove = false
  switch (e.key) {
    case 'ArrowUp':    active.set({ top: (active.top ?? 0) - moveDistance });  shouldMove = true; break
    case 'ArrowDown':  active.set({ top: (active.top ?? 0) + moveDistance });  shouldMove = true; break
    case 'ArrowLeft':  active.set({ left: (active.left ?? 0) - moveDistance }); shouldMove = true; break
    case 'ArrowRight': active.set({ left: (active.left ?? 0) + moveDistance }); shouldMove = true; break
  }
  if (shouldMove) {
    e.preventDefault()
    active.setCoords()
    this._canvas.requestRenderAll()
    this._canvas.fire('object:modified', { target: active })  // history 기록
  }
}
```

---

## 14. 정렬·그룹·잠금·복사

### 14.1 ObjectPlugin Z-order (fillImage 자동 따라가기)

```typescript
up() {
  const actives = this._canvas.getActiveObjects()
  if (actives.length !== 1) return  // 다중 선택은 무시

  this._canvas.offHistory()
  try {
    const active = actives[0]
    if ((active as any).lockLayerOrder) {
      console.log('🔒 레이어 순서 이동 잠금')
      return
    }
    active.bringForward()

    // ★ fillImage 자동 따라가기 (parentLayerId 매칭)
    const fillImage = this._canvas.getObjects().find(o =>
      o.extensionType === 'fillImage' && (o as any).parentLayerId === active.id
    )
    fillImage?.bringForward()

    this.setUnchangeable()  // workspace/background/border 다시 정렬
  } finally {
    this._canvas.onHistory()
    RenderOptimizer.queueRender(this._canvas)
    this._editor.emit('layerChanged')
  }
}
```

### 14.2 객체 삭제 — 연관 객체 일괄 정리

```typescript
del(object?: fabric.Object) {
  this._canvas.offHistory()
  const targets = object ? [object] : this._canvas.getActiveObjects()

  // lid 객체는 editMode 아닐 때 삭제 금지
  const lids = targets.filter(o => o.extensionType === 'lid')
  if (lids.length > 0 && !this._options.editMode) {
    this._canvas.onHistory()
    return
  }

  targets.forEach(obj => {
    if (!obj?.id) return
    const all = this._canvas.getObjects()

    // ① fillImage 제거
    const fillImage = all.find(i =>
      i.extensionType === 'fillImage' && (i as any).parentLayerId === obj.id
    )
    if (fillImage) {
      fillImage.clipPath = undefined
      this._canvas.remove(fillImage)
    }

    // ② 연관 객체 (outline, moldIcon 등)
    const associated = all.filter(i =>
      i.id === `${obj.id}_outline` ||
      i.id === `${obj.id}_moldIcon` ||
      (i.id?.startsWith(`${obj.id}_`) && i.extensionType !== 'fillImage')
    )
    associated.forEach(i => {
      i.clipPath = undefined
      this._canvas.remove(i)
    })
  })

  // ③ 모양틀에 채워진 이미지 삭제 시 + 아이콘 복원
  targets.forEach(obj => {
    if (obj.clipPath?.id) {
      const moldShape = this._canvas.getObjects().find(i =>
        i.id === obj.clipPath?.id && (i.extensionType === 'template-element' || i.hasMolding)
      )
      if (moldShape) {
        const moldIcon = this._canvas.getObjects().find(i =>
          i.extensionType === 'moldIcon' && i.id === `${moldShape.id}_moldIcon`
        )
        moldIcon?.set('visible', true)
      }
    }
  })

  this._canvas.remove(...targets)
  this._canvas.discardActiveObject()
  this._canvas.onHistory()
  RenderOptimizer.queueRender(this._canvas)
  this._editor.emit('layerChanged')
}
```

### 14.3 setUnchangeable (시스템 객체 Z-order 보장)

```typescript
setUnchangeable() {
  const all = this._canvas.getObjects()
  const workspace = this._getWorkspace()
  const background = all.find(i => i.extensionType === 'background')
  const templateBg = all.find(i => i.id === 'template-background')
  const templateOutline = all.find(i =>
    i.id === 'template-outline' || i.id === 'page-outline'
  )

  templateOutline?.bringToFront()
  background?.sendToBack()
  templateBg?.sendToBack()
  workspace?.sendToBack()

  // fillImage를 부모 바로 위로
  const fillImages = all.filter(o => o.extensionType === 'fillImage')
  fillImages.forEach(fi => {
    const parent = this._canvas.getObjects().find(o => o.id === (fi as any).parentLayerId)
    if (!parent) return
    const parentIdx = this._canvas.getObjects().indexOf(parent)
    const fiIdx = this._canvas.getObjects().indexOf(fi)
    if (fiIdx !== parentIdx + 1) fi.moveTo(parentIdx + 1)
  })

  // alwaysAbove extensionType은 항상 최상위
  const alwaysAbove = ['overlay', 'outline', 'printguide', 'guideline']
  all.forEach(o => {
    if (alwaysAbove.includes(o.extensionType) || o.alwaysTop === true) {
      o.bringToFront()
    }
  })

  this.updateLidObjectsSelectability(this._options.editMode)
  this._canvas.requestRenderAll()
}
```

### 14.4 핫키 카탈로그 (실제 등록된 것)

| 단축키 | 작동 | 플러그인 |
|---|---|---|
| `⌘+Z` / `⌘+⇧+Z` | undo / redo | HistoryPlugin |
| `⌘+C` / `V` / `D` | 복사 / 붙여넣기 / 복제 | CopyPlugin |
| `⌘+G` / `⌘+⌫` | 그룹 / 그룹해제 | GroupPlugin |
| `⌘+L` | 잠금 토글 | LockPlugin |
| `Delete` / `Backspace` | 삭제 | ObjectPlugin |
| 화살표 | 1px 이동 | ControlsPlugin |
| `Shift`+화살표 | 10px 이동 | ControlsPlugin |
| `[` / `]` | z-index 1단계 | ObjectPlugin |
| `⌘+[` / `]` | z-index 끝까지 | ObjectPlugin |
| `i` | 스포이드 | ObjectPlugin |
| `Space`+드래그 | 캔버스 패닝 | DraggingPlugin |
| `Alt`+드래그 | 패닝 (Space 대신) | DraggingPlugin |

핫키 등록 시 `KeyboardShortcutsModal` 카탈로그도 업데이트.

### 14.5 측면 핸들 scale/skew 전환

```typescript
// ml/mr/mt/mb 핸들에서 Shift 조합으로 scale ↔ skew
;(['ml', 'mr'] as const).forEach((key) => {
  const ctrl = (fabric.Object.prototype.controls as any)[key]
  if (ctrl) {
    ctrl.actionHandler = fabric.controlsUtils.scalingXOrSkewingY
    ctrl.actionName = fabric.controlsUtils.scaleOrSkewActionName
  }
})
;(['mt', 'mb'] as const).forEach((key) => {
  const ctrl = (fabric.Object.prototype.controls as any)[key]
  if (ctrl) {
    ctrl.actionHandler = fabric.controlsUtils.scalingYOrSkewingX
    ctrl.actionName = fabric.controlsUtils.scaleOrSkewActionName
  }
})
```

---

# Part 3 — 모바일·안정성

## 15. 모바일 메모리 카드

### 15.1 iOS Safari 메모리 한계

- **iPhone X 이전**: ~256MB
- **iPhone 11~14**: ~384MB
- **iPhone 15+**: ~512MB

WebContent 프로세스가 한계 초과 시 강제 종료 → 페이지 reload 또는 "이 사이트에서 문제가 반복적으로 발생했습니다" 표시.

### 15.2 적용된 메모리 절감 (★ 모두 검증됨)

| 항목 | 데스크톱 | 모바일 (TOUCH_ENV) | 절감 효과 |
|---|---|---|---|
| `enableRetinaScaling` | true | **false** | 9× (DPR=3) |
| `historyMaxSteps` | 50 | **15** | ~70% |
| 페이지 썸네일 | 풀 PNG | **placeholder** | toDataURL 비용 0 |
| 시스템 핀치 줌 | 가능 | **차단** (`user-scalable=no`) | 캔버스 줌 충돌 회피 |
| 자동저장 썸네일 | 캡처 | **null** | toDataURL 0.25× JPEG q0.7도 비쌈 |
| 화면 캡처 디바운스 | 200ms | **2000ms** | I/O 비용 10× 감소 |
| 다크모드 객체 색상 sweep | 활성 | **스킵** | iterate cost 0 |

### 15.3 코드 패턴

```typescript
// canvas-core/src/utils/factory.ts
const isCoarse = isCoarsePointer()
{
  enableRetinaScaling: !isCoarse,
  // ...
}
if (isCoarse) {
  fabric.Object.prototype.cornerSize = 16
  fabric.Object.prototype.touchCornerSize = 36
  fabric.Object.prototype.padding = 8
  fabric.Object.prototype.borderScaleFactor = 2
}

// canvas-core/src/utils/history.ts
const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches
this.historyMaxSteps = isCoarsePointer ? 15 : 50

// apps/editor/src/stores/useAppStore.ts
const TOUCH_ENV = isTouchEnv()
const SCREENSHOT_DEBOUNCE_MS = TOUCH_ENV ? 2000 : 200
const takeCanvasScreenshot = async () => {
  if (TOUCH_ENV) return PLACEHOLDER  // toDataURL 자체 스킵
  return canvas.toDataURL({ format: 'png', multiplier: 0.5 })
}

// apps/editor/src/hooks/useCanvasThemeSync.ts
function applyTheme() {
  if (TOUCH_ENV) return  // 모바일은 객체 sweep 안 함
  canvas.getObjects().forEach(obj => obj.set(...))
}

// apps/editor/src/hooks/useAutoSaveThumbnail.ts
async function captureAndUpload() {
  if (TOUCH_ENV) return null  // 모바일 자동저장 썸네일 스킵
  // ...
}
```

### 15.4 4MB 업로드 가드

```typescript
// useImageStore의 모든 upload 진입점에 적용
function checkMobileFileSize(file: File): boolean {
  if (!TOUCH_ENV) return true
  if (file.size > 4 * 1024 * 1024) {
    showToast('모바일에서는 4MB 이하 파일만 업로드 가능합니다', 'warning')
    return false
  }
  return true
}
```

### 15.5 console.log 핫패스에서 제거

`_historySaveAction` 같이 매 modification마다 호출되는 함수에서 `console.log`는 모바일 메모리 누적 크다 (콘솔 버퍼). 운영 빌드에서는 silent:

```typescript
// canvas-core/src/utils/debugLog.ts
export const dlog = (channel: string, ...args: any[]) => {
  if (import.meta.env.DEV || import.meta.env[`VITE_DEBUG_${channel.toUpperCase()}`]) {
    console.log(`[${channel}]`, ...args)
  }
}
```

---

## 16. 터치 UX 시스템

### 16.1 CSS — 브라우저 제스처 차단

```css
.canvas-container,
.canvas-container canvas,
#canvas-containers,
#canvas-wrapper,
.canvas-container .upper-canvas {
  touch-action: none;              /* pinch-zoom, pan, long-press 차단 */
  -webkit-touch-callout: none;
  -webkit-user-select: none;
  user-select: none;
}

body {
  overscroll-behavior: none;       /* iOS bounce 차단 */
  -webkit-overflow-scrolling: touch;
  -webkit-tap-highlight-color: transparent;
}
```

### 16.2 Viewport meta

```html
<meta name="viewport" content="width=device-width, initial-scale=1.0,
      maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

`user-scalable=no`로 시스템 핀치 줌 차단 (캔버스 줌과 충돌 방지).
`viewport-fit=cover`로 노치/홈 인디케이터 영역 활용.

### 16.3 모바일 사이드바 자동 닫기

```typescript
// 객체 추가 직후 사이드바 닫기 (캔버스 노출)
const handleAddText = useCallback(async () => {
  // ... 텍스트 추가 ...
  if (isCoarsePointer) {
    tapMenu(null)  // 사이드바 닫기
  }
}, [canvas, isCoarsePointer, tapMenu])
```

### 16.4 ControlBar 모바일 하단 시트

```tsx
// 데스크톱: 좌측 280px 고정
// 모바일: 하단 collapsible 시트 (88px ↔ 70vh)
const isMobile = mobileOverlay || isCoarsePointer
return (
  <div className={isMobile
    ? 'fixed bottom-0 left-0 right-0 max-h-[70vh] z-[120]'
    : 'w-[280px] flex-shrink-0'
  }>
    {/* ... */}
  </div>
)
```

★ 핵심: `fixed` 사용 — `position: relative`로 layout flow에 들어가면 캔버스 영역이 줄어들어 ResizeObserver 트리거 → SELECT-1 회귀.

### 16.5 SELECT-1 함정 (★ 실제 발생)

**증상**: 객체 탭 시 잠깐 선택됐다가 즉시 해제.

**원인**: ControlBar가 `pb-[45vh]` 같이 main 컨텐츠 영역을 selection 시 변경 → ResizeObserver → setDimensions → Fabric이 active object를 discard.

**해결**: ControlBar는 `fixed`로 layout 영향 없게. main에 `pb-[45vh]` 추가하지 말 것.

---

## 17. ResizeObserver 무한 루프 방지

### 17.1 문제 (★ iOS 크래시 주범)

```typescript
// ❌ 무한 루프 코드
const ro = new ResizeObserver(() => {
  canvas.setDimensions({ width: el.offsetWidth, height: el.offsetHeight })
})
ro.observe(el)
```

`setDimensions()`이 캔버스 DOM 크기 변경 → ResizeObserver 재발화 → 다시 `setDimensions` → 반복. 메인 스레드 점유 → iOS Safari WebContent 크래시 → "이 사이트에서 문제가 반복적으로 발생했습니다".

### 17.2 안전한 ResizeObserver 패턴

```typescript
// EditorView.tsx
useEffect(() => {
  let lastW = 0
  let lastH = 0
  let rafId: number | null = null

  const resize = () => {
    rafId = null
    if (!el || !canvas?.getContext()) return
    const w = el.offsetWidth
    const h = el.offsetHeight

    // ① 1px 미만 변동은 무시 (모바일 viewport 지터)
    if (Math.abs(w - lastW) < 1 && Math.abs(h - lastH) < 1) return

    // ② 캔버스 현재 크기와 같으면 setDimensions 생략
    if (canvas.getWidth() === w && canvas.getHeight() === h) return

    lastW = w; lastH = h
    canvas.setDimensions({ width: w, height: h })
    workspacePlugin?.setZoomAuto()
  }

  const ro = new ResizeObserver(() => {
    // ③ RAF로 합쳐 1프레임 1회만
    if (rafId !== null) return
    rafId = requestAnimationFrame(resize)
  })
  ro.observe(el)
  return () => {
    ro.disconnect()
    if (rafId !== null) cancelAnimationFrame(rafId)
  }
}, [canvas, el])
```

3중 가드:
1. **변동량 < 1px 무시** — viewport 지터 흡수
2. **현재 크기 동일하면 스킵** — 무한 루프 차단
3. **RAF로 합치기** — 1프레임 1회만 실행

---

## 18. crash 복구 (ErrorBoundary + localStorage 백업)

### 18.1 EditorErrorBoundary

```tsx
// apps/editor/src/components/EditorErrorBoundary.tsx
class EditorErrorBoundary extends React.Component {
  state = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('[EditorErrorBoundary]', error, info)
    // Sentry 등에 dispatch
  }

  render() {
    if (this.state.hasError) {
      return (
        <FallbackUI
          onReload={() => window.location.reload()}
          onReset={() => {
            // localStorage 백업 살리고 세션만 reset
            useEditorStore.getState().reset()
            window.location.reload()
          }}
        />
      )
    }
    return this.props.children
  }
}
```

### 18.2 useCanvasLocalBackup

```typescript
// 5초마다 캔버스를 localStorage에 toJSON
export function useCanvasLocalBackup(sessionKey: string | null, ready: boolean) {
  useEffect(() => {
    if (!ready || !sessionKey) return

    const save = () => {
      const canvas = useAppStore.getState().canvas
      if (!canvas || (canvas as any).disposed) return

      const json = JSON.stringify(canvas.toJSON([
        'id', 'extensionType', 'selectable', 'evented',
        'hasControls', 'lockUniScaling', 'lockScalingFlip',
        'name', 'meta',
      ]))

      // 변경 없으면 스킵 (불필요한 quota 사용 방지)
      if (json === lastSavedRef.current) return
      lastSavedRef.current = json

      const key = `storige.editor.backup.${sessionKey}`
      const payload = JSON.stringify({ ts: Date.now(), json })
      try {
        localStorage.setItem(key, payload)
      } catch {
        // QuotaExceeded — 오래된 백업 정리 후 재시도
        pruneOldBackups()  // MAX 3 sessions
        try { localStorage.setItem(key, payload) } catch { /* 포기 */ }
      }
    }

    const id = setInterval(save, 5000)
    return () => clearInterval(id)
  }, [ready, sessionKey])
}

// 마운트 시 1회 — 백업 있으면 사용자에게 복원 옵션
export function readCanvasBackup(sessionKey: string) {
  const raw = localStorage.getItem(`storige.editor.backup.${sessionKey}`)
  if (!raw) return null
  return JSON.parse(raw)
}
```

### 18.3 unhandledrejection 글로벌 핸들러

```typescript
// main.tsx
window.addEventListener('unhandledrejection', (event) => {
  console.error('[Unhandled Promise Rejection]', event.reason)
  event.preventDefault()  // ★ React 트리 freeze 방지
})
```

특히 SVG fabric 에러 같은 비동기 throw가 React 트리 전체를 freeze 시키는 것을 방지.

---

## 19. 성능 최적화 (RenderOptimizer, CacheManager)

### 19.1 RenderOptimizer.queueRender

```typescript
// canvas-core/src/utils/render.ts
export class RenderOptimizer {
  private static renderQueue = new Map<string, () => void>()
  private static animationFrameId: number | null = null

  static queueRender(canvas: fabric.Canvas, immediate = false) {
    if (!canvas?.id) return
    RenderOptimizer.renderQueue.set(canvas.id, () => {
      canvas.requestRenderAll()
      CacheManager.updateActiveObjectsCacheTime(canvas)
    })
    if (immediate) RenderOptimizer.processQueue()
    else RenderOptimizer.scheduleProcess()
  }

  private static scheduleProcess() {
    if (this.animationFrameId !== null) return
    this.animationFrameId = requestAnimationFrame(() => {
      this.animationFrameId = null
      this.processQueue()
    })
  }
}
```

여러 플러그인이 동시에 렌더 요청해도 한 프레임에 한 번만 실행.

### 19.2 CacheManager (LRU 100MB)

```typescript
export class CacheManager {
  private static readonly MAX_CACHE_SIZE = 100 * 1024 * 1024  // 100MB

  static checkAndCleanCache(canvas: fabric.Canvas) {
    const objects = canvas.getObjects()
    let total = 0
    objects.forEach(obj => {
      if (obj._cacheCanvas) {
        total += (obj._cacheCanvas.width || 0) * (obj._cacheCanvas.height || 0) * 4
      }
    })

    if (total > this.MAX_CACHE_SIZE) {
      // LRU: _lastCacheTime 기준 오래된 것부터 캐시 삭제
      const cached = objects
        .filter(o => o._cacheCanvas && o.id !== 'workspace')
        .sort((a, b) => ((a as any)._lastCacheTime || 0) - ((b as any)._lastCacheTime || 0))

      let freed = 0
      for (const obj of cached) {
        const size = (obj._cacheCanvas.width || 0) * (obj._cacheCanvas.height || 0) * 4
        obj.dirty = true
        delete obj._cacheCanvas
        delete (obj as any)._lastCacheTime
        freed += size
        if (total - freed < this.MAX_CACHE_SIZE * 0.8) break
      }
    }
  }

  static startPeriodicCleanup(canvas: fabric.Canvas, interval = 30000) {
    return setInterval(() => CacheManager.checkAndCleanCache(canvas), interval)
  }
}
```

### 19.3 배치 객체 추가

```typescript
// ❌ 매 객체마다 render
objects.forEach(o => canvas.add(o))

// ✅ 배치
canvas.discardActiveObject()
objects.forEach(o => {
  o.objectCaching = true
  canvas.add(o)
})
canvas.requestRenderAll()
```

### 19.4 텍스트 객체 캐시 해제 권장

```typescript
// 자주 변경되는 텍스트는 캐시 무효
if (obj.type === 'i-text' || obj.type === 'textbox') {
  obj.objectCaching = false
}
```

### 19.5 requestRenderAll vs renderAll

| API | 동기 | RAF 기반 | 사용 시점 |
|---|---|---|---|
| `renderAll()` | 즉시 | ❌ | toDataURL/스크린샷 직전만 |
| `requestRenderAll()` | 비동기 | ✅ | 일반 렌더 (★ 기본) |

---

## 20. 메모리 누수 방지 패턴

### 20.1 익명 함수로 on() 등록 금지

```typescript
// ❌ 제거 불가
canvas.on('object:added', (e) => { ... })

// ✅ 멤버 변수에 저장
this._handler = this.method.bind(this)
canvas.on('object:added', this._handler)
// destroyed():
canvas.off('object:added', this._handler)
this._handler = null
```

### 20.2 모든 플러그인에 destroyed() 구현

```typescript
async destroyed(): Promise<void> {
  // 캔버스 이벤트
  if (this._handler1) {
    this._canvas.off('object:added', this._handler1)
    this._handler1 = null
  }
  // 에디터 이벤트
  if (this._editorHandler) {
    this._editor.off('myEvent', this._editorHandler)
    this._editorHandler = null
  }
  // window 이벤트
  if (this._beforeUnload) {
    window.removeEventListener('beforeunload', this._beforeUnload)
    this._beforeUnload = null
  }
  // debounce 함수 취소
  this._debouncedFn?.cancel()
  this._debouncedFn = null

  return Promise.resolve()
}
```

### 20.3 Canvas Dispose 가드

dispose된 canvas에서 메서드 호출하면 `Cannot read properties of null (reading 'getContext')` 에러.

```typescript
// 모든 이벤트 핸들러 첫 줄에 가드
function handleEvent() {
  if (!this._canvas?.getContext()) {
    console.warn('Canvas disposed')
    return
  }
  // ...
}

// (canvas as any).disposed 플래그도 함께 체크
if ((canvas as any).disposed || !canvas.getContext()) return
```

### 20.4 ResizeObserver 정리

```typescript
useEffect(() => {
  const ro = new ResizeObserver(callback)
  ro.observe(el)
  return () => ro.disconnect()  // 필수
}, [])
```

### 20.5 setInterval/setTimeout 정리

```typescript
useEffect(() => {
  const id = setInterval(tick, 5000)
  return () => clearInterval(id)
}, [])
```

### 20.6 lodash debounce.cancel()

```typescript
private _debounced = debounce(() => { ... }, 300)

destroyed() {
  this._debounced.cancel()  // pending 호출 취소
}
```

### 20.7 Strict Mode 이중 마운트 방어

```typescript
useEffect(() => {
  let cancelled = false
  const setup = async () => {
    const canvas = await createCanvas(...)
    if (cancelled) {
      canvas.dispose()  // 두 번째 호출이 첫 번째를 정리
      return
    }
    // ...
  }
  setup()
  return () => { cancelled = true }
}, [])
```

---

# Part 4 — 운영

## 21. 저장/복원 파이프라인

### 21.1 자동저장 흐름

```typescript
// useAutoSave.ts
const collectCanvasData = async (): Promise<EditPage[]> => {
  const updated = [...pages]
  for (let i = 0; i < allEditors.length; i++) {
    const plugin = allEditors[i].getPlugin('ServicePlugin') as ServicePlugin
    const json = await plugin.saveJSON()
    updated[i] = { ...updated[i], canvasData: JSON.parse(json) }
  }
  return updated
}

const saveToServer = useCallback(debounce(async () => {
  if (isSavingRef.current) return
  isSavingRef.current = true
  setSaving()

  try {
    // ① 캔버스 → JSON 직렬화
    const updatedPages = await collectCanvasData()

    // ② 썸네일 캡처 (모바일 자동 스킵)
    const thumbnailUrl = await captureThumbnail()

    // ③ API 저장
    await sessionsApi.autoSave(sessionId, {
      pages: updatedPages,
      thumbnailUrl,  // 시점별 복원용
    })

    setSaved()
    resetRetry()
  } catch (e) {
    setFailed(e)
    if (canRetry()) incrementRetry()
  } finally {
    isSavingRef.current = false
  }
}, autoSaveInterval), [/* deps */])
```

### 21.2 시점별 복원 (Version History)

```typescript
// 백엔드: EditSessionVersion 엔티티 (LRU 20)
// 자동저장 시 1분 debounce로 push
// 사용자 복원 시 confirm + window.location.reload (가장 안전한 캔버스 재초기화)
const restoreVersion = async (versionId: string) => {
  await sessionsApi.restoreVersion(sessionId, versionId)
  setTimeout(() => window.location.reload(), 500)
}
```

### 21.3 멀티페이지 round-trip 함정

```typescript
// ❌ fabric object reference 유실
loadSession({ pages: [...rawPages] })

// ✅ JSON.stringify round-trip
loadSession({
  pages: rawPages.map(p => ({
    ...p,
    canvasData: JSON.parse(JSON.stringify(p.canvasData))
  }))
})
```

### 21.4 ServicePlugin.saveJSON 표준

```typescript
async saveJSON(): Promise<string> {
  // beforeSave 훅 실행 (인쇄 가이드선 색상 transparent 등)
  await this._editor.runHook('beforeSave')

  // toJSON
  this._canvas.offHistory()
  const json = JSON.stringify(this._canvas.toJSON(extendFabricOption))
  this._canvas.onHistory()

  // afterSave 훅 (복원)
  await this._editor.runHook('afterSave')

  return json
}
```

---

## 22. Vercel/CDN 배포 함정

### 22.1 CDN HTML cache 함정 (★ 실제 발생)

**증상**: 새 deploy 후 사용자에게 `Importing a module script failed` 에러 (chunk hash 404).

**원인**: Vercel CDN이 `index.html`을 9분 동안 캐시 → 새 deploy 시 옛 HTML이 새 chunk hash를 모름.

**수정** (`vercel.json`):
```json
{
  "headers": [
    {
      "source": "/(index\\.html)?",
      "headers": [
        { "key": "Cache-Control", "value": "no-cache, no-store, must-revalidate" },
        { "key": "Pragma", "value": "no-cache" },
        { "key": "Expires", "value": "0" }
      ]
    },
    {
      "source": "/assets/(.*)",
      "headers": [
        { "key": "Cache-Control", "value": "public, max-age=31536000, immutable" }
      ]
    }
  ]
}
```

`index.html` 캐시 끄고, `/assets/*` (파일명에 hash 있음)는 1년 immutable.

### 22.2 vercel.json 잘못된 키 조심

`comment` 같은 invalid 필드는 Vercel schema 거부 → 빌드 ERROR. 주석은 별도 README에.

### 22.3 COOP/COEP 함정 (Chrome 확장 충돌)

**시도한 것**: `Cross-Origin-Embedder-Policy: credentialless` 설정 → onnxruntime-web 멀티스레드 활성화 (10× 빨라짐).

**문제**: Chrome 확장 (Leap 등) 페이지 inject script가 차단되어 모든 사용자 인터랙션 깨짐.

**현재 상태**: revert. 향후 시크릿 모드 / 다양한 브라우저 사전 검증 필요.

### 22.4 OpenCV warmup 함정

**시도한 것**: `requestIdleCallback`으로 첫 업로드 전 OpenCV WASM 백그라운드 다운로드.

**문제**: 위 COEP 시도와 함께 묶여 운영 클릭 차단 발생 → 두 변경 모두 revert. 단독 위험은 적지만 안전망으로 같이 revert.

**교훈**: 큰 인프라 변경은 단독 PR로, 시크릿 모드/다양한 환경 사전 검증 필수.

---

## 23. PDF 합성 (Saddle Stitch 2-up 등)

### 23.1 중철(saddle stitch) 표지 펼침면

**입력** (`cover.pdf` 4페이지):
```
[p1=앞표지, p2=앞표지 안쪽, p3=뒷표지 안쪽, p4=뒷표지]
```

**출력** (펼침면 2페이지):
```
p1 외부면 = [뒷표지 | 앞표지]      = [input.p4 | input.p1]
p2 내부면 = [뒷표지 안쪽 | 앞표지 안쪽] = [input.p3 | input.p2]
```

**출력 페이지 크기**: `W*2 × H` (좌우로 두 페이지 붙임)

### 23.2 알고리즘 (pdf-lib 기준)

```typescript
import { PDFDocument } from 'pdf-lib'
import * as fs from 'node:fs/promises'

async function composeSaddleCover(inputPath: string, outputPath: string) {
  const bytes = await fs.readFile(inputPath)
  const doc = await PDFDocument.load(bytes)
  const pages = doc.getPages()

  // 4페이지가 아니면 그대로 복사 (warning)
  if (pages.length !== 4) {
    logger.warn(`saddle cover expected 4 pages, got ${pages.length}; copy as-is`)
    await fs.copyFile(inputPath, outputPath)
    return
  }

  const [front, insideF, insideB, back] = pages
  const W = front.getWidth(); const H = front.getHeight()

  const out = await PDFDocument.create()
  const [eFront, eInsideF, eInsideB, eBack] =
    await out.embedPdf(doc, [0, 1, 2, 3])

  // p1 외부 = [뒷표지 | 앞표지]
  const outer = out.addPage([W * 2, H])
  outer.drawPage(eBack,  { x: 0, y: 0, width: W, height: H })
  outer.drawPage(eFront, { x: W, y: 0, width: W, height: H })

  // p2 내부 = [뒷표지 안쪽 | 앞표지 안쪽]
  const inner = out.addPage([W * 2, H])
  inner.drawPage(eInsideB, { x: 0, y: 0, width: W, height: H })
  inner.drawPage(eInsideF, { x: W, y: 0, width: W, height: H })

  await fs.writeFile(outputPath, await out.save())
}
```

### 23.3 bindingType 분기

```typescript
if (bindingType === 'saddle' && pages.length === 4) {
  await composeSaddleCover(input, output)
} else {
  // perfect, hardcover, spring, spiral 등은 그대로 복사
  await fs.copyFile(input, output)
}
```

### 23.4 폴백 정책

| 입력 페이지 | 동작 |
|---|---|
| 1 | 그대로 복사 (단일 표지) |
| 2 | 그대로 복사 |
| 3 | 그대로 복사 + warning |
| 4 | **2-up 합성** |
| 5+ | 그대로 복사 + warning |

---

# Part 5 — 디버깅·금기

## 24. 버그 수정 이력 (16건)

이 섹션이 이 문서의 핵심. 실제 발생 → 원인 → 수정 패턴.

---

### BUG-001 — React Strict Mode 이중 초기화

**증상**: 캔버스 두 개 생성 또는 이벤트 핸들러 중복 등록.

**원인**: useEffect가 Strict Mode에서 두 번 실행.

**수정**: `initId` 파라미터를 createCanvas에 추가. AppStore의 `init()`에서 같은 initId면 두 번째 호출 무시.

---

### BUG-002 — Canvas Dispose 후 이벤트 핸들러 에러

**증상**: 페이지 이탈 후 `Cannot read properties of null (reading 'getContext')`.

**원인**: 비동기 핸들러가 dispose 후에도 실행됨.

**수정**: 모든 핸들러 첫 줄에 `if (!this._canvas?.getContext()) return`. `(canvas as any).disposed` 플래그도 체크. `destroyed()`에서 모든 핸들러 참조 null로.

---

### BUG-003 — Undo 후 가이드선 사라짐

**증상**: Ctrl+Z 후 cut-border, safe-zone-border가 사라짐.

**원인**: `excludeFromExport: true`라도 history에 포함되어 undo 시 제거됨.

**수정**: HistoryPlugin.undo() 콜백에서 `ensureGuideElements()` 호출. WorkspacePlugin에 `restoreGuideElements()` 메서드 추가.

---

### BUG-004 — Undo 후 효과 오버레이 위치 어긋남

**증상**: 금박 효과 적용된 객체 이동 후 Undo 시 overlay만 원위치 안 옴.

**원인**: undo는 원본만 복원, overlay는 별도 객체.

**수정**: undo 콜백에서 `realignOverlays()` 호출. overlay ID `_` 기준 분할로 원본 찾아 위치 동기화.

---

### BUG-005 — Undo History 오염 (historyProcessing 플래그)

**증상**: undo 후처리 중 `object:modified` 이벤트가 새 history 항목 생성 → 스택 무한 증가.

**원인**: undo 콜백 내 객체 수정이 자동으로 history에 들어감.

**수정**: `offHistory()` / `onHistory()` 패턴. 추가로:
```typescript
;(canvas as any).historyProcessing = false
;(canvas as any).historyNextState = (canvas as any)._historyNext()
```

---

### BUG-006 — 모바일 iOS 메모리 크래시

**증상**: iPhone에서 이미지 여러 장 추가 시 강제 종료.

**원인**: DPR=3에서 retina scaling으로 내부 캔버스가 9배 메모리.

**수정 패키지**:
- `enableRetinaScaling: !isCoarsePointer()` (factory.ts)
- `historyMaxSteps`: 50 → 15 (history.ts)
- toDataURL 모바일 스킵 (useAppStore)
- 다크모드 sweep 모바일 스킵 (useCanvasThemeSync)
- 자동저장 썸네일 모바일 스킵 (useAutoSaveThumbnail)
- 4MB 업로드 가드 (useImageStore)

---

### BUG-007 — 폰트 미로드 상태에서 텍스트 크기 오류

**증상**: 텍스트 박스 크기가 폰트 로드 전/후로 달라져 레이아웃 틀어짐.

**원인**: `loadFromJSON` 직후 폰트가 아직 로드 안 됨.

**수정**: `afterLoad` 훅에서 `await document.fonts.load(...)` + RAF 2번 + 30ms 대기 + `obj.initDimensions()` 호출.

---

### BUG-008 — Template Background Z-order 깨짐

**증상**: 사용자 객체가 template-background에 가려짐.

**원인**: `bringToFront()`가 다른 곳에서 호출되어 z-order 역전.

**수정**: `object:added/removed/modified`마다 `ensureTemplateBackgroundZOrder()` 호출. workspace 인덱스 + 1 위치 고정.

---

### BUG-009 — SVG Cutline Template과 Cut Border 중복

**증상**: SVG 재단선 템플릿 제품에서 두 개의 재단선 표시.

**원인**: `createOrUpdateCutBorder()`가 cutline-template 존재 미확인.

**수정**: cut-border 생성 전 `cutline-template` 검사. 있으면 스킵.

---

### BUG-010 — 스프레드 모드 책등 가변 시 객체 이탈

**증상**: 책등 폭 변경 후 일부 객체가 영역 밖으로 나감.

**원인**: SpineResizeStrategy가 spine 영역만 처리, front-cover/wing 객체 미고려.

**수정**: `repositionObjects()`에서 모든 region 처리. `checkObjectsOutOfBounds()` + `spreadObjectsOutOfBounds` 이벤트로 사용자 알림.

---

### BUG-011 — page-outline ClipPath 봉투 타입에서 누락

**증상**: 봉투 제품에서 일부 객체에 clipPath 미적용.

**원인**: `object:added` 핸들러의 extensionType 필터 로직이 일부 누락.

**수정**: `outline`, `printguide`, `overlay`, `template-element`만 제외. 나머지 모두 적용.

---

### BUG-012 — 휠 줌 중 overlay 깜빡임

**증상**: 마우스 휠 줌 시 금박 등 overlay 객체 깜빡임.

**원인**: 줌 중 viewport 변환 → overlay 위치 일시 어긋남.

**수정**: 줌 시작 시 overlay `visible = false`, debounce 300ms 완료 후 `visible = true`.

---

### BUG-013 — ResizeObserver 무한 루프 → iOS 크래시 (★ 가장 치명적)

**증상**: iPhone에서 캔버스 진입 후 짧게 사용 시 "이 사이트에서 문제가 반복적으로 발생했습니다".

**원인**: `setDimensions()`이 자기 자신을 관찰하는 ResizeObserver를 트리거 → 무한 루프 → 메인 스레드 점유 → WebContent 크래시.

**수정** (3중 가드):
1. 1px 미만 변동 무시 (viewport 지터 흡수)
2. `canvas.getWidth()/Height()`와 비교, 동일하면 setDimensions 스킵
3. RAF로 합쳐 1프레임 1회만

**부수 효과**: 첫 응답에 적용한 터치 UI 패치(touch-action 등)가 효과 없어 보였던 이유 — 무한 루프가 메인 스레드를 점유해 모든 이벤트가 처리 안 됐던 것.

---

### BUG-014 — TouchEvent에서 좌표 추출 실패

**증상**: 모바일에서 캔버스 패닝 안 됨.

**원인**: `opt.e as MouseEvent`로 캐스팅 후 `e.clientX` 직접 접근 → TouchEvent에서 undefined.

**수정**: `getEventPoint(e)` 헬퍼로 `touches[0]` 폴백:
```typescript
const t = e.touches?.[0] ?? e.changedTouches?.[0]
if (t) return { x: t.clientX, y: t.clientY, altKey: !!e.altKey }
```

---

### BUG-015 — SVG 업로드 시 화면 freeze

**증상**: "요소" 도구로 SVG 업로드 시 페이지 멈춤.

**원인**: `useImageStore.upload`가 SVG 파일을 fabric.Image.fromURL로 보내 fabric의 `t.indexOf` throw.

**수정**: `isSvgFile` 검출 후 SelectionType 무관하게 `loadSVGFromURL` 사용. 추가로 `window.unhandledrejection` 글로벌 핸들러로 React 트리 freeze 방지.

---

### BUG-016 — 배경색 적용 무반응 (useState 캐시 stale)

**증상**: 모바일에서 배경색 picker 적용 시 캔버스 색상 안 바뀜.

**원인**: AppBackground의 useState로 캐시한 객체 참조가 stale (이미 캔버스에서 제거된 객체 참조).

**수정**: 매 호출 시 `canvas.getObjects().filter(...)`로 fresh fetch + `set({ fill, dirty: true }) + canvas.renderAll()`.

---

## 25. 절대 하지 말아야 할 것들

### ❌ canvas를 React state에 저장

```typescript
const [canvas, setCanvas] = useState<fabric.Canvas>()  // 금지

// ✅ Zustand에 저장
const canvas = useAppStore(s => s.canvas)
```

### ❌ canvas.on()에 익명 함수 직접 전달

```typescript
canvas.on('object:added', () => { ... })  // 금지 — off 불가능

// ✅ 멤버 변수에 저장
this._handler = this.method.bind(this)
canvas.on('object:added', this._handler)
```

### ❌ destroyed() 미구현 플러그인

이벤트 핸들러가 살아남아 다음 마운트 시 누적 → 메모리 누수 + 동일 이벤트 N번 처리.

### ❌ historyProcessing/historyNextState 임의 조작

undo/redo 콜백 내 정해진 패턴 외에는 건드리지 말 것. 스택 꼬임.

### ❌ renderAll() 남발

```typescript
canvas.renderAll()  // 동기, 과다 호출 시 프레임 드롭

// ✅ requestRenderAll()
canvas.requestRenderAll()
```

예외: `toDataURL`/스크린샷 직전.

### ❌ 새 커스텀 속성을 extendFabricOption에 추가하지 않고 사용

저장 후 로드하면 사라짐. **추가하는 즉시** 배열에 반영.

### ❌ loadFromJSON 후 clearHistory() 생략

로드 자체가 undo 대상이 됨. `canvas.clearHistory()` 필수.

### ❌ getObjects()로 가져온 workspace를 사용자 객체로 취급

```typescript
// ✅ 항상 필터링
canvas.getObjects().filter(o =>
  o.id !== 'workspace' &&
  !o.excludeFromExport &&
  o.extensionType !== 'printguide'
)
```

### ❌ pb-[Nvh]로 selection 시 main height 토글

`ResizeObserver → setDimensions → Fabric discardActiveObject` 발생 (BUG-013, SELECT-1). ControlBar는 `fixed`로.

### ❌ ResizeObserver 콜백에서 무조건 setDimensions

무한 루프. 변동량 + 캔버스 크기 비교 + RAF 가드 필수 (BUG-013).

### ❌ 데스크톱에 영향 가는 변경을 (pointer:coarse) 가드 없이

```typescript
// 모바일 변경은 반드시 분기
if (TOUCH_ENV) {
  // 모바일 전용
} else {
  // 데스크톱 그대로
}
```

### ❌ console.log를 매 modification 핫패스에 추가

모바일 메모리 누적 (콘솔 버퍼). `dlog()` 같은 채널 기반 로거 사용.

### ❌ canvas-core src 변경 후 build 안 하고 commit

editor가 `canvas-core/dist`를 import하므로 src만 변경되면 반영 안 됨.

```bash
pnpm --filter @storige/canvas-core build  # 반드시 실행
```

### ❌ phosphor-icons 등 다른 아이콘 라이브러리 추가

lucide-react만 사용 (sideEffects:false 자동 트리쉐이킹). 혼용은 번들 크기 폭증.

### ❌ git push --force / git reset --hard 무단 사용

특히 master에는 절대.

### ❌ Vercel COEP/COOP 헤더 무검증 활성화

Chrome 확장 호환 깨짐 위험. 시크릿 모드/다양한 브라우저 사전 검증 필수.

---

## 26. 부록 빠른참조

### 26.1 예약된 객체 ID

| ID | 역할 |
|---|---|
| `workspace` | 배경 Rect |
| `cut-border` | 재단선 |
| `safe-zone-border` | 안전 영역선 |
| `template-background` | 템플릿 배경 |
| `template-mockup` | 목업 |
| `template-outline` | 템플릿 클립 |
| `page-outline` | 페이지 외곽선 |
| `page-outline-clip` | page-outline 복제 |
| `cutline-template` | 커스텀 재단선 SVG |

### 26.2 예약된 extensionType

| 값 | 의미 |
|---|---|
| `background` | 배경 |
| `clipping` | 클리핑 마스크 |
| `guideline` | 가이드라인 |
| `overlay` | 효과 레이어 |
| `outline` | 외곽선 |
| `printguide` | 인쇄 가이드 (저장 제외) |
| `template-element` | 잠금 템플릿 요소 |
| `frame` | 이미지 프레임 |
| `moldIcon` | 모양틀 + 아이콘 |
| `fillImage` | 모양 안 채워진 이미지 |
| `cutline-template` | 커스텀 재단선 |
| `lid` | 봉투 뚜껑 |

### 26.3 환경 변수

```bash
VITE_ENABLE_IMAGE_PROCESSING=false  # OpenCV 비활성화
VITE_ENABLE_RULER=false             # 룰러 비활성화
VITE_DEBUG_FONT=1                   # 폰트 디버그 로그
```

### 26.4 핵심 의존성

```json
{
  "fabric": "^5.x",
  "lodash-es": "^4.x",
  "uuid": "^9.x",
  "zustand": "^4.x",
  "fontfaceobserver": "^2.x",
  "lucide-react": "^0.400.0",
  "@techstark/opencv-js": "lazy",
  "@imgly/background-removal": "lazy"
}
```

### 26.5 빌드 순서

```bash
pnpm --filter @storige/types build           # 1
pnpm --filter @storige/canvas-core build     # 2 (★ src 변경 시 필수)
pnpm --filter @storige/editor build          # 3
pnpm --filter @storige/editor lint
pnpm --filter @storige/editor test
```

### 26.6 모바일 감지 패턴

```typescript
// React 컴포넌트
const isCoarsePointer = useIsCoarsePointer()

// store/util (모듈 상수)
const TOUCH_ENV = isTouchEnv()

// canvas-core (factory.ts)
function isCoarsePointer() {
  return window.matchMedia('(pointer: coarse)').matches
}
```

### 26.7 자주 쓰는 패턴 한 줄 요약

| 작업 | 패턴 |
|---|---|
| 객체 추가 | `offHistory → add → setActive → onHistory → requestRenderAll` |
| 시스템 변경 | `offHistory → 변경 → onHistory` (try/finally 보호) |
| Undo 후처리 | `realignOverlays + ensureGuide + rebindMold + historyProcessing 동기화` |
| 렌더 | `requestRenderAll()` (예외: toDataURL 직전만 renderAll) |
| 이벤트 등록 | `this._handler = this.method.bind(this)` (멤버 변수 보존) |
| 이벤트 해제 | `destroyed()`에서 `off + null 할당` |
| Canvas 가드 | `if (!canvas?.getContext()) return` |
| 모바일 분기 | `if (TOUCH_ENV) { ... } else { ... }` |
| 한글 폰트 매칭 | NFC/NFD 양방향 비교 |
| 폰트 변경 후 | `RAF 2번 + 30ms + initDimensions + setCoords` |

### 26.8 신규 프로젝트 체크리스트

```
□ Fabric 5.x 고정 (6.x 마이그 비용 큼)
□ canvas-core 별도 패키지로 분리 (프레임워크 독립)
□ extendFabricOption 배열 정의 + 모든 커스텀 속성 등록
□ configureFabricDefaults 1회 호출
□ enableRetinaScaling: !isCoarsePointer()
□ renderOnAddRemove: false (수동 렌더)
□ touchCornerSize: 36 (모바일)
□ historyMaxSteps: TOUCH_ENV ? 15 : 50
□ 모든 객체에 id: uuid()
□ 모든 플러그인에 destroyed() 구현
□ useCanvasLocalBackup (5초 주기 백업)
□ EditorErrorBoundary (마지막 방어선)
□ window.unhandledrejection 글로벌 핸들러
□ ResizeObserver 3중 가드 (변동량 + 비교 + RAF)
□ touch-action: none (CSS)
□ user-scalable=no (viewport meta)
□ TouchEvent 좌표 추출은 getEventPoint 헬퍼
□ SVG vs Raster 업로드 분기
□ 4MB 모바일 업로드 가드
□ 폰트 NFC/NFD 정규화
□ Vercel index.html no-cache + /assets/* immutable
□ Sentry 등 운영 에러 추적 연결
□ 빌드 의존 순서 자동화 (Turborepo 등)
```

---

*이 문서는 Storige 프로젝트(papascompany/storige-book-editor) 코드베이스의 92+ commit, 모바일 사이클 PR #1~#10, 6차 P0 핫픽스 사이클, BB-Phase 3 등 모든 작업 이력을 분석해 작성했습니다. 모든 패턴은 실제 운영 환경에서 검증된 것입니다.*

*가이드 적용 시 부족한 부분이 발견되면 이 문서를 업데이트해 주세요.*
