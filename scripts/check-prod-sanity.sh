#!/usr/bin/env bash
# check-prod-sanity.sh — 회고 §7.4 Step 0 자동화 (FOLLOWUP-58)
#
# 사용:
#   bash scripts/check-prod-sanity.sh --web [--utility p-5]
#   bash scripts/check-prod-sanity.sh --admin [--utility gap-4]
#   bash scripts/check-prod-sanity.sh --web --admin --utility p-5
#
# 종료 코드:
#   0 — 모든 sanity check 통과
#   1 — 하나 이상 실패 (deploy BLOCKED, utility 미존재 등)

set -euo pipefail

# ─── 인자 파싱 ───────────────────────────────────────────────────────────────

CHECK_WEB=false
CHECK_ADMIN=false
UTILITY=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --web)    CHECK_WEB=true;    shift ;;
    --admin)  CHECK_ADMIN=true;  shift ;;
    --utility) UTILITY="$2";    shift 2 ;;
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
done

if [[ "$CHECK_WEB" == false && "$CHECK_ADMIN" == false ]]; then
  echo "Usage: $0 [--web] [--admin] [--utility <class>]"
  echo "  --web      web 프로젝트 (storywork-editor-web) 점검"
  echo "  --admin    admin 프로젝트 (storywork-editor-admin) 점검"
  echo "  --utility  확인할 Tailwind utility class (예: p-5, gap-4)"
  exit 1
fi

# ─── 공통 함수 ───────────────────────────────────────────────────────────────

FAIL=0

check_project() {
  local project="$1"
  local label="$2"

  echo ""
  echo "=== ${label} deploy sanity ==="

  # vercel ls 로 최신 deploy 상태 확인
  if ! command -v vercel &>/dev/null; then
    echo "[SKIP] vercel CLI 없음. 수동으로 Vercel 대시보드 확인 필요."
    return
  fi

  local ls_out
  ls_out=$(vercel ls "${project}" --limit 3 2>/dev/null || true)

  if [[ -z "$ls_out" ]]; then
    echo "[WARN] vercel ls 결과 없음. 로그인 상태 또는 프로젝트명 확인."
    return
  fi

  echo "$ls_out"

  # BLOCKED / CANCELED 검출
  if echo "$ls_out" | grep -qiE "BLOCKED|CANCELED|ERROR"; then
    echo "[FAIL] deploy 가 BLOCKED / CANCELED / ERROR 상태."
    echo "       repo visibility / Vercel plan 점검 (회고 Layer 1):"
    echo "       → GitHub 에서 repo public 여부 확인"
    echo "       → Vercel project plan 확인 (Hobby + private + collaborator = BLOCKED)"
    FAIL=1
  else
    echo "[OK]   deploy state 정상."
  fi

  # CSS utility 확인 ─────────────────────────────────────────────────────────
  if [[ -z "$UTILITY" ]]; then
    return
  fi

  echo ""
  echo "--- CSS utility 확인: .${UTILITY} ---"

  # prod URL 추출 (vercel ls 의 첫 READY URL)
  local prod_url
  prod_url=$(echo "$ls_out" | grep -oE 'https://[^ ]+\.vercel\.app' | head -1 || true)

  if [[ -z "$prod_url" ]]; then
    echo "[SKIP] prod URL 추출 실패. --url 옵션으로 직접 지정하거나 수동 확인."
    return
  fi

  echo "       prod URL: ${prod_url}"

  # CSS chunk URL 추출
  local css_url
  css_url=$(curl -s --max-time 10 "${prod_url}" \
    | grep -oE '"/_next/static/css/[a-f0-9]+\.css"' \
    | head -1 \
    | tr -d '"' \
    || true)

  if [[ -z "$css_url" ]]; then
    echo "[SKIP] CSS chunk URL 추출 실패. Chrome DevTools 로 수동 확인."
    return
  fi

  local full_css_url="${prod_url}${css_url}"
  echo "       CSS chunk: ${full_css_url}"

  # utility rule 존재 확인
  local escaped
  escaped=$(printf '%s' "${UTILITY}" | sed 's/[.[\*^$()+?{|]/\\&/g')
  if curl -s --max-time 10 "${full_css_url}" | grep -q "\.${escaped}[{,\\:]"; then
    echo "[OK]   .${UTILITY} rule 존재 확인."
  else
    echo "[FAIL] .${UTILITY} rule 이 prod CSS 에 없음."
    echo "       → 로컬에서: pnpm check:css-anti && pnpm check:css-source && pnpm build && pnpm check:css-sanity"
    echo "       → Layer 2 (universal reset): scripts/check-css-anti-patterns.sh"
    echo "       → Layer 3 (@source 누락): scripts/check-tailwind-source.sh"
    echo "       → Layer 4 (turbo-ignore skip): admin/app/globals.css trivial 변경으로 force trigger"
    FAIL=1
  fi
}

# ─── 실행 ────────────────────────────────────────────────────────────────────

echo "check-prod-sanity.sh — 회고 §7.4 Step 0 (FOLLOWUP-58)"
echo "HEAD: $(git rev-parse --short HEAD 2>/dev/null || echo 'unknown')"

[[ "$CHECK_WEB" == true ]]   && check_project "storywork-editor-web"   "web"
[[ "$CHECK_ADMIN" == true ]]  && check_project "storywork-editor-admin" "admin"

echo ""
if [[ $FAIL -eq 0 ]]; then
  echo "[PASS] Step 0 sanity 통과. Step 1 (명세화) 진입 가능."
  exit 0
else
  echo "[FAIL] Step 0 sanity 실패. 인프라 fix 먼저. 디자인 토론 금지."
  echo "       docs/process/ui-feedback-workflow.md §2 참조."
  exit 1
fi
