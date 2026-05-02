# Agent Orchestration — 협업 시퀀스

## 1. 도구 풍경
```
┌─────────────────────────────────────────────────────────────┐
│ 휴먼 (PM/디자이너/엔지니어)                                  │
└──────────┬───────────────┬───────────────┬──────────────────┘
           │               │               │
           ▼               ▼               ▼
   ┌──────────────┐ ┌─────────────┐ ┌─────────────┐
   │ Claude Code  │ │ Claude (UI) │ │  Cursor     │
   │ (오토파일럿) │ │ (시안/카피) │ │ (인라인편집)│
   └──────┬───────┘ └──────┬──────┘ └──────┬──────┘
          │                │               │
          ▼                ▼               ▼
   ┌─────────────────────────────────────────┐
   │  Repo (storywork)                       │
   │  + integration-bridge 가 산출물 정규화  │
   └────────────────┬────────────────────────┘
                    ▼
            ┌──────────────┐
            │ nano-banana 2 │ (배경/소품/OG 이미지)
            └──────────────┘
```

## 2. 표준 흐름 (자동 배치 기능 신규 개발 예시)
```
1) 휴먼: /sw-next
2) orchestrator: roadmap.md 에서 [M4-03] 픽
3) orchestrator → layout-composer 위임 (자기완결 프롬프트)
4) layout-composer: 알고리즘 구현 + 단위 테스트
5) layout-composer → qa-tester 위임 (골든셋 확장)
6) qa-tester: 통과 후 simplify + security-review
7) orchestrator: PR 생성 (draft) + roadmap 체크
8) 휴먼: PR 리뷰 → 머지
```

## 3. UI 신규 화면 흐름
```
1) 휴먼: Claude(아티팩트)에 시안 요청
2) Claude: 화면 구성/카피/모바일 변형 시안
3) 휴먼: integration-bridge 에 시안 전달
4) integration-bridge: 토큰/컨벤션으로 정규화 → 컴포넌트 코드 초안
5) ui-designer: Storybook + a11y 보강
6) editor-engineer/admin-builder: 데이터 결선
7) qa-tester: E2E
```

## 4. 리소스 등록 흐름
```
1) 관리자: ZIP 업로드 (admin)
2) admin-builder: 검증 → 검수 큐
3) pose-curator: 자동 태깅(Claude API) + 임베딩
4) 관리자: 검수 + published 승격
5) 사용자: 검색/추천에서 즉시 노출
```

## 5. 충돌 해결 규칙
- 두 에이전트가 같은 파일을 만지려 하면 orchestrator 가 직렬화
- 서로 다른 마일스톤 작업은 병렬 가능. 단 같은 패키지 동시 변경은 금지
- 휴먼이 Cursor 로 만진 파일은 PR 머지 전 `integration-bridge` 가 흡수
