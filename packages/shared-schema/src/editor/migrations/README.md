# fabricJson 마이그레이터

이 디렉토리는 `PageJsonV1` 이후 버전이 생길 때 버전 간 변환 함수를 보관합니다.

## 명명 규칙

```
v1_to_v2.ts   # v1 → v2 마이그레이터
v2_to_v3.ts   # v2 → v3 마이그레이터
```

## 원칙

- 각 마이그레이터는 순수 함수 (`(input: PageJsonVN) => PageJsonVN1`) 형태.
- 마이그레이터 없이 schema 변경 금지 (erd.md §5 마이그레이션 정책 참조).
- 역방향(down) 마이그레이터도 가능하면 함께 작성.

## 현재 상태

- v1: 현재 사용 중 (`src/editor/v1.ts`)
- 향후 버전: 이 디렉토리에 추가
