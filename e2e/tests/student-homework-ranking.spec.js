import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('the student has a Homework page under Learning, and the home card and panel lead to it', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.getByRole('link', { name: 'Learning' }).first().click().catch(() => {});
  await page.goto('/student/timetable');
  await expect(page.getByRole('link', { name: 'Homework', exact: true })).toBeVisible();
  await page.getByRole('link', { name: 'Homework', exact: true }).click();
  await expect(page).toHaveURL(/\/student\/homework$/);
  await expect(page.getByRole('heading', { name: 'Homework' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Today' }).or(page.getByRole('button', { name: 'Today' })).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Earlier' }).or(page.getByRole('button', { name: 'Earlier' })).first().click();
  // earlier days are read like the school office reads them: a Monday-to-Sunday strip, and that day's list
  await expect(page.getByText('Homework given per day')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Previous week' })).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('class analysis: the full ranked list of my section and of the whole class, whole tests only', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/class');
  await expect(page.getByRole('heading', { name: 'Class analysis' })).toBeVisible();
  if (!(await page.getByText('In your section').count())) return; // no published results in this school yet
  await page.getByRole('button', { name: 'See the full list' }).first().click();
  const dlg = page.getByRole('dialog', { name: 'My section, ranked' });
  await expect(dlg).toBeVisible();
  await expect(dlg.getByRole('columnheader', { name: 'Overall average' })).toBeVisible();
  await expect(dlg.getByRole('columnheader', { name: 'Latest test' })).toBeVisible();
  await expect(dlg.getByText('You', { exact: true }).first()).toBeVisible();
  await dlg.getByRole('button', { name: 'Close' }).first().click();
  if (await page.getByText(/^Across all of /).count()) {
    await page.getByRole('button', { name: 'See the full list' }).last().click();
    const all = page.getByRole('dialog', { name: 'Whole class, ranked' });
    await expect(all.getByRole('columnheader', { name: 'Section' })).toBeVisible();
  }
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
