# M4-00 더미맨 Character 매핑 마이그레이션

**일자**: 2026-06-03
**스크립트**: `scripts/migrate-dummyman-character.ts`
**실행 명령**: `pnpm migrate:character:dummyman`

## 작업 내용

1. 시스템 Character "더미맨" 1건 upsert
   - `id`: `char-system-dummyman`
   - `ownerType`: `system`
   - `name`: `더미맨`
   - `bodyType`: `M`
   - `styleTag`: `흑백 단순화`
   - `status`: `published`

2. 기존 Resource(kind='pose') 전체 1,270건에 `characterId="char-system-dummyman"` 설정

## 검증 결과

```
Character 수: 1 (id="char-system-dummyman")
포즈 전체: 1270
더미맨 포즈: 1270
매핑률: 100.0%
```

멱등 재실행: 2회 실행 — 동일 결과 확인 (미매핑=0 → 스킵).

## 롤백

```sql
UPDATE "Resource" SET "characterId" = NULL WHERE "characterId" = 'char-system-dummyman';
DELETE FROM "Character" WHERE id = 'char-system-dummyman';
```
