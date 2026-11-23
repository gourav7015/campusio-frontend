import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { signIn } from './helpers.js';

// Runs only when the demo server was started with DEMO_MESSAGES_FILE (see message-codes.spec.js).
// It changes the Finance login's password, so this file is named to run last: every other test signs in as Finance with the original one.
const FILE = process.env.DEMO_MESSAGES_FILE;
test.skip(!FILE, 'needs the demo server started with DEMO_MESSAGES_FILE');

const lastCode = (re) => {
  const rows = fs.readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => re.test(m.text));
  return rows.at(-1)?.text.match(/\b(\d{6})\b/)?.[1];
};
const SIGNIN = /your AtKaksha code/;
const nextCode = async (re, before) => { await expect.poll(() => lastCode(re)).not.toBe(before); return lastCode(re); };

test('a forgotten password: login id and date of birth, then the emailed code, then a new password', async ({ page }) => {
  await page.goto('/library/login');
  await page.getByRole('button', { name: 'Forgot password?' }).click();
  await page.getByRole('link', { name: /Reset it with your date of birth/ }).click();
  await expect(page).toHaveURL(/forgot-password/);
  await expect(page.getByRole('heading', { name: 'Reset your password' })).toBeVisible(); // the sign-in page has gone, so the fields below are this page's
  await page.getByLabel('Login ID').fill('finance@gps.test');
  await page.getByLabel('Date of birth').fill('1985-02-02');
  const before = lastCode(SIGNIN);
  await page.getByRole('button', { name: 'Send me a code' }).click();
  await expect(page.getByText(/a code is on its way/)).toBeVisible();
  const code = await nextCode(SIGNIN, before);
  await page.getByLabel('6-digit code').fill('000000');
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByText(/not right, or it has expired/)).toBeVisible();
  await page.getByLabel('6-digit code').fill(code);
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('New password', { exact: true }).fill('Brand-new-Pass1');
  await page.getByLabel('Confirm new password').fill('Brand-new-Pass1');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText('Your password was changed')).toBeVisible();
  await signIn(page, 'finance', 'finance@gps.test', 'Brand-new-Pass1');
});
