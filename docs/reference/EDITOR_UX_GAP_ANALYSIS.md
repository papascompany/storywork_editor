# 편집기 UI/UX 격차 분석 — Canva + Storige 기준 재설계

**일시**: 2026-05-05
**비교 대상**:
- **현재 우리 (M1-06/07)** — 8 컴포넌트 1,643 LOC
- **Storige editor** — 14 컴포넌트 4,711 LOC + ToolBar/SidePanel/ControlBar/EditorHeader 풀 스택
- **Canva** — 업계 표준 캔버스 편집기 UX

**상태 확인**: https://storywork-editor-web.vercel.app/editor 200 OK 정상 배포 (빌드 캐시 이슈 해결 완료)

---

## 1. 격차 한눈에

| 영역 | 우리 (M1-06/07) | Storige | Canva | 격차 |
|---|---|---|---|---|
| **Top Bar** | 단순 — 파일명/Undo/Redo/내보내기 | 866줄 — 사이즈 프리셋·3D 목업·테마·Help·Command Palette·페이지 nav 위치 | 로고/제목/실시간저장/공유/다운로드 | ⚠️ Mid |
| **좌측 도구** | 4개(선택/포즈/배경/텍스트) — 라벨만 | **11개** + 카테고리 + Feature Flag (CLIPPING/TEMPLATE/IMAGE/TEXT/SHAPE/BACKGROUND/FRAME/QR/EDIT/AI/UPLOAD) | Templates/Elements/Text/Brand/Uploads/Photos/Apps | ❌ **Critical** |
| **도구 패널** | **없음** (도구 클릭 시 즉시 추가) | **FeatureSidebar** — 도구 클릭 시 좌측 280px 패널 (검색/그리드/속성) | 동일한 좌측 슬라이드 패널 | ❌ **Critical** |
| **속성 컨트롤** | Inspector — x/y/w/h/angle 수치만 | **ControlBar 496줄** — 객체 타입별 가변(텍스트→폰트/사이즈/색/줄간격, 이미지→불투명도/필터, 도형→fill/stroke), 정렬, lock/hidden/delete, 그룹/그룹해제 | 캔버스 위 floating 컨트롤 + 우측 패널 | ❌ **Critical** |
| **레이어 패널** | LayerPanel 248줄 — 트리 표시 | SidePanel 357줄 — 페이지+레이어 통합, 인라인 편집, 드래그 정렬 | 탭형 (Position/Layers) | ⚠️ Mid |
| **빈 캔버스 안내** | 없음 | EmptyCanvasHint — Sparkles + ⌘K 안내 | 템플릿 추천 그리드 | ⚠️ Mid |
| **Command Palette** | 없음 | 548줄 ⌘K 모든 명령 검색 | ⌘K 동일 | ❌ Critical (생산성) |
| **단축키 모달** | 없음 | KeyboardShortcutsModal — `?` 키 | `?` 키 동일 | ⚠️ Mid |
| **자동저장 표시** | 단순 텍스트 | AutoSaveIndicator — 5상태 아이콘+로컬백업+오프라인 | "Saving..." → "Saved 2 min ago" | ⚠️ Mid |
| **드래그 앤 드롭** | 없음 | 메인 영역 전체 — dim + dashed border | 동일 | ⚠️ Mid |
| **History 패널** | 없음 | HistoryPanel 454줄 — 시점별 복원 | 버전 기록 (유료) | 🆗 Low |
| **3D 목업/미리보기** | 없음 | BookMockup3D | 미리보기 모드 (스마트폰/노트북 mockup) | 🆗 Low (M9+) |
| **로딩 오버레이** | 없음 | 전체 화면 스피너 + 메시지 | 동일 | ⚠️ Mid |
| **토스트** | 없음 | useToastStore + ToastViewport | 우상단 토스트 | ⚠️ Mid |
| **편집기 헤더** (TopBar) | 56px, 4개 액션 | 866줄 — 메인 메뉴/사이즈/도구/사용자 메뉴 | 60px, 그룹화된 메뉴 | ❌ High |
| **모바일 BottomSheet** | ✅ 3-snap 3-탭 (M1-07) | 동일 패턴 (ControlBar mobileOverlay) | Canva 모바일 = BottomSheet 표준 | ✅ |

---

## 2. Canva 표준 UX 패턴 (업계 기준)

### 2.1 레이아웃 (데스크톱 ≥ 1024px)
```
┌─────────────────────────────────────────────────────────────┐
│ TopBar (56px) — 로고 │ 파일명 │ 메뉴(파일/리사이즈) │ 우측: 저장/공유/다운로드 │
├──────┬──────────────────────────────────────────────────────┤
│ Left │ Side       │                                  │ Right │
│ Tool │ Panel      │   Canvas (회색 배경 + 흰 페이지)   │ Layer │
│ Bar  │ (290px)    │                                  │ /Pos  │
│ 72px │ 도구 콘텐츠 │   객체 위 floating 컨트롤        │ 280px │
│      │ (검색/그리드)│                                  │ (선택)│
│      │            │                                  │       │
│      │            ├──────────────────────────────────┤       │
│      │            │ Footer (40px) — 페이지 N/M ◀ ▶ + 100% 줌 │       │
└──────┴────────────┴──────────────────────────────────┴───────┘
```

### 2.2 핵심 인터랙션 (사용자가 기대하는 것)
1. **좌측 도구 클릭** → 그 도구 전용 **콘텐츠 검색/그리드 패널** 슬라이드 (290px)
2. **콘텐츠 그리드에서 항목 클릭/드래그** → 캔버스에 추가 + 자동 선택 + 컨트롤바 노출
3. **객체 클릭/드래그** → 객체 주위 회전·크기 핸들 + 객체 위 floating 액션 바(복사/삭제/잠금/메뉴)
4. **객체 더블클릭** → 컨텍스트 진입 (텍스트는 편집 모드, 그룹은 자식 선택)
5. **우측 클릭** → 컨텍스트 메뉴 (복사/잘라내기/붙여넣기/잠금/순서)
6. **Cmd+K** → 모든 명령 빠른 검색
7. **자동저장** + **상단에 상태 표시** (Saving... / Saved 2min ago)
8. **빈 캔버스** → "디자인을 시작해보세요" + 템플릿 추천 그리드 + Cmd+K 안내
9. **모바일** → 좌측 툴바를 하단 BottomSheet 로, Inspector 도 같은 시트 안 탭으로

### 2.3 디자인 토큰 (Canva 풍)
- **여백**: 데스크톱 충분히 여유 / 모바일 빡빡
- **그림자**: 패널마다 부드러운 그림자 (depth)
- **클릭 타겟**: 데스크톱 32px / 모바일 44px
- **색**: 캔버스 배경 회색(#f5f5f5), 페이지 흰색 + 미세 그림자, 액션 보라/파랑 accent

---

## 3. Storige 의 검증된 패턴 (직접 차용)

| 패턴 | 우리 적용 위치 |
|---|---|
| **ToolBar** 11종 정의 + Feature Flag 토글 | `apps/web/components/editor/ToolBar.tsx` 신규 (현재 ToolPalette 대체) |
| **FeatureSidebar** 도구 클릭 → 좌측 패널 슬라이드 | `apps/web/components/editor/FeatureSidebar.tsx` 신규 |
| **개별 도구 패널** (AppText/AppImage/AppPose/...) | `apps/web/tools/` 신규 디렉토리 |
| **ControlBar** 객체 타입별 가변 컨트롤 | `apps/web/components/editor/ControlBar.tsx` 신규 |
| **EmptyCanvasHint** Sparkles + ⌘K | 동일 컴포넌트로 재구현 |
| **CommandPaletteModal** ⌘K 명령 검색 | 동일 (단순화 버전) |
| **KeyboardShortcutsModal** `?` 키 | 동일 |
| **AutoSaveIndicator** 5상태 + 오프라인 | DirtyTracker 와 결합 |
| **showToast** + ToastViewport | shared-ui 에 추가 |
| **드래그앤드롭** 전체 캔버스 영역 | EditorCanvas 에 onDrop |
| **EditorHeader** 사이즈 프리셋 + 페이지 nav | TopBar 확장 |
| **isCoarsePointer** 분기 | ✅ 이미 적용 (FOLLOWUP-16) |

> **우리 도메인 특화**: 스토리보드 = 포즈/배경/말풍선/소품/효과/꾸미기/텍스트(대사) — Storige 의 IMAGE/SHAPE/TEXT/BACKGROUND 위에 **POSE / BUBBLE / WORD-FX / DECORATION** 4종 추가

---

## 4. 우리 도메인 + Canva/Storige 결합 — **타깃 UX**

### 4.1 좌측 ToolBar (10종, 72px 폭, 아이콘+라벨)
```
┌─────┐
│ 🔍  │  Templates  ← 추천/즐겨찾기 페이지 템플릿
│ 👤  │  Pose       ← ★ 우리 핵심: 1,260개 검색
│ 🖼  │  Background ← 배경 이미지/단색
│ 💬  │  Bubble     ← 말풍선 (꼬리 자동)
│ ⚡  │  WordFX     ← 워드 효과 (50종)
│ ✨  │  Deco       ← 꾸미기 (스티커)
│ 🎨  │  Shape      ← 도형
│ T   │  Text       ← 텍스트 (대사)
│ ⬆   │  Upload     ← 사용자 자산 (M7 에서 활성)
│ 🤖  │  AI         ← 대본 자동 배치 (M4)
└─────┘
```

### 4.2 FeatureSidebar (290px, 도구 클릭 시 슬라이드)
- **검색창** 상단 (포즈/배경/텍스트 모두)
- **그리드/리스트** 하단 — 무한 스크롤
- **카테고리 필터** (포즈: 시점/감정/액션/bodyType / 배경: 실내/실외/시간대)
- **드래그 또는 클릭으로 추가**

### 4.3 Canvas (가운데, flex-1)
- 회색 배경 + 흰 페이지 + 외곽 그림자
- 객체 선택 시: fabric 핸들 + **객체 위 floating 컨트롤 바** (복사/삭제/잠금/메뉴 4 아이콘)
- 객체 더블클릭: 텍스트 편집 / 그룹 진입
- 우측 클릭: 컨텍스트 메뉴
- 빈 캔버스: EmptyCanvasHint
- 드래그앤드롭 전체 영역

### 4.4 우측 패널 (280px)
- **위**: ControlBar — 선택 객체 타입별 (텍스트=폰트/색/사이즈/스타일, 포즈=좌우반전/색상슬롯/스케일, 말풍선=꼬리방향/스타일)
- **아래**: LayerPanel — 트리 + 잠금/숨김/이름 변경
- 또는 탭(Position/Properties/Layers)

### 4.5 TopBar (56px)
- 좌: 로고 + 파일명(클릭 시 인라인 편집) + 페이지 인디케이터(N/M)
- 가운데: AutoSaveIndicator (Saving...→Saved Xm ago)
- 우: Undo/Redo · 미리보기 · 다운로드(PNG/PDF) · 공유 · ⌘K 힌트

### 4.6 Footer (40px)
- 페이지 ◀ N/M ▶ + 줌 슬라이더(25~400%) + Fit + 100%

### 4.7 모바일 (md 미만)
- TopBar(48px) + Canvas(전체) + BottomSheet (3-snap, 3-탭) ✅ 이미 M1-07 완료
- 단, 탭 추가: Tools(11종) → Inspector → Layers
- Tools 탭 클릭 → 도구 선택 → 자동으로 **콘텐츠 패널** 풀스크린(검색/그리드)

---

## 5. M1-08 (UI/UX 대대적 개선) — 작업 계획

### 5.1 작업 분할 (총 6 sub-task, 약 6시간 분량)

| ID | 작업 | 위임 | 의존 |
|---|---|---|---|
| **M1-08a** | 디자인 토큰 보강 + Toast 시스템 + 로딩 오버레이 (shared-ui) | @ui-designer | 없음 |
| **M1-08b** | TopBar 재설계 (파일명 인라인편집 + AutoSaveIndicator + 다운로드 메뉴) | @ui-designer | 08a |
| **M1-08c** | ToolBar 11종 + FeatureSidebar 슬라이드 패널 + 도구별 빈 패널(검색창만 — 콘텐츠는 M2/M5) | @ui-designer | 08a |
| **M1-08d** | ControlBar (객체 타입별 가변 컨트롤) + 우측 LayerPanel 통합 | @editor-engineer + @ui-designer | 08c |
| **M1-08e** | EmptyCanvasHint + Drag&Drop + Footer (페이지/줌) + 우클릭 메뉴 + 객체 위 floating | @editor-engineer | 08d |
| **M1-08f** | CommandPaletteModal (⌘K) + KeyboardShortcutsModal (?) + 모바일 BottomSheet 11탭 통합 | @ui-designer + @editor-engineer | 08e |

### 5.2 도구별 콘텐츠 패널 정책
- M1-08 단계: 패널 **셀** 만 만들고 검색창 + "M2 에서 활성화" placeholder
- M2 (포즈 라이브러리) 완료 후: Pose 패널 활성화 — 검색/그리드/드래그
- M3 (관리자) 완료 후: Background/Bubble/WordFX/Deco/Frame/Template 활성화
- M5 (텍스트/효과) 후: Text 풀 옵션 + WordFX 50종
- M7 후: Upload 활성화

### 5.3 차별화 포인트 (Storige 와 다른 우리만의 것)
- **Pose 도구는 1순위** (우리 핵심 가치)
- **AI 도구는 대본 분석 + 자동 배치** (Storige 는 추천만)
- **Bubble 도구는 화자 자동 추적** 옵션 (Storige 에 없음)
- **출력은 PDF + SNS 공유** (Storige 는 PDF 만)

### 5.4 비차용 (Storige 에 있지만 우리는 안 함)
- 책등/스프레드 편집 (인쇄 특화)
- 3D 북 목업 (M9+ 또는 마케팅용)
- ImageProcessing (OpenCV — 무거움, 보류)
- Cutting/Molding (재단/모양틀)

---

## 6. 즉시 권장 — 사용자 액션

이 작업(M1-08 6 sub-task)은 약 **6시간** 분량입니다. 기존 기능은 보존하면서 UI 셸을 확장하는 작업이라 **캔버스 코어/레이어/히스토리/엔진은 변경 없음** — 순수 UI 추가/재배치.

진행 옵션:
- **A** (권장): 6 sub-task 순차 자동 진행, 각 단계마다 Vercel 배포 + 화면 확인
- **B**: M1-08a 만 먼저 (디자인 토큰 + 토스트) → 사용자 검토 → 나머지
- **C**: 한꺼번에 큰 PR (롤백 어려움, 비권장)

선택하시면 M1-08a 부터 시작합니다.

---

_분석자: Claude Code editor-engineer + ui-designer_
_근거 자료: docs/reference/FABRIC_EDITOR_GUIDE.md, /Users/yohan/claude/Bookmoa Storige editor/storige/apps/editor/_
