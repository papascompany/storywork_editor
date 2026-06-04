# PDF 출판 흐름 (M6-01 + M6-02 + M6-03)

## 프리플라이트 검사 (M6-03, 출판 전 선택적 실행)

```
편집기 완성 → DownloadMenu "프리플라이트 검사" 클릭
  → POST /api/projects/{id}/preflight
  → 서버: Project + Format + Pages 로드
  → 서버: preflight() 3사 프로필 검증
  → 응답 200: { reports: PreflightReport[], summary: { totalErrors, totalWarnings, allPassed } }
  → 클라이언트: PreflightModal 에 결과 표시
  → 사용자: 오류 확인 후 수정 또는 그대로 출판 진행
```

자세한 프리플라이트 사양: [preflight.md](./preflight.md)

---

## 동기 모드 (기본, async=false)

```
편집기 완성 → TopBar "PDF 출판" 클릭 (async=false)
  → POST /api/projects/{id}/publish
  → 서버: Project + Format + Pages 로드
  → 서버: buildPdf() 동기 호출 (16p ≤ 6초)
  → 서버: Supabase Storage 업로드 (pdfs/{ownerId}/{projectId}-{ts}.pdf)
  → 서버: PublishJob 생성 (status: succeeded, pdfUrl)
  → 응답 200: { jobId, pdfUrl, byteSize, warnings, pageCount }
```

## 비동기 모드 (M6-02, async=true)

```
편집기 완성 → TopBar "PDF 출판" 클릭 (async=true)
  → POST /api/projects/{id}/publish { async: true }
  → 서버: PublishJob 생성 (status: queued)
  → 서버: inngest.send('pdf/build.requested', { jobId, projectId, ownerId })
  → 응답 202: { jobId, status: 'queued', realtimeChannel: 'pdf-jobs:{jobId}' }
  → 클라이언트: Supabase Realtime 'pdf-jobs:{jobId}' 구독
  → 클라이언트: PdfProgressToast 표시 (진행 바 0~100%)
  ↓ (Inngest Worker)
  → 잡: 프로젝트 로드 → PDF 빌드 → Storage 업로드 → 완료
  → Realtime emit: { progress: 100, status: 'succeeded', pdfUrl }
  → 클라이언트: Toast "완료" + "다운로드" 버튼
```

## API

### POST /api/projects/:id/publish

**인증**: Supabase 세션 (로그인 필수)

**요청 body** (선택적 JSON):

| 필드 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `async` | `boolean` | `false` | `true` 이면 Inngest 비동기 잡 트리거 |

**동기 응답 200**:
```json
{
  "jobId": "cuid",
  "pdfUrl": "https://...supabase.../pdfs/...",
  "byteSize": 1234567,
  "pageCount": 16,
  "warnings": []
}
```

**비동기 응답 202**:
```json
{
  "jobId": "cuid",
  "status": "queued",
  "realtimeChannel": "pdf-jobs:{jobId}"
}
```

**오류**:
| 상태 | 이유 |
|---|---|
| 400 | projectId 누락 |
| 401 | 미인증 |
| 403 | 소유권 불일치 |
| 404 | 프로젝트 없음 |
| 500 | 빌드/업로드/DB/Inngest 오류 |

## Storage 경로

```
storywork 버킷 / pdfs / {ownerId} / {projectId}-{timestamp}.pdf
```

RLS: `ownerId` scope (소유자만 접근 가능).

## PublishJob 레코드

| 필드 | 동기 모드 | 비동기 모드 |
|---|---|---|
| `kind` | `'pdf'` | `'pdf'` |
| `status` | `'succeeded'` or `'failed'` | `'queued' → 'running' → 'succeeded'` |
| `pdfUrl` | Storage 공개 URL | Storage 공개 URL (완료 후) |
| `spec` | formatId, pageCount, byteSize, seed, producer, creationDate | 동일 |
| `preflight` | `{ warnings: string[] }` | 동일 |

## 진행률 채널 (비동기 모드)

자세한 사양: [async-jobs.md](./async-jobs.md)

채널: `pdf-jobs:{jobId}`, 이벤트: `'progress'`

| 단계 | progress |
|------|----------|
| 시작 | 0% |
| 페이지 로드 | 20% |
| PDF 빌드 | 40% |
| 업로드 | 70% |
| 완료 처리 | 85% |
| 완료 | 100% |

## 클라이언트 통합 (편집기)

`/editor` TopBar의 `DownloadMenu`에서:

```typescript
// 동기 모드 (기본)
const res = await fetch(`/api/projects/${projectId}/publish`, { method: 'POST' })
const { pdfUrl, warnings } = await res.json()
if (pdfUrl) window.open(pdfUrl, '_blank')

// 비동기 모드 (M6-02)
const res = await fetch(`/api/projects/${projectId}/publish`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ async: true }),
})
const { jobId, realtimeChannel } = await res.json()
// → usePdfJobProgress(jobId) 훅으로 진행률 수신
// → PdfProgressToastContainer 로 UI 표시
```
