# M4-00 Character 시스템

## 개요

Character 모델은 여러 포즈(Resource)를 하나의 캐릭터 단위로 묶는다. `ai-recommend` 가 포즈를 추천할 때 캐릭터 일관성을 유지하기 위해 필요하다.

## 데이터 모델

```prisma
model Character {
  id          String         @id @default(cuid())
  ownerType   OwnerType      // system | creator
  ownerId     String?        // system=null, creator=User.id
  name        String
  description String?
  bodyType    String         // M / F / child / beast
  styleTag    String?        // "흑백 스케치", "수채화" 등
  thumbnail   String?
  status      ResourceStatus @default(draft)
  poses       Resource[]     @relation("CharacterPoses")
}
```

```prisma
model Resource {
  // ... 기존 필드 ...
  characterId String?        // kind='pose' 일 때 소속 캐릭터 FK
  character   Character?     @relation("CharacterPoses")
}
```

## RLS 정책

| 대상 | 정책 |
|---|---|
| anon/authenticated | status=published 캐릭터 SELECT |
| creator 본인 | 본인 ownerType=creator 캐릭터 SELECT/UPDATE/DELETE |
| system 캐릭터 | 관리자(service role)만 INSERT/UPDATE/DELETE |

## 마이그레이션

- `prisma/migrations/20260603100000_character_system/migration.sql` — Character 테이블 + Resource.characterId FK
- `prisma/migrations/20260603100001_character_rls/migration.sql` — RLS 정책

## 더미맨 매핑

`pnpm migrate:character:dummyman` 으로 시스템 캐릭터 "더미맨" 1건 upsert + 기존 포즈 1,270건 일괄 매핑.

- Character ID: `char-system-dummyman`
- 매핑 결과: 1,270/1,270 (100%)
- idempotent: 재실행 시 동일 결과

상세: `docs/migrations/2026-06-03_character_dummyman.md`

## Admin 관리 페이지

| 경로 | 설명 |
|---|---|
| `/characters` | 목록 (이름/bodyType/ownerType/포즈수/status) |
| `/characters/new` | 신규 생성 폼 |
| `/characters/[id]` | 상세/수정 + 포즈 그리드 (최근 60건) |
| `GET /api/admin/characters` | 목록 조회 |
| `POST /api/admin/characters` | 생성 (curator+) |
| `GET/PATCH /api/admin/characters/[id]` | 상세/수정 (curator+) |
| `DELETE /api/admin/characters/[id]` | 삭제 (superadmin, system 캐릭터 보호) |

## 향후 계획

- CHAR-02: 크리에이터 캐릭터 업로드 (M7)
- CHAR-03: ai-recommend 가 characterId 기준 포즈 후보 필터링
- CHAR-04: 캐릭터 변경 시 page fabricJson 재배치 제안
