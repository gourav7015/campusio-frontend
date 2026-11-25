import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('teaching and non-teaching staff have their own leave rules, saved separately', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/settings');
  const teaching = page.getByLabel('Most days in one application, teaching staff');
  const other = page.getByLabel('Most days in one application, non-teaching staff');
  await expect(teaching).toBeVisible();
  await expect(other).toBeVisible();
  await teaching.fill('3');
  await other.fill('1');
  await page.getByLabel('Days of notice needed, teaching staff').fill('2');
  await page.getByRole('button', { name: /^Save/ }).first().click();
  await expect(page.getByText('Settings saved').first()).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Most days in one application, teaching staff')).toHaveValue('3');
  await expect(page.getByLabel('Most days in one application, non-teaching staff')).toHaveValue('1');
  await expect(page.getByLabel('Days of notice needed, teaching staff')).toHaveValue('2');
  // put the school back to no limits
  await page.getByLabel('Most days in one application, teaching staff').fill('0');
  await page.getByLabel('Most days in one application, non-teaching staff').fill('0');
  await page.getByLabel('Days of notice needed, teaching staff').fill('0');
  await page.getByRole('button', { name: /^Save/ }).first().click();
  await expect(page.getByText('Settings saved').first()).toBeVisible();
  expect(problems).toEqual([]);
});
