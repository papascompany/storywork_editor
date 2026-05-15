# 세션 핸드오프 2026-05-15

> 목적: Claude/Codex 다음 세션이 디자인 시스템과 navigation 성능 문제를 같은 기준으로 이어받도록 정리합니다.

## TL;DR

2026-05-15 기준 핵심은 **기준 문서와 작업 브랜치가 엇갈려 UI/UX 수정이 반복 실패처럼 보였던 문제**입니다.

- `DESIGN-nike.md` 와 이 핸드오프가 한때 `.claude/worktrees/heuristic-dubinsky-735b19/` 안에만 있어 루트 기준 작업자가 SSOT를 못 읽었습니다.
- `main` 이 `origin/main` 보다 3커밋 뒤처져 있었고, 그 3커밋이 바로 editor 슬롯 좌표 fix, admin navigation perf fix, admin 인증 페이지 Nike 일관화였습니다.
- admin 은 `--nike-*` 와 `--mkt-*` 호환층이 섞여 있었고, editor 는 `--editor-*`/`--color-brand-*` 체계라 Nike가 직접 적용된 상태가 아니었습니다.

현재 조치:

- 루트 `DESIGN-nike.md` 를 공식 디자인 SSOT로 추가했습니다.
- `docs/handoff/RESUME_PROMPT.md` 를 최신 2026-05-15 기준으로 갱신했습니다.
- 현재 워크트리는 `origin/main` 의 필수 3커밋까지 fast-forward 되어야 합니다.
- admin TSX/CSS 의 직접 `mkt-*` 사용을 제거했습니다. marketing web 만 `mkt-*` 를 사용합니다.
- editor chrome 은 `/editor` scope 안에서 Nike-neutral `--editor-*` 토큰으로 매핑했습니다.

## 반드시 확인할 커밋

최소 기준:

```bash
git log --oneline | head -5
```

다음 커밋이 포함되어야 합니다.

- `56a0cd2 style(admin): 인증 페이지 nike 토큰 일관 적용`
- `01f8cf2 perf(admin): 메뉴 전환 4초 지연 개선 — requireRole cache + templates select`
- `2d2b03c fix(editor): 템플릿 적용 후 슬롯이 좌상단에 겹쳐 보이는 P0 버그 수정`

## 디자인 시스템 기준

| 표면 | 기준 문서 | 구현 방향 |
|---|---|---|
| marketing web | `DESIGN.md` | `--mkt-*`, 파스텔 sticky-note/Figma 톤 |
| admin dashboard | `DESIGN-nike.md` | `--nike-*`, ink/canvas/soft-cloud/hairline, pill actions |
| editor chrome | `DESIGN-nike.md` 번역 | `--editor-*` 를 Nike neutral 로 매핑. 캔버스 기능색은 유지 |

주의:

- admin 코드와 admin CSS에서 `mkt-*` 정의/사용 금지. `rg -n "mkt-|--mkt-" apps/admin` 가 0건이어야 합니다.
- admin globals 에서 `--color-brand-*` 를 override 금지. editor active tool 회귀가 납니다.
- editor 에 Nike commerce 컴포넌트를 그대로 복붙하지 말고 도구형 chrome 으로 번역해야 합니다.
- resource/category/swatch/word effect 색상은 기능 의미가 있으므로 무리하게 흑백화하지 않습니다.

## navigation 성능 상태

사용자 보고: admin 메뉴 이동이 약 4초 걸림.

확인된 원인:

- middleware 가 보호 라우트 이동마다 `supabase.auth.getUser()` 를 호출합니다.
- `(dashboard)/layout.tsx` 와 개별 page.tsx 가 각각 `requireRole()` 을 호출해 같은 request 안에서 Supabase/DB I/O가 중복될 수 있었습니다.
- 일부 page query 가 `include` 로 대형 JSON 컬럼을 읽었습니다.
- admin 에 route-level `loading.tsx` 가 없어 실제 시간보다 더 오래 멈춘 것처럼 보입니다.

이미 반영된 fix:

- `requireRole` / `getAdminUserByEmail` 를 React `cache()` 로 감싸 같은 request 안 중복 I/O를 줄임.
- middleware matcher 를 좁혀 정적 파일 진입을 원천 차단.
- templates list query 를 `include` 에서 필요한 `select` 로 축소.
- `(dashboard)/loading.tsx` skeleton 추가.
- dashboard count 병렬화, 일부 목록 page query payload 축소.

남은 권장 작업:

- list pages 의 count/groupBy 쿼리 lazy load 또는 cache 검토.
- 실제 측정은 local dev + production 둘 다에서 navigation timing/waterfall 로 확인.

## 다음 세션 권장 순서

1. `git status --short --branch` 로 현재 branch/dirty 상태 확인.
2. `rg -n "mkt-|--mkt-" apps/admin` 으로 admin 잔여 마케팅 토큰 확인.
3. `rg -n "#[0-9a-fA-F]{3,8}|rgba\\(" apps/admin apps/web/components/editor` 로 raw color 현황 확인.
4. admin 디자인 정리는 `admin-builder`, editor chrome 정리는 `editor-engineer`, navigation perf 는 `architect`, 검증은 `qa-tester` 로 분리.
5. 변경 후 최소 검증:
   - `pnpm --filter @storywork/admin typecheck`
   - `pnpm --filter @storywork/admin test`
   - `pnpm --filter @storywork/web typecheck`
   - `pnpm --filter @storywork/web test`
   - `pnpm --filter @storywork/editor-template test`

## 이번 정리 검증 결과

통과:

- `git diff --check`
- `pnpm --filter @storywork/admin lint`
- `pnpm --filter @storywork/admin typecheck`
- `pnpm --filter @storywork/admin test -- __tests__/auth.test.ts __tests__/middleware-logic.test.ts __tests__/reset-password.test.tsx __tests__/pages/formats-list.test.tsx __tests__/pages/audit-list.test.tsx` — 54 tests
- `pnpm --filter @storywork/web lint`
- `pnpm --filter @storywork/web test -- __tests__/topbar.test.tsx __tests__/toolbar.test.tsx __tests__/right-panel.test.tsx __tests__/mobile-bottomsheet.test.tsx __tests__/page-system/page-navigation.test.ts __tests__/page-system/usePageStore.test.ts __tests__/page-system/page-panel.test.tsx` — 136 tests
- `pnpm --filter @storywork/editor-template test` — 49 tests
- `rg -n "mkt-|--mkt-" apps/admin` — 0건
- `rg -n -- "--color-brand-[0-9]+\\s*:" apps/admin/app/globals.css` — 0건

주의:

- `pnpm install --frozen-lockfile --force` 는 lockfile 기준 의존성 복구를 진행했지만, `fabric` 내부 `canvas@2.11.2` prebuilt binary 가 Node 22 ABI용으로 없어 source build fallback 을 시도했고 `pkg-config` 부재로 canvas native build 는 실패 로그를 냈습니다. pnpm 자체는 exit 0 으로 끝났고 Prisma Client 는 재생성되었습니다.
- `pnpm --filter @storywork/web typecheck` 는 아직 실패합니다. 현재 실패는 editor-template/editor-text dist export 형태, `__tests__/lib/users.test.ts` mock 타입, 기존 package build artifact 쪽 이슈가 섞여 있어 이번 admin/editor token 변경의 직접 회귀로 보지 않았습니다.
- React `act(...)` 경고는 toolbar/sidebar/audit 테스트에 기존처럼 출력되지만 fatal 은 아닙니다.

## 휴먼 게이트

다음은 자동 진행하지 말고 사용자 승인/키 발급 후 진행:

- Supabase/Vercel production env 변경
- DB migration push
- Google/Kakao OAuth provider 활성화
- Stripe 가격/플랜/결제 연동
- production breaking change push

## 알려진 함정

- `.claude/worktrees/*` 안 문서를 루트 문서로 착각하지 말 것. 공식 인계 문서는 `docs/handoff/*`, 공식 디자인 문서는 루트 `DESIGN*.md`.
- Server Component 에 inline event handler를 넣지 말 것. `SidebarLogout` 회귀가 있었습니다.
- `postinstall: prisma generate` 제거 금지.
- editor template 적용 후 viewport fit 보장이 깨지면 슬롯이 좌상단에 겹쳐 보입니다. `TemplatePanel` 에서 `applyTemplate()` 후 `fitToViewport()` 호출이 있어야 합니다.
