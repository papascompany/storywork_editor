# PDF 출판 흐름 (M6-01)

## 사용자 흐름

```
편집기 완성 → TopBar "PDF 다운로드" 클릭
  → POST /api/projects/{id}/publish
  → 서버: Project + Format + Pages 로드
  → 서버: buildPdf() 동기 호출 (16p ≤ 6초)
  → 서버: Supabase Storage 업로드 (pdfs/{ownerId}/{projectId}-{ts}.pdf)
  → 서버: PublishJob 생성 (status: succeeded, pdfUrl)
  → 클라이언트: pdfUrl 새 탭 열기 or 자동 다운로드
```

## API

### POST /api/projects/:id/publish

**인증**: Supabase 세션 (로그인 필수)

**요청**: body 없음 (id는 URL 파라미터)

**응답 200**:
```json
{
  "jobId": "cuid",
  "pdfUrl": "https://...supabase.../pdfs/...",
  "byteSize": 1234567,
  "pageCount": 16,
  "warnings": []
}
```

**오류**:
| 상태 | 이유 |
|---|---|
| 400 | projectId 누락 |
| 401 | 미인증 |
| 403 | 소유권 불일치 |
| 404 | 프로젝트 없음 |
| 500 | 빌드/업로드/DB 오류 |

## Storage 경로

```
storywork 버킷 / pdfs / {ownerId} / {projectId}-{timestamp}.pdf
```

RLS: `ownerId` scope (소유자만 접근 가능).

## PublishJob 레코드

| 필드 | 값 |
|---|---|
| `kind` | `'pdf'` |
| `status` | `'succeeded'` or `'failed'` |
| `pdfUrl` | Storage 공개 URL |
| `spec` | formatId, pageCount, byteSize, seed, producer, creationDate |
| `preflight` | `{ warnings: string[] }` |

## M6-02 이후 계획

현재 M6-01은 동기 처리 (요청-응답 동기). 16p ≤ 6초 내에 완료.

M6-02 (별도 PR)에서 Inngest 비동기 잡 도입:
- 100p 이상 대용량 작품
- 진행% 이벤트 클라이언트 push (SSE or WebSocket)
- `PublishJob.status = 'queued' → 'running' → 'succeeded'` 흐름

## 클라이언트 통합 (편집기)

`/editor` TopBar의 `DownloadMenu`에서:

```typescript
const res = await fetch(`/api/projects/${projectId}/publish`, { method: 'POST' })
const { pdfUrl, warnings } = await res.json()
if (pdfUrl) window.open(pdfUrl, '_blank')
if (warnings.length > 0) showWarningToast(warnings)
```
