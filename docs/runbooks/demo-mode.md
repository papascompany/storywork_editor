# 데모 모드 운영 런북 (DEMO-01)

> 시연 시 로그인 없이 편집기를 체험하게 하는 **인증 우회 모드**. 관리자가 런타임 토글.
> ⚠️ 인증을 일부 비활성화하므로 **시연 후 반드시 OFF**.

---

## 켜기 / 끄기 (관리자)

1. admin 콘솔 로그인: `https://storywork-editor-admin.vercel.app` (curator 이상)
2. 대시보드 상단 **"데모 모드" 카드** → **"데모 모드 켜기"** (확인창) → ON.
3. 종료 시 같은 카드 → **"데모 모드 끄기"** → OFF.
4. **반영 지연 ~30초** (web 가 service-role 로 30초 캐시 조회). 켜고/끄고 약 30초 뒤 적용.

> 모든 토글은 AuditLog 에 기록(actor·before/after).

## 데모 중 동작 (ON일 때)

| 경로 | 평시 | 데모 ON |
|---|---|---|
| `/editor` | 로그인 필수(307→/login) | **익명 200** (누구나 편집기) |
| `/api/search/poses` | 401 | **익명 200** (포즈 검색·추가 허용, 읽기) |
| `/api/projects/*` (저장) | 401 | **401 유지** → 편집기는 localStorage 자동저장으로 시연 |
| `/mypage`, admin 콘솔 | 로그인 필수 | **변화 없음(비공개)** |

- 시연 URL: `https://storywork-editor-web.vercel.app/editor`
- 익명 저장이 막혀 있어 **prod DB 에 데모 데이터가 쌓이지 않음**.

## 아키텍처 (왜 이렇게)

- **DB 플래그**(`FeatureFlag` key='demoMode'): env 는 재배포가 필요해 런타임 토글 불가 → DB 로 제어.
- **읽기**: `apps/web/lib/feature-flags.ts` `isDemoModeEnabled()` — service-role 클라이언트(RLS 우회) + 30초 캐시 + **fail-closed**(조회 실패 시 false=인증 유지). 미들웨어(edge)·route 양쪽에서 사용.
- **RLS**: `FeatureFlag` 는 ENABLE + 정책 없음 → anon PostgREST 직접 접근 차단(service-role/Prisma 만).
- **쓰기**: `apps/admin/app/api/admin/demo-mode/route.ts` (curator+, upsert + audit) ← `DemoModeToggle` 카드.

## 안전 점검

- [ ] 시연 종료 즉시 OFF 확인 (`/editor` 익명 접속이 307 로 돌아오는지).
- [ ] admin 콘솔은 절대 공개하지 않음(쓰기 권한). 발표자만 로그인해 토글.
- [ ] 장애 시: 플래그 조회 실패해도 fail-closed 라 자동으로 인증 유지(데모 OFF).

## CLI 비상 제어 (admin UI 불가 시)

루트 `.env.local` 의 DIRECT_URL 사용 (정본 `/Users/yohan/Developer/claude/storywork`):
```bash
# ON
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.featureFlag.upsert({where:{key:'demoMode'},create:{key:'demoMode',enabled:true},update:{enabled:true}}).then(()=>p.\$disconnect())"
# OFF
node -e "const{PrismaClient}=require('@prisma/client');const p=new PrismaClient();p.featureFlag.update({where:{key:'demoMode'},data:{enabled:false}}).then(()=>p.\$disconnect())"
```

_갱신: 2026-06-23 · 마이그레이션 `20260623000000_feature_flag` prod 적용 완료. end-to-end 검증(ON 200 / OFF 307) 완료._
