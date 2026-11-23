import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

// A receipt or a payslip is one click away wherever fees or salary are shown.
test('the School Admin gets a Receipt on a student\'s paid charges and payments, and a Payslip on a teacher\'s months', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');

  // a student's Fees tab: the one fee table, each paid charge with its Receipt, then the payments
  await page.goto('/admin/students');
  await page.getByRole('row').nth(1).click();
  await page.getByRole('tab', { name: 'Fees' }).or(page.getByRole('button', { name: 'Fees', exact: true })).first().click();
  const fees = page.locator('.card').filter({ has: page.getByText('Fees', { exact: true }) }).first();
  await expect(fees).toBeVisible();
  await expect(page.getByText('Instalment / charge')).toBeVisible();
  await expect(page.getByText('Charges', { exact: true })).toHaveCount(0); // no separate Charges table any more
  await expect(fees.getByRole('button', { name: 'Receipt' }).first()).toBeVisible();
  const payments = page.locator('.card').filter({ has: page.getByText('Payments & receipts', { exact: true }) });
  await expect(payments.getByRole('button', { name: 'Receipt' }).first()).toBeVisible();
  const [file] = await Promise.all([page.waitForEvent('download'), payments.getByRole('button', { name: 'Receipt' }).first().click()]);
  expect(file.suggestedFilename()).toMatch(/^receipt-.*\.pdf$/);

  // a teacher's Salary & payslips tab: a Payslip for each month
  await page.goto('/admin/teachers');
  await page.getByRole('row').nth(1).click();
  await page.getByRole('tab', { name: 'Salary & payslips' }).or(page.getByRole('button', { name: 'Salary & payslips' })).first().click();
  const slips = page.locator('.card').filter({ has: page.getByText('Payslips', { exact: true }) });
  await expect(slips.getByRole('button', { name: 'Payslip' }).first()).toBeVisible();
  const [slip] = await Promise.all([page.waitForEvent('download'), slips.getByRole('button', { name: 'Payslip' }).first().click()]);
  expect(slip.suggestedFilename()).toMatch(/^payslip-.*\.pdf$/);
  expect(problems.filter((p) => !p.includes('dialog'))).toEqual([]);
});
