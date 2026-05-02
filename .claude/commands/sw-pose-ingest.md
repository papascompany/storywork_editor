---
description: data/poses/raw 의 PNG(향후 SVG) 자산을 매직바이트 검증·재인코딩·사이드카 매칭·임베딩 후 DB에 적재
argument-hint: "[--dry-run] [--limit N] [--format png|svg|auto]"
---

`pose-curator` 서브에이전트에 다음을 위임합니다:

- `scripts/ingest-poses.ts` 실행 ($ARGUMENTS)
- 기본 동작: `--format auto` — 매직바이트로 PNG/SVG 자동 분기 (현재 자산은 **PNG 1차**)
- 입력 디렉토리: `data/poses/raw/`
  - `<id>.png` 또는 `<id>.svg` (마스터)
  - `<id>.kp.json` (사이드카 키포인트 + 라이선스, 누락 시 검수 큐 진입)
- PNG 처리: 매직바이트 검증 → EXIF strip → sharp 재인코딩 → WebP/AVIF 파생본 + 256 썸네일
- SVG 처리(향후): DOMPurify SVG profile + viewBox 1024 정규화
- 시각 임베딩(이미지) + 텍스트 임베딩(태그) 결합 → pgvector 인덱싱
- 적재 결과 리포트(성공/실패/검수 큐 진입 수/저DPI 수) 출력
- 실패 케이스를 사유별로 그룹화하여 `data/poses/_failed/{reason}/` 로 격리

DoD:
- 성공률 ≥ 99%
- 임베딩 인덱스 갱신
- 검수 큐 진입 항목 수 + 사유별 분포 보고
- 모든 적재 자산 `Resource.format` + `masterDpi`(PNG) + `variants` 채워짐
