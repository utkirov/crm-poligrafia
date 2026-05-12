import { expect, test } from '@playwright/test'

test('local CRM smoke flow', async ({ page }) => {
  const suffix = Date.now().toString().slice(-6)
  const designerName = `Designer Smoke ${suffix}`
  const designerLogin = `designer${suffix}`

  await page.goto('/login')

  await page.getByLabel('Логин').fill('director')
  await page.getByLabel('Пароль').fill('123456')
  await page.getByRole('button', { name: 'Войти' }).click()

  await expect(page).toHaveURL(/\/dashboard/)
  await expect(page.getByTestId('orders-workspace')).toBeVisible()
  await expect(page.getByTestId('workspace-list-rail')).toBeVisible()
  await expect(page.getByTestId('workspace-active-canvas')).toBeVisible()
  await expect(page.getByTestId('workspace-context-rail')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Заказы' })).toBeVisible()

  await page.getByRole('link', { name: 'Финансы' }).click()
  await expect(page).toHaveURL(/\/finance/)
  await expect(page.getByRole('heading', { name: 'Финансы' })).toBeVisible()

  await page.getByRole('link', { name: 'Сотрудники' }).click()
  await expect(page).toHaveURL(/\/users/)
  await expect(page.getByRole('heading', { name: 'Сотрудники' })).toBeVisible()

  await page.getByRole('button', { name: /\+ Добавить сотрудника/ }).click()
  await page.getByLabel('Имя *').fill(designerName)
  await page.getByLabel('Логин *').fill(designerLogin)
  await page.getByRole('combobox', { name: 'Роль *' }).selectOption('designer')
  await page.getByLabel('Пароль *').fill('123456')
  await page.getByLabel('Подтверждение пароля *').fill('123456')
  await page.getByRole('button', { name: 'Сохранить' }).click()

  const designerRow = page.locator('tr').filter({ hasText: designerName })
  await expect(designerRow).toBeVisible()
  await designerRow.getByRole('link', { name: 'KPI' }).click()

  await expect(page).toHaveURL(/\/users\/.*\/kpi/)
  await expect(page.getByRole('heading', { name: new RegExp(designerName) })).toBeVisible()
  await page.getByLabel('Месяц').fill('2026-05')
  await page.getByLabel('План задач').fill('40')
  await page.getByLabel('План выполнения в срок, %').fill('95')
  await page.getByLabel('Лимит правок').fill('2')
  await page.getByRole('button', { name: 'Сохранить KPI' }).click()
  await expect(page.getByRole('cell', { name: '2026-05', exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByLabel('План задач')).toHaveValue('40')

  await page.getByRole('link', { name: 'Причины отмены' }).click()
  await expect(page).toHaveURL(/\/settings\/cancel-reasons/)
  await expect(page.getByRole('heading', { name: 'Причины отмены заказов' })).toBeVisible()

  await page.goto('/orders/create')
  await page.getByPlaceholder('Поиск по имени или телефону...').fill('Алина')
  await page.getByText('Алина Каримова').click()
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('heading', { name: 'Шаг 2: Заказ' })).toBeVisible()

  await page.getByRole('button', { name: 'Поиск услуги' }).click()
  await page.getByPlaceholder('Введите название услуги...').fill('Баннер')
  await page.getByText('Баннер 1 кв.м').click()
  await page.getByLabel('Название заказа *').fill('Smoke тест')
  await page.getByRole('button', { name: 'Далее' }).click()
  await expect(page.getByRole('heading', { name: 'Шаг 3: Оплата' })).toBeVisible()

  const seededOrderId = await page.evaluate(() => {
    const raw = window.localStorage.getItem('crm-poligraf.local-db.v1')
    if (!raw) {
      return null
    }

    const db = JSON.parse(raw) as { orders?: Array<{ id: string; title: string }> }
    return db.orders?.find((order) => order.title === 'Печать визиток')?.id ?? null
  })

  if (!seededOrderId) {
    throw new Error('Seeded order "Печать визиток" was not found in local storage')
  }

  await page.goto(`/orders/${seededOrderId}`)
  await expect(page.getByRole('heading', { name: 'Печать визиток' })).toBeVisible()

  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Сгенерировать PDF-счёт' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toContain('order-')

  await page.goto('/settings/local-data')
  await expect(page.getByRole('heading', { name: 'Локальные данные' })).toBeVisible()

  await page.getByRole('button', { name: 'Выйти' }).click()
  await expect(page).toHaveURL(/\/login/)
})
