import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('the Buses page can be narrowed, opens already narrowed from the dashboard links, and the dashboard follows a status change without a refresh', async ({ page }) => {
  const problems = watch(page, ['/api/auth/me']);
  await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');

  // the dashboard's links open Buses already narrowed
  await page.goto('/transport/buses?attention=papers');
  await expect(page.getByRole('combobox', { name: 'Needs attention' })).toHaveValue('papers');
  await expect(page.getByRole('status').filter({ hasText: /\d+ of \d+ buses/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();
  await expect(page.getByRole('combobox', { name: 'Needs attention' })).toHaveValue('');
  const total = Number((await page.getByRole('status').filter({ hasText: /of \d+ buses/ }).innerText()).match(/of (\d+)/)[1]);
  expect(total).toBeGreaterThan(0);

  // the filters
  await page.getByLabel('Search buses').fill('GPS-01');
  await expect(page.getByRole('row', { name: /GPS-01/ })).toBeVisible();
  await page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Retired' });
  await expect(page.getByText('No buses match these choices')).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();

  // a bus put into maintenance shows on the dashboard at once; made running again, it goes away: no refresh
  const setStatus = async (status) => {
    await page.getByRole('row', { name: /GPS-01/ }).getByRole('button', { name: 'Edit' }).click();
    await page.getByRole('dialog').getByLabel('Status').selectOption(status);
    await page.getByRole('dialog').getByRole('button', { name: 'Save bus' }).click();
    await expect(page.getByRole('dialog')).toHaveCount(0);
  };
  await setStatus('maintenance');
  await page.getByRole('navigation').first().getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByText(/in maintenance/).first()).toBeVisible();
  await page.getByRole('navigation').first().getByRole('link', { name: 'Buses' }).click();
  await setStatus('active');
  await page.getByRole('navigation').first().getByRole('link', { name: 'Dashboard' }).click();
  await expect(page.getByText(/in maintenance/)).toHaveCount(0);
  expect(problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
});
