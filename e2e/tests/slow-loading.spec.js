import { test, expect } from '@playwright/test';
import { signIn } from './helpers.js';

/** A slow server must never read as "nothing here", and a screen already fetched is shown again at once. */
test('student timetable: while the server is slow it shows loading, never "No timetable yet"; coming back needs no new request', async ({ page }) => {
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  let calls = 0;
  await page.route('**/api/student/timetable**', async (route) => { calls += 1; await new Promise((r) => setTimeout(r, 2500)); await route.continue(); });
  await page.goto('/student/timetable');
  await expect(page.getByRole('status')).toHaveCount(0, { timeout: 10_000 }); // the daily view has its answer
  await page.getByRole('tab', { name: 'Weekly' }).or(page.getByRole('button', { name: 'Weekly' })).first().click();
  await page.waitForTimeout(800); // the answer is still on its way
  await expect(page.getByText('No timetable yet')).toHaveCount(0);
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Period/ })).toBeVisible({ timeout: 10_000 });
  // leave and come back: the same answer is on screen straight away, with no second wait
  const before = calls;
  await page.getByRole('link', { name: 'Examinations' }).click();
  await page.getByRole('link', { name: 'My timetable' }).click();
  await page.getByRole('tab', { name: 'Weekly' }).or(page.getByRole('button', { name: 'Weekly' })).first().click();
  await expect(page.getByRole('columnheader', { name: /Period/ })).toBeVisible({ timeout: 1000 });
  expect(calls).toBe(before);
});
