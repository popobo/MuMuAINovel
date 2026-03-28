import { expect, test } from '@playwright/test'

const localAuthOn = process.env.LOCAL_AUTH_ENABLED === 'true'
const username = process.env.LOCAL_AUTH_USERNAME ?? 'admin'
const password = process.env.LOCAL_AUTH_PASSWORD ?? 'admin123'

test.describe('本地账号登录', () => {
  test.skip(
    !localAuthOn,
    '需在 .env 中设置 LOCAL_AUTH_ENABLED=true，并保证 DATABASE_URL 可用（首次登录会在库里创建用户）',
  )

  test('凭证正确时进入项目列表', async ({ page }) => {
    await page.goto('/login')
    await page.getByLabel('Username').fill(username)
    await page.getByLabel('Password').fill(password)
    await page.getByRole('button', { name: /Sign In|登录/ }).click()
    await expect(page).toHaveURL(/\/projects/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: /My Projects|我的项目/ })).toBeVisible()
  })
})
