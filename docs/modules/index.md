# Modules — 패키지별 상세 명세

본 문서는 `packages/*` 의 **공개 API와 책임 경계**를 정의한다. 모듈을 새로 만들거나 변경할 때는 이 문서를 먼저 갱신한다.

명명 규칙: `@storywork/<kebab-name>`. 모든 패키지는 다음을 포함:
- `src/index.ts` — 공개 export 만 모음
- `src/types.ts` — 공개 타입
- `__tests__/`
- `README.md` — 5분 사용법

---

## 1. `@storywork/editor-core`
**책임**: fabric.js v6 인스턴스 수명 관리, 좌표계 변환(mm↔px), 이벤트 버스, Schema 라운드트립.

**공개 API**
```ts
class StoryCanvas {
  constructor(opts: { format: Format, container?: HTMLElement | OffscreenCanvas })
  loadJson(json: PageJsonV1): Promise<void>
  toJson(): PageJsonV1
  on<K extends EditorEvent>(k: K, cb: EventMap[K]): Unsubscribe
  dispose(): void
}
type EditorEvent =
  | 'object:added' | 'object:changed' | 'object:removed'
  | 'selection:changed' | 'history:applied' | 'render:after'
```

**계약**
- 헤드리스(jsdom + node-canvas) 동작 보장
- 좌표 단위: 내부 mm. 픽셀 변환은 `format.dpi` 어댑터로
- React/DOM 의존 금지

**비책임**: 도구 패널 UI, 단축키 정의, 영속화

---

## 2. `@storywork/editor-layers`
**책임**: 레이어 트리, z-order, 그룹/잠금/숨김.

**공개 API**
```ts
class LayerTree {
  add(node: LayerNode, parent?: LayerNode): void
  move(id: string, toIndex: number): void
  group(ids: string[]): LayerNode
  ungroup(id: string): void
  lock(id: string, locked: boolean): void
  toJson(): LayerNodeJson
}
```

**계약**: `editor-core` 의 `data.id` 와 노드 id 1:1 매칭. fabric Z-order 동기화는 어댑터에서.

---

## 3. `@storywork/editor-history`
**책임**: Command 기반 undo/redo. 협업 OT 슬롯 제공.

**공개 API**
```ts
interface Command { name: string; do(): void; undo(): void; coalesceWith?(other: Command): Command | null }
class History {
  push(cmd: Command): void
  undo(): void
  redo(): void
  attachOTAdapter(adapter: OTAdapter): void
}
```

**계약**
- 모든 사용자 변경은 Command 로 표현
- 드래그 중 매 프레임 push 금지(coalesce)
- OT 어댑터 미장착 시 단독 동작

---

## 4. `@storywork/editor-template`
**책임**: 슬롯 정의/스냅 그리드/템플릿 인스턴싱.

**공개 API**
```ts
type Slot = { id: string; kind: 'pose'|'bg'|'bubble'|'prop'|'text'|'fx'; bbox: BBox; constraints?: Constraints }
function applyTemplate(canvas: StoryCanvas, template: Template, assignments: Record<string, ResourceRef>): void
function snapTo(canvas: StoryCanvas, opts: { grid?: number, guides?: Guide[] }): Disposer
```

---

## 5. `@storywork/editor-pose`
**책임**: 포즈 객체. **PNG가 1차**(투명 배경 RGBA + 사이드카 키포인트), SVG 어댑터는 향후. 키포인트 핸들 노출(머리/입/손/발 앵커), 좌우 반전, 색상 변경(틴트 마스크 기반).

**구성**
- `PoseObject` — 포맷 무관 공개 인터페이스 (fabric Group 래퍼)
- `adapters/png.ts` — PNG 마스터 + 사이드카 키포인트 로더 (1차 구현)
- `adapters/svg.ts` — SVG 로더 (M10+ 입점)

**공개 API**
```ts
class PoseObject extends FabricGroup {
  static async fromResource(r: Resource & { format: 'png' | 'svg' }): Promise<PoseObject>
  get format(): 'png' | 'svg'
  get keypoint(name: KPName): { x: number; y: number }   // 캔버스 좌표(mm)로 환산된 값
  flipX(): void                                           // flippable=true 일 때만
  applyTint(slot: TintSlot, color: string): void          // PNG: BlendColor + tintMask, SVG: fill 변경
  setMasterDpi(dpi: number): void                         // 인쇄 환산용
  toJson(): PoseJson
}

type PoseJson = {
  v: 1
  resourceId: string
  format: 'png' | 'svg'
  transform: { x: number; y: number; sx: number; sy: number; angle: number; flipX: boolean }
  tints?: Record<TintSlot, string>     // PNG: 마스크 보유 시만
}
```

**계약**
- 키포인트 좌표는 0..1 정규화 사이드카에서 로드 → 캔버스 mm 좌표로 환산 후 노출
- PNG 자산은 `tintMaskUrl` 미보유 시 `applyTint()` 호출은 no-op + 경고
- 좌우 반전은 `flippable=true` 일 때만, 키포인트도 동일 변환 적용
- 다중 해상도: variants(`webp1x/2x`)가 있으면 zoom 레벨에 따라 사용, 없으면 master 사용

**비책임**: 자산 인입(=`pose-curator` 파이프라인), 추천(=`ai-recommend`)

---

## 6. `@storywork/editor-text`
**책임**: 텍스트박스, 말풍선(꼬리 포함), 한글 줄바꿈/금칙어, 글꼴 임베드 메타.

**공개 API**
```ts
class SpeechBubble extends FabricGroup {
  setSpeakerAnchor(p: { x: number; y: number }): void
  setText(t: string, opts?: TextOpts): void
}
```

**계약**: 한글 금칙어/줄바꿈은 `wrapKo()` 유틸 사용. 폰트는 라이선스 검증 통과 자산만.

---

## 7. `@storywork/editor-effects`
**책임**: 워드 효과(번개/충격/하트 등 50종), fabric 필터 래퍼.

**공개 API**
```ts
function applyWordFx(target: FabricObject, kind: WordFxKind, opts?: WordFxOpts): Disposer
function applyFilter(target: FabricObject, filter: FilterDef): Disposer
```

**성능**: 모바일에서 단일 효과 ≤ 5ms 합성.

---

## 8. `@storywork/editor-export`
**책임**: PNG/JSON/PDF 트리거. PDF 는 워커 잡으로 위임.

**공개 API**
```ts
function exportPng(canvas: StoryCanvas, opts: { scale: number; bg?: string }): Promise<Blob>
function exportJson(canvas: StoryCanvas): PageJsonV1
function requestPdf(projectId: string, opts?: PdfOpts): Promise<{ jobId: string }>
```

---

## 9. `@storywork/editor-ui`
**책임**: 도구 패널, 인스펙터, 레이어 패널, 단축키 매핑. **유일하게 React 의존 허용**.

**구성**
- `<Toolbar />`, `<LayerPanel />`, `<Inspector />`, `<TemplatePicker />`, `<MobileBottomSheet />`
- 헤드리스 옵션: 모든 컴포넌트는 unstyled 변형 export

---

## 10. `@storywork/ai-script`
**책임**: 대본 → SceneDoc 변환, 평가 하네스.

**공개 API**
```ts
function analyzeScript(input: { text: string; lang?: 'ko'|'en'; seed?: string }): Promise<SceneDoc>
```

**프롬프트**: `prompts/*.md` (단일 출처). prompt caching 의무.

---

## 11. `@storywork/ai-recommend`
**책임**: 포즈/배경/말풍선 추천(임베딩 + 룰).

**공개 API**
```ts
function recommendPose(scene: Scene, k?: number): Promise<RankedResource[]>
function recommendBg(scene: Scene, k?: number): Promise<RankedResource[]>
function recommendBubble(line: Line): Promise<RankedResource[]>
```

---

## 12. `@storywork/ai-layout`
**책임**: 추천 + 템플릿 → fabricJson 초안. 결정론.

**공개 API**
```ts
function compose(args: ComposeArgs): Promise<ComposeResult>
type ComposeResult = { fabricJson: PageJsonV1; warnings: Warning[]; alternatives: Alt[] }
```

**해상도 제약 (ADR-0011a)**
- 슬롯 매칭 시 자산의 `lowDpi` 태그를 검사
- `lowDpi=true` 자산은 슬롯의 한 변이 페이지 한 변의 `1/2` 이하인 경우만 후보
- 위반 시 alternatives 로 대체 + warning 누적
- `effectiveDpi = assetMinSide / slotMaxSideMm * 25.4` < 200 → warn, < 150 → 거부

---

## 13. `@storywork/pdf-engine`
**책임**: 프로젝트 → POD PDF, 프리플라이트.

**공개 API**
```ts
function buildPdf(project: ProjectExport): Promise<Buffer>
function preflight(buffer: Buffer, format: Format, profile: PrintProfile): Promise<PreflightReport>
```

---

## 14. `@storywork/shared-schema`
**책임**: Prisma 모델 → Zod → 클라이언트 타입. fabricJson Schema v1 + 마이그레이터.

**구조**
```
src/
  prisma.ts            # Prisma 재export
  zod/
    resource.ts
    project.ts
    scene.ts
  editor/
    v1.ts              # PageJsonV1
    migrations/
      v0_to_v1.ts
```

---

## 15. `@storywork/shared-ui`
**책임**: 디자인 시스템(shadcn 래핑), 토큰, 다크모드.

**원칙**
- 토큰 외 색/간격 직접 사용 금지(ESLint 룰)
- 모든 컴포넌트 Storybook + a11y 스냅샷

---

## 16. `@storywork/shared-utils`
**책임**: 공통 유틸(slugify, dateFmt, retry, logger 어댑터). 비즈니스 로직 금지.

---

## 의존성 매트릭스

| from \ to | core | layers | history | template | pose | text | fx | export | ui | ai-script | ai-rec | ai-layout | pdf | schema | shared-ui | utils |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| editor-core | — | | | | | | | | | | | | | ✓ | | ✓ |
| editor-layers | ✓ | — | | | | | | | | | | | | ✓ | | ✓ |
| editor-history | ✓ | | — | | | | | | | | | | | ✓ | | ✓ |
| editor-template | ✓ | ✓ | ✓ | — | | | | | | | | | | ✓ | | ✓ |
| editor-pose | ✓ | | | | — | | | | | | | | | ✓ | | ✓ |
| editor-text | ✓ | | | | | — | | | | | | | | ✓ | | ✓ |
| editor-effects | ✓ | | | | | | — | | | | | | | ✓ | | ✓ |
| editor-export | ✓ | ✓ | | | | | | — | | | | | | ✓ | | ✓ |
| editor-ui | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | — | | | | | ✓ | ✓ | ✓ |
| ai-* | | | | | | | | | | — | — | — | | ✓ | | ✓ |
| pdf-engine | ✓(헤드리스) | ✓ | | ✓ | ✓ | ✓ | ✓ | | | | | | — | ✓ | | ✓ |

ESLint `import/no-restricted-paths` 룰로 위 매트릭스를 강제한다. 룰 정의 파일: `eslint.config.js`.
