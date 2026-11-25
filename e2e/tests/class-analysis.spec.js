import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('Examinations has no Upcoming/Completed tab; Class analysis shows the student where they stand', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/exams');
  await expect(page.getByRole('heading', { name: 'Examinations' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Upcoming' })).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Completed' })).toHaveCount(0);
  await page.getByRole('link', { name: 'Learning' }).first().click().catch(() => {});
  await page.goto('/student/class');
  await expect(page.getByRole('heading', { name: 'Class analysis' })).toBeVisible();
  // either real standing (rank, spread, subjects, every test) or an honest "not ready" message — never invented numbers
  await expect(page.getByText(/^Rank \d+/).or(page.getByText('Your class standing will appear here'))).toBeVisible();
  if (await page.getByText('Where the class stands').count()) {
    await expect(page.getByText('Subject by subject')).toBeVisible();
    await expect(page.getByText('What to keep an eye on')).toBeVisible();
    await expect(page.getByText('Every test')).toBeVisible();
  }
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
