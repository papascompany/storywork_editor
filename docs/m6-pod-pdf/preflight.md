# Preflight 검증기 (M6-03)

인쇄소 표준 사양을 기준으로 PDF 빌드 입력을 자동 검증한다.  
3사 가상 프로필 + 6개 룰 엔진 + 시각화 PDF 생성.

---

## 인쇄소 프로필 3사

| 프로필 ID | 이름 | 주요 대상 | bleed | safe | minPose | minBg | maxPages |
|---|---|---|---|---|---|---|---|
| `bookprint-korea` | BookPrint Korea | 도서 (B5/A5) | 3~5mm | 5mm | 300dpi | 150dpi | 무제한 |
| `instaprint` | InstaPrint | 정사각 인스타 카드 | 2~4mm | 4mm | 200dpi | 150dpi | 1 |
| `comicmaker` | ComicMaker | 만화/콘티 | 3~5mm | 5mm | 200dpi | 72dpi | 200 |

---

## 6개 룰

| 룰 ID | 검사 내용 | 실패 시 |
|---|---|---|
| `bleed-check` | format.bleedMm vs 프로필 min/max; 레이어 trim 경계 침범 | error/warning |
| `safe-check` | format.safeMm vs 프로필 min; 텍스트/말풍선/포즈 safe area 침범 | error/warning |
| `dpi-check` | 이미지 effectiveDpi vs minPose/minBg; lowDpi 자산 50% 슬롯 제약 (ADR-0011a) | error/warning |
| `font-check` | fontEmbedRequired 충족; 알 수 없는 fontFamily 라이선스 | error |
| `color-check` | CMYK 선호 경고; opacity<1 투명도 경고; 순수 흰색 배경 info | warning/info |
| `page-count-check` | maxPages 초과; 페이지 없음; fabricJson 크기 불일치 | error/warning |

---

## API 시그니처

### `preflight(input, profileId?, opts?)`

```typescript
import { preflight } from '@storywork/pdf-engine'

// 모든 프로필 검증 (3개 리포트)
const reports = await preflight(buildInput)

// 특정 프로필만
const [report] = await preflight(buildInput, 'bookprint-korea', { embedFonts: true })
```

**파라미터:**

| 파라미터 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `input` | `PdfBuildInput` | 필수 | buildPdf() 와 동일한 입력 |
| `profileId` | `string` | undefined | 지정 시 해당 프로필만, 생략 시 3개 모두 |
| `opts` | `PdfBuildOptions` | `{}` | embedFonts 등 font-check 에 전달 |

**반환:**

```typescript
PreflightReport[] // profileId별 1개
```

```typescript
interface PreflightReport {
  profileId: string
  profileName: string
  ok: boolean           // errors.length === 0
  errors: PreflightViolation[]
  warnings: PreflightViolation[]
  infos: PreflightViolation[]
  metadata: {
    totalPages: number
    checkedAt: string   // ISO 8601
  }
}

interface PreflightViolation {
  rule: string
  severity: 'error' | 'warning' | 'info'
  pageIndex?: number    // 0-based
  layerId?: string      // fabric 레이어 ID
  message: string
  suggestion?: string
}
```

### `buildPreflightPdf(input, report)`

```typescript
import { buildPreflightPdf } from '@storywork/pdf-engine'

const pdfBytes = await buildPreflightPdf(buildInput, report)
// PDF 시각화: 표지 + 페이지별 오버레이 + 위반 목록
```

---

## POST /api/projects/:id/preflight

**인증:** Supabase 세션 (로그인 필수)

**요청 body** (선택적 JSON):

| 필드 | 타입 | 기본값 | 설명 |
|---|---|---|---|
| `profileId` | `string` | undefined | 생략 시 3개 프로필 모두 검증 |
| `embedFonts` | `boolean` | `true` | font-check 에 전달 |

**응답 200:**

```json
{
  "reports": [
    {
      "profileId": "bookprint-korea",
      "profileName": "BookPrint Korea",
      "ok": false,
      "errors": [...],
      "warnings": [...],
      "infos": [...],
      "metadata": { "totalPages": 16, "checkedAt": "2026-06-04T..." }
    },
    ...
  ],
  "summary": {
    "totalErrors": 3,
    "totalWarnings": 2,
    "allPassed": false
  }
}
```

**오류:**

| 상태 | 이유 |
|---|---|
| 400 | projectId 누락 |
| 401 | 미인증 |
| 403 | 소유권 불일치 |
| 404 | 프로젝트 없음 |
| 500 | 검증 오류 |

---

## UI 통합

`/editor` TopBar의 `DownloadMenu` 에 "프리플라이트 검사" 메뉴 항목 추가.  
클릭 시 `PreflightModal` 표시:

- 3사 프로필 탭 전환
- error/warning/info 색상 구분 + 페이지/레이어 위치
- "재검증" 버튼

---

## Variant B (PDF buffer 검증) — Placeholder

`preflightBuffer(pdfBuffer, profileId?)` 는 현재 placeholder.  
M6-04 이후 pdf-lib 로 실제 PDF 메타 추출 후 구현 예정.

---

## ADR-0011a lowDpi 정책 통합

`dpi-check` 룰에서 lowDpi 태그 자산의 슬롯 제약을 검증:

- `layerArea / pageArea > 0.5` → error: "lowDpi 자산이 페이지 면적의 X%를 차지합니다 (ADR-0011a 제한: ≤50%)"
- effectiveDpi < 200 → error
- effectiveDpi < minPose(또는 minBg) → warning
