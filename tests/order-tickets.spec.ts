import { expect, test } from '@playwright/test'

test('director and designer ticket flow works', async ({ page }) => {
  await page.goto('/login')

  await page.locator('input').nth(0).fill('director')
  await page.locator('input').nth(1).fill('123456')
  await page.locator('button[type="submit"]').click()

  await expect(page).toHaveURL(/\/dashboard/)

  await page.goto('/tickets')
  await expect(page).toHaveURL(/\/tickets/)
  await expect(page.getByText('Подготовить макет и согласовать печать визиток')).toBeVisible()

  await page.getByText('Подготовить макет и согласовать печать визиток').click()
  await expect(page).toHaveURL(/\/tickets\/.+/)

  await page.getByRole('button', { name: 'Готово' }).click()
  await expect(page.getByText('Статус тикета обновлён')).toBeVisible()

  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login/)

  await page.locator('input').nth(0).fill('designer1')
  await page.locator('input').nth(1).fill('123456')
  await page.locator('button[type="submit"]').click()

  await expect(page).toHaveURL(/\/tickets/)
  await expect(page.getByText('Подготовить макет и согласовать печать визиток')).toBeVisible()
  await expect(page.getByText('Outdoor banner')).not.toBeVisible()
})
