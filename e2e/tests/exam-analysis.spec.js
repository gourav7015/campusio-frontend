import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('class analysis has Tables and Graphs, a student finder, and a marks-only student page', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/exams');
  await expect(page.getByRole('heading', { name: 'Class analysis' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tables' })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Graphs' })).toBeVisible();
  // the overview shows exams held and the subject-wise average as cards; the charts are on the Graphs tab
  await expect(page.getByText('Examinations held')).toBeVisible();
  await expect(page.getByText('Subject-wise average')).toBeVisible();
  await expect(page.getByText('Average by class')).toHaveCount(0);
  await page.getByRole('tab', { name: 'Graphs' }).click();
  await expect(page.getByText('Average by class')).toBeVisible();
  await page.getByRole('tab', { name: 'Tables' }).click();

  // find a student by name, or by admission number, and open their marks
  const finder = page.getByLabel('Find a student').first();
  await finder.fill('Aarav');
  await expect(page.getByText('Aarav Sharma').first()).toBeVisible();
  await finder.fill('ADM2026');
  await expect(page.getByRole('button', { name: 'Open marks' }).first()).toBeVisible();
  await finder.fill('Aarav');
  await expect(page.getByText('Aadhya Sharma')).toHaveCount(0); // wait for the list to narrow before opening a row
  await page.getByRole('button', { name: 'Open marks' }).first().click();
  await expect(page).toHaveURL(/\/admin\/exams\/student\//);
  await expect(page.getByRole('heading', { name: /Aarav/ })).toBeVisible();
  const card = page.getByText('Admission no.').locator('xpath=ancestor::*[contains(@class,"card") or self::section][1]');
  await expect(page.getByText('Admission no.')).toBeVisible();
  await expect(page.getByText('Roll no.')).toBeVisible();
  await expect(page.getByText(/Mother|Father|Guardian/).first()).toBeVisible(); // guardian and phone are in the top card
  await expect(page.getByText('Bus', { exact: true })).toBeVisible();
  void card;
  // marks sections open and close
  const fold = page.getByRole('button', { name: /Subject-wise average/ });
  await expect(fold).toHaveAttribute('aria-expanded', 'false');
  await fold.click();
  await expect(fold).toHaveAttribute('aria-expanded', 'true');
  // marks only: nothing about fees, library, attendance
  await expect(page.getByText('Total fee assigned')).toHaveCount(0);
  const main = page.locator('#main-content');
  await expect(main.getByText('Library', { exact: true })).toHaveCount(0);
  await expect(page.getByText('Attendance this year')).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'full student page' })).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('inside a class: find a student by name or admission number, filter, and see graphs of the marks', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/exams');
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8' });
  await expect(page.getByText('Every student, every exam')).toBeVisible();
  const rows = () => page.getByRole('table').last().getByRole('row');
  const total = (await rows().count()) - 1;
  expect(total).toBeGreaterThan(1);
  await page.getByLabel('Find a student').fill('Aarav');
  await expect.poll(async () => (await rows().count()) - 1).toBeLessThan(total);
  await expect(page.getByRole('table').last()).toContainText('Aarav');
  await page.getByLabel('Find a student').fill('');
  await expect.poll(async () => (await rows().count()) - 1).toBe(total);
  await page.getByLabel('Result filter').selectOption({ index: 1 });
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.getByRole('tab', { name: 'Graphs' }).click();
  await expect(page.getByText('Average and pass rate by exam')).toBeVisible();
  await expect(page.getByText('How marks are spread')).toBeVisible();
  await expect(page.getByText('Grades awarded')).toBeVisible();
  await expect(page.getByText('Every student, every exam')).toHaveCount(0); // the tables are on the other tab
});
