import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('Collect payment: every due starts ticked, Select none makes the amount 0, ticking dues sets the amount, Select all brings it back', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/students');
  await page.getByRole('row').nth(1).click();
  await expect(page.getByRole('button', { name: '+ Add charge' })).toBeVisible(); // the student's account has loaded (the list rows have their own Collect payment buttons)
  await page.getByRole('button', { name: 'Collect payment' }).click();
  const dlg = page.getByRole('dialog', { name: 'Collect payment' });
  const dues = dlg.locator('label.row.small input[type=checkbox]');
  const amount = dlg.getByLabel(/^Amount/);
  const collect = dlg.getByRole('button', { name: /^Collect/ });
  const n = await dues.count();
  expect(n).toBeGreaterThan(1);
  // what is shown agrees with itself: everything ticked, the whole amount
  for (let i = 0; i < n; i += 1) await expect(dues.nth(i)).toBeChecked();
  const full = Number(await amount.inputValue());
  expect(full).toBeGreaterThan(0);
  await expect(dlg.getByRole('button', { name: 'Select all' })).toBeDisabled();
  // none ticked: nothing to collect
  await dlg.getByRole('button', { name: 'Select none' }).click();
  for (let i = 0; i < n; i += 1) await expect(dues.nth(i)).not.toBeChecked();
  await expect(amount).toHaveValue('0');
  await expect(amount).toBeDisabled();
  await expect(collect).toBeDisabled();
  await expect(dlg.getByText(/Nothing is ticked/)).toBeVisible();
  // tick one: the amount is that due
  await dues.first().check();
  const one = Number(await amount.inputValue());
  expect(one).toBeGreaterThan(0); expect(one).toBeLessThan(full);
  await expect(collect).toBeEnabled();
  // tick the second as well: the amount grows; untick: it shrinks back
  await dues.nth(1).check();
  expect(Number(await amount.inputValue())).toBeGreaterThan(one);
  await dues.nth(1).uncheck();
  expect(Number(await amount.inputValue())).toBe(one);
  // select all: back to the whole amount
  await dlg.getByRole('button', { name: 'Select all' }).click();
  expect(Number(await amount.inputValue())).toBe(full);
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
