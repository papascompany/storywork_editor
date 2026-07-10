#!/usr/bin/env bash
# check-css-anti-patterns.sh — ADR-0014 universal * reset 금지 검증 (FOLLOWUP-57)
#
# 용도: @layer 바깥에 위치한 universal * selector + padding/margin: 0 조합을 찾아
#       CI 에서 조기 실패시킨다.
#       (2026-05-16 회고 §3 — cascade 순서상 * reset 이 utility class 를 덮어쓰는 버그)
#
# 탐지 로직:
#   - 대상: packages/**/*.css, apps/**/*.css
#     (node_modules, .next, dist, *.min.css 제외)
#   - 휴리스틱: 파일 내 @layer 블록이 열리기 전이거나, @layer 닫힌 후 위치에서
#     "^\s*\*\s*{" 형태의 universal selector 블록을 찾고,
#     그 블록의 닫는 "}" 이전 5줄 내에 "padding\s*:\s*0" 또는 "margin\s*:\s*0" 이 있으면 위반.
#   - @layer base { ... } 내부는 Tailwind preflight 의 정당한 영역이므로 허용.
#
# 사용법:
#   bash scripts/check-css-anti-patterns.sh
#   bash scripts/check-css-anti-patterns.sh --help
#   pnpm check:css-anti
#
# 종료 코드:
#   0 — 위반 없음
#   1 — ADR-0014 위반 발견
#
# CI 위치: lint 직후, typecheck/test/build 이전 (빌드 불필요)

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# ── 색상 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[check-css-anti-patterns]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[check-css-anti-patterns] OK${NC}"; }
log_error() { echo -e "${RED}[check-css-anti-patterns] ERROR${NC} $*" >&2; }

# ── 도움말 ────────────────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
check-css-anti-patterns — ADR-0014 universal selector reset 금지 검증 (FOLLOWUP-57)

사용법:
  bash scripts/check-css-anti-patterns.sh
  pnpm check:css-anti

동작:
  packages/**/*.css 와 apps/**/*.css 에서 @layer 바깥의 universal selector (* { })
  블록 내에 padding: 0 또는 margin: 0 이 있는 패턴을 탐지합니다.

  허용:
    @layer base {
      * { box-sizing: border-box; }   ← Tailwind preflight, OK
    }

  금지:
    * { padding: 0; margin: 0; }     ← @layer 밖, ADR-0014 위반

  이유: @layer 밖의 universal reset 은 cascade 에서 Tailwind utility 클래스(.p-N, .gap-N)
  보다 높은 우선순위를 가져 spacing utility 가 무효화되는 사일런트 버그를 유발합니다.

종료 코드:
  0   위반 없음
  1   ADR-0014 위반 발견 (파일:줄번호 출력)

참조:
  docs/architecture/decisions.md#adr-0014-—-layer-밖-universal-selector-reset-금지
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

# ── CSS 파일 수집 ─────────────────────────────────────────────────────────────
log_info "CSS 파일 탐색 중..."

CSS_FILES=()
while IFS= read -r -d '' file; do
  CSS_FILES+=("$file")
done < <(find "$REPO_ROOT/packages" "$REPO_ROOT/apps" \
  -name "*.css" \
  ! -name "*.min.css" \
  ! -path "*/node_modules/*" \
  ! -path "*/.next/*" \
  ! -path "*/dist/*" \
  ! -path "*/.turbo/*" \
  -print0 2>/dev/null | sort -z)

TOTAL=${#CSS_FILES[@]}
log_info "검사 대상: $TOTAL 개 CSS 파일"

if [[ $TOTAL -eq 0 ]]; then
  log_info "검사할 CSS 파일이 없습니다."
  log_ok
  exit 0
fi

# ── awk 기반 패턴 탐지 ────────────────────────────────────────────────────────
# 전략:
#   1. 전체 중괄호 깊이(depth)와 "@layer 블록 내부 여부"(in_layer 불리언)를 추적한다.
#      최상위(depth 0)에서 @layer 가 열리면 in_layer=1, depth 가 0 으로 돌아오면 in_layer=0.
#   2. in_layer == 0 (레이어 바깥) 에서 universal selector 블록 시작을 감지.
#   3. universal selector 블록이 열린 후 닫히기 전에 padding/margin reset 이 있으면 위반.
VIOLATIONS=()

for css_file in "${CSS_FILES[@]}"; do
  rel_path="${css_file#$REPO_ROOT/}"

  # awk 분석 — 결과: "줄번호" 형태로 위반 줄 번호 출력
  violation_lines=$(awk '
    BEGIN {
      depth = 0            # 전체 중괄호 중첩 깊이
      in_layer = 0         # 최상위 @layer 블록 내부 여부
      in_universal = 0     # @layer 밖 * { } 블록 내부 여부
      universal_depth = 0  # universal 블록이 시작된 중괄호 깊이
    }

    {
      # 이 줄에서 @layer 선언이 시작되는가? (여는 { 판정용)
      line_is_layer = ($0 ~ /@layer[[:space:]]/)

      # 문자 단위로 중괄호 깊이 + @layer/universal 블록 상태 추적
      n = length($0)
      for (i = 1; i <= n; i++) {
        ch = substr($0, i, 1)
        if (ch == "{") {
          if (depth == 0 && line_is_layer) in_layer = 1
          depth++
        } else if (ch == "}") {
          if (in_universal && depth == universal_depth) in_universal = 0
          depth--
          if (depth <= 0) { depth = 0; in_layer = 0 }
        }
      }

      # @layer 밖 universal selector 블록 시작 감지
      # 패턴: 줄이 "  *  {" 또는 "* {" 형태 (앞에 공백 허용, 뒤에 코멘트 허용)
      if (!in_layer && $0 ~ /^[[:space:]]*\*[[:space:]]*\{/) {
        in_universal = 1
        universal_depth = depth
      }

      # universal 블록 안에서 padding: 0 또는 margin: 0 탐지
      if (in_universal) {
        if ($0 ~ /padding[[:space:]]*:[[:space:]]*0/ || $0 ~ /margin[[:space:]]*:[[:space:]]*0/) {
          print NR
        }
      }
    }
  ' "$css_file" 2>/dev/null || true)

  if [[ -n "$violation_lines" ]]; then
    while IFS= read -r lineno; do
      [[ -n "$lineno" ]] && VIOLATIONS+=("${rel_path}:${lineno}")
    done <<< "$violation_lines"
  fi
done

# ── 결과 출력 ─────────────────────────────────────────────────────────────────
if [[ ${#VIOLATIONS[@]} -gt 0 ]]; then
  echo "" >&2
  log_error "ADR-0014 위반 — @layer 바깥 universal * selector reset 감지:"
  echo "" >&2
  for v in "${VIOLATIONS[@]}"; do
    echo -e "  ${RED}${v}${NC}" >&2
  done
  echo "" >&2
  log_error "ADR-0014 위반: docs/architecture/decisions.md#adr-0014-—-layer-밖-universal-selector-reset-금지"
  echo "" >&2
  log_error "수정 방법: universal reset 을 @layer base { } 안으로 이동하거나 제거하세요."
  log_error "Tailwind v4 preflight 가 @layer base 에서 box-sizing/margin/padding 을 이미 reset 합니다."
  exit 1
fi

log_ok
exit 0
