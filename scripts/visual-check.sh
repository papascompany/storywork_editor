#!/usr/bin/env bash
# visual-check.sh — AI 시각 검증 헬퍼 (FOLLOWUP-51, FOLLOWUP-54)
#
# 용도: 코드 변경 후 dev 서버에서 특정 라우트/셀렉터를 캡처하여
#       tmp/visual/{slug}.png 로 저장. UI PR 작성 전 반드시 1회 실행.
#
# 사용법:
#   bash scripts/visual-check.sh /editor
#   bash scripts/visual-check.sh /editor "#pose-panel" --viewport 1280x800
#   bash scripts/visual-check.sh /editor --start-server
#   bash scripts/visual-check.sh --url https://storywork-editor-web.vercel.app/editor
#   bash scripts/visual-check.sh /editor --click "[aria-label='포즈']" --wait 2000
#   bash scripts/visual-check.sh /editor --seed-storage tmp/seed.json --click "[aria-label='포즈']"
#   bash scripts/visual-check.sh /editor --device mobile
#   bash scripts/visual-check.sh --help
#
# 의존:
#   - Node.js >= 20
#   - pnpm (모노레포 루트에서 실행)
#   - @playwright/test (apps/web devDependencies 에 이미 포함)
#
# 메인 워크트리 기준으로 동작. worktree 내에서 실행 시 경고 출력.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$REPO_ROOT/scripts"
OUT_DIR="$REPO_ROOT/tmp/visual"

# ── 색상 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[visual-check]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[visual-check] OK${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[visual-check] WARN${NC} $*"; }
log_error() { echo -e "${RED}[visual-check] ERROR${NC} $*" >&2; }

# ── 도움말 ────────────────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
visual-check — StoryWork 시각 검증 스크립트 (FOLLOWUP-51, FOLLOWUP-54)

사용법:
  bash scripts/visual-check.sh <route> [selector] [options]
  bash scripts/visual-check.sh --url <full-url> [options]
  pnpm visual-check <route> [selector] [options]

인자:
  <route>       캡처할 Next.js 라우트 (예: /editor, /admin/resources)
                --url 옵션 사용 시 생략 가능
  [selector]    (선택) CSS 셀렉터 — 해당 영역만 캡처 (예: "#pose-panel")

옵션 (기존):
  --port <n>          dev 서버 포트 (기본: 3000)
  --viewport <WxH>    뷰포트 크기 (기본: 1280x900). --device 보다 낮은 우선순위.
  --out <dir>         출력 디렉토리 (기본: tmp/visual/)
  --start-server      dev 서버가 없으면 자동 기동 (기본: 이미 떠 있는 서버에 연결)
  --wait <ms>         페이지 로드 후 + 클릭 후 대기 시간 ms (기본: 2000)
  --help, -h          이 도움말 출력

옵션 (FOLLOWUP-54 신규):
  --url <full-url>    full URL 캡처. localhost 외 외부 서버(Vercel prod 등) 사용 시.
                      이 옵션 사용 시 dev 서버 readiness 체크 skip.
                      예: --url https://storywork-editor-web.vercel.app/editor
  --click <sel>       캡처 전 해당 selector 클릭. 반복 지정으로 복수 클릭 가능.
                      semicolon(;) 구분도 지원: --click "btnA;btnB"
                      클릭 후 --wait ms 만큼 대기.
                      예: --click "[aria-label='포즈']"
  --seed-storage <path>
                      캡처 전 localStorage 에 JSON 파일 주입.
                      FormatPickerModal 등 초기화 상태 우회에 사용.
                      --url(외부 URL) 과 함께 사용 불가 (cross-origin 제약).
                      예: --seed-storage tmp/seed.json
  --device <name>     Playwright device emulation. --viewport 보다 우선.
                      desktop=1440x900, tablet=768x1024, mobile=390x844
  --wait-for-selector <sel>
                      페이지 로드 후 selector 가 나타날 때까지 최대 10s 대기.
                      예: --wait-for-selector "aside[aria-label='포즈 패널']"
  --emulate-media <type>
                      CSS media type (기본: screen). 옵션: screen|print.

산출물:
  tmp/visual/<slug>.png   — 전체 또는 셀렉터 영역 스크린샷
  (git-ignored)

예시:
  # 편집기 전체 캡처 (desktop)
  bash scripts/visual-check.sh /editor

  # 도형 패널 열린 상태 캡처 (FOLLOWUP-54 한계 1 해소)
  bash scripts/visual-check.sh /editor --click "[aria-label='도형']" --wait 2000

  # 포즈 패널 열린 상태 캡처
  bash scripts/visual-check.sh /editor --click "[aria-label='포즈']" --wait 2000

  # prod URL 캡처 (FOLLOWUP-54 한계 2 해소)
  bash scripts/visual-check.sh --url https://storywork-editor-web.vercel.app/editor

  # localStorage seed + 패널 클릭
  bash scripts/visual-check.sh /editor --seed-storage tmp/seed.json --click "[aria-label='포즈']"

  # 모바일 emulation
  bash scripts/visual-check.sh /editor --device mobile

  # 포즈 패널 영역만 캡처
  bash scripts/visual-check.sh /editor "#pose-panel"

  # 모바일 뷰포트 직접 지정
  bash scripts/visual-check.sh /editor --viewport 390x844

  # dev 서버 자동 기동 후 캡처
  bash scripts/visual-check.sh /editor --start-server

주의:
  - 기본 동작은 이미 실행 중인 dev 서버(localhost:<port>)에 연결합니다.
  - --start-server 옵션 시에만 pnpm dev 를 백그라운드로 기동합니다.
  - --url 옵션 시 dev 서버 체크를 생략합니다.
  - UI PR 작성 전 반드시 1회 실행 후 사용자 의도와 비교하세요.
EOF
  exit 0
}

# ── 인자 파싱 ─────────────────────────────────────────────────────────────────
ROUTE=""
SELECTOR=""
PORT=3000
VIEWPORT="1280x900"
OUT_OVERRIDE=""
START_SERVER=false
WAIT_MS=2000
# FOLLOWUP-54 신규
FULL_URL=""
CLICK_SELECTORS=()
SEED_STORAGE=""
DEVICE=""
WAIT_FOR_SELECTOR=""
EMULATE_MEDIA=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) usage ;;
    --port)               PORT="$2";               shift 2 ;;
    --viewport)           VIEWPORT="$2";            shift 2 ;;
    --out)                OUT_OVERRIDE="$2";        shift 2 ;;
    --start-server)       START_SERVER=true;        shift ;;
    --wait)               WAIT_MS="$2";             shift 2 ;;
    --url)                FULL_URL="$2";            shift 2 ;;
    --click)              CLICK_SELECTORS+=("$2");  shift 2 ;;
    --seed-storage)       SEED_STORAGE="$2";        shift 2 ;;
    --device)             DEVICE="$2";              shift 2 ;;
    --wait-for-selector)  WAIT_FOR_SELECTOR="$2";   shift 2 ;;
    --emulate-media)      EMULATE_MEDIA="$2";       shift 2 ;;
    -*)
      log_error "알 수 없는 옵션: $1 (--help 로 도움말 확인)"
      exit 1
      ;;
    *)
      if [[ -z "$ROUTE" ]]; then
        ROUTE="$1"
      elif [[ -z "$SELECTOR" ]]; then
        SELECTOR="$1"
      else
        log_error "인자가 너무 많습니다. --help 로 확인하세요."
        exit 1
      fi
      shift
      ;;
  esac
done

# --url 없을 때만 route 필수
if [[ -z "$FULL_URL" && -z "$ROUTE" ]]; then
  log_error "라우트 인자 또는 --url 옵션이 필요합니다."
  echo ""
  usage
fi

[[ -n "$OUT_OVERRIDE" ]] && OUT_DIR="$OUT_OVERRIDE"

# ── 워크트리 경고 ────────────────────────────────────────────────────────────
if [[ "$REPO_ROOT" == *"/worktrees/"* ]]; then
  log_warn "git worktree 내에서 실행 중입니다."
  log_warn "dev 서버가 메인 워크트리(${REPO_ROOT%/worktrees/*})에서 떠 있는지 확인하세요."
fi

# ── Node.js / pnpm 확인 ───────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  log_error "Node.js 가 설치되어 있지 않습니다."
  exit 1
fi

if ! command -v pnpm &>/dev/null; then
  log_error "pnpm 이 설치되어 있지 않습니다."
  exit 1
fi

# ── gh CLI 없어도 이 스크립트는 동작 (ci-watch 와 달리) ──────────────────────

# ── dev 서버 readiness 체크 (외부 URL 모드 시 skip) ───────────────────────────
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    log_info "dev 서버 종료 (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if [[ -n "$FULL_URL" ]]; then
  log_info "외부 URL 모드: $FULL_URL (dev 서버 체크 skip)"
elif $START_SERVER; then
  log_info "dev 서버 기동 중 (port $PORT)..."
  cd "$REPO_ROOT"
  pnpm --filter @storywork/web dev --port "$PORT" &>/tmp/visual-check-dev.log &
  SERVER_PID=$!
  log_info "서버 PID: $SERVER_PID — 준비까지 최대 30초 대기..."

  ATTEMPTS=0
  until curl -sf "http://localhost:$PORT" &>/dev/null; do
    sleep 2
    ATTEMPTS=$((ATTEMPTS + 1))
    if [[ $ATTEMPTS -ge 15 ]]; then
      log_error "dev 서버가 30초 안에 응답하지 않습니다."
      log_error "로그: /tmp/visual-check-dev.log"
      exit 1
    fi
  done
  log_ok "dev 서버 준비 완료"
else
  # 이미 떠 있는지 확인
  if ! curl -sf "http://localhost:$PORT" &>/dev/null; then
    log_error "dev 서버가 localhost:$PORT 에서 응답하지 않습니다."
    log_error ""
    log_error "해결 방법:"
    log_error "  1) 다른 터미널에서: pnpm dev"
    log_error "  2) 또는 --start-server 옵션 사용"
    log_error "  3) 다른 포트면: --port <포트번호>"
    log_error "  4) 외부 URL 캡처: --url <full-url>"
    exit 1
  fi
  log_ok "dev 서버 확인 (localhost:$PORT)"
fi

# ── 출력 디렉토리 생성 ────────────────────────────────────────────────────────
mkdir -p "$OUT_DIR"

# ── TypeScript 래퍼로 위임 ────────────────────────────────────────────────────
if [[ -n "$FULL_URL" ]]; then
  log_info "캡처 시작: $FULL_URL"
else
  log_info "캡처 시작: http://localhost:$PORT$ROUTE"
fi
[[ -n "$SELECTOR" ]] && log_info "셀렉터: $SELECTOR"
if [[ -n "$DEVICE" ]]; then
  log_info "디바이스: $DEVICE | 대기: ${WAIT_MS}ms"
else
  log_info "뷰포트: $VIEWPORT | 대기: ${WAIT_MS}ms"
fi
[[ ${#CLICK_SELECTORS[@]} -gt 0 ]] && log_info "클릭: ${CLICK_SELECTORS[*]}"

ARGS=(
  "--tsconfig" "$REPO_ROOT/tsconfig.scripts.json"
  "$SCRIPT_DIR/visual-check.ts"
  "--wait" "$WAIT_MS"
  "--out" "$OUT_DIR"
)

# --url vs --route
if [[ -n "$FULL_URL" ]]; then
  ARGS+=("--url" "$FULL_URL")
else
  ARGS+=("--route" "$ROUTE" "--port" "$PORT")
fi

# --device vs --viewport
if [[ -n "$DEVICE" ]]; then
  ARGS+=("--device" "$DEVICE")
else
  ARGS+=("--viewport" "$VIEWPORT")
fi

# 선택적 옵션 passthrough
[[ -n "$SELECTOR" ]]           && ARGS+=("--selector" "$SELECTOR")
[[ -n "$SEED_STORAGE" ]]       && ARGS+=("--seed-storage" "$SEED_STORAGE")
[[ -n "$WAIT_FOR_SELECTOR" ]]  && ARGS+=("--wait-for-selector" "$WAIT_FOR_SELECTOR")
[[ -n "$EMULATE_MEDIA" ]]      && ARGS+=("--emulate-media" "$EMULATE_MEDIA")

# --click 반복 (복수 클릭) — set -u 하에서 빈 배열 안전 처리
if [[ ${#CLICK_SELECTORS[@]} -gt 0 ]]; then
  for sel in "${CLICK_SELECTORS[@]}"; do
    ARGS+=("--click" "$sel")
  done
fi

cd "$REPO_ROOT"
pnpm tsx "${ARGS[@]}"
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  # 파일명 생성 (visual-check.ts 에서 동일 로직으로 저장)
  if [[ -n "$FULL_URL" ]]; then
    # URL 경로 기반 slug
    URL_PATH="${FULL_URL#*://}"
    URL_PATH="${URL_PATH#*/}"
    SLUG="prod-${URL_PATH//\//-}"
    [[ "$SLUG" == "prod-" ]] && SLUG="prod-root"
  else
    SLUG="${ROUTE#/}"
    SLUG="${SLUG//\//-}"
    [[ -z "$SLUG" ]] && SLUG="root"
  fi
  OUT_FILE="$OUT_DIR/${SLUG}.png"
  log_ok "캡처 완료: $OUT_FILE"
  echo ""
  echo "  다음 단계:"
  echo "  1) AI 가 이 이미지를 확인합니다 (Read 툴 사용)"
  echo "  2) 사용자 의도와 비교 후 일치하면 push"
  echo "  3) 불일치 시 Step 1 (명세표 작성)으로 돌아감"
else
  log_error "캡처 실패 (exit $EXIT_CODE)"
  exit $EXIT_CODE
fi
