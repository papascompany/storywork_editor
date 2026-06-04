# 인쇄소 사양 프리셋 (PrinterProfile)

M6-04 구현. 관리자가 인쇄소별 POD 사양 프리셋을 DB에서 CRUD 관리하고,
preflight() 가 DB 프로필을 우선 사용한다.

## 데이터 모델

`PrinterProfile` (prisma/schema.prisma):

| 필드 | 타입 | 설명 |
|------|------|------|
| id | cuid | PK |
| slug | String unique | URL/import 키 (bookprint-korea 등) |
| name | String | 표시 이름 |
| description | String? | 상세 설명 |
| formats | String[] | 지원 판형 ID 목록 (빈 배열 = 모두 허용) |
| bleedMinMm | Float | 재단 여백 최소 |
| bleedMaxMm | Float | 재단 여백 최대 |
| safeMinMm | Float | 안전 영역 최소 |
| imageDpiMinPose | Float | 포즈/인물 최소 DPI |
| imageDpiMinBg | Float | 배경 최소 DPI |
| fontEmbedRequired | Boolean | 폰트 임베드 필수 여부 |
| colorSpaces | String[] | 허용 색공간 순서 (['rgb', 'cmyk']) |
| maxPages | Int? | 최대 페이지 수 (null = 제한 없음) |
| customWarnings | String[] | 커스텀 경고 메시지 목록 |
| isSystem | Boolean | 시스템 프리셋 (삭제 불가) |
| isActive | Boolean | 활성 여부 (false = 사용자에게 숨김) |
| createdById | String? | 등록한 관리자 User.id |

## 시스템 프리셋 (isSystem=true)

seed 스크립트로 upsert. 삭제 불가, isActive 토글만 가능.

| slug | name | 특징 |
|------|------|------|
| bookprint-korea | BookPrint Korea | B5/A5 도서 표준, CMYK 우선 |
| instaprint | InstaPrint | 정사각 1:1, maxPages=1 |
| comicmaker | ComicMaker | 만화/콘티, maxPages=200, lowDpi 허용 |

## Admin CRUD

- 목록: `admin/printers` — DataTable, isSystem 배지 표시
- 등록: `admin/printers/new` — 8개 섹션 폼 (기본정보/판형/bleed-safe/dpi/폰트-색공간/페이지제한/경고/활성)
- 편집: `admin/printers/[id]` — isSystem=true 이면 isActive 토글만
- API: `GET/POST /api/admin/printers`, `GET/PATCH/DELETE /api/admin/printers/[id]`
- 권한: 조회=curator+, mutate=curator+, 삭제=superadmin, isSystem 삭제=403

## pdf-engine 통합

`packages/pdf-engine/src/preflight/profiles.ts`:
- `ProfileLoader` 인터페이스 (`getById`, `listActive`)
- `setProfileLoader(loader)` — DB 어댑터 등록
- `getProfileLoader()` — 현재 등록 어댑터 조회

`packages/pdf-engine/src/preflight/check.ts`:
- `preflight()` 호출 시 DB loader 우선 → 실패/미등록 시 in-memory PROFILES fallback

`apps/web/lib/preflight/db-loader.ts`:
- Prisma 기반 ProfileLoader 구현
- `initDbProfileLoader()` — apps/web 부팅 시 등록

## 사용자 흐름

1. 편집기 → "프리플라이트 검사" 클릭
2. PreflightModal 오픈 → `/api/printers` 에서 활성 인쇄소 목록 로드
3. 사용자가 인쇄소 선택 (미선택 시 전체 검증)
4. "검증 시작" → `POST /api/projects/[id]/preflight` (profileId 포함)
5. 결과 프로필 탭으로 표시
