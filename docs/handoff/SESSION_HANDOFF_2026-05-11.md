# 세션 핸드오프 — 2026-05-11

> 본 문서는 **2026-05-10 ~ 11** 세션의 작업을 정리한 핸드오프다.
> 이전 세션: [SESSION_HANDOFF_2026-05-10.md](./SESSION_HANDOFF_2026-05-10.md) (마케팅 표면 4 페이지 + DESIGN.md).
> 다음 세션은 [RESUME_PROMPT.md](./RESUME_PROMPT.md) 의 시작 프롬프트로 즉시 이어갈 수 있다.

---

## 1. 한 줄 요약

> StoryWork — **마케팅 표면 강화 + 편집기 Phase 1+2 흡수 (Bookmoa Storige) + M5-01 마무리 (Pretendard + 한글 금칙어 57+16) + M5-02 말풍선 꼬리 자동 화자 추적 (★ StoryWork 핵심 차별화 — `editor-bubble` 신규 패키지)**. 10 commits (8 feat + 2 build fix), 모두 Vercel READY. 다음 권장: **M5-04 `editor-template` (M3-05 SlotCanvas 와 슬롯 매핑, M4 사전 인프라)** → M4 ANTHROPIC 키 게이트.

---

## 2. 마일스톤 진행 매트릭스

| 마일스톤 | 작업 수 | 완료 | 미완 | 비고 |
|---|---|---|---|---|
| M0~M3 | 37 | 34 | 3 | 동일 |
| **M4 AI 파이프라인** | 5 | 0 | 5 | ❌ ANTHROPIC 키 휴먼 게이트 |
| **M5 텍스트/말풍선/효과** | 4 | **2** | 2 | ✅ M5-01 (Pretendard + 금칙어) + M5-02 (editor-bubble 신규 + 자동 화자 추적, 33 tests) |
| M6~M9 | 12 | 0 | 12 | ❌ |
| **마케팅 표면** | 7 | 4 | 3 | ✅ MKT-01~04 (페이지 + DESIGN.md + 포즈자산 + OG/Storybook) |

**합계: 53 + 7 마케팅 = 60건 중 40건 (66.7%)**

---

## 3. 이번 세션 산출물 (6 commits)

### 3.1 커밋 흐름

```
3596d1e  docs(handoff): wrap-up 2026-05-10 — 마케팅 표면 4 페이지 + DESIGN.md (직전 세션 마무리)
─────────── 오늘 시작 ───────────
f3b2a8d  feat(web): connect real pose assets to marketing pages
a74db15  feat(web): og images, metadata, sitemap for marketing pages
b637dfc  docs(storybook): marketing components stories (9 files, 49 stories)
eb8ff86  feat(editor): phase1 multi-select/clipboard/align/rotate-snap/autosave
0243653  feat(editor-text): phase2 text object + inline edit + ControlBar + 한글
28d76ba  docs(handoff): wrap-up 2026-05-11 (중간 정리)
d17f923  feat(editor-text): m5-01 polish — Pretendard 정식 등록 + 금칙어 50+ + fallback
3cff7ca  feat(editor-bubble): m5-02 말풍선 꼬리 자동 화자 추적
🔧 dcb1da1  fix(editor-bubble): add rootDir/paths/tsBuildInfoFile to tsconfig.build.json
🔧 fb93c59  fix(web): commit Pretendard webfont (M5-01 누락 파일)
```

총 **8 feat/docs commits + 2 build fix = 10 commits**. 모두 main push + Vercel READY 완료.

### 빌드 함정 2건 (FOLLOWUP-39/40 등록)

| ID | 증상 | 원인 | 수정 |
|---|---|---|---|
| 39 | `editor-bubble:build TS6059 rootDir` | 신규 패키지 tsconfig.build.json 에 rootDir/paths/tsBuildInfoFile 누락 (commit a07dad3 패턴 미적용) | `dcb1da1` editor-text 와 동일한 13줄 설정 적용 |
| 40 | `next/font/local` src not found | `apps/web/public/fonts/PretendardVariable.woff2` (2MB) 가 git 에 untracked — 로컬은 통과, Vercel 만 실패 | `fb93c59` woff2 add + commit. 향후 git LFS 권장 |

### 3.2 누적 코드/테스트 변화

| 측정 | 세션 시작 | 세션 끝 | 증가 |
|---|---|---|---|
| web 테스트 | 181 | 255 | +74 (마케팅 50 + OG 24) |
| editor-text 테스트 | 0 | 21 | +21 (신규 패키지 활성화) |
| editor-history/core 테스트 | 144 | 144 | 회귀 0 |
| Storybook 스토리 (마케팅) | 0 | 49 | +49 |
| editor-* 활성 패키지 | 4 (core/layers/history/export) | 6 (+text +bubble) | +2 |
| 신규 web 컴포넌트 | — | AlignControlBar, TextSection, TextPanel, BubblePanel, BubbleSection | — |
| 신규 web lib | — | clipboard.ts, autosave (localStorage), font-stack.ts, fonts.ts (Pretendard) | — |
| 신규 명령 (⌘K) | 30 | 38 | +8 (copy/paste/duplicate/align variants) |
| editor-bubble 테스트 | 0 | 33 | +33 (신규 패키지) |
| 한글 금칙어 | 0 | 73 (END 57 + START 16) | +73 |

### 3.3 마케팅 강화 산출물 (commit 3종)

#### `f3b2a8d` 포즈 자산 실 연결
- `apps/web/lib/marketing-assets.ts` (125 LOC) — Storage URL 빌더 + 큐레이트 슬러그
- `next.config.ts` Supabase Storage `remotePatterns` 추가
- `StickyNote` `imageUrl` prop 지원 → 더비맨 4컷 + 랜딩 navy 12개 + features AI/검색 데모 9개 = **22 자산** (16 unique slugs)

#### `a74db15` OG 이미지 + 메타데이터
- `/api/og/[slug]/route.tsx` Edge runtime — 1200×630, 4 템플릿 (landing/intro/features/derbyman)
- 페이지별 metadata API (title/description/og/twitter/canonical)
- `icon.tsx` (32px) + `apple-icon.tsx` (180px) — 검정 + lime "S"
- `robots.ts` + `sitemap.ts` (4 URL, priority)
- 24 신규 테스트

#### `b637dfc` Storybook 49 스토리
- 9 파일: Hero(5) / ColorBlock(8) / PillButton(6) / Marquee(4) / FeatureCard(4) / StickyNote(5) / Header(3) / Footer(3) / Tokens(1)
- Storybook 인프라: `next/{link,image,navigation}` mock + Vite alias + MDX 패턴 + globals.css preview

### 3.4 편집기 Phase 1+2 산출물 (commit 2종)

#### `eb8ff86` Phase 1 — Bookmoa Storige 흡수 (객체 편집 기본기)

**Bookmoa Storige `/Users/yohan/claude/Bookmoa Storige editor/` 의 EDITOR.md / EDITOR_OBJECT_EDITING_SPEC.md / FABRIC_EDITOR_GUIDE.md 패턴 흡수**:

- **명령 핸들러 (B영역 — 미작동 의심)** 검증/구현:
  - `edit-select-all` (Cmd+A), `layer-group/ungroup` (Cmd+G/Cmd+Shift+G), z-order 4종
  - 모든 핸들러 `if (!_canvas?.getContext()) return` 가드 적용
- **다중 선택**: 마퀴 드래그 + Shift+클릭 (fabric 디폴트 활성 + ActiveSelection 검증)
- **클립보드** (`apps/web/components/editor/lib/clipboard.ts`):
  - `copySelection / paste / duplicate` — module-level 버퍼, clone-on-paste, offset 누적
  - 단축키: `Cmd+C / Cmd+V / Cmd+D` (EditorShell global keydown)
- **AlignControlBar** (`apps/web/components/editor/AlignControlBar.tsx`) — 좌/중/우 + 상/중/하 정렬 6 + 균등 분배 가로/세로 2 (3개 이상 시), `TransformObjectCommand` 로 undo
- **레이어 순서 단축키**: `]` / `[` / `⌘]` / `⌘[`
- **회전 15° 스냅** (`StoryCanvas._onObjectRotating` bound 메서드, Shift = 자유)
- **자동 저장 + localStorage 백업**:
  - debounce 30초 서버 저장 stub (M7 결제 정착 전 fetch stub)
  - localStorage 5초 백업 → 새로고침 시 "복구하시겠어요?" 토스트

#### `0243653` Phase 2 — editor-text 활성화 (M5-01 사전 진입)

**`packages/editor-text/`** (현재 빈 스캐폴드 → 21 테스트 + 풀 동작):
- `text-object.ts` — `createTextObject` (fabric Textbox, splitByGrapheme=true)
- `text-commands.ts` — `AddTextCommand` + `EditTextCommand` (undo 가능)
- `text-input-mode.ts` — `attachTextInputMode` (더블클릭 enter, Esc exit)
- `LINE_END_FORBIDDEN` + `hasForbiddenLineEnd` — 한글 금칙어 (행 끝 못 오는 12자)

**`apps/web`**:
- `useToolStore.ACTIVE_TOOLS` 에 'text' 추가
- `TextPanel` (FeatureSidebar) — "텍스트 추가" + 빠른 스타일 4종 (제목/본문/대사/주석)
- `ControlBar.TextSection` — 폰트 / 크기 / B / I / U / 좌중우 정렬 / 색상 / 줄간격 / 자간 슬라이더 (모두 EditTextCommand 로 wrap)

---

## 4. 환경 정보

### 4.1 변경 없음
- 로컬 머신 / GitHub / Supabase Cloud / Vercel admin 도메인
- DB Resource: 1,270 PNG (변경 없음)

### 4.2 Vercel 배포 상태
- **web**: https://storywork-editor-web.vercel.app — `0243653` (Phase 2) READY ✅
- **admin**: https://storywork-editor-admin.vercel.app — `e220aa5` (M3-05) READY ✅

### 4.3 누적 테스트
- web: **255 green** + editor-text 21 = 다음 세션 web build 시 ~276
- admin: 328 green
- editor-history: 66 / editor-core: 78 (회귀 0)
- 합산 ≈ **750+ tests green**

---

## 5. 다음 작업 권장 — M5-02 말풍선 (StoryWork 핵심 차별화)

### 5.1 현재 진행 중 (이번 세션의 다음 단계)

**A → C 오토파일럿** (사용자 승인):
- A — 핸드오프 갱신 (이 문서)
- C — **M5-01 마무리 + M5-02 말풍선 꼬리 자동 화자 추적**
  - M5-01: Pretendard webfont 정식 등록 (next/font/local), 한글 금칙어 강화, 폰트 fallback
  - M5-02: ★ **말풍선 꼬리 자동 화자 추적** — `PoseMeta.keypoints` 의 `mouth` 좌표로 꼬리 끝 자동 향함

### 5.2 다음 옵션 (이후)

| 옵션 | 작업 | 시간 | 가치 | 휴먼 게이트 |
|---|---|---|---|---|
| Phase 3 | 이미지 필터 (밝기/대비/채도) + 클리핑 마스크 + 텍스트 특수효과 (금박/엠보싱) | 8~12h | Storige 차별화 | 없음 |
| M5-03 | `editor-effects` 워드효과 50종 + 필터 — 모바일 30fps | 6~8h | 디자인 풍부 | 없음 |
| M5-04 | `editor-template` 템플릿 적용/저장 — M3-05 SlotCanvas 와 슬롯 매핑 | 4~6h | 템플릿 활용 | 없음 |
| M4 | AI 파이프라인 (`ai-script` + `ai-recommend` + `ai-layout`) | 8~12h | ★★★★ 핵심 가치 | 🚦 ANTHROPIC + VOYAGE/OPENAI |
| M6 | POD PDF — `pdf-engine` + 인쇄 사양 | 8~10h | 출판 가치 | 없음 |

---

## 6. 등록된 후속 이슈 (FOLLOWUP-34 ~ 38 신규)

| ID | 내용 | 우선도 | 처리 시점 |
|---|---|---|---|
| 34 | DB pose `status` 가 모두 `draft` — 마케팅 헬퍼는 Storage public URL 직접 사용으로 우회. 정상화 필요 (M3-04 검수큐로 published 승격) | 중 | 운영 시 |
| 35 | OG 카드의 Noto Sans KR weight 분기 (현재 400/700 동일 URL — 가변 폰트 라우팅 이슈) | 낮 | OG 가독성 개선 시 |
| 36 | derbyman OG 카드에 포즈 이미지 embed (Edge fetch + Supabase URL CORS 검증 필요) | 낮 | 마케팅 강화 시 |
| 37 | editor-text 빠른 스타일 4종 → 더 많은 프리셋 + 사용자 정의 | 낮 | M5-01 마무리 |
| 38 | autosave 의 서버 PATCH 연결 (현재 fetch stub + localStorage 만 작동) | 중 | M7 결제/사용자 모델 정착 후 |

> 1~33 은 이전 세션 핸드오프 참조.

---

## 7. 프로덕션 검증 시나리오 (다음 세션 시작 시)

### Phase 1+2 편집기 검증 (5분)
- https://storywork-editor-web.vercel.app/editor
- 포즈 5개 추가 → Shift+클릭 3개 → 정렬 좌/상 → Cmd+G (그룹) → 회전 15° 스냅
- Cmd+C → Cmd+V → Cmd+D → ]/[/⌘]/⌘[
- F5 새로고침 → "복구" 토스트 노출 (localStorage)
- Text 도구 활성화 → 더블클릭 인라인 → 한글 입력 → TextControlBar 폰트/색상

### 마케팅 표면 검증 (3분)
- https://storywork-editor-web.vercel.app — navy 섹션 12 실 자산
- /showcase/derbyman — 4컷 콘티 더비맨 캐릭터
- https://www.opengraph.xyz/ → 4 URL OG 카드 미리보기
- /sitemap.xml + /robots.txt

---

## 8. 휴먼 게이트 (다음 세션이 결정 받아야)

- 🚦 **ANTHROPIC API 키 발급** (M4 진입 필수) — `claude-sonnet-4-6`, 캐시 활성, Vercel env
- 🚦 **VOYAGE / OPENAI embedding 키** (M2-04 정확도 측정 + M4 의존성)
- 🚦 **결제/플랜** (M7) — Stripe 가격 확정
- 🚦 **인쇄소 사양** (M6) — 제휴 인쇄소 선정 또는 기본 진행
- ⚠️ **Prisma baseline 정식 처리** (FOLLOWUP-29) — 다음 schema 변경 전

---

_작성: Claude Code (orchestrator)_
_완료 시각: 2026-05-11_
