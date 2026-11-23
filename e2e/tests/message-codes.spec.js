import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { signIn } from './helpers.js';

// Runs only when the demo server was started with DEMO_MESSAGES_FILE (it then pretends email works and writes each email there):
//   DEMO_MESSAGES_FILE=/tmp/msgs.jsonl bash e2e-prod.sh tests/message-codes.spec.js
const FILE = process.env.DEMO_MESSAGES_FILE;
test.skip(!FILE, 'needs the demo server started with DEMO_MESSAGES_FILE');
test.describe.configure({ mode: 'serial' });

const lastCode = (re) => {
  const rows = fs.readFileSync(FILE, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)).filter((m) => re.test(m.text));
  return rows.at(-1)?.text.match(/\b(\d{6})\b/)?.[1];
};
const SIGNIN = /your AtKaksha code/;
// the email is written a moment after the page says it was sent: wait for a code that is not the previous one
const nextCode = async (re, before) => { await expect.poll(() => lastCode(re)).not.toBe(before); return lastCode(re); };

test('a librarian turns on sign-in codes by email, signs in with one, and turns it off again', async ({ page }) => {
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/account');
  await expect(page.getByText(/authenticator/i)).toHaveCount(0); // no separate app
  const card = page.locator('.card').filter({ has: page.getByText('Sign-in code by email', { exact: true }) });
  await expect(card.getByText(/registered email address \(l•+@gps\.test\)/)).toBeVisible();
  await card.getByRole('button', { name: 'Turn on' }).click();
  await card.getByLabel('Your password').fill('Library@12345');
  let seen = lastCode(SIGNIN);
  await card.getByRole('button', { name: 'Send code' }).click();
  await expect(card.getByText(/We emailed a 6-digit code to l•+@gps\.test/)).toBeVisible();
  await card.getByLabel('6-digit code').fill('000000');
  await card.getByRole('button', { name: 'Turn on' }).click();
  await expect(card.getByLabel('6-digit code')).toBeVisible(); // wrong code: still asking
  seen = await nextCode(SIGNIN, seen);
  await card.getByLabel('6-digit code').fill(seen);
  await card.getByRole('button', { name: 'Turn on' }).click();
  await expect(card.getByText('On', { exact: true })).toBeVisible();

  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.goto('/library/login');
  await page.getByLabel('Login id').fill('library@gps.test');
  await page.getByLabel('Password', { exact: true }).fill('Library@12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel('Sign-in code')).toBeVisible();
  seen = await nextCode(SIGNIN, seen);
  await expect(page.getByText(/We emailed a 6-digit code to l•+@gps\.test/)).toBeVisible();
  await page.getByLabel('Sign-in code').fill('123456');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByText('That code is not right')).toBeVisible();
  await page.getByLabel('Sign-in code').fill(seen);
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));

  // switch it off: password, then a code emailed to the same address
  await page.goto('/account');
  await card.getByRole('button', { name: 'Turn off' }).click();
  await card.getByLabel('Your password').fill('Library@12345');
  await card.getByRole('button', { name: 'Send code' }).click();
  await expect(card.getByText(/We emailed a 6-digit code/)).toBeVisible();
  await card.getByLabel('6-digit code').fill(await nextCode(SIGNIN, seen));
  await card.getByRole('button', { name: 'Turn off' }).click();
  await expect(card.getByRole('button', { name: 'Turn on' })).toBeVisible();
});
