# 회사정보 관리 가이드 (LEGAL-OPS-01)

## 개요

admin 콘솔에서 사업자 정보를 입력·관리하면 서비스 footer, 이용약관, 개인정보처리방침에 즉시 반영됩니다.

한국 전자상거래법(제10조) 및 개인정보보호법(제30조) 에 따라 운영자 연락처와 개인정보처리방침 기재사항을 의무적으로 표시해야 합니다.

## 접근 방법

1. admin 콘솔 접속 (curator 이상 권한 필요)
2. 사이드바 하단 "회사정보" 메뉴 클릭
3. URL: `/company`

## 입력 항목

### 기본 정보 (필수)
| 필드 | 설명 |
|---|---|
| 회사명 | 상호 (예: 주식회사 스토리워크) |
| 대표자명 | 대표이사명 |

### 법적 등록 정보 (선택)
| 필드 | 형식 |
|---|---|
| 사업자등록번호 | 000-00-00000 |
| 통신판매업신고번호 | 2026-서울-00000 |

### 주소·연락처 (필수)
| 필드 | 설명 |
|---|---|
| 사업장 주소 | 전자상거래법 필수 표시 항목 |
| 전화번호 | 고객센터 또는 대표 번호 |
| 이메일 | 문의 수신 이메일 |
| 팩스번호 | 선택 |

### 개인정보보호 (선택, 권장)
| 필드 | 설명 |
|---|---|
| 개인정보보호책임자 이름 | 개인정보보호법 제30조 필수 표시 |
| 개인정보보호책임자 이메일 | 미입력 시 이메일 필드 fallback |

### 운영 정보
| 필드 | 설명 |
|---|---|
| 고객센터 운영시간 | 예: 평일 10:00~18:00 |
| 호스팅 제공자 | 개인정보처리방침 처리 위탁 명시용. 기본값: Vercel · Supabase |

## 공개 설정 (isPublished)

`isPublished = false` (기본) 이면 서비스 footer 에 placeholder 유지됩니다.
`isPublished = true` 로 전환하면 **즉시** footer · 이용약관 · 개인정보처리방침에 반영됩니다.

**활성화 조건**: 회사명, 대표자명, 주소, 전화번호, 이메일 5개 필드 모두 입력 완료.

## 캐시 전략

- 웹 서버는 DB 데이터를 1시간 캐시합니다.
- admin PATCH 요청 시 `revalidateTag('company-info')` 가 자동 호출되어 **즉시 무효화**됩니다.
- 다음 요청부터 최신 데이터가 반영됩니다.

## 싱글톤 보장

`CompanyInfo` 테이블은 id `company-info-singleton` 으로 1건만 유지합니다.
별도 쿼리 없이 `findUnique({ where: { id: 'company-info-singleton' } })` 로 조회합니다.

## 보안

- GET: 모든 admin 역할 조회 가능
- PATCH: `curator` 이상 권한 필요
- 모든 수정은 `AuditLog` 에 기록됩니다 (actor, timestamp, isPublished 변경 이력)
- 실제 사업자 정보는 환경변수나 commit 에 포함하지 않습니다 (admin UI 에서만 입력)

## 관련 파일

- `prisma/schema.prisma` — CompanyInfo 모델
- `prisma/migrations/20260605000000_company_info/migration.sql`
- `packages/shared-schema/src/zod/company-info.ts` — Zod 스키마
- `apps/admin/app/(dashboard)/company/` — admin 관리 페이지
- `apps/admin/app/api/admin/company/route.ts` — GET/PATCH API
- `apps/web/lib/company-info.ts` — 캐시된 공개 데이터 로더
- `apps/web/components/marketing/Footer.tsx` — 사업자정보 블록
- `apps/web/app/legal/terms/page.tsx` — 이용약관 동적 변수
- `apps/web/app/legal/privacy/page.tsx` — 개인정보처리방침 동적 변수
