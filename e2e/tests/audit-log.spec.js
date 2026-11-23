import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('the audit log opens on today and can be narrowed by day, person, role, kind of action and words', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/audit');
  // it opens on today only
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('status').filter({ hasText: /entr(y|ies) for today/ })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'auth.login' }).first()).toBeVisible(); // signing in just now is on today's log
  // the kind of action offers only what happened, with counts
  const what = page.getByLabel('What');
  await expect(what.locator('option', { hasText: 'Sign-ins and passwords' })).toHaveCount(1);
  await what.selectOption({ label: (await what.locator('option', { hasText: 'Sign-ins and passwords' }).first().innerText()).trim() });
  await expect(page.getByRole('row').filter({ hasText: 'auth.login' }).first()).toBeVisible();
  // words, and a person
  await page.getByLabel('Search the log').fill('zzzz-no-such-thing');
  await expect(page.getByText(/Nothing was recorded for today/)).toBeVisible();
  await page.getByLabel('Search the log').fill('');
  await page.getByLabel('Who').selectOption({ index: 1 });
  await expect(page.getByRole('row').nth(1)).toBeVisible();
  // other days: yesterday has its own list; a range; all time
  await page.getByRole('button', { name: 'Yesterday' }).click();
  await expect(page.getByRole('button', { name: 'Yesterday' })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('From date')).not.toHaveValue('');
  await page.getByRole('button', { name: 'Last 7 days' }).click();
  await expect(page.getByRole('status').filter({ hasText: /entr(y|ies) for/ })).toContainText(' to ');
  await page.getByRole('button', { name: 'All time' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'all time' })).toBeVisible();
  // two dates picked by hand
  await page.getByLabel('From date').fill('2026-01-01'); await page.getByLabel('To date').fill('2026-01-02');
  await expect(page.getByRole('status')).toContainText(/(1 Jan 2026|Jan 1, 2026) to (2 Jan 2026|Jan 2, 2026)/);
  // back to today clears every choice
  await page.getByRole('button', { name: 'Back to today' }).click();
  await expect(page.getByRole('button', { name: 'Today', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByLabel('Who')).toHaveValue('');
  expect(problems).toEqual([]);
});
