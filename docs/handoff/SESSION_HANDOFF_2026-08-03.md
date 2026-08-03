# 세션 핸드오프 — 2026-08-03

> 이전: [SESSION_HANDOFF_2026-07-30.md](SESSION_HANDOFF_2026-07-30.md)
> 이번 세션 = 대표님 액션 4건 처리(키포인트 재적재 + prod 이중화 정리 · PRETENDARD 실가동 · FOLLOWUP-68 사전조사 · PERF-ADMIN 준비) + **한글 PDF 폰트 임베드 잠재 결함 발견·수정**.

## 0. 한 줄 상태 (main `df66e79`+ = origin · CI green · web prod Ready · 포즈 1,262행 일원화)

## 1. 이번 세션 완료

- **키포인트 DB 재적재 (prod)** — `pnpm tsx scripts/ingest-poses.ts` 전체 실행: 1,260/1,260 성공 · 실패 0 · 사이드카 1,058 매칭 · 업로드 171.8MB · 421.5s. 말풍선 화자 앵커(BUBBLE-02 `speakerAnchorFromPoseSlot`)가 실측 mouth 좌표 사용 가능해짐.
  - **부작용 발견·정리**: 6월 적재분(구 slug `01-seogi-02`)과 신 적재분(`heubsyeon-01-1`)이 slug 완전 분리 집합 → upsert 가 전부 신규 insert → 포즈 2,530행 이중화. 사용자 승인 후 `scripts/cleanup-stale-poses.ts` 로 **스테일 1,268행 삭제, 작품 참조 2행 보존, 최종 1,262행**(신규 25점 키포인트 1,260 + 보존 2). 검증: 20점+ 키포인트 782행. Storage 구 slug 폴더는 무해한 고아로 잔존.
- **`df66e79` fix(pdf-engine)**: **한글 PDF 폰트 임베드 실가동** — PRETENDARD_TTF_PATH 액션 처리 중 **잠재 결함 발견**: fontkit 미등록으로 `embedFont(bytes)` 가 항상 throw → try/catch 침묵 → env 를 설정해도 Helvetica 폴백(즉 이 계약은 작동한 적 없음).
  - `@pdf-lib/fontkit` 추가(사용자 승인) + `registerFontkit` 배선 + 실패 시 warnings 표면화
  - **PretendardVariable.ttf v1.3.9 공식 원본 번들**(OFL 동봉, 사용자 승인). 정적 OTF 는 구형 fontkit CFF 파서가 거부("Not a CFF Font")
  - **subset:false 고정** — fontkit 서브셋터가 한글 글리프 파괴(일부 글자만 렌더, 정적 TTF 변환본도 동일 · fontkit 2.x 는 pdf-lib subset API 비호환). 전체 임베드(+~3MB/PDF)가 검증된 유일 경로. 결정론(byte-identical) 유지
  - fonts.ts cwd 후보 자동 발견 — **prod env 설정 불필요**(PRETENDARD_TTF_PATH 는 오버라이드로만 잔존, 대표님 액션 4번 자동 해소)
  - next.config `outputFileTracingIncludes`(publish·inngest) — `.nft.json` 실측 + Vercel prod 배포 **Ready** 확인
  - 검증: pdf-engine 113 테스트(신규 fonts 5) + 의존 역방향 turbo 24태스크 green + 실물 PDF 래스터 시각검증 **poppler+Quartz 이중**(표지·본문 한글 완벽) + CI run 30824578202 success
  - **잔여 확인 1건**: prod 실 publish 1회로 한글 PDF 최종 확인(인증 필요해 어시 미수행)
- **FOLLOWUP-68 사전조사** — prod 읽기 전용 실측: `Reaction_userId_fkey` **이미 존재**(과거 SQL Editor 수동 적용 추정) · 고아 Reaction 0 · RLS 활성. 따라서 `migrate deploy` 단독 실행 시 ADD CONSTRAINT 중복으로 **실패**함 → 올바른 순서는 `migrate resolve --applied 20260629020000_reaction_user_fk` 선행 후 deploy(멱등 RLS 2건만 재실행). 권한 분류기가 prod 변경 명령을 차단해 **대표님 실행 대기**(명령은 RESUME_PROMPT 참조).
- **PERF-ADMIN-03 준비** — `tmp/perf/admin-auth.json` 부재 확인. `pnpm perf:admin:save-auth --env prod` 대표님 선행 필요(비번은 어시 취급 불가), 이후 측정·P75 분석은 어시 가능.
- **디스크 98% 분석(보고 전용)** — 사용자 요청으로 대용량 스캔: Downloads 219G(볼링 89G·광고천하 52G·NFT 20G) · Library 205G(App Support 81G·Caches 31G) · Parallels VM 70G · Developer/claude 62G 중 40G 는 "00 macbook desktop 20260622 백업". 레포 자체 정리 후보: `.claude/worktrees` 1.3G(5월 스테일 워크트리 2개, 56a0cd2 = main 병합됨, dist·미사용 TOTP 파일만 잔존). 삭제는 미실행.

## 2. 검증 상태

- 재적재·정리: dry-run 사전 실측(1,268/2/1,260) → apply 후 전수 재검증(1,262 · 20점+ 782) — 전부 읽기 전용 쿼리 근거.
- 폰트: §1 참조(테스트 + 이중 래스터 + nft + CI + 배포 Ready). 16p 성능 테스트 여전히 green(≤6s).
- FOLLOWUP-68 실측 쿼리는 읽기 전용으로만 수행 — 마이그레이션 이력 변경은 미실행.

## 3. 미진행 · 다음 큐

- 🔴 대표님 액션(갱신):
  1. **FOLLOWUP-68**: `set -a; source .env.local; set +a; pnpm prisma migrate resolve --applied 20260629020000_reaction_user_fk && pnpm prisma migrate deploy && pnpm prisma migrate status`
  2. **PERF-ADMIN-03**: `pnpm perf:admin:save-auth --env prod` → 어시에게 알리면 측정·분석 진행
  3. **AI_GATEWAY_API_KEY 등록**(발급 완료 상태): `.env.local` 3곳 + `vercel env add AI_GATEWAY_API_KEY production`(web) — 등록 즉시 CONTI-01 + SCRIPT-KO-02 착수 가능
  4. **prod 실 publish 1회**로 한글 PDF 육안 확인
- 🚦 게이트 대기(불변): onnxruntime-node(BUBBLE-02 검출기) / Upstash(SEC-RATE-01) / POSE3D-01 결제 / 제품 결정 3건(보류 확인됨 2026-08-03)
- 다음 코드 큐 제안: ① CONTI-01(키 등록 시) ② SCRIPT-KO-02 ③ 키 불요 대안 — AI-ACT-02(태깅·골든셋)·AI-ACT-04(채택률 측정체계)

## 4. 환경/함정 노트 (신규 실측)

- **pdf-lib `subset:true` + 한글 폰트 = 글리프 파괴** — @pdf-lib/fontkit 서브셋터 결함(변환 정적 TTF 도 동일). 전체 임베드만 정상. fontkit 2.x 는 `encodeStream` 부재로 pdf-lib 비호환.
- **@pdf-lib/fontkit 은 Pretendard 정적 OTF(CFF) 파싱 불가** — TrueType 아웃라인만 사용.
- **ingest upsert 는 slug 안정성 전제** — 원본 파일명/폴더 체계가 바뀌면 재적재가 전량 신규 insert 로 이중화됨. 재적재 전 slug 대조 필수(이번 세션 실측·정리 스크립트 `scripts/cleanup-stale-poses.ts` 재사용 가능).
- **prod DB 변경 명령은 권한 분류기 차단 가능** — `prisma migrate resolve/deploy` 차단 실측(ingest tsx 스크립트는 통과). 차단 시 대표님 실행 명령으로 전달.
- 디스크 98% — 병렬 pnpm 금지 유지(`turbo --concurrency=1`), 이번 세션 전 검증 순차 실행으로 무사고.

_갱신: 2026-08-03 · 대표님 액션 4건 중 2건 완료(재적재+정리 · PRETENDARD 실가동), 2건 명령 준비(FOLLOWUP-68 · PERF-ADMIN), 디스크 분석 보고. AI_GATEWAY_API_KEY 등록되면 CONTI-01 착수._
