import { test, expect } from '@playwright/test';
import { signIn } from './helpers.js';

// Each public address has one job: hello (general), support (school administrators), privacy (data requests), billing (subscription), security (reports).
test('the policies and the app point to the right mailbox', async ({ page, request }) => {
  await page.goto('/privacy');
  await expect(page.getByRole('link', { name: 'privacy@atkaksha.com' })).toHaveAttribute('href', 'mailto:privacy@atkaksha.com');
  await page.goto('/refunds');
  await expect(page.getByRole('link', { name: 'billing@atkaksha.com' })).toHaveAttribute('href', 'mailto:billing@atkaksha.com');
  await page.goto('/terms');
  await expect(page.getByRole('link', { name: 'hello@atkaksha.com' }).first()).toBeVisible();

  const sec = await request.get('/.well-known/security.txt');
  expect(sec.ok()).toBe(true);
  expect(await sec.text()).toContain('mailto:security@atkaksha.com');

  // school administrators can write to support from every page; students and parents go to their school, so they do not see it
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toHaveAttribute('href', /^mailto:support@atkaksha\.com\?subject=AtKaksha%20support&body=/);
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByRole('menuitem', { name: /sign out/i }).click();
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await expect(page.getByRole('link', { name: 'Support', exact: true })).toHaveCount(0);
});
