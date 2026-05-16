---
description: dev 서버에서 특정 라우트/셀렉터를 캡처해 AI 가 직접 시각 검증. UI PR 작성 전 필수.
---

# /visual-check — 시각 검증 커맨드 (FOLLOWUP-51)

## 목적

코드 변경 후 dev 서버에서 화면을 캡처해 `tmp/visual/<slug>.png` 로 저장한다.
AI 가 직접 Read 툴로 이미지를 열어 사용자 의도와 비교한 후 push 여부를 결정한다.

**UI 작업은 이 커맨드를 통과한 후에만 push 한다.**

## 사용법

```
/visual-check <route> [selector] [--viewport WxH] [--port N] [--wait MS]
```

### 예시

```bash
# 편집기 전체 (desktop 기본 1280x800)
/visual-check /editor

# 포즈 패널 영역만
/visual-check /editor "#pose-panel"

# 모바일 뷰포트
/visual-check /editor --viewport 390x844

# admin 리소스 페이지
/visual-check /admin/resources

# dev 서버가 없으면 자동 기동
/visual-check /editor --start-server
```

## 실행 절차

이 커맨드를 받으면 다음 순서로 실행한다:

```bash
# 1. 스크립트 실행
bash /Users/yohan/Documents/claude/storywork/scripts/visual-check.sh <route> [selector] [옵션]
```

```
# 2. 성공 시 출력된 파일 경로 확인
# 예: tmp/visual/editor.png
```

```
# 3. AI 가 직접 이미지 열기
# Read 툴로 tmp/visual/<slug>.png 를 열어 시각적으로 확인
```

```
# 4. 사용자 의도와 비교
# - 일치 → push 진행
# - 불일치 → Step 1 (명세표 작성) 로 돌아감. push 하지 않음.
```

## 의사결정 기준

캡처 이미지 확인 시 다음을 점검한다:

| 항목            | 기준                                                     |
| --------------- | -------------------------------------------------------- |
| spacing         | 외곽 padding ≈ grid gap (1:1 비율). 8px+ 단위 인식 가능  |
| visual boundary | panel bg ≠ card bg. 카드는 흰 배경 + border 로 분리 명확 |
| 색 대비         | 텍스트 4.5:1+, 아이콘 3:1+                               |
| 레이아웃        | 뷰포트에서 잘림 없음, 오버플로우 없음                    |
| 반응형          | 모바일 뷰포트에서 BottomSheet / 단일 컬럼 정상           |

## 서버가 없는 경우 에러 메시지

```
[visual-check] ERROR dev 서버가 localhost:3000 에서 응답하지 않습니다.

해결 방법:
  1) 다른 터미널에서: pnpm dev
  2) 또는 --start-server 옵션 사용
  3) 다른 포트면: --port <포트번호>
```

## package.json 스크립트 (pnpm visual-check 으로도 실행 가능)

루트 `package.json` 에 등록됨:

```json
"visual-check": "bash scripts/visual-check.sh"
```

## 출력 파일 위치

```
tmp/visual/
  editor.png          ← /editor
  admin-resources.png ← /admin/resources
  root.png            ← /
```

`tmp/` 는 `.gitignore` 에 포함되어 있어 커밋되지 않는다.

## orchestrator/ui-designer 통합 규칙

- **ui-designer** 는 panel spacing / card boundary / 색상 작업 시 구현 완료 후 이 커맨드를 자동 호출한다.
- **orchestrator** 는 ui-designer 산출물 검증 단계에서 이 커맨드 통과 여부를 확인한다.
- 3번 연속 불일치 시 → 멈추고 사용자에게 명세표 재확인 요청.
