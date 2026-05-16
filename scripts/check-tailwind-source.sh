#!/usr/bin/env bash
# check-tailwind-source.sh — ADR-0013 Tailwind @source directive 검증 (FOLLOWUP-56)
#
# 용도: packages/shared-ui/src/styles/globals.css 에 모노레포 전체를 커버하는
#       @source 3개가 존재하는지 정적으로 검사한다.
#       누락 시 Tailwind v4 의 사일런트 utility 누락 버그가 재발한다.
#       (2026-05-16 회고 §3 — root cause: @source 부재로 유틸리티 클래스 미생성)
#
# 사용법:
#   bash scripts/check-tailwind-source.sh
#   bash scripts/check-tailwind-source.sh --help
#   pnpm check:css-source
#
# 종료 코드:
#   0 — 검증 통과
#   1 — 누락된 @source 발견 (ADR-0013 위반)
#
# CI 위치: lint 직후, typecheck/test/build 이전 (빌드 불필요)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_CSS="$REPO_ROOT/packages/shared-ui/src/styles/globals.css"

# ── 색상 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[check-tailwind-source]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[check-tailwind-source] OK${NC}"; }
log_error() { echo -e "${RED}[check-tailwind-source] ERROR${NC} $*" >&2; }

# ── 도움말 ────────────────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
check-tailwind-source — ADR-0013 Tailwind @source directive 검증 (FOLLOWUP-56)

사용법:
  bash scripts/check-tailwind-source.sh
  pnpm check:css-source

동작:
  packages/shared-ui/src/styles/globals.css 에 다음 @source 3개가 모두 있는지 확인합니다:
    @source "../../../../apps/web"
    @source "../../../../apps/admin"
    @source "../../../../packages"

  Tailwind v4 는 @import 한 CSS 파일이 속한 패키지만 자동 scan 하므로,
  모노레포 전체를 커버하려면 이 3개 directive 가 필수입니다. (ADR-0013)

종료 코드:
  0   검증 통과
  1   ADR-0013 위반 — 누락된 @source 발견

참조:
  docs/architecture/decisions.md#adr-0013-—-tailwind-v4-monorepo-source-directive-의무화
EOF
  exit 0
}

# ── 인자 파싱 ─────────────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h) usage ;;
    *)
      log_error "알 수 없는 옵션: $1 (--help 로 도움말 확인)"
      exit 1
      ;;
  esac
done

# ── 대상 파일 존재 확인 ───────────────────────────────────────────────────────
if [[ ! -f "$TARGET_CSS" ]]; then
  log_error "대상 파일이 존재하지 않습니다: $TARGET_CSS"
  log_error "packages/shared-ui/src/styles/globals.css 경로를 확인하세요."
  exit 1
fi

log_info "검사 대상: packages/shared-ui/src/styles/globals.css"

# ── @source 3개 검증 ──────────────────────────────────────────────────────────
declare -a REQUIRED_SOURCES=(
  '@source "../../../../apps/web"'
  '@source "../../../../apps/admin"'
  '@source "../../../../packages"'
)

FAIL=0

for source_line in "${REQUIRED_SOURCES[@]}"; do
  if grep -qF "$source_line" "$TARGET_CSS"; then
    log_info "  FOUND: $source_line"
  else
    log_error "  MISSING: $source_line"
    FAIL=1
  fi
done

# ── 결과 출력 ─────────────────────────────────────────────────────────────────
if [[ $FAIL -ne 0 ]]; then
  echo "" >&2
  log_error "ADR-0013 위반: docs/architecture/decisions.md#adr-0013-—-tailwind-v4-monorepo-source-directive-의무화"
  log_error ""
  log_error "수정 방법: packages/shared-ui/src/styles/globals.css 에 누락된 @source 를 추가하세요."
  log_error ""
  log_error "예시:"
  log_error '  @source "../../../../apps/web";'
  log_error '  @source "../../../../apps/admin";'
  log_error '  @source "../../../../packages";'
  exit 1
fi

log_ok
exit 0
