---
description: 변경 PR에 simplify + security-review 를 차례로 실행
---

현재 브랜치의 변경 사항에 대해:

1. `simplify` 스킬 실행 — 중복/복잡도/불필요 추상화 제거 제안 후 자동 적용 가능한 것은 적용
2. `security-review` 스킬 실행 — 사용자 입력/업로드(매직바이트·EXIF·재인코딩)/SVG(향후)/SSRF 점검
3. `qa-tester` 위임 — 영향 받는 모듈의 테스트 추가 보강
4. 결과를 PR description 의 "Self-Review" 섹션에 반영
