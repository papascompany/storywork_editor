# Storige(Bookmoa) 편집기 — 기본 기능 학습/내재화 노트

> **목적**: 같은 도메인(Fabric.js 기반 POD 인쇄 편집기)인 Storige 편집기의 기본 기능을
> 정독·내재화한 레퍼런스. StoryWork 편집기 작업 시 **기능 패리티 체크리스트** 및
> **재사용 가능한 패턴 출처**로 활용한다.
>
> - **분석 대상**: `/Users/yohan/claude/Bookmoa Storige editor/storige` (별도 제품, 동일 사용자 소유)
> - **분석일**: 2026-06-08
> - **분석 범위**: `packages/canvas-core/src` 전체(21 플러그인 + spread 엔진 + models),
>   `apps/editor/src`(tools/controls/components/stores/views/hooks),
>   `docs/EDITOR.md` / `EDITOR_OBJECT_EDITING_SPEC.md` / `EDITOR_SCREENS.md` / `MOBILE_TOUCH_UI.md`
> - **관련 기존 노트**: [`STORIGE_GUIDE_REVIEW.md`](./STORIGE_GUIDE_REVIEW.md), [`FABRIC_EDITOR_GUIDE.md`](./FABRIC_EDITOR_GUIDE.md), [`EDITOR_UX_GAP_ANALYSIS.md`](./EDITOR_UX_GAP_ANALYSIS.md)

---

## 0. 한눈에

Storige = 인쇄 쇼핑몰용 **Fabric.js v6 POD 편집기**.

```
apps/editor (React+Vite+Zustand+Tailwind 셸)
  └─ packages/canvas-core (Fabric 래퍼 + 플러그인 엔진)   ← 핵심
apps/api    (NestJS + TypeORM + MariaDB + JWT)
apps/worker (NestJS + Bull + pdf-lib + Sharp + Ghostscript)  ← PDF 변환/합성
```

데이터 흐름: 편집기 → `edit_sessions`(JSON 저장) → API가 `worker_jobs`+Bull 큐 생성 →
worker가 validate→convert→synthesize → 콜백으로 상태 갱신.

**StoryWork와의 관계**: 도메인이 거의 동일(Fabric 편집 → 재단/세이프/스프레드 → POD PDF).
아키텍처 경계만 다름 — Storige는 **단일 `Editor` + 플러그인**, StoryWork는 **`@storywork/editor-*` 패키지 분리**.

---

## 1. 아키텍처 — 플러그인 시스템

`packages/canvas-core/src/{Editor.ts, plugin.ts, contextMenu.ts}`

### Plugin 계약 (`PluginBase`)
- 필수: `name`(Map 키, 중복 무시), `events: string[]`(선언적 계약), `hotkeys: CanvasHotkey[]`(단축키+컨텍스트메뉴 **공용 배열**)
- 라이프사이클(`Lifecycle`, 모두 `()=>Promise<void>`): `mounted`, `destroyed`, `beforeLoad`, `afterLoad`, `beforeSave`, `afterSave`
- 생성자: `(canvas, editor, options)` — 서브클래스 생성자에서 직접 이벤트 바인딩

### `CanvasHotkey` 모델
```ts
{ name; input: string|string[];  // ['ctrl+z','⌘+z'] 크로스플랫폼
  callback; onlyForActiveObject: boolean; hideContext?: boolean|(()=>boolean) }
// ContextMenuItem extends CanvasHotkey + { children?, color?, disabled? }  (서브메뉴)
```

### `editor.use(plugin)` 동작
1. `plugins.set(name, plugin)`
2. **bindingHooks** — 라이프사이클 메서드를 tapable `AsyncSeriesHook`에 `tapPromise`(직렬 실행)
3. **bindingHotkeys** — `hotkeys-js`로 등록, keydown 시 `onlyForActiveObject` 체크 → `preventDefault` → callback
4. **bindingContextItems** — 컨텍스트 메뉴에 push
5. `plugin.mounted()`

> **주의**: API 자동 프록시 **없음**. 호출부가 `editor.getPlugin<T>('FilterPlugin')?.gold(obj)`로 명시 접근.
> 플러그인 간 협업도 동일(예: HistoryPlugin → Filter/Workspace/ImageProcessing).
> `Editor`는 `EventEmitter` 상속 + `[key:string]:any` 인덱스 시그니처(동적 접근 허용).

### ContextMenu (`contextMenu.ts`)
`canvas.wrapperEl`에 DOM 렌더. `contextmenu`/`ContextMenu`키/우클릭 재오픈/외부클릭 닫기.
서브메뉴·구분선·disabled·per-item color·단축키 힌트. `hideContext`/`onlyForActiveObject`로 필터.

---

## 2. 엔진 능력 — 21개 플러그인

| 그룹 | 플러그인 | 핵심 기능 / 공개 API | 단축키 |
|---|---|---|---|
| **워크스페이스** | `WorkspacePlugin` | 페이지 사각형, `setZoomAuto`(fit ×0.98), 휠 줌(클램프 **0.01–20×**), 재단선(`#cd3f3f`)·세이프존(`#3fcd84`) 가이드, z-order 정규화 | — |
| **영속/PDF** | `ServicePlugin` | `saveJSON/loadJSON`(폰트 프리로드+타임아웃 가드), **`saveMultiPagePDF`**(벡터, 텍스트→패스, 효과/컷라인 페이지, **300DPI 캡 `PRINT_MAX_IMAGE_DIMENSION=3508`**) | — |
| **객체** | `ObjectPlugin` | z-order(up/down/top, 연결 fillImage 동반), `del`(잠금/`deleteable` 존중), lock/visible, 배경 고정 | `[ ] ⌘[ ⌘]`, `del/backspace`, 화살표 1px, `i`(스포이드) |
| | `CopyPlugin` | copy/paste/clone, **시스템 클립보드 파일**(pdf/psd/ai/svg/png…)+텍스트 붙여넣기 | `⌘C ⌘V ⌘D` |
| | `GroupPlugin` | group/unGroup/toggle(uuid 재발급) | `⌘G ⌘⌫` |
| | `AlignPlugin` | 단일=워크스페이스 기준, 다중=선택 bounds 기준 정렬(H/V) | — |
| | `LockPlugin` | **4단계 역할 잠금** `user<designer<admin<system`(system 불가역), 7개 fabric lock 속성, `lockInfo` 메타 직렬화 | `⌘L` |
| **변형** | `ControlsPlugin` | 커스텀 핸들(원형 코너/캡슐 측면/회전핸들 36px 아래), **coarse-pointer 시 12→16px** | 화살표(+Shift=10px) |
| | `DraggingPlugin` | Space=grab 팬, Alt-drag 팬, 드롭-투-추가(½ 워크스페이스 스케일), 터치 좌표 폴백 | (raw Space) |
| **텍스트** | `FontPlugin` | WOFF2 동적 로드, **한글 NFC/NFD 정규화**, **글리프 검증**(`validateTextGlyphs`), 텍스트→패스, woff2→TTF API | — |
| | `EffectPlugin` | 곡선/아치 텍스트(`textCurve`, 180° 호 분할) | — |
| **이미지** | `FilterPlugin` | 필터 11종(BW/Sepia/Invert/BlendColor…) + **인쇄효과 박(gold)/엠보싱/컷팅**(이미지=필터스택, 텍스트=패턴fill), save 전후 원복/재적용 | — |
| | `ImageProcessingPlugin` | **AI 배경제거**(@imgly isnet_fp16), **OpenCV 윤곽 추출/오토크롭**, 몰드(모양틀) 채우기, 색 채우기 | — |
| **인쇄** | `PreviewPlugin` | 인쇄 미리보기(컷라인 클립, 편집 비활성), **CMYK 소프트프루프**(≤36MP, 300DPI 타깃) | — |
| | `RulerPlugin` | 룰러 + 드래그 가이드라인 + 중앙 스냅(임계 15px/스냅 8px) | — |
| | `AccessoryPlugin` | 키링/스탠드/그립톡 액세서리, **paper.js 불리언 유니온**, 경로 제약 드래그, lid 클립 | — |
| | `SpreadPlugin` | 펼침면 레이아웃/책등 리사이즈/**영역 클릭 포커싱**(§4) | — |
| **기타** | `SmartCodePlugin` | QR(qr-code-styling) + 바코드(jsbarcode: CODE128/EAN8/EAN13/ITF14…) | — |
| | `ScreenshotPlugin` | 캡처/썸네일/워크스페이스 전용 export(png/jpeg/webp) | — |
| | `TemplatePlugin` | SVG 템플릿 인스턴싱, **템플릿 교체 시 사용자 요소 보존**(preserve→clear→load→restore) | — |
| | `HistoryPlugin` | undo/redo(§3) | `⌘Z ⌘⇧Z` |

**무거운/네이티브 의존**: OpenCV.js + @imgly/background-removal(이미지, **lazy+warmup**), jsPDF+svg2pdf.js(PDF), paper.js(액세서리 불리언), jsbarcode+qr-code-styling(코드), fontfaceobserver+opentype(폰트), d3.

---

## 3. Undo/Redo (HistoryPlugin) — 패턴 주목

- **fabric 히스토리 믹스인**(`utils/history` 사이드이펙트 import) 위의 얇은 컨트롤러.
- **full-document JSON 스냅샷**(command/delta 아님). 그래서 거의 모든 플러그인이 변형을
  **`canvas.offHistory() … onHistory()`로 괄호**쳐 중간상태 오염 방지 ← **핵심 디스ципline**.
- `history:append` → 에디터 이벤트 `historyUpdate(undoLen, redoLen)`.
- 스택 깊이: PC 50 / **모바일 15** (문서 기준).
- **복원 후 재정합**(스냅샷이 못 잡는 파생상태): `realignOverlays`(오버레이→소스 재배치),
  `ensureGuideElements`(재단/세이프 가이드 재생성), `rebindMoldFeatures`(몰드 +아이콘 재생성).
- `afterLoad`에서 히스토리 클리어, `beforeunload`로 미저장 경고.

---

## 4. 인쇄 특화 — 스프레드/책등 엔진 (가장 전이가치 높음)

`packages/canvas-core/src/spread/` (Fabric-free 순수 모듈) + `SpreadPlugin`(canvas 연동)

### 레이아웃
영역 순서 `back-wing · back-cover · spine · front-cover · front-wing`.
`computeLayout(spec)` → 영역별 `{x,width,height,widthMm,label}` + 가이드 + 치수 라벨 + 총 px/mm.
(날개 비활성 시 zero-width 영역 스킵)

### 책등(spine) 리사이즈 — Strategy 패턴
`getSpineResizeStrategy(obj)`:
- 텍스트(i-text/textbox) → **스케일 없이 재중심**(폰트 품질 보존)
- 이미지 → 비례 스케일(`newW/oldW`) + `strokeUniform`
- 텍스트 포함 그룹 → 재중심만
- 그 외 → 비례 스케일

`resizeSpine(newMm)`는 **원자적 트랜잭션**(렌더 락 → 워크스페이스 리사이즈 → 전 객체 재배치 →
가이드/라벨 재렌더 → setZoomAuto → out-of-bounds 자동 클립).

### 영역 멤버십 — 히스테리시스
`resolveRegionRef`: overlap ≥0.9 **승격**, ≥0.7 **유지**, 그 외 **free 강등**(경계 플리커 방지).
`regionRef===null`=free(절대좌표), 영역객체=정규화 anchor `{xNorm,yNorm}`(−1.0~2.0 클램프)로 영역 추종.

### §19.8 영역 클릭 포커싱
빈 영역(system/workspace/background) `mouse:down` → `getRegionAtPoint`(scene→content 좌표변환)
→ 파랑 하이라이트 + `spreadRegionFocus` 이벤트. 같은 영역 재클릭=토글.
**SpreadPlugin 내부에서 완결** → `/embed`에서도 UI 배선 없이 자동 동작.
가이드/포커스 오버레이는 `excludeFromExport:true`(리로드 시 유령객체 방지).

### 기타 인쇄 개념
- **재단선/세이프**: 빨강/파랑 점선, 줌 시 숨김(`overlay` 타입), 세이프 15mm inset
- **책등 폭 공식**: `(페이지÷2)×종이두께 + 제본여유` (`spine.service` 권위, `SPINE_FORMULA_VERSION`).
  종이 7종(모조70/80·서적70·신문45·아트200·매트200·카드300·크라프트120g),
  제본 4종(무선 +0.5/≥32p·중철 +0.2~0.4/≤64p·4배수·스프링 +3.0·양장 +2.0). 책등<5mm 경고.
- **제본 페이지 가드**(§19.6): 무선 min32(삭제불가)/중철 max64(추가불가)
- **내지/면지/임포지션**: 내지 PDF 언더레이(표시전용 `excludeFromExport` 락 배경), 면지 0–6,
  임포지션은 design-done/impl-pending
- **PDF 출력**: DPI **72→300 통일**(§15.2), 곡선텍스트 per-glyph 보존(§15.4),
  **스프레드 책 = `cover.pdf` + `content.pdf` 2파일 분리 강제**(§19.4)
- **무결성 체인**(§19): `template.spreadConfig ⟵ metadata.spread(SpreadSnapshot) ⟵ 실제 cover.pdf MediaBox`
  검증(pt→mm, tol max(0.2mm,1px@dpi)). 실제 0.6mm 결함(429.2 vs 428.6) 검출.
  기본 SOFT(warn), `SPREAD_SNAPSHOT_HARD_FAIL=true`로 HARD 승격.

---

## 5. 사용자 기능 (apps/editor)

### 화면(`views/`)
Editor(메인, query-param 로딩) · **Embed**(iframe 호스트) · TemplateEditor(관리자) ·
MyWorks · BrowseContents · Unauthorized

### 도구(`tools/` — 좌측 ToolBar, 템플릿셋별 화이트리스트)
텍스트 · 이미지(벡터 ai/eps/pdf→래스터) · 요소(클립아트) · 배경(색/이미지/뚜껑색) ·
템플릿(+칼선 업로드) · 프레임(클리핑 마스크) · QR/바코드 ·
**모양컷**(윤곽컷+배경제거+액세서리+외곽여백 슬라이더) · 편집도구(관리자: 배경/목업/페이지아웃라인)

### 인스펙터(`controls/` — 선택 시 ControlBar)
크기 · 채우기(그라데이션+각도0/45/90/135°+radial) · 선 · 그림자 ·
텍스트속성(폰트/pt프리셋6–96/**B·I·U**/자간/행간/정렬/**부분 색**) ·
곡선텍스트(30–340° 반원/¾/원형) · 특수효과(박/엠보싱/컷팅) · 영역간 이동(MoveToCoverRegion)

추가 ControlBar 액션: 잠금/가시성/삭제/**삭제잠금**(관리자)/그룹/정렬 6종/**균등분포**(≥3)

### 헤더(`EditorHeader.tsx`)
Undo/Redo · 자동저장 인디케이터 · 히스토리 패널 · 제목 · **판형 선택**(프리셋+커스텀 mm) ·
룰러 · 테마 · **3D 목업** · 페이지내비 위치 · 단축키도움말 · 불러오기 · **편집완료**(역할 분기)

### 패널/모달
- 레이어·페이지 패널(`SidePanel`): 썸네일 드래그 재정렬, 인라인 리네임, 잠금/가시성
- 히스토리 패널: **버전 타임라인 + 썸네일 + "이 시점으로 복원"**
- 커맨드 팔레트(`⌘K`, 즐겨찾기 별), 단축키 모달(`?`)
- AI 패널: 추천(점수+이유칩+피드백) / 생성(프롬프트→템플릿, 진행률)
- **3D 목업**(`BookMockup3D`, CSS-3D 회전), 가죽표지 미리보기
- 스파인 에디터(미리보기/설정/계산 탭), 커버 포커스 바

### 저장/복구(`hooks/`)
자동저장(디바운스) + **5초 localStorage 백업**(iOS Safari 크래시 복구, `useCanvasLocalBackup`) +
세션 복원 + 자동저장 스냅샷(~20점, 1/min)

---

## 6. 모바일/터치 (`MOBILE_TOUCH_UI.md`)

- **감지 원칙**: 뷰포트 폭이 아니라 `(pointer: coarse)` (`useIsCoarsePointer`) — 외장마우스 태블릿 구분
- 핸들: coarse 시 `cornerSize 16`/`touchCornerSize 36`/`padding 8`/`borderScaleFactor 2`
- 브라우저 충돌 차단: `touch-action:none`, `overscroll-behavior:none`(iOS 바운스),
  `user-scalable=no, viewport-fit=cover`, fabric `allowTouchScrolling:false`
- ControlBar: 데스크톱 좌측 280px → **모바일 바텀시트 88px↔70vh**, 객체 추가 후 사이드바 자동 닫힘
- **크래시 하드닝**: ResizeObserver 무한루프 가드(RAF+사이즈 캐시 — "터치 안 됨"의 실제 근본원인),
  ErrorBoundary, localStorage 백업
- **미구현 갭**: 캔버스 내 핀치줌, 두손가락 팬, iText 가상키보드 `visualViewport` 보정, 롱프레스 컨텍스트

---

## 7. 임베드 / iframe 호스트 모드

- **`/embed`** = 외부 쇼핑몰(bookmoa) 삽입 정식 진입점. 자동저장+세션영속+postMessage+sessionId 재편집 완비.
- **postMessage 이중 발신**: 모던 envelope(`editor.ready/save/complete/cancel/error/needAuth`) + 레거시(`storige:*`)
- **호스트→편집기 핸드셰이크**(§17.1): `{source:'storige-host',version:'1',command,requestId?}`,
  origin 검증, `getState`/`saveNow`/`setBackGuard`
- **뒤로가기 가드**(§17): history 센티넬 push로 첫 back 흡수, dirty 시 confirm(강제 자동저장 ≤3s)
- **게스트 폴백**(§14.4): 진입 시 멤버세션 생성, `MEMBER_REQUIRED` 시 createGuest, 24h 자동 삭제

---

## 8. StoryWork에 전이할 재사용 패턴 (실천 항목)

| # | 패턴 | StoryWork 적용 포인트 |
|---|---|---|
| 1 | **full-snapshot history + `offHistory/onHistory` 괄호 디스ципline** + 복원 후 파생상태 재정합 | `editor-history`의 command 패턴과 비교 — 우리는 delta지만, 복원 후 가이드/오버레이 재정합 단계는 차용 가치 |
| 2 | **PDF 전 글리프 검증**(폰트 누락 글자 사전 탐지) | `pdf-engine` + 한글 금칙어 처리와 결합 → 인쇄 사고 예방 |
| 3 | **300DPI 이미지 상한 + 텍스트 벡터화** | 우리 `pdf-engine` 벡터 우선 정책과 동일 방향 — 상한 상수화 |
| 4 | **coarse-pointer 분기**(폭 아님) + `touch-action:none` + ResizeObserver 루프 가드 | 모바일 1급 시민 NFR 충족, "터치 안 됨" 근본원인 선제 차단 |
| 5 | **스프레드 Strategy + 히스테리시스 영역 멤버십** | 향후 책/표지 스프레드 기능 시 SpineResizeStrategy/resolveRegionRef 구조 차용 |
| 6 | **영역 클릭 포커싱을 코어(SpreadPlugin)에 완결** | UI 레이어 배선 없이 임베드/모바일 동시 동작 — 코어 책임 분리 원칙과 일치 |
| 7 | **무결성 체인 검증**(template ⟵ snapshot ⟵ 실제 PDF MediaBox) | 우리 preflight 프로필에 스프레드 치수 교차검증 추가 후보 |
| 8 | **임베드 호스트 핸드셰이크 + 뒤로가기 가드** | 외부 삽입(쇼핑몰/SNS) 시나리오 레퍼런스 |

---

_분석: 3-에이전트 병렬 정독(canvas-core 플러그인 / apps-editor UI / EDITOR.md 스펙) 후 종합._
_주의: 위 §13–§19 번호는 Storige `docs/EDITOR.md`의 날짜별 체인지로그 섹션 기준._
