#!/usr/bin/env bash
# visual-regression.sh — 시각 회귀 자동화 배치 실행기 (DESIGN-04)
#
# 용도: 대상 페이지 14개를 Playwright 로 캡처 → 기존 snapshot 과 픽셀 비교.
#       spacing/layout/색상 회귀를 차단. dev 서버(web+admin) 가 떠 있어야 함.
#
# 사용법:
#   bash scripts/visual-regression.sh                 # compare 모드
#   bash scripts/visual-regression.sh --update        # baseline 갱신
#   bash scripts/visual-regression.sh --only-web      # web 만
#   bash scripts/visual-regression.sh --filter "login"
#   bash scripts/visual-regression.sh --help
#   pnpm visual-regression
#   pnpm visual-regression:update
#
# CI 환경:
#   - WEB_PORT / ADMIN_PORT 환경변수로 포트 오버라이드 가능
#   - SKIP_SERVER_CHECK=1 로 readiness 체크 생략 (CI 서버 선기동 후 사용)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SCRIPT_DIR="$REPO_ROOT/scripts"

# ── 색상 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[visual-regression]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[visual-regression] OK${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[visual-regression] WARN${NC} $*"; }
log_error() { echo -e "${RED}[visual-regression] ERROR${NC} $*" >&2; }

# ── 도움말 ────────────────────────────────────────────────────────────────────
if [[ "${1:-}" == "--help" || "${1:-}" == "-h" ]]; then
  cat <<'EOF'
visual-regression.sh — StoryWork 시각 회귀 배치 실행기 (DESIGN-04)

사용법:
  bash scripts/visual-regression.sh [options]
  pnpm visual-regression          # compare 모드
  pnpm visual-regression:update   # baseline 갱신

옵션:
  --update              baseline 모드 (의도적 UI 변경 시 snapshot 갱신)
  --threshold <n>       픽셀 색 차이 허용 비율 (기본: 0.15)
  --max-diff-ratio <n>  diff 픽셀 비율 허용치 (기본: 0.05)
  --filter <regex>      특정 페이지 이름만 실행
  --only-web            web 페이지만 실행 (port 3000)
  --only-admin          admin 페이지만 실행 (port 3001)
  --help, -h            이 도움말

환경변수:
  WEB_PORT=3000         web dev 서버 포트 (기본: 3000)
  ADMIN_PORT=3001       admin dev 서버 포트 (기본: 3001)
  SKIP_SERVER_CHECK=1   readiness 체크 생략 (CI 선기동)
  VISUAL_REGRESSION_UPDATE=1  --update 와 동일

사전 조건:
  - pnpm dev (web port 3000 + admin port 3001) 가 실행 중이어야 함
  - 또는 CI 에서 production build 를 기동한 후 SKIP_SERVER_CHECK=1

산출물:
  tests/visual-regression/snapshots/*.png  — baseline PNG (git tracked)

baseline 갱신 SOP:
  1. UI 변경 후 dev 서버 기동
  2. pnpm visual-regression:update
  3. snapshots/ 변경사항을 PR 에 함께 commit
  4. PR 리뷰어가 snapshot diff 검토
EOF
  exit 0
fi

# ── 포트 설정 ─────────────────────────────────────────────────────────────────
WEB_PORT="${WEB_PORT:-3000}"
ADMIN_PORT="${ADMIN_PORT:-3001}"
SKIP_SERVER_CHECK="${SKIP_SERVER_CHECK:-0}"

# ── 인자 통과 준비 ────────────────────────────────────────────────────────────
PASSTHROUGH_ARGS=("$@")

# --only-web / --only-admin 감지해 서버 체크 범위 결정
ONLY_WEB=false
ONLY_ADMIN=false
for arg in "$@"; do
  [[ "$arg" == "--only-web" ]]   && ONLY_WEB=true
  [[ "$arg" == "--only-admin" ]] && ONLY_ADMIN=true
done

# ── Node.js / pnpm 확인 ───────────────────────────────────────────────────────
if ! command -v node &>/dev/null; then
  log_error "Node.js 가 설치되어 있지 않습니다."
  exit 1
fi
if ! command -v pnpm &>/dev/null; then
  log_error "pnpm 이 설치되어 있지 않습니다."
  exit 1
fi

# ── dev 서버 readiness 체크 ───────────────────────────────────────────────────
check_server() {
  local port="$1"
  local label="$2"
  if curl -sf "http://localhost:${port}" &>/dev/null || \
     curl -sf "http://localhost:${port}/login" &>/dev/null; then
    log_ok "${label} (localhost:${port})"
  else
    log_error "${label} 가 localhost:${port} 에서 응답하지 않습니다."
    log_error ""
    log_error "해결 방법:"
    log_error "  1) 다른 터미널에서 pnpm dev 실행"
    log_error "  2) 또는 SKIP_SERVER_CHECK=1 (CI 환경)"
    log_error "  3) 다른 포트라면 WEB_PORT=<n> ADMIN_PORT=<n> 환경변수 사용"
    exit 1
  fi
}

if [[ "$SKIP_SERVER_CHECK" != "1" ]]; then
  log_info "dev 서버 readiness 확인..."
  if ! $ONLY_ADMIN; then
    check_server "$WEB_PORT" "web"
  fi
  if ! $ONLY_WEB; then
    check_server "$ADMIN_PORT" "admin"
  fi
else
  log_info "SKIP_SERVER_CHECK=1 — readiness 체크 생략"
fi

# ── snapshot 디렉토리 보장 ────────────────────────────────────────────────────
SNAPSHOT_DIR="$REPO_ROOT/tests/visual-regression/snapshots"
mkdir -p "$SNAPSHOT_DIR"

# ── TypeScript 실행 ───────────────────────────────────────────────────────────
log_info "시각 회귀 실행 시작..."
log_info "snapshots: $SNAPSHOT_DIR"

cd "$REPO_ROOT"
pnpm tsx \
  --tsconfig "$REPO_ROOT/tsconfig.scripts.json" \
  "$SCRIPT_DIR/visual-regression.ts" \
  "${PASSTHROUGH_ARGS[@]}"

EXIT_CODE=$?

if [[ $EXIT_CODE -eq 0 ]]; then
  log_ok "시각 회귀 완료"
else
  log_error "시각 회귀 실패 (exit $EXIT_CODE)"
  echo ""
  echo "  의도적 UI 변경이라면:"
  echo "    pnpm visual-regression:update"
  echo "  또는:"
  echo "    bash scripts/visual-regression.sh --update"
  exit $EXIT_CODE
fi
