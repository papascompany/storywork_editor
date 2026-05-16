#!/usr/bin/env bash
# visual-check.sh — AI 시각 검증 헬퍼 (FOLLOWUP-51)
#
# 용도: 코드 변경 후 dev 서버에서 특정 라우트/셀렉터를 캡처하여
#       tmp/visual/{slug}.png 로 저장. UI PR 작성 전 반드시 1회 실행.
#
# 사용법:
#   bash scripts/visual-check.sh /editor
#   bash scripts/visual-check.sh /editor "#pose-panel" --viewport 1280x800
#   bash scripts/visual-check.sh /editor --start-server
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
visual-check — StoryWork 시각 검증 스크립트 (FOLLOWUP-51)

사용법:
  bash scripts/visual-check.sh <route> [selector] [options]
  pnpm visual-check <route> [selector] [options]

인자:
  <route>       캡처할 Next.js 라우트 (예: /editor, /admin/resources)
  [selector]    (선택) CSS 셀렉터 — 해당 영역만 캡처 (예: "#pose-panel")

옵션:
  --port <n>          dev 서버 포트 (기본: 3000)
  --viewport <WxH>    뷰포트 크기 (기본: 1280x800)
  --out <dir>         출력 디렉토리 (기본: tmp/visual/)
  --start-server      dev 서버가 없으면 자동 기동 (기본: 이미 떠 있는 서버에 연결)
  --wait <ms>         페이지 로드 후 대기 시간 ms (기본: 2000)
  --help, -h          이 도움말 출력

산출물:
  tmp/visual/<slug>.png   — 전체 또는 셀렉터 영역 스크린샷
  (git-ignored)

예시:
  # 편집기 전체 캡처 (desktop)
  bash scripts/visual-check.sh /editor

  # 포즈 패널 영역만 캡처
  bash scripts/visual-check.sh /editor "#pose-panel"

  # 모바일 뷰포트
  bash scripts/visual-check.sh /editor --viewport 390x844

  # dev 서버 자동 기동 후 캡처
  bash scripts/visual-check.sh /editor --start-server

주의:
  - 기본 동작은 이미 실행 중인 dev 서버(localhost:<port>)에 연결합니다.
  - --start-server 옵션 시에만 pnpm dev 를 백그라운드로 기동합니다.
  - UI PR 작성 전 반드시 1회 실행 후 사용자 의도와 비교하세요.
EOF
  exit 0
}

# ── 인자 파싱 ─────────────────────────────────────────────────────────────────
ROUTE=""
SELECTOR=""
PORT=3000
VIEWPORT="1280x800"
OUT_OVERRIDE=""
START_SERVER=false
WAIT_MS=2000

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) usage ;;
    --port)      PORT="$2";         shift 2 ;;
    --viewport)  VIEWPORT="$2";     shift 2 ;;
    --out)       OUT_OVERRIDE="$2"; shift 2 ;;
    --start-server) START_SERVER=true; shift ;;
    --wait)      WAIT_MS="$2";      shift 2 ;;
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

if [[ -z "$ROUTE" ]]; then
  log_error "라우트 인자가 필요합니다. 예: bash scripts/visual-check.sh /editor"
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

# ── dev 서버 기동 (--start-server 옵션 시) ───────────────────────────────────
SERVER_PID=""

cleanup() {
  if [[ -n "$SERVER_PID" ]]; then
    log_info "dev 서버 종료 (PID $SERVER_PID)..."
    kill "$SERVER_PID" 2>/dev/null || true
  fi
}
trap cleanup EXIT

if $START_SERVER; then
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
    exit 1
  fi
  log_ok "dev 서버 확인 (localhost:$PORT)"
fi

# ── 출력 디렉토리 생성 ────────────────────────────────────────────────────────
mkdir -p "$OUT_DIR"

# ── TypeScript 래퍼로 위임 ────────────────────────────────────────────────────
log_info "캡처 시작: http://localhost:$PORT$ROUTE"
[[ -n "$SELECTOR" ]] && log_info "셀렉터: $SELECTOR"
log_info "뷰포트: $VIEWPORT | 대기: ${WAIT_MS}ms"

ARGS=(
  "--tsconfig" "$REPO_ROOT/tsconfig.scripts.json"
  "$SCRIPT_DIR/visual-check.ts"
  "--route" "$ROUTE"
  "--port" "$PORT"
  "--viewport" "$VIEWPORT"
  "--out" "$OUT_DIR"
  "--wait" "$WAIT_MS"
)
[[ -n "$SELECTOR" ]] && ARGS+=("--selector" "$SELECTOR")

cd "$REPO_ROOT"
pnpm tsx "${ARGS[@]}"
EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  # 파일명 생성 (visual-check.ts 에서 동일 로직으로 저장)
  SLUG="${ROUTE#/}"
  SLUG="${SLUG//\//-}"
  [[ -z "$SLUG" ]] && SLUG="root"
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
