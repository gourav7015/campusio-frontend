import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('teaching and non-teaching staff have their own leave rules, saved together from the Leave group', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/settings/leave');
  const teaching = page.getByLabel('Most days in one application, teaching staff');
  await expect(teaching).toBeVisible();
  await teaching.fill('3');
  await page.getByLabel('Days of notice needed, teaching staff').fill('2');
  await page.getByRole('tab', { name: 'Non-teaching and transport' }).click();
  const other = page.getByLabel('Most days in one application, non-teaching staff');
  await expect(other).toBeVisible();
  await other.fill('1');
  await expect(page.getByText('3 unsaved changes').or(page.getByText('1 unsaved change'))).toBeVisible(); // one change in Leave rules
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved').first()).toBeVisible();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Most days in one application, teaching staff')).toHaveValue('3');
  await expect(page.getByLabel('Days of notice needed, teaching staff')).toHaveValue('2');
  await page.getByRole('tab', { name: 'Non-teaching and transport' }).click();
  await expect(page.getByLabel('Most days in one application, non-teaching staff')).toHaveValue('1');
  // put the school back to no limits
  await page.getByLabel('Most days in one application, non-teaching staff').fill('0');
  await page.getByRole('tab', { name: 'Teaching staff' }).click();
  await page.getByLabel('Most days in one application, teaching staff').fill('0');
  await page.getByLabel('Days of notice needed, teaching staff').fill('0');
  await page.getByRole('button', { name: 'Save settings' }).click();
  await expect(page.getByText('Settings saved').first()).toBeVisible();
  expect(problems).toEqual([]);
});
