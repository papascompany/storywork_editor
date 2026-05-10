# 세션 핸드오프 — 2026-05-10

> 본 문서는 **2026-05-10** 세션의 작업을 정리한 핸드오프다.
> 이전 세션: [SESSION_HANDOFF_2026-05-07.md](./SESSION_HANDOFF_2026-05-07.md) (M3 100% 완료).
> 다음 세션은 [RESUME_PROMPT.md](./RESUME_PROMPT.md) 의 시작 프롬프트로 즉시 이어갈 수 있다.

---

## 1. 한 줄 요약

> StoryWork 마케팅 표면(랜딩 + 서비스 소개 + 편집기 기능 + 더비맨 사례) **4 페이지 + 8 공용 컴포넌트 + DESIGN.md** Figma 마케팅 캔버스 스타일로 풀 리뉴얼. `--mkt-*` CSS 변수 네임스페이스로 editor/admin 토큰 무영향. Vercel web `https://storywork-editor-web.vercel.app` 배포 완료 (commit `72b57af`). 다음 권장: **포즈 자산 실 연결** → **OG 이미지** → **Storybook 스토리** → **M4 AI 파이프라인** (휴먼 게이트).

---

## 2. 마일스톤 진행 매트릭스

| 마일스톤 | 작업 수 | 완료 | 미완 | 비고 |
|---|---|---|---|---|
| M0~M3 | 37 | 34 | 3 | M2-03b/07/09 보류 (이전 세션 동일) |
| M4 AI 파이프라인 | 5 | 0 | 5 | ❌ ANTHROPIC API 키 휴먼 게이트 |
| M5~M9 | 16 | 0 | 16 | ❌ |
| **마케팅 표면** (신규) | 4 | 4 | 0 | ✅ 이번 세션 |

**합계: 53건 + 마케팅 4건 = 57건 중 38건 (66.7%)**

---

## 3. 이번 세션 산출물 (commit `72b57af`)

### 3.1 4 페이지

| URL | 역할 | 컬러블록 리듬 |
|---|---|---|
| `/` | 랜딩 — 핵심 가치 + 5 섹션 + CTA | marquee → cream(비교) → lime(AI) → navy(포즈) → coral(PDF) → 더비맨 → CTA |
| `/intro` | 서비스 소개 — 왜/누구/무엇 | lilac(왜) → mint(누구 3카드) → cream(차별점 4) |
| `/features` | 편집기 기능 — 5개 코어 기능 | cream → lime → mint → coral → navy |
| `/showcase/derbyman` | 사례 — 더비맨 4컷 콘티 + 4단계 과정 | cream(콘티) → lime/mint/coral/lilac(과정) |

### 3.2 8 공용 컴포넌트 (`apps/web/components/marketing/`)

- `Header.tsx` — 모바일 햄버거 + Sheet (shared-ui)
- `Footer.tsx` — 4 컬럼 + 카피라이트
- `Hero.tsx` — display-xl 헤드라인 + pill CTA
- `ColorBlock.tsx` — 7 파스텔 variant (lime/lilac/cream/mint/pink/coral/navy)
- `MarqueeStrip.tsx` — 검정 가로 스크롤 텍스트 띠
- `PillButton.tsx` — pill (rounded.pill 50px), primary/secondary/ghost variants
- `FeatureCard.tsx` — 카드 (sticky-note 스타일 가능)
- `StickyNote.tsx` — 4컷 콘티 placeholder

### 3.3 DESIGN.md (루트, 578줄)

- Figma 마케팅 캔버스에서 추출한 토큰 명세
- 컬러 팔레트 (모노 + 7 파스텔)
- 타이포 스케일 (display-xl 86px → display-l 64px → display-m 48px → display-s 32px → body)
- Pretendard (figmaSans 대체) + JetBrains Mono fallback
- spacing/rounded/border/shadow 토큰
- 컴포넌트 패턴 (Hero/ColorBlock/Card/Pill 가이드)

### 3.4 globals.css (apps/web)

- `--mkt-*` CSS 변수 네임스페이스 추가 (colors/typography/spacing/rounded)
- 기존 `--color-brand-*` editor/admin 토큰 무영향
- 모바일 탭 스크롤 안전 (`overscroll-behavior: none`)

### 3.5 테스트

- 50개 신규 (4 marketing 페이지 × ~12개)
- 기존 181 + 50 = **231 테스트 100% green**

---

## 4. 환경 정보 (이전 세션과 동일 + 변경분)

### 4.1 변경 없음
- 로컬 머신 / GitHub / Supabase Cloud / Vercel admin 도메인
- DB Resource: 1,270 PNG (변경 없음)

### 4.2 Vercel 배포 상태
- **web**: https://storywork-editor-web.vercel.app — `72b57af` (마케팅 4 페이지) READY ✅
- **admin**: https://storywork-editor-admin.vercel.app — `e220aa5` (M3-05) READY ✅ (이번 세션 변경 없음)

### 4.3 누적 코드 변화
| 측정 | 세션 시작 | 세션 끝 | 증가 |
|---|---|---|---|
| web 라우트 | 2 (`/`, `/editor`) | 5 (마케팅 4 페이지 + `/editor`) | +3 |
| web 컴포넌트 (marketing) | 0 | 8 | +8 |
| web 테스트 | 181 | 231 | +50 |
| 디자인 시스템 토큰 (`--mkt-*`) | 0 | ~30 | +30 |

---

## 5. 다음 작업 권장 — 4 옵션

### 5.1 권장 순서 (이번 세션 선택)
**A → B → C → E → D**:

| 옵션 | 작업 | 시간 | 가치 | 휴먼 게이트 |
|---|---|---|---|---|
| **A** | 핸드오프 갱신 (이 문서 작성) | 20분 | 다음 세션 부드러운 시작 | 없음 |
| **B** | 포즈 자산 실 연결 — Supabase Storage URL → 마케팅 페이지의 placeholder 박스 | 60~90분 | 마케팅 매력도 ↑↑ (1,270 자산 활용) | 없음 |
| **C** | OG 이미지 + 메타데이터 — SNS 공유 카드 + SEO | 60분 | 검색/공유 트래픽 | 없음 (선택: nano-banana 2 이미지 생성) |
| **E** | Storybook 마케팅 컴포넌트 스토리 (Hero, ColorBlock 7 variants, Pill, FeatureCard 등) | 30분 | 디자인 시스템 보관 | 없음 |
| **D** | M4 AI 파이프라인 진입 — `ai-script` + `ai-recommend` + `ai-layout` | 8~12h | ★★★★ 핵심 사용자 가치 | 🚦 **ANTHROPIC API 키 발급** + Vercel env 등록 |

### 5.2 D 휴먼 게이트 상세 (다음 세션이 받아야 할 결정)

M4 진입 전 사용자가 결정해야 할 항목:
- 🚦 **ANTHROPIC Claude API 키 발급** — 비용 한도 + Vercel env (`ANTHROPIC_API_KEY` 등록)
  - 모델: `claude-sonnet-4-6` (CLAUDE.md §2 권장)
  - 캐시 활성화 (장면 분석 반복 입력)
- 🚦 **VOYAGE 또는 OPENAI embedding 키** — `VOYAGE_API_KEY` 또는 `OPENAI_API_KEY`
  - 현재 mock 임베딩 사용 중 (M2-04). 실 키 도입 시 M4 추천 정확도 측정 가능
- ⚠️ **AI 비용 한도** — 월 예산 결정 (사용량 모니터링 필요)

---

## 6. 등록된 후속 이슈 (FOLLOWUP-30 ~ 33 신규)

이전 세션의 1~29 외에 이번 세션에서 발견한 4건:

| ID | 내용 | 우선도 | 처리 시점 |
|---|---|---|---|
| 30 | 마케팅 페이지의 placeholder 박스를 실 PNG 썸네일로 교체 — Supabase Storage URL 활용 | 중 | **다음 (B 옵션)** |
| 31 | OG 이미지 자동 생성 (`/api/og`) + 메타데이터 — 4 페이지별 동적 | 중 | **다음 (C 옵션)** |
| 32 | Storybook 마케팅 컴포넌트 스토리 (Header/Footer 제외 6개 이상) | 낮 | **다음 (E 옵션)** |
| 33 | Pretendard webfont 정식 등록 (next/font/local) — 현재 system fallback | 중 | OG 이미지 작업 시 함께 |

> 1~29 는 [SESSION_HANDOFF_2026-05-07.md §5](./SESSION_HANDOFF_2026-05-07.md#5-등록된-후속-이슈-followup-19--29) + [SESSION_HANDOFF_2026-05-06.md §7](./SESSION_HANDOFF_2026-05-06.md#7-등록된-후속-이슈-followup-01--18) 참조.

---

## 7. 프로덕션 검증 시나리오 (다음 세션 시작 시)

다음 세션이 마케팅 표면 살아있는지 확인 (3분):

1. https://storywork-editor-web.vercel.app — 랜딩 hero "대본만 쓰세요. 페이지는 AI가 그립니다." 노출
2. /intro, /features, /showcase/derbyman 모두 200
3. 모바일 (375px) — 햄버거 메뉴 → Sheet 슬라이드 작동
4. /editor 회귀 — 기존 fabric.js 편집기 정상 (포즈 검색/캔버스 추가)

---

_작성: Claude Code (orchestrator)_
_완료 시각: 2026-05-10_
