import { test, expect } from '@playwright/test';

test('the forgot-password page asks for the login id and date of birth first, and a wrong date gives no hint', async ({ page }) => {
  await page.goto('/forgot-password');
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible();
  await page.getByLabel('Login ID').fill('nobody@nowhere.test');
  await page.getByLabel('Date of birth').fill('1990-01-01');
  await page.getByRole('button', { name: 'Send me a code' }).click();
  // the same answer for an account that does not exist
  await expect(page.getByText(/If those details match/)).toBeVisible();
  await page.getByLabel('6-digit code').fill('123456');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/not right, or it has expired/)).toBeVisible();
});
