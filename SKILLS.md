# SKILLS.md — StoryWork 스킬 카탈로그

이 문서는 StoryWork 개발에서 **자주 호출하는 작업 단위(스킬)** 와 **각 스킬을 실행할 주체(서브에이전트/도구)** 를 정의합니다. Claude Code의 `Skill` 호출 또는 슬래시 커맨드로 트리거됩니다.

> 표기 규칙
> - 스킬 이름은 `kebab-case`
> - "주체" 컬럼은 기본 실행자(서브에이전트). `+`로 연계 도구 표기
> - 출력물은 항상 `목적/입력/출력/완료조건(DoD)` 4종 세트로 검증

---

## 1. 부트스트랩 / 인프라

### `bootstrap-monorepo`
- **주체**: `architect` + Claude Code
- **목적**: pnpm + Turborepo 모노레포 초기화, 기본 패키지/앱 스캐폴드
- **입력**: `CLAUDE.md` 의 §3 모노레포 구조
- **출력**: `pnpm-workspace.yaml`, `turbo.json`, 각 `package.json` 스텁
- **DoD**: `pnpm i && pnpm build` 무오류

### `setup-supabase`
- **주체**: `architect`
- **목적**: 로컬/스테이징/프로덕션 Supabase 프로젝트 + Prisma 연결 + RLS 베이스라인
- **DoD**: `prisma migrate dev` 통과, RLS 미설정 테이블 0건

### `setup-design-system`
- **주체**: `ui-designer` + Claude(아티팩트)
- **목적**: 디자인 토큰, shadcn 베이스, 다크 모드, 모바일 브레이크포인트
- **DoD**: Storybook 에 토큰/Button/Input/Sheet 가시화

---

## 2. 포즈 데이터 처리

### `ingest-pose-asset`
- **주체**: `pose-curator`
- **목적**: 포즈 자산(**PNG 1차** / SVG 향후) → 매직바이트 검증 → sanitize/재인코딩 → 사이드카 매칭 → 파생본 생성 → 메타 추출 → DB 적재 + 임베딩
- **입력**: `data/poses/raw/<id>.png` + `<id>.kp.json` (사이드카)
- **출력**: `Resource(kind=pose, format='png')` + `variants{webp1x, webp2x, thumb}` + `PoseMeta`
- **DoD**: 적재 성공률 ≥ 99%, 사이드카 누락은 검수 큐 진입, masterDpi 미달은 `lowDpi` 태그
- **호환**: SVG 입력 시 `format='svg'` 분기, sanitize 단계만 추가 — 동일 스킬 사용

### `tag-pose-batch`
- **주체**: `pose-curator` + Claude API
- **목적**: 미태깅 포즈에 대해 `action / view / bodyType / mood` 자동 태깅 후보 생성 → 관리자 검수 큐로
- **입력**: 썸네일 + 사이드카 JSON + 파일명. 비전 임베더로 시각 임베딩 동시 생성
- **DoD**: 태깅 정확도(샘플 100개) ≥ 85%

### `pose-quality-audit`
- **주체**: `qa-tester`
- **목적**:
  - PNG: 매직바이트 / EXIF 잔여 / 알파 채널 / masterDpi / 사이드카 키포인트 좌표 범위(0..1) 점검
  - SVG(향후): 스크립트/외부 참조, viewBox 일관성
  - 공통: 좌우 대칭 일관성, 라이선스 메타 누락
- **DoD**: 위반 0건 또는 보고서로 위반 기록 + 이슈 자동 생성

---

## 3. 편집기 모듈

### `scaffold-editor-module`
- **주체**: `editor-engineer`
- **목적**: 새 `editor-*` 패키지 골격 생성(엔트리/타입/테스트/Storybook 스텁)
- **입력**: 모듈명, 책임 요약
- **DoD**: `pnpm test --filter @storywork/editor-<name>` 통과

### `implement-fabric-feature`
- **주체**: `editor-engineer`
- **목적**: fabric.js v6 위에 단일 기능(예: 스냅 그리드, 다중 선택 변형) 추가
- **DoD**: 단위 테스트 + Storybook 인터랙션 + a11y 키보드 시나리오

### `wire-undo-redo`
- **주체**: `editor-engineer`
- **목적**: 새 명령(Command)을 `editor-history` 에 등록, zundo 트래킹
- **DoD**: 100스텝 undo/redo 라운드트립 통과

### `optimize-canvas-perf`
- **주체**: `editor-engineer`
- **목적**: 캔버스 200+ 객체에서 프레임 드롭 감소(부분 redraw, off-screen, requestAnimationFrame 합치기)
- **DoD**: 모바일(중급 안드로이드) 30fps 이상

---

## 4. AI 파이프라인

### `analyze-script`
- **주체**: `scene-analyzer`
- **목적**: 자유 형식 대본 → `SceneDoc{ scenes[], dialogue[] }`
- **DoD**: 골든 셋 20개에서 장면 분할 F1 ≥ 0.8

### `recommend-pose`
- **주체**: `scene-analyzer` + `pose-curator`
- **목적**: 장면/대사/감정 → 포즈 후보 K개(임베딩 + 룰 가중)
- **DoD**: 인간 평가 만족도 70%+

### `auto-compose-page`
- **주체**: `layout-composer`
- **목적**: 장면 + 템플릿 슬롯 + 추천 리소스 → fabricJson 초안 + alternatives
- **DoD**: 충돌(겹침/safe area 침범) 0, 슬롯 미배정 0

### `generate-bg-image`
- **주체**: `ui-designer` + nano-banana 2
- **목적**: 장면 설명 → 배경 이미지 생성(저작권 안전 프롬프트), Resource 후보로 등록
- **DoD**: 생성 메타에 모델/시드/프롬프트 보존, 검수 큐로

---

## 5. 관리자 / 리소스

### `build-admin-crud`
- **주체**: `admin-builder`
- **목적**: 단일 엔티티 CRUD 페이지(테이블/필터/일괄작업/검수액션) 자동 생성
- **DoD**: 권한 가드 + i18n + 빈 상태/에러 상태 디자인 포함

### `bulk-import-resources`
- **주체**: `admin-builder` + `pose-curator`
- **목적**: ZIP 업로드 → 검증 → 썸네일 → 검수 큐
- **DoD**: 1,000개 일괄 업로드 < 60초

### `review-resource-queue`
- **주체**: 휴먼 + `pose-curator`(보조)
- **목적**: draft → published 승인 흐름 (반려 사유 메모)

---

## 6. PDF / 출판

### `compile-pdf`
- **주체**: `pdf-publisher`
- **목적**: Project → POD PDF (재단/여백/북마크/표지)
- **DoD**: 인쇄소 프리플라이트 통과(샘플 3사)

### `preflight-check`
- **주체**: `pdf-publisher` + `qa-tester`
- **목적**: bleed/safe area 침범, 이미지 DPI 미달, 텍스트 outline 누락 검증
- **DoD**: 위반 항목 별 위치 좌표 포함 리포트

---

## 7. 소셜 / 결제

### `wire-stripe-plan`
- **주체**: `architect`
- **목적**: 새 구독 플랜 추가/수정 (Stripe + DB + 게이트)
- **DoD**: Webhook 재처리 멱등성 테스트 통과

### `social-share-card`
- **주체**: `ui-designer` + nano-banana 2
- **목적**: 작품 공유용 OG 이미지 자동 생성
- **DoD**: Lighthouse SEO 100, 카카오/트위터/페북 카드 검증

### `contest-season`
- **주체**: `admin-builder`
- **목적**: 공모전 시즌 생성/마감/결과 발표 자동화

---

## 8. 품질 / 운영

### `simplify`
- **주체**: 모든 에이전트(셀프 리뷰)
- **목적**: 변경 코드의 중복/복잡도/불필요 추상화 제거
- **DoD**: 변경 라인 -10% 이상 또는 "수정 없음" 명시

### `security-review`
- **주체**: `qa-tester`
- **목적**: 외부 입력/업로드/SQL/SSRF/SSRF/SVG XSS 점검
- **트리거**: 사용자 입력 다루는 PR 자동

### `ultrareview`
- **주체**: 휴먼 트리거
- **목적**: 멀티 에이전트 클라우드 리뷰. 큰 머지 전 사용

### `release-notes`
- **주체**: Claude Code
- **목적**: 마일스톤 종료 시 변경 요약 + 사용자 향 릴리즈 노트 작성

---

## 9. 슬래시 커맨드 매핑

| 커맨드 | 호출 스킬 | 위치 |
|---|---|---|
| `/sw-next` | roadmap.md 의 다음 작업을 픽 → orchestrator 위임 | `.claude/commands/sw-next.md` |
| `/sw-pose-ingest` | `ingest-pose-asset` (PNG 우선, SVG 자동 분기) | `.claude/commands/sw-pose-ingest.md` |
| `/sw-compose <projectId>` | `analyze-script` → `auto-compose-page` 풀 파이프 | `.claude/commands/sw-compose.md` |
| `/sw-pdf <projectId>` | `compile-pdf` + `preflight-check` | `.claude/commands/sw-pdf.md` |
| `/sw-review` | 변경 PR에 대해 `simplify` + `security-review` | `.claude/commands/sw-review.md` |
| `/visual-check <route> [selector]` | dev 서버 screenshot 캡처 (FOLLOWUP-51, 2026-05-16) | `.claude/commands/visual-check.md` |
| `/ci-watch` | push 직후 GitHub Actions CI 자동 polling (FOLLOWUP-52) | `.claude/commands/ci-watch.md` |
| `/ui-spec <issue>` | 사용자 UI 직관 표현 → 명세표 변환 (FOLLOWUP-53) | `.claude/commands/ui-spec.md` |

---

## 10. 외부 스킬 사용 정책
- `claude-api` 스킬: 모든 AI 호출은 **prompt caching 활성화** 필수
- `figma:figma-implement-design`: UI 시안 → 코드 변환 시 사용
- `pdf` 스킬: 프로토타이핑 단계의 임시 PDF 생성에만 사용. 본 시스템의 출판 경로는 `pdf-engine` 사용
- `loop` 스킬: **사용 금지**(오토파일럿은 명시적 트리거만)

---

_Last updated: 2026-06-05 · M4 AI Pipeline + M6 POD PDF 완료 후_
