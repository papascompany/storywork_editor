/**
 * apps/web/e2e/keyboard.spec.ts — 키보드 단독 편집 시나리오 5종 (M9-02, NFR: 키보드 단독 편집 가능)
 *
 * 마우스 없이 편집기의 핵심 루프를 끝까지 수행할 수 있는지 실제 브라우저로 검증한다.
 *   S1 판형 선택 모달 — Tab/Enter 로 판형 고르고 시작
 *   S2 도구 단축키·도움말 — S 로 패널 열고 닫기, 닫힌 패널은 Tab 순서에서 빠짐, ? 도움말 + Esc
 *   S3 명령 팔레트 — Ctrl+K → 검색 → Enter 실행 → Esc
 *   S4 객체 추가·이동 — 도형 추가 → 캔버스 포커스 → 화살표 1mm / Shift 10mm
 *   S5 편집 루프 — 복제 → 삭제 → 실행 취소 → 다시 실행 (레이어 수로 확인)
 *
 * 대상: 로컬 production 서버(WEB_BASE_URL=http://localhost:3000). web 은
 * NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321 로 빌드돼 있어야 한다(CI 시각 회귀 단계와 동일).
 * 로그인은 support/fake-supabase 의 가짜 인증 서버 + 세션 쿠키로 대신한다.
 *
 * 실행: WEB_BASE_URL=http://localhost:3000 pnpm --filter @storywork/web exec playwright test e2e/keyboard.spec.ts --workers=1
 */
import { expect, test, type Page } from '@playwright/test'

import { fakeSessionCookie, startFakeSupabase } from './support/fake-supabase'

let stopFakeSupabase: (() => Promise<void>) | undefined

test.beforeAll(async () => {
  stopFakeSupabase = await startFakeSupabase()
})

test.afterAll(async () => {
  await stopFakeSupabase?.()
})

test.beforeEach(async ({ context, baseURL }) => {
  const host = new URL(baseURL ?? 'http://localhost:3000').hostname
  await context.addCookies([fakeSessionCookie(host)])
})

/** 현재 포커스 요소의 접근 가능한 이름(aria-label 우선) */
function focusedName(page: Page): Promise<string> {
  return page.evaluate(() => {
    const el = document.activeElement as HTMLElement | null
    if (!el) return ''
    return (el.getAttribute('aria-label') ?? el.textContent ?? '').trim()
  })
}

/** Tab 을 눌러가며 이름이 맞는 요소에 포커스가 닿을 때까지 이동 — 닿지 못하면 실패 */
async function tabTo(page: Page, name: RegExp, max = 80): Promise<void> {
  const seen: string[] = []
  for (let i = 0; i < max; i++) {
    await page.keyboard.press('Tab')
    const current = await focusedName(page)
    seen.push(current)
    if (name.test(current)) return
  }
  throw new Error(
    `Tab ${max}회 안에 ${name} 에 닿지 못함. 지나간 포커스: ${seen.slice(-12).join(' | ')}`,
  )
}

/** /editor 진입 + 키보드만으로 판형 선택 (S1 과 같은 경로) */
async function openEditorWithKeyboard(page: Page): Promise<void> {
  await page.goto('/editor')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toBeVisible()
  await expect(page.getByRole('radio', { name: /B5 단행본/ })).toBeVisible()
  await tabTo(page, /^B5 단행본/)
  await page.keyboard.press('Enter')
  await expect(page.getByRole('radio', { name: /B5 단행본/ })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await tabTo(page, /선택한 판형으로 시작하기/)
  await page.keyboard.press('Enter')
  await expect(dialog).toBeHidden()
}

/** 도형 패널을 S 로 열고 Tab/Enter 로 사각형 추가 */
async function addRectangleWithKeyboard(page: Page): Promise<void> {
  await page.keyboard.press('s')
  await expect(page.getByTestId('feature-sidebar')).toHaveAttribute('aria-hidden', 'false')
  await tabTo(page, /^사각형 추가$/)
  await page.keyboard.press('Enter')
}

test.describe('키보드 단독 편집 (M9-02)', () => {
  test('S1 판형 선택 모달을 키보드로 통과한다', async ({ page }) => {
    await openEditorWithKeyboard(page)
    await expect(page.getByRole('region', { name: '편집 캔버스' })).toBeVisible()
  })

  test('S2 도구 단축키로 패널을 열고 닫으며, 닫힌 패널은 Tab 순서에 없다 · ? 도움말', async ({
    page,
  }) => {
    await openEditorWithKeyboard(page)
    const sidebar = page.getByTestId('feature-sidebar')

    await page.keyboard.press('s')
    await expect(sidebar).toHaveAttribute('aria-hidden', 'false')
    await expect(page.getByRole('button', { name: '사각형 추가' })).toBeVisible()

    await page.keyboard.press('s') // 같은 도구 다시 → 닫힘
    await expect(sidebar).toHaveAttribute('aria-hidden', 'true')

    // 닫힌(폭 0) 패널의 닫기 버튼·검색창으로 포커스가 들어가면 안 된다
    for (let i = 0; i < 40; i++) {
      await page.keyboard.press('Tab')
      const name = await focusedName(page)
      expect(name).not.toBe('패널 닫기')
      expect(name).not.toMatch(/ 검색$/)
    }

    await page.locator('body').focus()
    await page.keyboard.press('Shift+Slash') // ?
    const help = page.getByRole('dialog')
    await expect(help).toBeVisible()
    await expect(help).toContainText('키보드 단축키')
    await page.keyboard.press('Escape')
    await expect(help).toBeHidden()
  })

  test('S3 명령 팔레트를 Ctrl+K 로 열고 검색·실행·닫기', async ({ page }) => {
    await openEditorWithKeyboard(page)
    await page.keyboard.press('Control+k')
    const search = page.getByRole('combobox', { name: '명령 검색' })
    await expect(search).toBeFocused()

    await page.keyboard.type('단축키')
    await page.keyboard.press('Enter')
    // "단축키 도움말" 명령 실행 → 도움말 모달
    await expect(page.getByRole('dialog')).toContainText('키보드 단축키')
    await page.keyboard.press('Escape')
    await expect(page.getByRole('dialog')).toBeHidden()
  })

  test('S4 도형을 추가하고 화살표로 1mm · Shift+화살표로 10mm 이동한다', async ({ page }) => {
    await openEditorWithKeyboard(page)
    await addRectangleWithKeyboard(page)

    const x = page.getByLabel('X 위치 (mm)')
    await expect(x).toBeVisible() // 추가된 도형이 선택돼 속성 패널이 뜬다
    const start = Number(await x.inputValue())

    await tabTo(page, /^편집 캔버스$/)
    await page.keyboard.press('ArrowRight')
    await expect(x).toHaveValue(String(start + 1))
    await page.keyboard.press('Shift+ArrowRight')
    await expect(x).toHaveValue(String(start + 11))
  })

  test('S5 복제 → 삭제 → 실행 취소 → 다시 실행', async ({ page }) => {
    await openEditorWithKeyboard(page)
    await addRectangleWithKeyboard(page)

    // 오른쪽 패널 탭: Tab 으로 '속성' 탭에 닿은 뒤 → 로 '레이어'
    await tabTo(page, /^속성$/)
    await page.keyboard.press('ArrowRight')
    const layerTab = page.getByRole('tab', { name: '레이어' })
    await expect(layerTab).toHaveAttribute('aria-selected', 'true')
    const rows = page.getByRole('row')

    // 사용자가 고른 레이어 탭은 선택이 바뀌어도 유지된다 — 매 단계 탭이 그대로인지도 확인
    const expectLayers = async (n: number) => {
      await expect(rows).toHaveCount(n)
      await expect(layerTab).toHaveAttribute('aria-selected', 'true')
    }

    await expectLayers(1)
    await page.keyboard.press('Control+d')
    await expectLayers(2)
    await page.keyboard.press('Delete') // 복제본이 선택돼 있어야 지워진다
    await expectLayers(1)
    await page.keyboard.press('Control+z')
    await expectLayers(2)
    await page.keyboard.press('Control+Shift+z')
    await expectLayers(1)
  })
})
