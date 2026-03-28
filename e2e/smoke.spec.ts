import { expect, test } from '@playwright/test'

test.describe('公开页与重定向', () => {
  test('根路径未登录时进入登录页', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL(/\/login/)
  })

  test('登录页展示品牌与表单', async ({ page }) => {
    await page.goto('/login')
    await expect(page.getByRole('heading', { name: 'MuMuAINovel' })).toBeVisible()
    await expect(page.getByLabel('Username')).toBeVisible()
    await expect(page.getByLabel('Password')).toBeVisible()
    await expect(
      page.getByRole('button', { name: /Sign In|登录/ }),
    ).toBeVisible()
  })

  test('未登录访问受保护路由会回到登录页', async ({ page }) => {
    await page.goto('/projects')
    await expect(page).toHaveURL(/\/login/)
  })
})
