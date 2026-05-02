---
description: 프로젝트의 대본을 분석하고 페이지를 자동 배치 (analyze-script → recommend → compose)
argument-hint: "<projectId>"
---

`scene-analyzer` → `layout-composer` 순으로 위임:

1. `scene-analyzer`: `Project($1).script` 를 `SceneDoc` 으로 변환, 골든셋 회귀 확인 후 저장
2. `layout-composer`: 각 Scene 에 대해 `recommendPose/Bg/Bubble` → `compose()` → `Page.fabricJson` 초안 작성
3. 결과 페이지의 충돌/safe area 위반 0 검증
4. 사용자에게 미리보기 URL 안내
