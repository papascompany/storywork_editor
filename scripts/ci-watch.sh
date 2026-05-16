#!/usr/bin/env bash
# ci-watch.sh — GitHub Actions CI polling 자동화 (FOLLOWUP-52)
#
# 용도: push 직후 현재 브랜치 HEAD 의 GitHub Actions 워크플로 run 을 추적.
#       성공/실패 를 명확한 종료 코드로 반환하고, 실패 시 핵심 로그를 stdout.
#
# 사용법:
#   bash scripts/ci-watch.sh
#   bash scripts/ci-watch.sh --workflow "CI"
#   bash scripts/ci-watch.sh --timeout 600
#   bash scripts/ci-watch.sh --help
#   pnpm ci-watch
#
# 의존:
#   - gh CLI (brew install gh 또는 https://cli.github.com)
#   - gh auth login 완료 상태
#   - git (현재 브랜치/HEAD SHA 읽기)
#
# 종료 코드:
#   0 — CI 성공
#   1 — CI 실패 (실패 로그 요약 출력)
#   2 — gh CLI 없음 / auth 미완료 / run 찾기 실패
#   3 — 타임아웃

set -euo pipefail

# ── 색상 ──────────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

log_info()  { echo -e "${CYAN}[ci-watch]${NC} $*"; }
log_ok()    { echo -e "${GREEN}[ci-watch] OK${NC} $*"; }
log_warn()  { echo -e "${YELLOW}[ci-watch] WARN${NC} $*"; }
log_error() { echo -e "${RED}[ci-watch] ERROR${NC} $*" >&2; }
log_fail()  { echo -e "${RED}${BOLD}[ci-watch] FAIL${NC} $*" >&2; }

# ── 도움말 ────────────────────────────────────────────────────────────────────
usage() {
  cat <<'EOF'
ci-watch — GitHub Actions CI 자동 polling (FOLLOWUP-52)

사용법:
  bash scripts/ci-watch.sh [옵션]
  pnpm ci-watch [옵션]

옵션:
  --workflow <name>   추적할 워크플로 이름 (기본: 모든 워크플로)
  --branch <name>     추적할 브랜치 (기본: 현재 브랜치)
  --sha <SHA>         추적할 커밋 SHA (기본: HEAD)
  --timeout <sec>     최대 대기 시간 (기본: 600초 / 10분)
  --poll <sec>        polling 간격 (기본: 15초)
  --no-log            실패 시 로그 요약 생략
  --help, -h          이 도움말 출력

종료 코드:
  0   CI 전체 성공
  1   CI 실패 (실패 로그 자동 요약)
  2   gh CLI 없음 / auth 미완료 / run 찾기 실패
  3   타임아웃

예시:
  # push 후 즉시 실행
  bash scripts/ci-watch.sh

  # 특정 워크플로만 추적
  bash scripts/ci-watch.sh --workflow "CI"

  # 더 오래 대기
  bash scripts/ci-watch.sh --timeout 900

  # PR 흐름에서 머지 전 게이트로 사용
  bash scripts/ci-watch.sh && gh pr merge --squash

주의:
  - gh auth login 이 완료되어 있어야 합니다.
  - gh CLI 가 없으면 exit 2 + 설치 안내를 출력합니다 (hang 없음).
  - 공개 리포지터리가 아닌 경우 gh auth token 에 'repo' 스코프 필요.
EOF
  exit 0
}

# ── 인자 파싱 ─────────────────────────────────────────────────────────────────
WORKFLOW_NAME=""
BRANCH_NAME=""
TARGET_SHA=""
TIMEOUT_SEC=600
POLL_SEC=15
SHOW_LOG=true

while [[ $# -gt 0 ]]; do
  case "$1" in
    --help|-h)       usage ;;
    --workflow)      WORKFLOW_NAME="$2"; shift 2 ;;
    --branch)        BRANCH_NAME="$2";  shift 2 ;;
    --sha)           TARGET_SHA="$2";   shift 2 ;;
    --timeout)       TIMEOUT_SEC="$2";  shift 2 ;;
    --poll)          POLL_SEC="$2";     shift 2 ;;
    --no-log)        SHOW_LOG=false;    shift ;;
    *)
      log_error "알 수 없는 옵션: $1 (--help 로 도움말 확인)"
      exit 2
      ;;
  esac
done

# ── gh CLI 확인 ───────────────────────────────────────────────────────────────
if ! command -v gh &>/dev/null; then
  log_error "gh CLI 가 설치되어 있지 않습니다."
  log_error ""
  log_error "설치 방법:"
  log_error "  macOS: brew install gh"
  log_error "  기타:  https://cli.github.com/manual/installation"
  exit 2
fi

# auth 상태 확인
if ! gh auth status &>/dev/null; then
  log_error "gh CLI 인증이 완료되지 않았습니다."
  log_error ""
  log_error "해결 방법: gh auth login"
  exit 2
fi

# ── git 정보 ─────────────────────────────────────────────────────────────────
if [[ -z "$BRANCH_NAME" ]]; then
  BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo '')"
  if [[ -z "$BRANCH_NAME" || "$BRANCH_NAME" == "HEAD" ]]; then
    log_error "현재 브랜치를 감지할 수 없습니다. --branch 옵션으로 직접 지정하세요."
    exit 2
  fi
fi

if [[ -z "$TARGET_SHA" ]]; then
  TARGET_SHA="$(git rev-parse HEAD 2>/dev/null || echo '')"
  if [[ -z "$TARGET_SHA" ]]; then
    log_error "HEAD SHA 를 읽을 수 없습니다. git 리포지터리인지 확인하세요."
    exit 2
  fi
fi

SHA_SHORT="${TARGET_SHA:0:7}"

log_info "브랜치: ${BRANCH_NAME} | 커밋: ${SHA_SHORT}"
log_info "최대 대기: ${TIMEOUT_SEC}s | polling: ${POLL_SEC}s"

# ── run ID 탐색 ───────────────────────────────────────────────────────────────
log_info "GitHub Actions run 탐색 중..."

START_TIME=$(date +%s)
RUN_ID=""

# push 직후라면 run 이 아직 트리거 안 됐을 수 있으므로 최대 60초 대기
FIND_DEADLINE=$((START_TIME + 60))

while [[ -z "$RUN_ID" ]]; do
  NOW=$(date +%s)
  if [[ $NOW -ge $FIND_DEADLINE ]]; then
    log_error "60초 안에 run 을 찾지 못했습니다."
    log_error ""
    log_error "확인 사항:"
    log_error "  1) push 가 실제로 완료됐는지: git log --oneline -1"
    log_error "  2) GitHub Actions 가 이 리포지터리에서 활성화됐는지"
    log_error "  3) 워크플로 파일이 .github/workflows/ 에 존재하는지"
    log_error "  4) gh auth token 에 repo 스코프가 있는지: gh auth status"
    exit 2
  fi

  # gh run list 로 최신 run 탐색
  GH_ARGS=(run list --branch "$BRANCH_NAME" --limit 5 --json "databaseId,headSha,name,status,conclusion")
  [[ -n "$WORKFLOW_NAME" ]] && GH_ARGS+=(--workflow "$WORKFLOW_NAME")

  # gh run list 출력에서 HEAD SHA 매칭
  RUNS_JSON="$(gh "${GH_ARGS[@]}" 2>/dev/null || echo '[]')"

  RUN_ID="$(echo "$RUNS_JSON" | \
    node --input-type=module --eval "
      import { createInterface } from 'readline';
      let data = '';
      process.stdin.on('data', c => data += c);
      process.stdin.on('end', () => {
        try {
          const runs = JSON.parse(data);
          const sha = '${TARGET_SHA}';
          const match = runs.find(r => r.headSha === sha || r.headSha.startsWith(sha.slice(0,7)));
          if (match) process.stdout.write(String(match.databaseId));
        } catch {}
      });
    " 2>/dev/null || echo '')"

  if [[ -z "$RUN_ID" ]]; then
    log_info "run 대기 중... (${SHA_SHORT})"
    sleep "$POLL_SEC"
  fi
done

log_ok "run 발견 (ID: ${RUN_ID})"
log_info "https://github.com/$(gh repo view --json nameWithOwner -q .nameWithOwner 2>/dev/null)/actions/runs/${RUN_ID}"

# ── polling 루프 ──────────────────────────────────────────────────────────────
DEADLINE=$((START_TIME + TIMEOUT_SEC))
LAST_STATUS=""

while true; do
  NOW=$(date +%s)
  if [[ $NOW -ge $DEADLINE ]]; then
    log_warn "타임아웃 (${TIMEOUT_SEC}초). CI 결과를 확인하세요:"
    log_warn "  gh run view $RUN_ID"
    exit 3
  fi

  # run 상태 조회
  RUN_INFO="$(gh run view "$RUN_ID" --json "status,conclusion,name" 2>/dev/null || echo '{}')"
  STATUS="$(echo "$RUN_INFO" | node --input-type=module --eval "
    import { createInterface } from 'readline';
    let data = '';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try { process.stdout.write(JSON.parse(data).status ?? ''); } catch {}
    });
  " 2>/dev/null || echo '')"

  CONCLUSION="$(echo "$RUN_INFO" | node --input-type=module --eval "
    import { createInterface } from 'readline';
    let data = '';
    process.stdin.on('data', c => data += c);
    process.stdin.on('end', () => {
      try { process.stdout.write(JSON.parse(data).conclusion ?? ''); } catch {}
    });
  " 2>/dev/null || echo '')"

  if [[ "$STATUS" != "$LAST_STATUS" ]]; then
    ELAPSED=$((NOW - START_TIME))
    log_info "상태: ${STATUS} | 경과: ${ELAPSED}s"
    LAST_STATUS="$STATUS"
  fi

  # 완료 판정
  if [[ "$STATUS" == "completed" ]]; then
    ELAPSED=$((NOW - START_TIME))
    if [[ "$CONCLUSION" == "success" ]]; then
      log_ok "CI 성공 (${SHA_SHORT} | ${ELAPSED}s)"
      exit 0
    else
      log_fail "CI 실패 (결론: ${CONCLUSION} | ${ELAPSED}s)"

      if $SHOW_LOG; then
        echo ""
        log_info "실패 로그 요약 (최근 50줄):"
        echo "─────────────────────────────────────────────────────────────────"
        gh run view "$RUN_ID" --log-failed 2>/dev/null | tail -50 || \
          log_warn "실패 로그를 가져올 수 없습니다."
        echo "─────────────────────────────────────────────────────────────────"
        echo ""
        log_info "전체 로그: gh run view $RUN_ID --log-failed"
        log_info "웹 보기:   gh run view $RUN_ID --web"
      fi
      exit 1
    fi
  fi

  # 아직 진행 중
  sleep "$POLL_SEC"
done
