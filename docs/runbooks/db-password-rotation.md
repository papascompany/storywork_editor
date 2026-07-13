# 런북 — prod DB 비밀번호 회전

> prod Postgres 마스터 비밀번호(`DATABASE_URL`/`DIRECT_URL` 내)가 노출/의심될 때 회전 절차.
> **2026-06-29**: perf 측정 준비 중 `apps/admin/.env.local` 값이 세션 로그에 평문 노출 → 회전 결정.

## 회전 대상 = **5곳** (전부 갱신해야 앱이 계속 뜬다)

| 위치 | 키 |
|---|---|
| 로컬 `apps/web/.env.local` | `DATABASE_URL` · `DIRECT_URL` |
| 로컬 `apps/admin/.env.local` | `DATABASE_URL` · `DIRECT_URL` |
| 로컬 `.env.local` (루트) | `DATABASE_URL` · `DIRECT_URL` |
| Vercel `storywork-editor-web` | `DATABASE_URL` · `DIRECT_URL` (Production + Development) |
| Vercel `storywork-editor-admin` | `DATABASE_URL` · `DIRECT_URL` (Production + Development) |

- 프로젝트 ref: `wjpyeqckuxyfeytuzgon` / 계정 `thestorige@gmail.com` / DB 사용자 `postgres.wjpyeqckuxyfeytuzgon`
- ⚠️ Supabase 는 **단일 비번**이라 무중단 회전 불가 → 리셋~재배포 사이 짧은 연결 실패 window. **Vercel 갱신+재배포를 미리 준비한 뒤 리셋**해 window 최소화.

## 절차

### 1. 새 비번 발급 (대표님, 대시보드)
Supabase 대시보드 → 프로젝트 `wjpyeqckuxyfeytuzgon` → **Settings → Database → Reset database password** → 새 비번 생성·복사.
같은 화면 **Connection string** 에서 새 연결문자열 확인:
- **DATABASE_URL** = Transaction pooler (`...pooler...:6543/postgres?pgbouncer=true&connect_timeout=10`)
- **DIRECT_URL** = Direct (`...:5432/postgres`)

### 2. Vercel 갱신 (web·admin 각각, Production+Development)
새 값을 `$NEW_DB`/`$NEW_DIRECT` 셸 변수에 넣고(히스토리 회피는 `export` 대신 붙여넣기), 각 프로젝트 디렉토리에서:
```bash
# web
cd apps/web    # 링크: storywork-editor-web
for E in production development; do
  vercel env rm DATABASE_URL "$E" -y 2>/dev/null; printf '%s' "$NEW_DB"     | vercel env add DATABASE_URL "$E"
  vercel env rm DIRECT_URL   "$E" -y 2>/dev/null; printf '%s' "$NEW_DIRECT" | vercel env add DIRECT_URL   "$E"
done
# admin — cd ../.. 후 루트(.vercel=storywork-editor-admin)에서 동일 반복
```

### 3. 재배포 (env 반영)
web·admin 각각 새 배포 트리거: 빈 커밋 push(`git commit --allow-empty -m "chore: redeploy (db pw rotation)" && git push`) 또는 `vercel --prod`. Vercel 은 배포 시점 env 를 사용하므로 **재배포해야 새 비번 적용**.

### 4. 로컬 `.env.local` 3개 갱신
각 파일의 `DATABASE_URL`/`DIRECT_URL` 비번 부분을 새 값으로 교체(에디터). 커밋 금지(gitignored 확인).

### 5. 검증
- prod: web·admin 로그인/데이터 로드 정상, Vercel → Logs 에 DB 연결 에러 없음.
- 로컬: `pnpm --filter @storywork/web prisma db execute --stdin <<< 'select 1;'` 연결 OK.

## 완료 후
- 이 문서·과거 로그의 구 비번은 무효화됨(추가 조치 불요).
- 노출 값이 개인 재사용 패턴이면 이메일·타 서비스도 별도 점검 권장.
