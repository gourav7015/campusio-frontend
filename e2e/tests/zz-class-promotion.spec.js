import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

// runs last: it creates the next academic year and moves a whole class into it
test('the office moves a whole class to the next year; other classes stay put, and both years are told apart', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');

  // the class teacher has no promotion page: moving a class is a whole-class decision of the office
  await expect(page.getByRole('link', { name: 'Move my class on' })).toHaveCount(0);

  // the next year, with its sections and subjects
  await page.goto('/admin/promotion');
  await page.getByLabel('From academic year').selectOption({ label: '2026-2027 (current)' });
  await page.getByRole('button', { name: '+ Create next year' }).click();
  await page.getByRole('dialog').getByRole('textbox', { name: 'Name' }).fill('2027-2028 B'); // its own name: earlier specs may have left a plain 2027-2028 behind
  await page.getByRole('dialog').getByRole('button', { name: /^Create/ }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Class 7' })).toContainText('Active');
  await page.getByLabel('To academic year').selectOption({ label: '2027-2028 B' });

  // choose one whole class; it lists every section of it, and the others are left alone
  await page.getByRole('checkbox', { name: 'Choose Class 7' }).check();
  await page.getByRole('button', { name: /^3\. Preview/ }).click();
  await expect(page.getByText('Left as they are')).toBeVisible();
  await expect(page.getByText(/Is 2027-2028 B set up for the classes\?/)).toBeVisible();
  // the destination sections say which year they are in
  const goes = page.getByLabel(/^Section for /).first();
  await expect(goes.locator('option').nth(1)).toContainText('(2027-2028 B)');
  // the next year has its sections and subjects but no teachers yet: the office has to confirm on purpose
  await expect(page.getByText('The next year is not fully set up for these classes')).toBeVisible();
  await expect(page.getByRole('button', { name: /^Promote \d+ students/ })).toBeDisabled();
  await page.getByRole('checkbox', { name: /Promote anyway/ }).check();
  await expect(page.getByRole('checkbox', { name: /^Close / })).toBeDisabled(); // other classes are still in the old year
  await page.getByRole('button', { name: /^Promote \d+ students/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Promote|Confirm|Yes/ }).last().click();
  await expect(page.getByText(/Promotion .* complete/)).toBeVisible();

  // the class is completed; the others are not touched
  await expect(page.getByRole('row').filter({ hasText: 'Class 7' })).toContainText('Completed');
  await expect(page.getByRole('row').filter({ hasText: 'Class 6' })).toContainText('Active');

  // the old year cannot close while another class is still in it
  await page.goto('/admin/years');
  const refused = page.waitForResponse((r) => /\/years\/[a-f0-9]+\/close$/.test(r.url()));
  await page.getByRole('row').filter({ hasText: '2026-2027' }).getByRole('button', { name: 'Close' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  const res = await refused;
  expect(res.status()).toBe(409);
  expect((await res.json()).error).toMatch(/cannot be closed yet/);

  // with two years running, the Students filter says which year each class belongs to
  await page.goto('/admin/students');
  await expect(page.getByLabel('Section').locator('option', { hasText: '(2027-2028 B)' }).first()).toBeAttached();
  await expect(page.getByLabel('Section').locator('option', { hasText: '(2026-2027)' }).first()).toBeAttached();
  expect(problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
});
