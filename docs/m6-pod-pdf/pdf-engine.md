# @storywork/pdf-engine — API 명세 + 결정론 + 성능

## buildPdf() 시그너처

```typescript
import { buildPdf } from '@storywork/pdf-engine'
import type { PdfBuildInput, PdfBuildOptions, PdfBuildResult } from '@storywork/pdf-engine'

async function buildPdf(
  input: PdfBuildInput,
  opts?: PdfBuildOptions,
): Promise<PdfBuildResult>
```

### PdfBuildInput

| 필드 | 타입 | 설명 |
|---|---|---|
| `formatId` | `string` | Format 모델 ID |
| `format` | `PdfFormat` | widthMm/heightMm/dpi/bleedMm/safeMm |
| `title` | `string` | PDF 제목 (메타데이터) |
| `author` | `string?` | 작가명 (메타데이터) |
| `pages` | `PageInput[]` | 본문 페이지 목록 (pageIndex 순) |
| `cover` | `CoverInput?` | 표지 옵션 |
| `seed` | `number?` | 결정론 시드 (기본 0) |

### PdfBuildOptions

| 옵션 | 기본 | 설명 |
|---|---|---|
| `embedFonts` | `true` | Pretendard ttf 임베드 |
| `withCover` | `!!input.cover` | 표지 페이지 포함 |
| `showGuides` | `false` | bleed/safe 가이드 라인 시각화 |
| `metadataDate` | (seed 기반) | CreationDate ISO 문자열 오버라이드 |

### PdfBuildResult

```typescript
{
  pdfBuffer: Uint8Array      // 최종 PDF 바이트
  pageCount: number          // 페이지 수 (표지 포함)
  byteSize: number           // 바이트 크기
  warnings: string[]         // 비치명 경고 (bleed 침범, URL 실패 등)
  metadata: {
    title: string
    author?: string
    producer: string         // 항상 'StoryWork PDF Engine v0.1'
    creationDate: string     // ISO 8601
  }
}
```

## 결정론 보장 (ADR-0007)

같은 입력 + 같은 `seed` → 같은 PDF 바이트 (sha256 해시 일치).

구현 방법:
- `CreationDate` / `ModificationDate` = `seed` 기반 고정값 (기본 `seed=0` → `2024-01-01T00:00:00Z`)
- `useObjectStreams: false` → pdf-lib object stream ID 비결정론 방지
- 이미지 URL별 캐시 → 동일 URL 동일 임베드 객체 재사용

검증:
```typescript
const r1 = await buildPdf(input, { metadataDate: '2024-01-01T00:00:00.000Z' })
const r2 = await buildPdf(input, { metadataDate: '2024-01-01T00:00:00.000Z' })
assert(sha256(r1.pdfBuffer) === sha256(r2.pdfBuffer))
```

## 성능 (NFR: 16p ≤ 6초)

| 조건 | 측정값 |
|---|---|
| 16p (이미지 없음, 로컬) | 8~17ms |
| 16p (이미지 있음, CDN fetch) | URL 수에 따라 증가 (Promise.all 병렬) |

이미지가 있는 경우 병렬 프리페치(`collectImageUrls → prefetchImages`)로 최적화.
Supabase CDN 이미지 기준 16p ≤ 6초 목표.

## 좌표계

```
fabricJson (mm, 좌상단 원점, y↓ 증가)
  → MM_TO_PT = 2.83465 → pt 변환
  → y-flip: y_pdf = (pageH + 2*bleed)*MM_TO_PT - (y_fab + h_fab)*MM_TO_PT - bleed*MM_TO_PT
  → bleed offset: x_pt += bleed*MM_TO_PT
```

## 페이지 박스 (인쇄 사양)

| 박스 | 범위 | 목적 |
|---|---|---|
| MediaBox | 전체 (bleed 포함) | PDF 전체 크기 |
| BleedBox | 전체 (= MediaBox) | 인쇄소 재단여유 |
| TrimBox | bleed 안쪽 (content만) | 실제 책 크기 |

## 폰트 임베드

1. 환경변수 `PRETENDARD_TTF_PATH` → 해당 경로 ttf 로드
2. `packages/pdf-engine/assets/fonts/Pretendard-Regular.ttf` (번들)
3. 없으면 `StandardFonts.Helvetica` 폴백 (한글 깨짐 가능)

한글 텍스트를 위해 서버 환경에서 Pretendard ttf 공급 권장.

## 표지 배경 톤

DESIGN-nike SSOT 기준 6종:

| 톤 | RGB |
|---|---|
| cream | #f5f0e8 |
| mint | #d4ede8 |
| lilac | #e8d4ed |
| pink | #edd4dc |
| navy | #1a2b4a |
| white | #ffffff |

navy 배경일 때 텍스트 색 자동 흰색.
