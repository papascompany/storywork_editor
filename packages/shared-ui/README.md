# @storywork/ui — StoryWork 디자인 시스템

StoryWork 의 단일 디자인 시스템 패키지입니다.
shadcn/ui 철학 (헤드리스 Radix + CVA 스타일) 위에 StoryWork 토큰을 입혀 구축되었습니다.

## 빠른 시작 (5분)

### 1. 전역 CSS import

`apps/web/app/layout.tsx` 또는 `apps/admin/app/layout.tsx` 최상단에:

```tsx
import '@storywork/ui/styles/globals.css'
```

또는 `globals.css` 파일에서:

```css
@import '../../../packages/shared-ui/src/styles/globals.css';
```

### 2. ThemeProvider 감싸기

```tsx
import { ThemeProvider, themeScript } from '@storywork/ui'

export default function RootLayout({ children }) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <head>
        {/* FOUC 방지 */}
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <ThemeProvider defaultTheme="system">{children}</ThemeProvider>
      </body>
    </html>
  )
}
```

### 3. 컴포넌트 사용

```tsx
import { Button, Card, CardHeader, CardTitle, Input, Dialog } from '@storywork/ui'

export default function Page() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>StoryWork</CardTitle>
      </CardHeader>
      <Button>시작하기</Button>
    </Card>
  )
}
```

---

## 디자인 토큰 사용 규칙

**반드시 지켜야 할 규칙:**

- 직접 hex 컬러값을 사용하지 마십시오 (예: `#6366f1` 금지)
- 직접 px 간격을 style prop 에 작성하지 마십시오 (예: `style={{ padding: '16px' }}` 금지)
- 반드시 CSS 변수 또는 Tailwind 클래스를 사용하십시오

### CSS 변수로 사용

```tsx
// 컬러
<div style={{ color: 'var(--color-brand-500)' }}>텍스트</div>
<div style={{ background: 'var(--color-surface-raised)' }}>카드</div>

// 반경
<div style={{ borderRadius: 'var(--radius-md)' }}>박스</div>

// 그림자
<div style={{ boxShadow: 'var(--shadow-md)' }}>카드</div>
```

### Tailwind 클래스로 사용

```tsx
// 토큰이 Tailwind 에 매핑되어 있는 경우
<div className="text-[var(--color-brand-500)] rounded-[var(--radius-md)]">토큰 사용</div>
```

### TypeScript 에서 토큰 값 참조

```ts
import { brand, spacing, radius, breakpoints } from '@storywork/ui'

brand[500] // '#6366f1'
spacing[11] // '2.75rem' (44px 터치 타겟)
radius.md // '0.5rem'
```

---

## 컴포넌트 목록

| 컴포넌트 | 설명                                            | 모바일 지원    |
| -------- | ----------------------------------------------- | -------------- |
| `Button` | 기본 버튼, 5가지 variant, 아이콘 버튼           | 44px 터치 타겟 |
| `Input`  | 레이블/에러/도움말 포함 입력 필드               | 44px 최소 높이 |
| `Card`   | 카드 레이아웃 (Header/Content/Footer)           | 반응형         |
| `Dialog` | 확인/경고 모달                                  | 모바일 가득    |
| `Sheet`  | 슬라이드 패널, `side="bottom"` 으로 BottomSheet | 85dvh 최대     |

### Button

```tsx
<Button variant="default" size="md">저장</Button>
<Button variant="outline" size="sm">취소</Button>
<Button variant="destructive">삭제</Button>
<Button size="icon" aria-label="추가"><Plus /></Button>

// 링크로 렌더
<Button asChild variant="outline">
  <a href="/edit">편집하기</a>
</Button>
```

Variants: `default` | `secondary` | `ghost` | `outline` | `destructive` | `unstyled`
Sizes: `sm` (36px) | `md` (44px) | `lg` (48px) | `icon` (44×44)

### Input

```tsx
<Input
  label="이메일"
  type="email"
  placeholder="user@example.com"
  helperText="이메일 형식으로 입력하세요"
/>

<Input
  label="비밀번호"
  variant="error"
  errorText="8자 이상 입력하세요"
/>
```

### Sheet (BottomSheet)

```tsx
<Sheet>
  <SheetTrigger asChild>
    <Button>레이어</Button>
  </SheetTrigger>
  <SheetContent side="bottom">
    {' '}
    {/* 모바일 BottomSheet */}
    <SheetHeader>
      <SheetTitle>레이어 패널</SheetTitle>
    </SheetHeader>
    {/* 내용 */}
  </SheetContent>
</Sheet>
```

Side: `right` (기본, 데스크톱) | `left` | `bottom` (모바일) | `top`

---

## 테마 (다크모드)

```tsx
import { useTheme } from '@storywork/ui'

const { theme, resolvedTheme, setTheme, toggleTheme } = useTheme()
// theme: 'light' | 'dark' | 'system'
// resolvedTheme: 'light' | 'dark'  ← 실제 적용된 값

setTheme('dark') // 수동 변경
toggleTheme() // 라이트 ↔ 다크 토글
```

---

## 접근성 체크리스트

- [x] Button 최소 터치 타겟 44×44px (WCAG 2.5.5 AA)
- [x] 색상 대비 ≥ 4.5:1 (WCAG 1.4.3 AA)
- [x] focus-visible 링 (키보드 탐색 표시)
- [x] Dialog/Sheet 포커스 트랩 + ESC 닫기
- [x] Input `aria-invalid` + `role="alert"` (에러)
- [x] prefers-reduced-motion 전역 가드

---

## ESLint 디자인 토큰 규칙 안내

현재 lint 규칙에서 직접 컬러 값 사용을 자동 감지하지는 않습니다.
팀 내 협약으로 아래 패턴을 **금지**합니다:

```tsx
// 금지
<div style={{ color: '#6366f1' }} />
<div style={{ padding: '16px' }} />

// 허용
<div style={{ color: 'var(--color-brand-500)' }} />
<div className="p-4" />
```

향후 `eslint-plugin-no-css-in-js-literal` 또는 커스텀 룰로 강제 예정입니다.

---

## Storybook

```bash
pnpm --filter @storywork/storybook storybook  # 6006 포트
```

5개 컴포넌트 × 다크모드 × 모바일 viewport (360/390/414/768/1280) 조합으로 시각 검수합니다.
a11y addon 으로 WCAG 위반을 즉시 확인할 수 있습니다.
