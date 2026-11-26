import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

// The one register look: the class teacher's phone screen has no sideways scroll, the status is a pill that opens a sheet, and nobody is
// treated as present until marked. Uses its own (past) day so other tests' registers are untouched.
test('the register on a phone: no sideways scroll, a pill per student opens a sheet, Mark all absent / present, review before submit', async ({ page }) => {
  const problems = watch(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/attendance');
  await expect(page.getByRole('button', { name: 'Mark all present' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark all absent' })).toBeVisible();
  const sideways = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(sideways, 'page scrolls sideways').toBeLessThanOrEqual(1);
  // the five-button row is replaced by one pill per student
  const pill = page.getByRole('button', { name: /: .*\. Change$/ }).first();
  await expect(pill).toBeVisible();
  await expect(page.getByRole('group', { name: /^Status of / })).toHaveCount(0);
  await page.getByRole('button', { name: 'Mark all absent' }).click();
  await expect(page.getByText(/0 of \d+ here|of \d+ marked/).first()).toBeVisible();
  await page.getByRole('button', { name: 'Undo the last change' }).click(); // back to what it was
  await page.getByRole('button', { name: 'Mark all present' }).click();
  await pill.click();
  const sheet = page.getByRole('dialog');
  await sheet.getByRole('button', { name: 'Late', exact: true }).click();
  await sheet.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('button', { name: /: Late\. Change$/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit attendance' })).toBeVisible(); // not hidden behind the bottom navigation
  const box = await page.getByRole('button', { name: 'Submit attendance' }).boundingBox();
  const nav = await page.getByRole('navigation', { name: 'Primary' }).boundingBox();
  expect(box.y + box.height, 'Submit sits above the bottom navigation').toBeLessThanOrEqual(nav.y + 1);
  await page.screenshot({ path: 'shots/attendance-roster-phone.png' });
  expect(problems, 'console / network problems').toEqual([]);
});

test('the register on a laptop: chips, search, both bulk buttons and a review that lists who is not here', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/attendance');
  await expect(page.getByRole('button', { name: /^All \d+$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Mark all present' }).click();
  await page.getByRole('row').nth(1).getByRole('button', { name: 'Absent', exact: true }).click();
  await page.getByRole('button', { name: /^Not here 1$/ }).click();
  await expect(page.getByText(/Showing 1 of \d+/)).toBeVisible();
  await page.getByRole('button', { name: /^All \d+$/ }).click();
  await page.screenshot({ path: 'shots/attendance-roster-desktop.png', fullPage: true });
  await page.getByRole('button', { name: 'Submit attendance' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Not here (1)');
  await dlg.getByRole('button', { name: 'Back to the register' }).click();
  expect(problems, 'console / network problems').toEqual([]);
});
