import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

// Needs a demo that has an earlier year: start it with DEMO_PREVIOUS_YEAR=1 (see backend/src/sample-previous-year.js)
test.skip(!process.env.DEMO_PREVIOUS_YEAR, 'start the demo with DEMO_PREVIOUS_YEAR=1 to run this');

test('a student finds the results of the year before: pick the year on Results and on Class analysis', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/results');
  const year = page.getByLabel('Academic year');
  await expect(year).toBeVisible();
  await year.selectOption({ index: 1 });
  await expect(page.getByText('An earlier academic year')).toBeVisible();
  await expect(page.getByText('Final Exam').first()).toBeVisible();
  await page.getByRole('button', { name: 'View report card' }).first().click();
  await expect(page).toHaveURL(/\/student\/results\/[a-f0-9]+\?year=/);
  await expect(page.getByRole('heading', { name: /Unit Test 1|Half-Yearly|Final Exam/ })).toBeVisible();
  await page.goto('/student/class');
  await page.getByLabel('Academic year').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'See the full list' }).last().click();
  const dlg = page.getByRole('dialog', { name: 'Whole class, ranked' });
  await expect(dlg.getByText(/Ranked by the latest test: Final Exam/)).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
