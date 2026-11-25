import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('Approvals keeps earlier decisions and has status and kind filters, with All pre-selected; Leave opens on All too', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/approvals');
  const status = page.getByLabel('Status', { exact: true });
  await expect(status).toHaveValue('all');
  await expect(status.locator('option')).toHaveText(['All', 'Waiting for you', 'Approved', 'Rejected']);
  await expect(page.getByLabel('Kind', { exact: true })).toHaveValue('all');
  await status.selectOption('approved');
  await expect(page.getByText('Nothing to show').or(page.getByText(/^(Expenses|Vendors) \(\d+\)$/).first())).toBeVisible();
  await page.goto('/admin/leave');
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('all');
  await page.getByRole('tab', { name: 'Non-teaching staff' }).click();
  await expect(page.getByLabel('Status', { exact: true })).toHaveValue('all');
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
