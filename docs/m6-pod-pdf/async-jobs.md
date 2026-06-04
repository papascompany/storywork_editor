# PDF 비동기 잡 (M6-02)

## 개요

M6-01 의 동기 PDF 빌드에 Inngest 기반 비동기 잡을 추가합니다.  
16p 이내 작품은 동기(6초 이내)로 처리하고, 100p+ 대용량은 비동기로 처리합니다.  
클라이언트는 Supabase Realtime 채널로 진행률(0~100%)을 수신합니다.

## 아키텍처 다이어그램

```
[편집기 TopBar]
    │ POST /api/projects/{id}/publish
    │ body: { async: true }
    ▼
[Next.js Route Handler]
    │ PublishJob 생성 (status: 'queued')
    │ inngest.send('pdf/build.requested', { jobId, projectId, ownerId })
    │ 응답 202: { jobId, status: 'queued', realtimeChannel: 'pdf-jobs:{jobId}' }
    ▼
[클라이언트: usePdfJobProgress(jobId)]
    │ Supabase Realtime 채널 'pdf-jobs:{jobId}' 구독
    │ PdfProgressToastContainer 렌더링
    ▼
[Inngest Worker: pdfBuildJob]
    ├── step.run('load-project')        → progress 0%   emit
    ├── step.run('update-status-running')
    ├── step.run('build-pdf')           → progress 40%  emit
    ├── step.run('upload-to-storage')   → progress 70%  emit
    ├── step.run('update-status-completed')
    └── step.run('emit-complete')       → progress 100% emit + pdfUrl
```

## Realtime 채널 스펙

**채널명**: `pdf-jobs:{jobId}`  
**이벤트**: `'progress'` (broadcast)  
**payload**:

```typescript
interface PdfProgressPayload {
  jobId: string
  progress: number          // 0~100
  status: 'queued' | 'running' | 'succeeded' | 'failed'
  message?: string          // 사용자에게 표시할 메시지
  pdfUrl?: string           // succeeded 시 다운로드 URL
}
```

**단계별 진행률**:

| 단계 | progress | message |
|------|----------|---------|
| load-project 시작 | 0% | 프로젝트 로드 중... |
| 페이지 로드 완료 | 20% | 페이지 로드 완료 |
| build-pdf 시작 | 40% | PDF 생성 중... |
| upload 시작 | 70% | 업로드 중... |
| 완료 처리 | 85% | 완료 처리 중... |
| 완료 | 100% | PDF 생성 완료 + pdfUrl |

## API 변경

### POST /api/projects/:id/publish

M6-02 에서 `async` 옵션이 추가됩니다. 기존 동기 모드는 100% 보존됩니다.

**요청 body** (선택적 JSON):
```json
{ "async": true }
```

**비동기 응답 202**:
```json
{
  "jobId": "cuid",
  "status": "queued",
  "realtimeChannel": "pdf-jobs:{jobId}"
}
```

**동기 응답 200** (async=false 또는 미지정, 기존 동작):
```json
{
  "jobId": "cuid",
  "pdfUrl": "https://...",
  "byteSize": 1234567,
  "pageCount": 16,
  "warnings": []
}
```

## Inngest 함수

**패키지**: `@storywork/workers`  
**함수 ID**: `pdf-build`  
**이벤트**: `pdf/build.requested`  
**재시도**: 3회  
**동시성**: 최대 10

```typescript
// apps/workers/src/functions/pdf-build.ts
export const pdfBuildJob = inngest.createFunction(
  { id: 'pdf-build', retries: 3, concurrency: { limit: 10 } },
  { event: 'pdf/build.requested' },
  async ({ event, step }) => { ... }
)
```

## Inngest 엔드포인트

**경로**: `/api/inngest`  
**파일**: `apps/web/app/api/inngest/route.ts`

로컬 개발:
```bash
npx inngest-cli@latest dev -u http://localhost:3000/api/inngest
```

## 환경변수

| 변수 | 설명 | 필수 |
|------|------|------|
| `INNGEST_EVENT_KEY` | Inngest 이벤트 전송 키 | prod |
| `INNGEST_SIGNING_KEY` | Inngest 웹훅 서명 검증 키 | prod |
| `INNGEST_DEV` | `'1'` 이면 dev 서버 연동 | 로컬 |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase 서비스 키 (워커 → Storage) | 필수 |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase URL | 필수 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (클라이언트 Realtime) | 필수 |

## 클라이언트 통합

### 훅

```typescript
// apps/web/lib/realtime/usePdfJobProgress.ts
const { progress, status, pdfUrl, message, error } = usePdfJobProgress(jobId)
```

### Toast UI

```tsx
// apps/web/components/editor/PdfProgressToastContainer.tsx
<PdfProgressToastContainer
  jobId={jobId}
  progress={progress}
  status={status}
  pdfUrl={pdfUrl}
  message={message}
  error={error}
  onDismiss={() => setJobId(null)}
/>
```

## PublishJob 상태 흐름

```
queued → running → succeeded
                  → failed (재시도 후 최종 실패)
```

M6-01 동기 처리는 `succeeded` or `failed` 를 직접 기록합니다.  
M6-02 비동기 처리는 `queued → running → succeeded/failed` 순서로 전이합니다.

## 비용 보호

- Inngest dev 모드는 무료 (로컬 `npx inngest-cli dev`)
- 프로덕션 Inngest 호출은 `INNGEST_EVENT_KEY` 가 설정된 환경에서만 활성화
- Realtime 채널은 broadcast 이벤트 — Supabase free tier 에서도 동작
