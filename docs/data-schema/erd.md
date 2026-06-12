# Data Schema — ERD & Prisma 초안

## 1. ERD (텍스트)
```
User ─┬─< Project ─< Page
      │             └─ fabricJson (PageJsonV1)
      ├─< SceneDoc ─< Scene ─< Line
      ├─< Resource (kind=*, ownerType=creator)
      ├─< PublishJob
      ├─< Showcase ─< Reaction
      └─ Subscription (Stripe)

Admin ──< AuditLog
Format ─< Template ─< Slot
TemplateSet ─< Template
Resource ──┬─ PoseMeta? (kind=pose 일 때)
           ├─ BgMeta?
           └─ BubbleMeta?
Resource.embedding (pgvector)
ContestSeason ─< ContestEntry ─ Showcase
```

## 2. Prisma Schema 초안 (`prisma/schema.prisma`)
```prisma
generator client { provider = "prisma-client-js" }
datasource db   { provider = "postgresql"; url = env("DATABASE_URL") }

enum Role           { user creator curator superadmin readonly }
enum ResourceKind   { pose background mise_en_scene prop speech_bubble word_fx decoration }
enum ResourceFormat { png svg webp }   // 1차: png. 향후 svg 병행
enum OwnerType      { system creator }
enum ResourceStatus { draft review published rejected }
enum ProjectStatus  { drafting composing editing publishing archived }
enum JobStatus      { queued running succeeded failed }
enum ShowcaseMode   { contest gallery }

model User {
  id            String   @id @default(cuid())
  email         String   @unique
  role          Role     @default(user)
  stripeId      String?  @unique
  createdAt     DateTime @default(now())
  projects      Project[]
  resources     Resource[] @relation("CreatorResources")
  showcases     Showcase[]
  subscriptions Subscription[]
}

model Subscription {
  id            String   @id @default(cuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])
  plan          String
  status        String
  currentPeriodEnd DateTime
  uploadQuotaMb Int      @default(100)
  createdAt     DateTime @default(now())
  @@index([userId])
}

model Format {
  id        String   @id @default(cuid())
  name      String   @unique
  widthMm   Float
  heightMm  Float
  dpi       Int      @default(300)
  bleedMm   Float    @default(3)
  safeMm    Float    @default(5)
  gridDef   Json?
  // 표지(Cover) 기본 정책 — COVER-ADMIN-01 (마이그레이션 format_templateset_cover_settings)
  coverEnabled  Boolean @default(false) // 표지 사용 유무 기본값
  coverWidthMm  Float?                  // 표지 독립 폭 (null=widthMm 상속)
  coverHeightMm Float?                  // 표지 독립 높이 (null=heightMm 상속)
  isActive      Boolean @default(true)  // false 면 편집기 FormatPicker 에서 숨김
  templates Template[]
}

model Template {
  id          String   @id @default(cuid())
  formatId    String
  format      Format   @relation(fields: [formatId], references: [id])
  name        String
  thumbnail   String?
  fabricJson  Json
  slots       Json     // Slot[]
  setId       String?
  set         TemplateSet? @relation(fields: [setId], references: [id])
  createdAt   DateTime @default(now())
}

model TemplateSet {
  id        String   @id @default(cuid())
  name      String
  coverIdx  Int      @default(0)
  templates Template[]
  // 표지 오버라이드 (null=Format 상속, tri-state) + 활성화 — COVER-ADMIN-01
  coverEnabled  Boolean?
  coverWidthMm  Float?
  coverHeightMm Float?
  isActive      Boolean @default(true)
}

model Resource {
  id               String   @id @default(cuid())
  slug             String   @unique                // URL-safe (한글/공백/괄호 정규화)
  originalFilename String                          // 원본 파일명 보존(검색·디버그)
  kind             ResourceKind
  format           ResourceFormat @default(png)    // 1차: png. 향후 svg 병행
  ownerType        OwnerType
  ownerId          String?
  owner            User?    @relation("CreatorResources", fields: [ownerId], references: [id])
  fileUrl          String                          // 마스터 (PNG/SVG)
  thumbUrl         String?
  variants         Json?                           // PNG 파생본 { webp1x, webp2x, avif?, thumb }
  width            Int?                            // 마스터 픽셀
  height           Int?
  masterDpi        Int?                            // PNG 한정. SVG=null
  lowDpi           Boolean  @default(false)        // ai-layout 슬롯 제약 트리거 (ADR-0011a)
  tintMaskUrl      String?                         // PNG 색상 변경용 알파 마스크(선택)
  meta             Json                            // kind 별 다형 (PoseMeta 등)
  tags             String[]
  tagsBootstrap    String[]                        // 파일명 키워드 사전으로 자동 추출 (감사용)
  license          Json                            // { id, holder, terms, source, commercialUse, ... }
  licenseSource    String                          // 'folder-default' | 'sidecar' | 'override'
  status           ResourceStatus @default(draft)
  embedding        Unsupported("vector(1024)")?   // 결합 임베딩 (또는 아래 두 컬럼 사용)
  embeddingText    Unsupported("vector(1024)")?
  embeddingVis     Unsupported("vector(1024)")?
  createdAt        DateTime @default(now())
  reviewer         String?
  reviewNote       String?

  @@index([kind, status])
  @@index([kind, format, status])
  @@index([kind, lowDpi, status])
  @@index([ownerType, ownerId])
}

model Project {
  id         String   @id @default(cuid())
  ownerId    String
  owner      User     @relation(fields: [ownerId], references: [id])
  formatId   String
  format     Format   @relation(fields: [formatId], references: [id])
  title      String
  status     ProjectStatus @default(drafting)
  // settings.cover: { widthMm, heightMm } | null — 표지 독립 치수 (FOLLOWUP-COVER-02).
  // 표지 컨벤션: settings.cover 가 설정된 프로젝트는 pages[index=0] = 표지 페이지.
  settings   Json     @default("{}")
  pages      Page[]
  sceneDoc   SceneDoc?
  publishes  PublishJob[]
  showcases  Showcase[]
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
  @@index([ownerId])
}

model Page {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  index      Int
  templateId String?
  fabricJson Json     // PageJsonV1
  thumbnail  String?
  @@unique([projectId, index])
}

model SceneDoc {
  id        String  @id @default(cuid())
  projectId String  @unique
  project   Project @relation(fields: [projectId], references: [id], onDelete: Cascade)
  scriptRaw String
  scenes    Scene[]
  meta      Json
  createdAt DateTime @default(now())
}

model Scene {
  id          String   @id @default(cuid())
  sceneDocId  String
  sceneDoc    SceneDoc @relation(fields: [sceneDocId], references: [id], onDelete: Cascade)
  index       Int
  slug        String
  summary     String
  emotion     String?
  view        String?
  pageId      String?
  lines       Line[]
  @@unique([sceneDocId, index])
}

model Line {
  id        String   @id @default(cuid())
  sceneId   String
  scene     Scene    @relation(fields: [sceneId], references: [id], onDelete: Cascade)
  index     Int
  speaker   String?
  text      String
  bubbleId  String?
  @@unique([sceneId, index])
}

model PublishJob {
  id         String   @id @default(cuid())
  projectId  String
  project    Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  kind       String   // pdf
  status     JobStatus @default(queued)
  pdfUrl     String?
  spec       Json
  preflight  Json?
  createdAt  DateTime @default(now())
  updatedAt  DateTime @updatedAt
}

model Showcase {
  id          String   @id @default(cuid())
  projectId   String
  project     Project  @relation(fields: [projectId], references: [id], onDelete: Cascade)
  ownerId     String
  owner       User     @relation(fields: [ownerId], references: [id])
  mode        ShowcaseMode
  contestId   String?
  contest     ContestSeason? @relation(fields: [contestId], references: [id])
  likes       Int      @default(0)
  createdAt   DateTime @default(now())
  reactions   Reaction[]
}

model Reaction {
  id         String   @id @default(cuid())
  showcaseId String
  showcase   Showcase @relation(fields: [showcaseId], references: [id], onDelete: Cascade)
  userId     String
  kind       String   // like/heart/wow
  @@unique([showcaseId, userId, kind])
}

model ContestSeason {
  id          String   @id @default(cuid())
  name        String
  opensAt     DateTime
  closesAt    DateTime
  resultsAt   DateTime?
  rules       String
  entries     Showcase[]
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String
  target    String   // entity:id
  payload   Json
  at        DateTime @default(now())
  @@index([actorId])
  @@index([target])
}
```

## 3. RLS 정책 베이스라인
- `Project`, `Page`, `SceneDoc`, `Scene`, `Line`, `PublishJob`: `owner_id = auth.uid()` 만 read/write
- `Resource`:
  - `system + published` → 모두 read
  - `creator + published` → 작가가 share=true 로 토글한 경우 모두 read
  - `creator + draft/review` → 작가만
- `Subscription`: 본인만 read, 쓰기는 webhook(service role)
- `AuditLog`: superadmin 만 read, write 는 트리거/서버 액션

## 4. fabricJson Schema v1 (요약)
```ts
export type PageJsonV1 = {
  v: 1
  format: { id: string; widthMm: number; heightMm: number; dpi: number }
  layers: LayerJson[]
}

type LayerJson = {
  id: string
  kind: 'pose'|'bg'|'bubble'|'prop'|'text'|'fx'|'group'|'decoration'
  data: { resourceId?: string; slotId?: string; locked?: boolean; meta?: Record<string, unknown> }
  fabric: object  // fabric.js v6 직렬화 결과
  children?: LayerJson[]
}
```

## 4-bis. PoseMeta (Resource.meta JSON when kind='pose')

포맷 무관 동일 스키마 — PNG/SVG 모두 같은 인터페이스를 사용한다.
```ts
type PoseMeta = {
  bodyType: 'M'|'F'|'child'|'beast'|string
  view:     'front'|'side'|'back'|'three-quarter'
  action:   string                 // '걷기','놀람','싸움' …
  mood?:    string
  bbox:     { x:number, y:number, w:number, h:number }   // 0..1 정규화
  anchorPoint: { x:number, y:number }                    // 0..1 (배치 기준점)
  flippable: boolean
  keypoints: KP[]                  // 25 표준, 0..1 정규화
  styleVariants?: string[]
}
type KP = { name: KPName; x:number; y:number; weight?:number; inferred?:boolean }
```

### 사이드카 — 인입 시 PNG와 함께 입력
```
data/poses/raw/<id>.png        # 마스터 (투명 RGBA, 1024px+ 권장)
data/poses/raw/<id>.kp.json    # 사이드카 (아래 PoseSidecar)
```
```ts
type PoseSidecar = {
  v: 1
  format: 'png'|'svg'
  size: { w:number, h:number }      // 마스터 픽셀(또는 SVG viewBox)
  keypoints: KP[]                   // 0..1 정규화
  bbox: { x:number, y:number, w:number, h:number }
  flippable: boolean
  license: { id:string, holder:string, terms:string }   // 누락 시 적재 거부
}
```

## 5. 마이그레이션 정책
- 모든 schema 변경은 `prisma/migrations/<ts>_*` 자동 + `packages/shared-schema/migrations/` 의 fabricJson 마이그레이터 짝이 있어야 머지
- expand-contract: 컬럼 추가 → 백필 → 코드 전환 → 컬럼 제거(별 PR)
