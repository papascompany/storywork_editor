---
description: 프로젝트의 POD PDF 컴파일 + 프리플라이트
argument-hint: "<projectId>"
---

`pdf-publisher` 위임:

1. `apps/workers/pdf-job.ts` 트리거 (project=$1)
2. 완료 후 `preflight-check` 실행
3. 위반 항목이 있으면 PR 본문에 위치/좌표 리포트 첨부, error 등급은 게시 차단
4. 통과 시 PublishJob.pdfUrl 반환
