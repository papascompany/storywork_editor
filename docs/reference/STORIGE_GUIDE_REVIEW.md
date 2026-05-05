# FABRIC_EDITOR_GUIDE.md 분석 보고서 — StoryWork 적용 검토

**원문**: [FABRIC_EDITOR_GUIDE.md](./FABRIC_EDITOR_GUIDE.md) — Storige(Bookmoa 인쇄 편집기) 92+ commit + 6차 P0 핫픽스 + BB-Phase 3 누적 노하우. 5 Part / 26 장 / 3,106줄.

**분석 시각**: 2026-05-05, 본 레포 M1-06 완료 시점

---

## 1. 한 줄 요약

> Storige 가이드는 **fabric v5 + 인쇄 편집기 운영** 경험으로 최적화된 운영 백서다. **모바일 안정성·메모리·undo 패턴·한글 폰트·CDN/저장 함정** 등 운영에서 실제 발생한 16건 버그 수정 패턴은 **우리도 그대로 받아도 100% 적용 가치**가 있다. 다만 **fabric v5 vs v6** 차이로 일부 API 는 번역 필요하고, **표지/책등/스프레드** 같은 인쇄 특화 영역은 우리 도메인(스토리보드)과 무관하다.

---

## 2. 우리 편집기 vs 가이드 — 비교 매트릭스

| 영역 | Storige 가이드 | StoryWork (M1-01~06) | 차이 |
|---|---|---|---|
| **Fabric 버전** | v5 (글로벌 prototype 확장) | **v6** (ESM 클래스 import) | 패턴 번역 필요. v5 자료가 더 풍부 |
| **모듈 구조** | canvas-core / editor / types 3-tier | editor-core/layers/history/export/ui (5+) | 우리가 더 세분화 |
| **상태 관리** | **Zustand + Canvas owner** | React useState (M1-06 EditorShell) | ⚠️ **우리 위반** — 수정 필요 |
| **이벤트 등록** | bound 멤버 + destroyed() off | **익명 함수 7건** (StoryCanvas) | ⚠️ **우리 위반** — 메모리 누수 위험 |
| **헤드리스 테스트** | 없음 (브라우저만) | jsdom + node-canvas (67 tests) | 우리가 우월 |
| **Undo/Redo** | fabric-history 확장 + offHistory 패턴 | 자체 Command 패턴 + coalesce + OT slot | 우리는 더 명시적이지만 가이드의 시스템 변경 가드(offHistory) 누락 |
| **Schema 직렬화** | extendFabricOption 화이트리스트 | PageJsonV1 + Zod | 우리는 strict, 다만 fabric 내부 필드 누락 위험 (styles, charSpacing 등) |
| **모바일 메모리** | 7가지 절감 (Retina off, history 15, 썸네일 skip…) | **0건 적용** | ⚠️ **iOS 크래시 위험** |
| **커스텀 객체 ID** | uuid + 예약어 (workspace 등) | nanoid + ObjectKind enum | 우리도 OK, 예약 ID 정리 필요 |
| **터치 UX** | touch-action:none + cornerSize 16 + viewport user-scalable=no | **0건 적용** | ⚠️ **모바일 사용 불가** |
| **CDN/Vercel** | index.html no-cache + assets immutable | 미설정 (FOLLOWUP-15 와 연관) | 추가 필요 |
| **에러 복구** | EditorErrorBoundary + localStorage 5초 백업 + unhandledrejection | DirtyTracker localStorage 만 | 일부 적용, ErrorBoundary/global handler 추가 필요 |

---

## 3. 즉시 적용해야 할 항목 (P0 — 모바일 크래시 차단)

### 3.1 ⚠️ canvas 를 React useState 에 보관 — `apps/web/components/editor/EditorShell.tsx:51`

```ts
// 현재 (가이드 §25 ❌)
const [canvas, setCanvas] = useState<StoryCanvas | null>(null)

// 권장
// useRef + Context (또는 Zustand)
const canvasRef = useRef<StoryCanvas | null>(null)
// 자식에 ref.current 전달, 직접 비교 X
```
**위험**: useEffect 의존성에 들어가면 무한 리렌더, 가비지컬렉트 안 되어 메모리 leak. 다행히 우리는 setCanvas 한 번만 호출하므로 즉시 폭발은 아니지만, M1-07 BottomSheet 작업에서 의존성 늘면 위험.

### 3.2 ⚠️ 익명 함수로 fabric.on() 등록 — `packages/editor-core/src/canvas/StoryCanvas.ts:183~217` (7건)

```ts
// 현재
this._fabric.on('object:added', (e) => { ... })  // off 불가능

// 권장 (가이드 §20.1)
private _onObjectAdded = (e: FabricEvent) => { ... }
constructor() { this._fabric.on('object:added', this._onObjectAdded) }
dispose() { this._fabric.off('object:added', this._onObjectAdded) }
```
**위험**: `dispose()` 가 fabric 핸들러를 제거 못 함 → 다음 마운트 시 누적 → 동일 이벤트 N번 처리 → 점진적 메모리 누수. **단위 테스트(memory leak)에서 잡히지 않음**.

### 3.3 ⚠️ Canvas dispose 가드 0건 — `packages/editor-core/src/`

가이드 §20.3: 모든 핸들러 첫 줄 `if (!this._canvas?.getContext()) return`
**위험**: 비동기 핸들러가 dispose 후 실행 → `Cannot read properties of null (getContext)` 런타임 에러. Next.js 라우팅 이동 시 자주 발생.

### 3.4 ⚠️ enableRetinaScaling 항상 true (모바일 9× 메모리)

가이드 §15.2 검증: iPhone DPR=3 → 캔버스 백버퍼 9× 메모리. iPhone X 256MB 한계 즉시 초과.
**조치**: `StoryCanvas` factory 에 `isCoarsePointer()` 분기 추가.

### 3.5 ⚠️ historyMaxSteps 분기 없음 — `editor-history`

현재 capacity 200 단일. 가이드 §7.2: 모바일 15 / 데스크톱 50 (메모리 ~70% 절감).
**조치**: `History` 생성자 옵션에 모바일 자동 분기.

### 3.6 ⚠️ touch-action / viewport meta 누락

```css
/* apps/web/app/globals.css 추가 필요 */
.canvas-container, .canvas-container canvas {
  touch-action: none;
  -webkit-touch-callout: none;
  user-select: none;
}
body { overscroll-behavior: none; }
```
```html
<!-- viewport meta — Next.js 의 metadata.viewport 로 -->
<meta name="viewport" content="width=device-width, initial-scale=1.0,
      maximum-scale=1.0, minimum-scale=1.0, user-scalable=no, viewport-fit=cover">
```
**위험**: 모바일 시스템 핀치 줌이 우리 캔버스 줌과 충돌, 객체 탭 시 페이지 자체가 zoom 됨.

### 3.7 ⚠️ window.unhandledrejection 글로벌 핸들러 없음

가이드 §18.3 + BUG-015: SVG 파싱 throw 가 React 트리 freeze. 한 줄 추가:
```ts
// apps/web/app/layout.tsx 또는 client provider
window.addEventListener('unhandledrejection', (e) => {
  console.error('[unhandled]', e.reason); e.preventDefault()
})
```

### 3.8 ⚠️ ResizeObserver 가드 — M1-07 진입 전 필수

현재 우리는 ResizeObserver 안 씀. M1-07 모바일 BottomSheet 작업에서 캔버스 크기 추적 시 **반드시 3중 가드** (가이드 §17.2):
- 1px 미만 변동 무시
- canvas.getWidth()/Height() 와 비교, 동일하면 setDimensions 스킵
- RAF 로 합치기 (1프레임 1회)
**근거**: BUG-013 (가이드의 가장 치명적 버그) — iOS Safari WebContent 크래시.

---

## 4. M1-07/M2 진입 전 적용 (P1 — 중요)

| # | 항목 | 출처 | 우리 적용 위치 |
|---|---|---|---|
| 1 | 터치 핸들 크기 (`cornerSize:16, padding:8, touchCornerSize:36`) | 가이드 §3.2 | StoryCanvas factory (모바일 분기) |
| 2 | `renderOnAddRemove: false` + 수동 `requestRenderAll()` | 가이드 §3.1 | StoryCanvas factory |
| 3 | `objectCaching: true, statefullCache: false` 글로벌 | 가이드 §3.2 | StoryCanvas 1회 init |
| 4 | `preserveObjectStacking: true` | 가이드 §3.1 | 우리 이미 OK 인지 확인 |
| 5 | 객체 추가 정형 패턴: `offHistory → add → setActive → onHistory → requestRenderAll` | 가이드 §6.2, §26.7 | EditorShell 의 add* 메서드 |
| 6 | mobile 사이드바 자동 닫기 (`if (TOUCH_ENV) tapMenu(null)`) | 가이드 §16.3 | M1-07 BottomSheet |
| 7 | console.log 핫패스 제거 (debug logger) | 가이드 §15.5 | editor-history `_historySaveAction` 같은 곳 |
| 8 | DirtyTracker 모바일 debounce 2초 (현재 5초로 안전한 편) | 가이드 §15.3 | editor-export DirtyTracker (현 default OK) |
| 9 | LRU CacheManager 100MB | 가이드 §19.2 | M2 포즈 1,260개 인입 후 필수 |

---

## 5. M2~M5 단계에서 적용 (P2)

| # | 항목 | 출처 | 우리 적용 시점 |
|---|---|---|---|
| 1 | **SVG vs Raster 분기 (BUG-015 핫픽스)** | 가이드 §6.5 | M2-01 인입 (PNG 1차라 직접 영향 X), M5 사용자 업로드 |
| 2 | createFabricImage CORS + 자동 스케일 (40% / max 0.5) | 가이드 §6.3 | M5 이미지 도구 |
| 3 | 알파 채널 100×100 샘플 감지 | 가이드 §9.3 | M2-01 PNG 인입 (sharp 가 처리하므로 직접 적용은 X) |
| 4 | **한글 NFC/NFD 폰트 매칭** | 가이드 §10.3 | M5 텍스트 |
| 5 | **CSS Font Loading API + RAF 2번 + 30ms** | 가이드 §10.4 | M5 텍스트 |
| 6 | 폰트 변경 후 `initDimensions + setCoords` | 가이드 §10.5 | M5 |
| 7 | 폰트 로딩 큐 (중복 방지 Map) | 가이드 §10.6 | M5 |
| 8 | PDF 변환 시 텍스트 → SVG path | 가이드 §10.7 | M6 PDF |
| 9 | EditorErrorBoundary + localStorage 5초 백업 | 가이드 §18 | M9 안정화 (DirtyTracker 위에 추가) |
| 10 | 모바일 4MB 업로드 가드 | 가이드 §15.4 | M5/M7 사용자 업로드 |
| 11 | Vercel index.html no-cache + /assets/* immutable | 가이드 §22.1 | FOLLOWUP-15 와 함께 처리 |

---

## 6. 우리 도메인과 무관 (스킵)

가이드의 인쇄 특화 영역 — StoryWork 는 POD PDF 만 출력하면 되므로 깊게 안 가도 됨:
- §11 표지 편집 (Separated/Composite/Spread) — **우리는 단일 페이지 멀티페이지 책**
- §12.4 page-outline ClipPath (봉투/비규칙) — **우리는 직사각 페이지만**
- §13.4 Zoom Auto Fit `findScaleToFit` — **개념은 차용 OK** (M1-07 에서 fit-to-viewport)
- §14.3 setUnchangeable (workspace/background z-order 강제) — **개념만 차용** (우리 layers 가 이미 비슷한 일 함)
- §22.3 COOP/COEP — **OpenCV 안 쓰면 무관**
- §23 Saddle Stitch PDF 합성 — **우리 책 형식이 saddle 이면 차용**

---

## 7. 우리가 **더 잘** 하고 있는 것

| 항목 | 우리 |
|---|---|
| **모듈 경계 ESLint** | `import/no-restricted-paths` 룰 강제 — 가이드는 명시 X |
| **헤드리스 단위 테스트** | jsdom + node-canvas 로 editor-core 67 tests, layers 85, history 63, export 43 — 가이드는 브라우저 테스트만 |
| **Schema v1 strict** | Zod + PageJsonV1 — 가이드는 fabric toJSON 그대로 |
| **Command 패턴 명시** | 10+ builtin Commands + coalesce + OT slot 사전 설계 — 가이드는 fabric-history 확장 |
| **TypeScript strict + any 금지** | 모든 패키지 — 가이드는 `(canvas as any)` 다수 사용 |
| **CI green 게이트** | 모든 push 마다 lint+typecheck+test+build — 가이드 프로젝트도 있을 가능성, 명시 X |

---

## 8. 우리가 **놓친** 것 / 실수 위험

체크리스트 (가이드 §26.8 신규 프로젝트 체크리스트와 비교):

| □ | 항목 | 우리 상태 |
|---|---|---|
| ☑ | 모노레포 패키지 분리 | M0-01 |
| ☐ | extendFabricOption 화이트리스트 (커스텀 속성 보존) | **누락** — Schema v1 의 `data` 필드만 보존, fabric 내부 styles/charSpacing/cmykFill 등 커스텀 속성 향후 추가 시 누락 위험 |
| ☐ | configureFabricDefaults 1회 호출 | **누락** — StoryCanvas 가 매번 옵션 적용, 글로벌 prototype 설정 X |
| ☐ | enableRetinaScaling: !isCoarsePointer() | **누락** (P0) |
| ☐ | renderOnAddRemove: false | **확인 필요** — fabric v6 default OK 인지 |
| ☐ | touchCornerSize: 36 (모바일) | **누락** (P1) |
| ☐ | historyMaxSteps: TOUCH_ENV ? 15 : 50 | **누락** (P0) |
| ☑ | 모든 객체에 id (nanoid) | OK |
| ☐ | 모든 dispose 가드 | **누락** (P0) |
| ☐ | useCanvasLocalBackup (5초 주기 백업) | DirtyTracker 가 비슷한 역할, 5초 default 일치 ✅ |
| ☐ | EditorErrorBoundary | **누락** (P2 — M9) |
| ☐ | window.unhandledrejection | **누락** (P0) |
| ☐ | ResizeObserver 3중 가드 | **N/A** (현재 미사용, M1-07 진입 시 필수) |
| ☐ | touch-action: none | **누락** (P0) |
| ☐ | user-scalable=no | **누락** (P0) |
| ☐ | TouchEvent getEventPoint 헬퍼 | **누락** (P1 — M1-07 모바일 작업) |
| ☐ | SVG vs Raster 분기 | **N/A** (M2 PNG 1차) |
| ☐ | 4MB 모바일 업로드 가드 | **누락** (M5/M7 진입 시) |
| ☐ | NFC/NFD 폰트 정규화 | **N/A** (M5) |
| ☐ | Vercel index.html no-cache | **누락** (FOLLOWUP-15 와 함께) |
| ☐ | Sentry 연결 | **누락** (M0-06 미진행) |
| ☑ | Turborepo 빌드 의존 | M0-01 |

---

## 9. 권장 조치 — 즉시 → M1-07 → M9

### 즉시 (M1-07 진입 전 핫픽스 1건)
**FOLLOWUP-16** 신설 → editor-engineer 에 다음을 위임:
- StoryCanvas 의 익명 핸들러 7건 → bound member 로 변경
- StoryCanvas dispose 시 모든 핸들러 off + null
- StoryCanvas factory 옵션에 `isCoarsePointer()` 분기 추가:
  - `enableRetinaScaling: !coarse`
  - `cornerSize: coarse ? 16 : 13`, `touchCornerSize: 36`, `padding: coarse ? 8 : 0`
  - `renderOnAddRemove: false` (수동 렌더 강제)
- editor-history 의 `History` capacity 옵션 모바일 자동 분기 (15/200)
- apps/web/app/layout.tsx 에 viewport meta + globals.css 에 touch-action
- apps/web 에 unhandledrejection global handler
- apps/web/components/editor/EditorShell.tsx 의 useState<StoryCanvas> → useRef + provider

### M1-07 작업 시 추가 적용
- ResizeObserver 3중 가드 (BottomSheet 가 캔버스 영역 변경)
- TouchEvent getEventPoint 헬퍼
- ControlBar position:fixed (SELECT-1 함정)
- 모바일 사이드바 자동 닫기

### M2 진입 시
- LRU CacheManager 100MB (포즈 1,260개 캐싱)
- 알파 채널 감지 (현재 sharp 가 처리하므로 보조)

### M5 진입 시
- 한글 NFC/NFD 폰트 매칭
- CSS Font Loading API + RAF 2번 + 30ms 패턴
- 폰트 로딩 큐
- 4MB 모바일 업로드 가드
- SVG sanitize + raster 분기

### M9 안정화
- EditorErrorBoundary + 5초 백업 옵션 강화
- Vercel index.html no-cache 헤더

---

## 10. 결론

**가이드는 우리 프로젝트의 P0~P1 안정성 문제를 사전 차단해주는 검증된 운영 백서**. 도메인 차이(인쇄 vs 스토리보드) 약 30%, 직접 적용 가능 약 70%. **즉시 FOLLOWUP-16 으로 8개 핫픽스를 처리한 후 M1-07 진입을 권장**합니다.

특히 **BUG-006 (iOS 메모리)**, **BUG-013 (ResizeObserver 무한루프)**, **BUG-015 (SVG freeze)**, **BUG-002 (dispose 후 핸들러)** 의 4가지는 우리가 동일 패턴으로 똑같이 만날 위험이 매우 높음. 가이드 패턴 그대로 적용 가치가 있음.

---

_분석자: Claude Code editor-engineer (M1 진행자), 2026-05-05_
