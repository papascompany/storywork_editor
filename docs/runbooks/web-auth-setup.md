# Web 인증 시스템 설정 런북

이 문서는 `apps/web` (storywork-editor-web.vercel.app) 의 Supabase 인증 시스템을 운영·설정하기 위한 체크리스트입니다.

## 1. Supabase Dashboard URL Configuration

Supabase 프로젝트 대시보드 → **Authentication** → **URL Configuration** 에서 다음을 설정하세요.

### Site URL
```
https://storywork-editor-web.vercel.app
```

### Redirect URLs (Allowed Redirect URLs 목록에 추가)
```
https://storywork-editor-web.vercel.app/auth/callback
https://storywork-editor-web.vercel.app/auth/reset-password
```

### Admin 도메인 (이미 존재하는지 확인)
```
https://storywork-editor-admin.vercel.app/auth/callback
https://storywork-editor-admin.vercel.app/reset-password
```

로컬 개발용 (localhost):
```
http://localhost:3000/auth/callback
http://localhost:3000/auth/reset-password
http://localhost:3001/auth/callback
http://localhost:3001/reset-password
```

---

## 2. Vercel 환경변수 설정

`storywork-editor-web` Vercel 프로젝트에 다음 환경변수를 추가하세요.

**현재 누락된 변수 (반드시 추가 필요):**

| 변수명 | 설명 | 어디서 확인 |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon 공개 키 | Supabase 대시보드 → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase 프로젝트 URL | Supabase 대시보드 → Project Settings → API |

**이미 설정되어 있을 수 있는 변수:**

| 변수명 | 용도 |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | 포즈 검색 등 서버 전용 RLS 우회 (기존 `lib/supabase-admin.ts` 용) |

> `NEXT_PUBLIC_SUPABASE_ANON_KEY` 는 클라이언트 번들에 노출되어도 안전합니다 (Supabase RLS 가 보호함).
> `SUPABASE_SERVICE_ROLE_KEY` 는 절대 `NEXT_PUBLIC_` 접두어로 등록하지 마세요.

---

## 3. 로컬 개발 환경 설정

`apps/web/.env.local` 파일을 생성하고 아래 값을 채우세요:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_WEB_URL=http://localhost:3000
```

---

## 4. 수동 검증 시나리오 (회원가입 → 로그인 → 마이페이지)

Vercel 배포 완료 또는 `pnpm --filter @storywork/web dev` 실행 후 다음을 순서대로 확인하세요.

### 4.1 회원가입
1. `https://storywork-editor-web.vercel.app/signup` 접속
2. 테스트 이메일 + 비밀번호(8자+) 입력 → 약관 동의 체크 → "가입하기" 클릭
3. `/signup/check-email` 로 이동되며 안내 메시지 표시 확인
4. 이메일 받은편지함 → 인증 링크 클릭
5. `/auth/callback` 을 거쳐 `/` 로 리다이렉트 확인

### 4.2 로그인
1. `https://storywork-editor-web.vercel.app/login` 접속
2. 가입한 이메일 + 비밀번호 입력 → "로그인" 클릭
3. `/` 로 리다이렉트, Header 에 사용자 아바타(이메일 첫 글자) 표시 확인

### 4.3 마이페이지 보호 가드
1. 로그아웃 상태에서 `/mypage` 직접 접속
2. `/login?next=/mypage` 로 자동 리다이렉트 확인
3. 로그인 후 `/mypage` 접속 → placeholder 카드 표시 확인

### 4.4 비밀번호 재설정
1. `/forgot-password` 에서 이메일 입력 → "재설정 이메일 보내기"
2. 이메일 받은편지함 → 재설정 링크 클릭
3. `/auth/reset-password#access_token=...` 로 이동
4. 새 비밀번호 입력 → "비밀번호 변경" → 성공 후 `/login` 으로 이동 확인

### 4.5 Header 로그아웃
1. 로그인 상태에서 Header 우측 아바타 클릭 → 드롭다운 표시 확인
2. "로그아웃" 클릭 → `/` 로 이동, Header 가 "로그인" 버튼으로 복귀 확인

---

## 5. 아키텍처 요약

```
apps/web/
├── lib/supabase/
│   ├── client.ts      # createWebBrowserClient() — 'use client' 전용
│   ├── server.ts      # createWebServerClient() — Server Component/Route Handler 전용
│   └── middleware.ts  # createMiddlewareClient() — middleware.ts 전용
├── middleware.ts       # 세션 갱신 + /mypage/* 보호 가드
└── app/
    ├── (auth)/         # 인증 라우트 그룹 (별도 layout — 마케팅 header/footer 없음)
    │   ├── layout.tsx
    │   ├── login/page.tsx
    │   ├── signup/
    │   │   ├── page.tsx
    │   │   └── check-email/page.tsx
    │   └── forgot-password/page.tsx
    ├── auth/
    │   ├── callback/route.ts        # OAuth/이메일 인증 콜백
    │   └── reset-password/page.tsx  # 비밀번호 재설정 폼
    ├── api/auth/logout/route.ts     # POST → signOut → /
    └── mypage/page.tsx              # 보호 라우트 (placeholder)
```

---

## 6. 다음 PR 에서 처리할 항목

- Google OAuth 실 활성화 (Supabase Dashboard → Authentication → Providers → Google 설정 필요)
- Kakao OAuth 실 활성화 (Kakao Developers 앱 등록 + Supabase Custom OAuth Provider 설정 필요)
- 마이페이지 본체 구현 (프로필, 작품 목록, 구독 상태)
- `prisma/schema.prisma` 의 `User` 테이블에 회원가입 시 row 자동 생성 (Supabase Edge Function 또는 DB Trigger)
- 편집기 저장 시 로그인 모달 (미인증 상태에서 저장 시도)
