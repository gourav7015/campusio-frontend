import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('School settings: one group at a time under the side menu, one save bar that says what changed, a dot in the menu, and a finder', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/settings');
  await expect(page.getByRole('heading', { name: 'School settings' })).toBeVisible();
  const menu = page.getByRole('navigation', { name: 'Main' });
  for (const g of ['General', 'Attendance', 'Grading', 'Leave', 'Staff attendance', 'Payroll']) await expect(menu.getByRole('link', { name: g, exact: true })).toBeVisible();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save settings' })).toBeDisabled();

  // a live example beside the field, and tap-to-add pieces
  await page.getByLabel('Starting password format').fill('{NAME4}');
  await expect(page.getByText(/starts with AARA$/)).toBeVisible();
  await page.getByRole('button', { name: 'Add {DDMM}' }).click();
  await expect(page.getByLabel('Starting password format')).toHaveValue('{NAME4}{DDMM}');
  await expect(page.getByText('1 unsaved change')).toBeVisible();
  await expect(menu.getByRole('link', { name: /General/ }).getByRole('img', { name: 'Unsaved changes' })).toBeVisible();

  // moving to another group keeps it, and the bar says where
  await menu.getByRole('link', { name: 'Grading', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Grading' })).toBeVisible();
  await expect(page.getByText('1 unsaved change')).toBeVisible();
  await page.getByLabel('Try a percentage').fill('95');
  await expect(page.getByText('A+').first()).toBeVisible();
  await page.getByLabel('Pass percentage').fill('35');
  await expect(page.getByText('2 unsaved changes')).toBeVisible();
  await expect(page.getByText(/in General and Grading/)).toBeVisible();
  await page.getByRole('button', { name: 'Discard' }).click();
  await expect(page.getByText('All changes saved')).toBeVisible();
  await expect(page.getByLabel('Pass percentage')).not.toHaveValue('35');

  // the way attendance is taken is the school's plan: shown, with the day rule beside it, not switchable here
  await menu.getByRole('link', { name: 'Attendance', exact: true }).click();
  await expect(page.getByText('Your plan')).toBeVisible();
  await expect(page.getByRole('button', { name: /Review and switch/ })).toHaveCount(0);
  await expect(page.getByRole('switch', { name: 'Late counts as present' })).toBeVisible();

  // the finder opens the group that holds a setting
  await page.getByLabel('Find a setting').fill('professional tax');
  await page.getByRole('option', { name: /Payroll/ }).click();
  await expect(page.getByRole('heading', { name: 'Payroll' })).toBeVisible();
  await expect(page.getByText('Professional Tax').first()).toBeVisible();
  expect(problems).toEqual([]);
});
