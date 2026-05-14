/**
 * apps/web/e2e/smoke.spec.ts
 *
 * 통합 검증 — production URL 대상 (Vercel 배포 결과 직접 확인).
 *
 * 시나리오:
 *  1. web 랜딩/마케팅 페이지 렌더링
 *  2. web 인증 페이지(login/signup/forgot) 폼 필드 + 마케팅 토큰 적용
 *  3. web 인증 가드 (/mypage 미인증 → /login redirect)
 *  4. web /editor 익명 진입 가능 + 저장 시 게이트 모달
 *  5. admin /login 폼 + 미인증 / → /login redirect
 *
 * 회원가입+이메일 인증은 외부 메일 의존이라 자동화 제외.
 */
import { expect, test } from '@playwright/test'

const ADMIN_BASE_URL = process.env['ADMIN_BASE_URL'] ?? 'https://storywork-editor-admin.vercel.app'

// ─── 1. web 랜딩/마케팅 ───────────────────────────────────────────

test.describe('web 마케팅 표면', () => {
  test('랜딩 페이지가 200 + Header 로그인 버튼이 자체 /login 으로 연결', async ({ page }) => {
    const res = await page.goto('/')
    expect(res?.status()).toBe(200)

    // Header 의 "로그인" 링크 — admin 도메인 jump 가 아닌 자체 /login 인지 확인
    const loginLink = page.getByRole('link', { name: '로그인' }).first()
    await expect(loginLink).toBeVisible()
    const href = await loginLink.getAttribute('href')
    expect(href).toBe('/login')
  })

  test('히어로의 4컷 미니 콘티 카드가 표시됨', async ({ page }) => {
    await page.goto('/')
    // MiniStoryboard 컨테이너 + 내부 4개 컷 article
    // 컨테이너는 SSR 단계에 있음
    await expect(page.getByLabel('더미맨의 월요일 4컷 미리보기')).toBeVisible()
    // 실제 4컷 카드는 .hero-cut-card 클래스 (StickyNote 가 아닌 hero 전용 컴포넌트)
    const cuts = page.locator('.hero-cut-card')
    await expect(cuts).toHaveCount(4)
  })
})

// ─── 2. web 인증 페이지 ───────────────────────────────────────────

test.describe('web 인증 페이지', () => {
  test('/login: 이메일/비밀번호 폼 + OAuth 버튼(disabled) + 마케팅 토큰', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/스토리워크|StoryWork|로그인/)

    // 폼 필드
    await expect(page.getByLabel(/이메일/)).toBeVisible()
    await expect(page.getByLabel(/비밀번호/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^로그인/ })).toBeVisible()

    // 회원가입 / 비밀번호 잊으셨나요 링크
    await expect(page.getByRole('link', { name: /회원가입/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /비밀번호.*잊/ })).toBeVisible()

    // OAuth 버튼 자리 (Google/Kakao) — 존재하지만 disabled
    const google = page.getByRole('button', { name: /Google/i })
    const kakao = page.getByRole('button', { name: /Kakao|카카오/i })
    if (await google.count()) await expect(google.first()).toBeDisabled()
    if (await kakao.count()) await expect(kakao.first()).toBeDisabled()
  })

  test('/signup: 가입 폼 + 약관 체크박스', async ({ page }) => {
    const res = await page.goto('/signup')
    expect(res?.status()).toBe(200)
    await expect(page.getByLabel(/이메일/)).toBeVisible()
    await expect(page.getByLabel(/비밀번호/, { exact: false }).first()).toBeVisible()
    // 정확히 "가입하기" — OAuth "Google 로 시작하기" / "카카오로 시작하기" 와 구분
    await expect(page.getByRole('button', { name: '가입하기' })).toBeVisible()
  })

  test('/forgot-password: 이메일 입력 + 발송 버튼', async ({ page }) => {
    const res = await page.goto('/forgot-password')
    expect(res?.status()).toBe(200)
    await expect(page.getByLabel(/이메일/)).toBeVisible()
    await expect(page.getByRole('button', { name: /발송|재설정|보내기/ })).toBeVisible()
  })
})

// ─── 3. 인증 가드 ─────────────────────────────────────────────────

test.describe('web 인증 가드', () => {
  test('/mypage 미인증 → /login?next=/mypage', async ({ page }) => {
    await page.goto('/mypage')
    await page.waitForURL(/\/login\?next=%2Fmypage/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
    expect(page.url()).toContain('next=%2Fmypage')
  })
})

// ─── 4. web /editor 익명 진입 + 저장 게이트 ─────────────────────

test.describe('web 편집기 익명 + 저장 게이트', () => {
  test('/editor 익명 진입 가능 (가드 없음)', async ({ page }) => {
    const res = await page.goto('/editor')
    expect(res?.status()).toBe(200)
    // FormatPicker 또는 편집 영역 셸이 보여야 함
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})
    // 어떤 형태든 편집기 셸이 마운트됐는지 — body 가 비어있지 않은지
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(50)
  })

  test('저장 클릭 시 로그인 게이트 모달 표시', async ({ page }) => {
    await page.goto('/editor')
    await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

    // 익명 진입 시 FormatPickerModal 이 자동 표시 — 첫 판형 선택 후 "시작하기"
    // 모달 footer 가 viewport 밖일 수 있어 scrollIntoView 후 클릭
    const radioGroup = page.getByRole('radiogroup', { name: /판형/ })
    if (await radioGroup.isVisible().catch(() => false)) {
      await radioGroup.locator('button').first().click()
      const startBtn = page.getByRole('button', { name: '선택한 판형으로 시작하기' })
      await startBtn.scrollIntoViewIfNeeded()
      await startBtn.click()
    } else {
      await page.keyboard.press('Escape').catch(() => {})
    }

    // backdrop 사라질 때까지 대기
    await expect(page.locator('div.fixed.inset-0[aria-hidden="true"]')).toHaveCount(0, {
      timeout: 5_000,
    })

    // 저장 버튼 (data-testid 발견 — TopBar 에 이미 있음)
    const saveBtn = page.getByTestId('topbar-save').filter({ visible: true }).first()
    await saveBtn.click()

    // 게이트 모달 — id="save-gate-title" 의 카피 "지금 작품을 저장하려면 로그인이 필요해요"
    const modalTitle = page.locator('#save-gate-title')
    await expect(modalTitle).toBeVisible({ timeout: 8_000 })
    await expect(modalTitle).toContainText(/로그인이 필요/)
  })
})

// ─── 5. admin ─────────────────────────────────────────────────────

test.describe('admin', () => {
  test('admin /login 폼 표시', async ({ page }) => {
    const res = await page.goto(`${ADMIN_BASE_URL}/login`)
    expect(res?.status()).toBe(200)
    await expect(page.getByLabel(/이메일/)).toBeVisible()
    await expect(page.getByLabel(/비밀번호/)).toBeVisible()
    await expect(page.getByRole('button', { name: /^로그인/ })).toBeVisible()
  })

  test('admin / 미인증 → /login?next=%2F', async ({ page }) => {
    await page.goto(`${ADMIN_BASE_URL}/`)
    await page.waitForURL(/\/login\?next=%2F/, { timeout: 10_000 })
    expect(page.url()).toContain('/login')
  })
})
