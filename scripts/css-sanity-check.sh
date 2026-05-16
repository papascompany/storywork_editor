#!/usr/bin/env bash
# css-sanity-check.sh — 빌드 산출물 Tailwind utility 존재 검증 (FOLLOWUP-55)
#
# 용도: next build 후 .next/static/css/*.css 에 핵심 spacing utility 12개가
#       실제로 포함됐는지 확인한다.
#       @source 누락이나 기타 설정 실수로 utility 가 미생성된 경우 조기 차단.
#       (2026-05-16 회고 §3 — utility 누락 사일런트 버그의 빌드 단계 게이트)
#
# 사용법:
#   bash scripts/css-sanity-check.sh
#   bash scripts/css-sanity-check.sh --help
#   pnpm check:css-sanity
#
# 종료 코드:
#   0 — 모든 utility 확인됨
#   1 — 누락된 utility 발견
#   2 — 빌드 산출물 없음 (pnpm build 를 먼저 실행)
#
# CI 위치: build 단계 이후

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── 색상 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[css-sanity]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[css-sanity] OK${NC} — 모든 utility rule 생성됨"; }
log_warn()  { echo -e "${YELLOW}[css-sanity] WARN${NC} $*"; }
log_error() { echo -e "${RED}[css-sanity] ERROR${NC} $*" >&2; }

# ── 도움말 ────────────────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
css-sanity-check — 빌드 산출물 Tailwind utility 존재 검증 (FOLLOWUP-55)

사용법:
  bash scripts/css-sanity-check.sh
  pnpm check:css-sanity

전제 조건:
  pnpm build 가 완료되어 다음 경로가 존재해야 합니다:
    apps/web/.next/static/css/
    apps/admin/.next/static/css/

동작:
  위 두 경로의 *.css 파일에서 핵심 spacing utility 12개를 검증합니다:
    .p-1  .p-4  .p-5  .p-6  .p-8
    .gap-2  .gap-4  .gap-5  .gap-8
    .px-4  .py-4  .mx-auto

  Tailwind v4 출력 형식: .p-4{padding:calc(var(--spacing)*4)}
  → "\.p-4{" 또는 ".p-4 {" 형식으로 grep 합니다.

종료 코드:
  0   모든 utility 확인됨
  1   누락된 utility 발견
  2   빌드 산출물 없음 (pnpm build 먼저 실행)

참조:
  ADR-0013: docs/architecture/decisions.md#adr-0013-—-tailwind-v4-monorepo-source-directive-의무화
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

# ── 빌드 산출물 확인 ──────────────────────────────────────────────────────────
WEB_CSS_DIR="$REPO_ROOT/apps/web/.next/static/css"
ADMIN_CSS_DIR="$REPO_ROOT/apps/admin/.next/static/css"

BUILD_MISSING=0

if [[ ! -d "$WEB_CSS_DIR" ]]; then
  log_error "apps/web/.next/static/css 가 없습니다."
  BUILD_MISSING=1
fi

if [[ ! -d "$ADMIN_CSS_DIR" ]]; then
  log_error "apps/admin/.next/static/css 가 없습니다."
  BUILD_MISSING=1
fi

if [[ $BUILD_MISSING -ne 0 ]]; then
  log_error ""
  log_error "[css-sanity] ERROR: 빌드 산출물 없음. pnpm build 먼저 실행하세요."
  exit 2
fi

# ── 검증할 utility 목록 ───────────────────────────────────────────────────────
declare -a UTILITIES=(
  ".p-1"
  ".p-4"
  ".p-5"
  ".p-6"
  ".p-8"
  ".gap-2"
  ".gap-4"
  ".gap-5"
  ".gap-8"
  ".px-4"
  ".py-4"
  ".mx-auto"
)

# ── CSS 파일 수집 ─────────────────────────────────────────────────────────────
declare -a TARGET_DIRS=("$WEB_CSS_DIR" "$ADMIN_CSS_DIR")
declare -a TARGET_LABELS=("apps/web" "apps/admin")

FAIL=0
MISSING_ITEMS=()

for idx in 0 1; do
  css_dir="${TARGET_DIRS[$idx]}"
  label="${TARGET_LABELS[$idx]}"

  # *.css 파일 모두 수집하여 하나의 임시 파일로 병합 (grep 단순화)
  css_files=()
  while IFS= read -r -d '' f; do
    css_files+=("$f")
  done < <(find "$css_dir" -name "*.css" -print0 2>/dev/null | sort -z)

  if [[ ${#css_files[@]} -eq 0 ]]; then
    log_warn "$label: CSS 파일 없음 (빌드 결과가 비어있음)"
    MISSING_ITEMS+=("(no CSS file) in $label")
    FAIL=1
    continue
  fi

  log_info "$label: ${#css_files[@]}개 CSS 파일 검사 중..."

  for utility in "${UTILITIES[@]}"; do
    # Tailwind v4 는 .p-4{ 또는 .p-4 { 형식으로 출력
    # grep -E 로 두 형식 모두 탐지
    pattern="${utility//./\\.}[[:space:]]*\{"
    found=0

    for css_file in "${css_files[@]}"; do
      if grep -qE "$pattern" "$css_file" 2>/dev/null; then
        found=1
        break
      fi
    done

    if [[ $found -eq 0 ]]; then
      rel_dir="${css_dir#$REPO_ROOT/}"
      MISSING_ITEMS+=("MISSING: ${utility} in ${rel_dir}")
      FAIL=1
    fi
  done
done

# ── 결과 출력 ─────────────────────────────────────────────────────────────────
if [[ $FAIL -ne 0 ]]; then
  echo "" >&2
  for item in "${MISSING_ITEMS[@]}"; do
    log_error "$item"
  done
  echo "" >&2
  log_error "Tailwind utility 가 빌드 CSS 에 없습니다."
  log_error ""
  log_error "가능한 원인:"
  log_error "  1) packages/shared-ui/src/styles/globals.css 에 @source 누락 → check:css-source 실행"
  log_error "  2) @layer 밖 * { } reset 이 utility 를 덮어쓰는 경우 → check:css-anti 실행"
  log_error "  3) 빌드가 오래됐거나 캐시 문제 → pnpm build --force"
  log_error ""
  log_error "ADR-0013: docs/architecture/decisions.md#adr-0013-—-tailwind-v4-monorepo-source-directive-의무화"
  exit 1
fi

log_ok
exit 0
