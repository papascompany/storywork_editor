# 세션 핸드오프 — 2026-05-07

> 본 문서는 **2026-05-07** 세션의 작업을 정리한 핸드오프다.
> 이전 세션: [SESSION_HANDOFF_2026-05-06.md](./SESSION_HANDOFF_2026-05-06.md).
> 다음 세션은 [RESUME_PROMPT.md](./RESUME_PROMPT.md) 의 시작 프롬프트로 즉시 이어갈 수 있다.

---

## 1. 한 줄 요약

> StoryWork — **M3 (관리자 콘솔) 6/6 sub-task 100% 완료**. admin-builder 서브에이전트로 7개 commit (M3-01 부트스트랩 + 2FA / M3-02 공용 컴포넌트 / M3-03 Format CRUD / M3-04 Resource CRUD + 검수큐 + 키포인트 보정 / M3-05 Template+TemplateSet 빌더 / M3-06 Audit Log) 일괄 push, **328 admin 테스트 100% green**, Vercel admin production 배포 모두 READY. 다음 우선순위는 **M4 (AI 파이프라인)**.

---

## 2. 마일스톤 진행 매트릭스

| 마일스톤 | 작업 수 | 완료 | 미완 | 비고 |
|---|---|---|---|---|
| M0 부트스트랩 | 6 | 6 | 0 | ✅ |
| M1 편집기 코어 | 15 | 15 | 0 | ✅ |
| M2 포즈 라이브러리 | 10 | 7 | 3 | ✅ 핵심 (M2-03b/07/09 보류, **M2-08 키포인트 검수는 M3-04에 통합 완료**) |
| **M3 관리자 콘솔** | **6** | **6** | **0** | **✅ 100% (이번 세션)** |
| M4 AI 파이프라인 | 5 | 0 | 5 | ❌ **다음 우선순위** |
| M5 텍스트/말풍선/효과 | 4 | 0 | 4 | ❌ |
| M6 POD PDF | 4 | 0 | 4 | ❌ |
| M7 크리에이터/결제 | 4 | 0 | 4 | 🚦 휴먼 게이트 |
| M8 소셜 | 4 | 0 | 4 | ❌ |
| M9 안정화 | 4 | 0 | 4 | ❌ |

**합계: 53건 작업 중 34건 완료 (64.2%) — 이전 28건에서 6건 추가**

---

## 3. 이번 세션 (2026-05-07) 산출물

### 3.1 커밋 흐름 (시간 순)

```
b18cc45  feat(prisma): add Role.support + User TOTP columns (M3-01)
fc89d44  feat(admin): m3-01 bootstrap auth + TOTP 2FA gate
1b08d71  feat(admin): m3-02 공용 컴포넌트 (DataTable / EntityForm / ReviewQueue / BulkActionBar)
c8d2ab8  feat(admin): m3-03 Format CRUD + 4종 프리셋 + audit log
b4d1034  feat(admin): m3-04 Resource CRUD + 검수큐 + 일괄액션 + 키포인트 보정
e58730c  fix(admin): remove any casts from resources facets (next build lint strict)
f615e18  feat(admin): m3-06 Audit Log panel
e220aa5  feat(admin): m3-05 Template + TemplateSet Builder
```

총 **8 commits**. 모두 main push 완료. 모든 commit 이 Vercel admin production READY 상태.

### 3.2 누적 코드/테스트 변화

| 측정 | 세션 시작 | 세션 끝 | 증가 |
|---|---|---|---|
| admin 라우트 (Next App Router) | 1 (placeholder) | 18 (login/2FA/dashboard/formats/resources/audit/templates/template-sets) | +17 |
| admin API routes | 0 | 24 | +24 |
| admin 컴포넌트 | 0 | 8 (DataTable/EntityForm/ReviewQueue/BulkActionBar/KeypointEditor/AuditDiffViewer/SlotCanvas/...) | +8 |
| admin 테스트 | 31 | 328 (all green) | +297 |
| Storybook 스토리 (admin) | 0 | 33 | +33 |
| 의존성 추가 (admin) | — | @supabase/ssr, otplib, qrcode, @tanstack/react-table, react-hook-form, @hookform/resolvers, @prisma/client, lucide-react, @testing-library/* | — |

### 3.3 핵심 산출물 디렉토리

```
apps/admin/
├── app/
│   ├── login/                       ← 이메일+비밀번호 (Supabase browser client)
│   ├── setup-2fa/                   ← QR 발급 + 첫 코드 검증
│   ├── verify-2fa/                  ← 매 세션 6자리 + 12h 쿠키
│   ├── 403/                         ← 권한 없음
│   ├── api/auth/{logout, totp-setup, totp-setup-init, totp-verify}/
│   └── (dashboard)/                 ← 인증+TOTP 통과 후
│       ├── layout.tsx               ← 사이드바 + 햄버거 모바일
│       ├── page.tsx                 ← 홈 (5메뉴 카드)
│       ├── formats/{page, new, [id]}/                          ← M3-03
│       ├── resources/{page, [id], review, upload}/             ← M3-04
│       ├── templates/{page, new, [id]}/                        ← M3-05
│       ├── template-sets/{page, new, [id]}/                    ← M3-05
│       └── audit/page.tsx                                      ← M3-06
├── app/api/{formats,resources,templates,template-sets,audit}/
├── src/
│   ├── components/
│   │   ├── data-table/              ← DataTable (M3-02)
│   │   ├── entity-form/             ← EntityForm (M3-02)
│   │   ├── review-queue/            ← ReviewQueue (M3-02)
│   │   ├── bulk-action-bar/         ← BulkActionBar (M3-02)
│   │   ├── keypoint-editor/         ← KeypointEditor (M3-04)
│   │   ├── audit-diff-viewer/       ← AuditDiffViewer (M3-06)
│   │   └── slot-canvas/             ← SlotCanvas (M3-05) ⭐
│   ├── lib/
│   │   ├── auth.ts                  ← session/role 헬퍼
│   │   ├── audit.ts                 ← recordAudit() 헬퍼
│   │   ├── prisma.ts                ← 싱글톤
│   │   ├── api-response.ts          ← apiOk / apiError
│   │   ├── supabase/{client,server,middleware}.ts
│   │   ├── totp/totp.ts             ← otplib 래퍼
│   │   └── schemas/{format,resource,template}.ts  ← Zod 스키마
│   └── ...
└── middleware.ts                    ← role/TOTP 가드
```

### 3.4 DB 변경 (Supabase Cloud 적용 완료)

마이그레이션: `prisma/migrations/20260507000000_add_admin_role_totp/migration.sql`

```sql
ALTER TYPE "Role" ADD VALUE IF NOT EXISTS 'support';
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpSecret" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "totpVerified" BOOLEAN NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS "User_role_idx" ON "User" ("role");
```

> P3005 (baseline 미설정) 회피를 위해 `prisma db execute` 로 직접 적용. `_prisma_migrations` 테이블에 기록 안 됨 (FOLLOWUP-29).

### 3.5 사용자 등록 + Supabase 권한 부여 (수동 작업 완료)

- 이메일: `yohan73@gmail.com` (Supabase Auth 가입 + email_confirmed_at 자동)
- Auth user ID: `00767b47-0bcb-4319-9718-da544f2ffeb5`
- `app_metadata`: `{"role":"superadmin","provider":"email","providers":["email"],"totp_setup":false}`
- Prisma User 미러: id=`cmow9xb8e0000vxjckhe3eifn`, role=`superadmin`, totpVerified=false (TOTP 등록 후 true 로 플립)

---

## 4. 환경 정보 (이전 세션과 동일 + 변경분)

### 4.1 변경 없음
- 로컬 머신 / GitHub / Supabase Cloud (`wjpyeqckuxyfeytuzgon`) / Vercel 두 도메인 / .env.local 모두 동일

### 4.2 Vercel 배포 상태
- **admin**: https://storywork-editor-admin.vercel.app — M3-05 (e220aa5) READY ✅
- **web**: https://storywork-editor-web.vercel.app — `184eec4` (M2-05 PosePanel) READY (이번 세션 변경 없음)

### 4.3 데이터/자산 현황 (이전 세션과 동일)
- DB Resource: 1,270 PNG (검수 큐 0건 — 모두 published)
- Storage: 171.8 MB (Free 1GB 중 17%)
- AuditLog: 신규 — Format/Resource CRUD 테스트마다 행이 쌓임 (실제 production 사용분만)

---

## 5. 등록된 후속 이슈 (FOLLOWUP-19 ~ 29 신규)

이전 세션의 1~18 외에 이번 세션에서 발견한 11건:

| ID | 내용 | 우선도 | 처리 시점 |
|---|---|---|---|
| 19 | EntityForm 의 Zod v4 `_def` 내부 API 의존 (위젯 자동 추론) — v5 업그레이드 시 `inferWidget` 재검토 | 낮 | Zod v5 전 |
| 20 | (미사용 — 결번) | — | — |
| 21 | dashboard layout 이 `'use client'` (usePathname 때문) — 사이드바 활성 상태만 분리하면 Server 화 가능 | 낮 | 성능 튜닝 시 |
| 22 | `/formats` 목록이 Server 직접 prisma 조회 — 실시간 검색/정렬 시 클라이언트 사이드 fetch 전환 필요 | 낮 | UX 강화 시 |
| 23 | admin-builder 가 `pnpm --filter @storywork/admin lint` 통과로 보고했지만 `next build` lint 가 더 엄격 → `as any` 검출. 두 ESLint config 통일 필요 | 중 | M4 진입 전 |
| 24 | AuditLog `(target)`/`(action,at)` 복합 인덱스 부재 — 수만 건 누적 시 성능 저하 | 중 | DB 마이그레이션 시점 |
| 25 | Audit facets 쿼리가 매 요청마다 `groupBy + findMany(target prefix)` 추가 실행 — materialized view 또는 캐시 권장 | 낮 | 로그 누적 시 |
| 26 | Audit CSV 내보내기 미구현 (스펙의 옵션 항목) | 낮 | 요청 발생 시 |
| 27 | SlotCanvas 썸네일 캡처 미구현 (placeholder 사용) — `html2canvas` 또는 SVG 직렬화 후 sharp | 중 | M5 텍스트 통합 시 |
| 28 | SlotCanvas undo (Cmd+Z) 미구현 — 1단계 brutal undo or 생략 | 낮 | UX 강화 시 |
| 29 | Prisma `_prisma_migrations` baseline 부재 (P3005) — `init.sql` 직접 적용한 영향. 정식 baseline 처리 필요 | 중 | 다음 schema 변경 전 |

> 1~18 은 [SESSION_HANDOFF_2026-05-06.md §7](./SESSION_HANDOFF_2026-05-06.md#7-등록된-후속-이슈-followup-01--18) 참조.

---

## 6. 다음 작업 권장 — M4 (AI 파이프라인)

**근거**: M3 가 끝났으므로 자산 운영 도구는 갖춰짐. 이제 **이 자산들을 사용자 가치로 연결**하는 핵심 — AI 대본 분석 + 자동 페이지 배치.

**M4 sub-tasks 5건 (~8-10시간, 또는 분할)**:
- M4-01: `ai-script` 분석기 — 대본 → 장면/대사/지문/감정 분리, 골든셋 20 F1 ≥ 0.8 — `@scene-analyzer`
- M4-02: `ai-recommend` 포즈/배경/말풍선 추천 — 만족도 ≥ 70% — `@scene-analyzer`
- M4-03: `ai-layout` compose() + 결정론 시드 — 충돌 0, safe 침범 0 — `@layout-composer`
- M4-04: 사용자 흐름 — 대본 → 자동 페이지 N개 → 편집기 — E2E 통과 — `@layout-composer + @editor-engineer`
- M4-05: alternatives UI (한 클릭 교체) — 모바일 동작 — `@ui-designer`

**M4 진입 전 권장 정리** (1~2시간):
- FOLLOWUP-23 (admin lint vs next build lint 통일) — 향후 admin-builder 작업이 매번 같은 함정 빠지지 않도록
- ANTHROPIC API 키 발급 + Vercel env 등록 (휴먼 게이트 — M4 의 핵심 의존성)
- VOYAGE 또는 OPENAI embedding 키 발급 + Vercel env 등록 (M2-04 mock → 실 임베딩으로 전환, M4 추천 정확도 측정)

**M3 안에서 M5 와 통합하면 좋은 것**:
- FOLLOWUP-27 (SlotCanvas 썸네일 캡처) → M5-04 `editor-template` 작업 시 함께 처리

---

## 7. 프로덕션 검증 시나리오 (다음 세션 시작 시 빠르게 확인)

다음 세션이 admin 파이프라인이 살아있는지 확인하려면 (3분):

1. https://storywork-editor-admin.vercel.app 진입 → /login 자동 이동
2. `yohan73@gmail.com` + 비밀번호 → `/verify-2fa` 자동 이동 (2FA 등록 후) → 6자리 입력
3. 사이드바: 대시보드 / 판형 / 리소스 / 템플릿 / 템플릿셋 / 감사 로그 5메뉴 노출
4. `/resources` → 1,270 자산 + 필터 작동
5. 임의 자산 → 키포인트 SVG 오버레이 노출 + 드래그 가능
6. `/audit` → 이번 세션의 mutation 로그 (Format/Resource/Template CRUD) 펼침 가능

문제 시 [Vercel Inspector](https://vercel.com/yohans-projects-de3234df/storywork-editor-admin) 에서 runtime logs 확인.

---

## 8. 휴먼 게이트 (다음 세션이 결정 받아야 할 항목)

- 🚦 **ANTHROPIC API 키 발급** (M4 진입 필수) — 비용 한도 + Vercel env 등록
- 🚦 **VOYAGE/OPENAI embedding 키 발급** (M2-04 정확도 측정 + M4 의존성)
- 🚦 **결제/플랜** (M7) — Stripe 가격 확정
- 🚦 **인쇄소 사양** (M6) — 제휴 인쇄소 선정 또는 기본 B5/A5 진행
- ⚠️ **Prisma baseline 정식 처리** (FOLLOWUP-29) — 다음 schema 변경 전 결정

---

_작성: Claude Code (orchestrator)_
_완료 시각: 2026-05-07_
