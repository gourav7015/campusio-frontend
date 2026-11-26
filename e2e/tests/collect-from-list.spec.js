import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('finance: collect a payment straight from the Students and dues list; the School Admin has no such button', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/students');
  await page.getByLabel('Search students').fill('Aarav Sharma');
  const row = page.getByRole('row', { name: /Aarav Sharma/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /Collect payment/ }).click();
  const d = page.getByRole('dialog', { name: 'Collect payment' });
  await expect(d).toBeVisible();
  await d.getByLabel(/^Amount/).fill('1000');
  await d.getByRole('button', { name: 'Collect ₹1,000' }).click();
  await expect(page.getByText(/Receipt .* issued/)).toBeVisible();
  await expect(d).toHaveCount(0);
  expect(problems).toEqual([]);
  // the School Admin's window on the same list is view-only
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/fees?tab=students');
  await page.getByLabel('Search students').fill('Aarav Sharma');
  await expect(page.getByRole('row', { name: /Aarav Sharma/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Collect payment/ })).toHaveCount(0);
});
