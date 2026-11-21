import { test, expect } from '@playwright/test';
import crypto from 'node:crypto';
import { Buffer } from 'node:buffer';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

// the one-time code an authenticator app would show (RFC 6238, SHA-1, 6 digits), for a given time step
const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const fromBase32 = (s) => { let bits = ''; for (const ch of s.replace(/\s/g, '')) bits += ALPHABET.indexOf(ch).toString(2).padStart(5, '0'); const out = []; for (let i = 0; i + 8 <= bits.length; i += 8) out.push(parseInt(bits.slice(i, i + 8), 2)); return Buffer.from(out); };
const codeAt = (secret, step) => {
  const buf = Buffer.alloc(8); buf.writeBigUInt64BE(BigInt(step));
  const h = crypto.createHmac('sha1', fromBase32(secret)).update(buf).digest(); const o = h[h.length - 1] & 0xf;
  return String((((h[o] & 0x7f) << 24) | (h[o + 1] << 16) | (h[o + 2] << 8) | h[o + 3]) % 1e6).padStart(6, '0');
};
const now = () => Math.floor(Date.now() / 1000 / 30);

test('two-factor sign-in: turn it on, sign in with a code, use a recovery code, turn it off', async ({ page }) => {
  const problems = watch(page, ['/api/auth/']);
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/account');
  await expect(page.getByRole('heading', { name: 'Two-factor sign-in' })).toBeVisible();
  const card = page.locator('.card').filter({ has: page.getByText('Two-factor sign-in', { exact: true }) });
  await card.getByRole('button', { name: 'Turn on' }).click();
  await card.getByLabel('Your password').fill('Library@12345');
  await card.getByRole('button', { name: 'Continue' }).click();
  await expect(card.getByRole('img', { name: /QR code/ })).toBeVisible();
  const secret = (await card.locator('code').innerText()).replace(/\s/g, '');
  expect(secret).toMatch(/^[A-Z2-7]{32}$/);
  await card.getByLabel('6-digit code').fill('000000');
  await card.getByRole('button', { name: 'Turn on' }).click();
  await expect(card.getByLabel('6-digit code')).toBeVisible();
  await card.getByLabel('6-digit code').fill(codeAt(secret, now()));
  await card.getByRole('button', { name: 'Turn on' }).click();
  await expect(card.getByText(/recovery codes/i).first()).toBeVisible();
  const recovery = (await card.locator('li').allInnerTexts()).filter((t) => /^[a-z2-7]{5}-[a-z2-7]{5}$/.test(t));
  expect(recovery).toHaveLength(10);
  await card.getByRole('button', { name: 'I have saved them' }).click();
  await expect(card.getByText('On', { exact: true })).toBeVisible();

  // sign out, sign in again: password, then the code
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.goto('/library/login');
  await page.getByLabel('Login ID').fill('library@gps.test');
  await page.getByLabel('Password', { exact: true }).fill('Library@12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page.getByLabel('Code from your authenticator app')).toBeVisible();
  await page.getByLabel('Code from your authenticator app').fill('123456');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByText('That code is not right')).toBeVisible();
  await page.getByLabel('Code from your authenticator app').fill(codeAt(secret, now() + 1));
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));

  // a recovery code also signs in, once
  await page.goto('/account');
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await page.goto('/library/login');
  await page.getByLabel('Login ID').fill('library@gps.test');
  await page.getByLabel('Password', { exact: true }).fill('Library@12345');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await page.getByLabel('Code from your authenticator app').fill(recovery[0]);
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await page.waitForURL((u) => !/\/login$/.test(u.pathname));

  // turn it off again so the rest of the suite is unaffected
  await page.goto('/account');
  await card.getByRole('button', { name: 'Turn off' }).first().click();
  await card.getByLabel('Your password').fill('Library@12345');
  await card.getByLabel(/Code from your app/).fill(recovery[1]);
  await card.getByRole('button', { name: 'Turn off' }).last().click();
  await expect(page.getByText('Two-factor sign-in is off').first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('the reset page explains itself without a link, and refuses a made-up one', async ({ page }) => {
  await page.goto('/reset-password');
  await expect(page.getByText('This page needs the link from your email')).toBeVisible();
  await page.goto(`/reset-password?token=${'a'.repeat(43)}`);
  await page.getByLabel('New password', { exact: true }).fill('Brand-new-Pass1');
  await page.getByLabel('Confirm new password').fill('Brand-new-Pass1');
  await page.getByRole('button', { name: 'Change password' }).click();
  await expect(page.getByText(/not valid any more/)).toBeVisible();
});
