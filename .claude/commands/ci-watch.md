---
description: push 직후 GitHub Actions CI 결과를 자동 polling. 실패 시 핵심 로그 요약 출력.
---

# /ci-watch — CI 자동 polling 커맨드 (FOLLOWUP-52)

## 목적

push 직후 GitHub Actions 워크플로 run 을 추적해 성공/실패를 명확히 확인한다.
실패 시 핵심 로그를 자동 요약해 다음 작업 전 즉시 수정할 수 있게 한다.

**PR 머지 전 반드시 이 커맨드로 CI green 을 확인한다.**

## 사용법

```
/ci-watch [--workflow <name>] [--timeout <sec>]
```

### 예시

```bash
# push 직후 기본 실행
/ci-watch

# 특정 워크플로만 추적
/ci-watch --workflow "CI"

# CI 성공 확인 후 PR 머지
/ci-watch && gh pr merge --squash
```

## 실행 절차

이 커맨드를 받으면 다음을 실행한다:

```bash
bash /Users/yohan/Documents/claude/storywork/scripts/ci-watch.sh [옵션]
```

또는:

```bash
pnpm ci-watch [옵션]
```

## 종료 코드

| 코드 | 의미                                         |
| ---- | -------------------------------------------- |
| 0    | CI 전체 성공 → 다음 작업 진행 가능           |
| 1    | CI 실패 → 실패 로그 확인 후 수정 필요        |
| 2    | gh CLI 없음 / auth 미완료 → 설치/로그인 필요 |
| 3    | 타임아웃 (10분) → 수동 확인 필요             |

## orchestrator PR 흐름 통합

PR 생성/머지 흐름에서 다음 순서를 따른다:

```
1. git push
2. /ci-watch          ← 이 커맨드
3. CI exit 0 → gh pr create / gh pr merge
4. CI exit 1 → 실패 로그 확인 → 수정 → git push → /ci-watch 재실행
```

push 후 CI 확인 없이 PR을 만들지 않는다.

## 의존 조건

- `gh` CLI 설치: `brew install gh`
- `gh auth login` 완료 (repo 스코프 필요)
- GitHub Actions 가 리포지터리에서 활성화됨

gh CLI 가 없으면 exit 2 + 설치 안내를 출력하고 hang 없이 종료한다.

## package.json 스크립트

루트 `package.json` 에 등록됨:

```json
"ci-watch": "bash scripts/ci-watch.sh"
```

## 실패 로그 예시 출력

```
[ci-watch] FAIL CI 실패 (결론: failure | 47s)

[ci-watch] 실패 로그 요약 (최근 50줄):
─────────────────────────────────────────────────────────────────
Run pnpm lint
...
ESLint: 3 errors found
─────────────────────────────────────────────────────────────────

[ci-watch] 전체 로그: gh run view 12345 --log-failed
[ci-watch] 웹 보기:   gh run view 12345 --web
```
