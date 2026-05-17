---
description: dev 서버에서 특정 라우트/셀렉터를 캡처해 AI 가 직접 시각 검증. UI PR 작성 전 필수.
---

# /visual-check — 시각 검증 커맨드 (FOLLOWUP-51, FOLLOWUP-54)

## 목적

코드 변경 후 dev 서버에서 화면을 캡처해 `tmp/visual/<slug>.png` 로 저장한다.
AI 가 직접 Read 툴로 이미지를 열어 사용자 의도와 비교한 후 push 여부를 결정한다.

**UI 작업은 이 커맨드를 통과한 후에만 push 한다.**

## 사용법

```
/visual-check <route> [selector] [--viewport WxH] [--port N] [--wait MS]
/visual-check --url <full-url> [옵션]
```

### 기본 예시

```bash
# 편집기 전체 (desktop 기본 1440x900)
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

### FOLLOWUP-54 신규 예시

```bash
# 1. dev 서버 + 패널 캡처 (FeatureSidebar 클릭 후 열린 상태)
#    한계 1 해소: --click 으로 도구 버튼 클릭 → 패널이 열린 상태로 캡처
pnpm visual-check /editor --click "[aria-label='도형']" --wait 2000
pnpm visual-check /editor --click "[aria-label='포즈']" --wait 2000

# 2. prod URL 캡처 (한계 2 해소: localhost 전용 제약 없음)
#    외부 URL 캡처 시 dev 서버 readiness 체크를 skip
pnpm visual-check --url https://storywork-editor-web.vercel.app/editor

# 3. localStorage seed + 패널 클릭
#    FormatPickerModal dismissable=false 우회 등 초기화 상태 주입 후 캡처
pnpm visual-check /editor --seed-storage tmp/seed.json --click "[aria-label='포즈']"

# 4. 모바일 device emulation (--device 가 --viewport 보다 우선)
pnpm visual-check /editor --device mobile
pnpm visual-check /editor --device tablet
pnpm visual-check /editor --device desktop
```

## 옵션 전체 목록

| 옵션                        | 설명                                            | 기본값      |
| --------------------------- | ----------------------------------------------- | ----------- |
| `--port <n>`                | dev 서버 포트                                   | 3000        |
| `--viewport <WxH>`          | 뷰포트 크기 (`--device` 보다 낮은 우선순위)     | 1280x900    |
| `--out <dir>`               | 출력 디렉토리                                   | tmp/visual/ |
| `--start-server`            | dev 서버 자동 기동                              | false       |
| `--wait <ms>`               | 페이지 로드 후 + 클릭 후 대기                   | 2000        |
| `--url <full-url>`          | full URL 캡처. dev 서버 체크 skip               | -           |
| `--click <sel>`             | 캡처 전 selector 클릭. 반복 가능. `;` 구분 지원 | -           |
| `--seed-storage <path>`     | localStorage JSON 파일 주입 (외부 URL 불가)     | -           |
| `--device <name>`           | desktop/tablet/mobile emulation                 | -           |
| `--wait-for-selector <sel>` | 페이지 로드 후 selector 출현 대기 (최대 10s)    | -           |
| `--emulate-media <type>`    | CSS media type (screen/print)                   | screen      |

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

## 한계 1 진단 결과 (FOLLOWUP-54)

**2026-05-17 진단**: Playwright headless + viewport 1280px 환경에서 `matchMedia('(min-width: 768px)')` 는 `true` 로 정상 반환됨. 즉 **hydration 타이밍/matchMedia mock 문제가 아님**.

실제 원인: FeatureSidebar 는 **도구 클릭 시에만 펼쳐지는 상태 기반 패널** (`width: 0px` → `width: 328px`). Playwright 가 클릭 없이 캡처하면 width: 0 상태로 렌더된 것. `--click` 옵션으로 도구 버튼 클릭 후 캡처하면 정상 해소됨.

```
# 진단 측정값 (케이스 A 기본 설정)
matchMedia(min-width: 768px): true
window.innerWidth: 1280
aside (ToolBar) width: 80px   ← w-20 = 80px (정상)
aside (FeatureSidebar) width: 308px  ← hidden md:flex md:flex-col w-[308px] (정상)
→ 클릭 전 FeatureSidebar width: 0px (상태 기반)
→ 해결: --click "[aria-label='도형']" 후 캡처
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
| 패널 열림       | --click 사용 시 FeatureSidebar width > 100px 확인        |

## 서버가 없는 경우 에러 메시지

```
[visual-check] ERROR dev 서버가 localhost:3000 에서 응답하지 않습니다.

해결 방법:
  1) 다른 터미널에서: pnpm dev
  2) 또는 --start-server 옵션 사용
  3) 다른 포트면: --port <포트번호>
  4) 외부 URL 캡처: --url <full-url>
```

## package.json 스크립트 (pnpm visual-check 으로도 실행 가능)

루트 `package.json` 에 등록됨:

```json
"visual-check": "bash scripts/visual-check.sh"
```

## 출력 파일 위치

```
tmp/visual/
  editor.png              ← /editor (dev)
  admin-resources.png     ← /admin/resources (dev)
  root.png                ← / (dev)
  prod-editor.png         ← --url https://.../editor (prod)
```

`tmp/` 는 `.gitignore` 에 포함되어 있어 커밋되지 않는다.

## orchestrator/ui-designer 통합 규칙

- **ui-designer** 는 panel spacing / card boundary / 색상 작업 시 구현 완료 후 이 커맨드를 자동 호출한다.
- **orchestrator** 는 ui-designer 산출물 검증 단계에서 이 커맨드 통과 여부를 확인한다.
- 3번 연속 불일치 시 → 멈추고 사용자에게 명세표 재확인 요청.
- FeatureSidebar 같은 토글 패널은 반드시 `--click` 옵션으로 열린 상태 캡처.
- Vercel prod 검증은 `--url` 옵션 사용.
