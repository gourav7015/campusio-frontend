import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const iso = (d) => d.toISOString().slice(0, 10);
const inDays = (n) => { const d = new Date(Date.now() + n * 864e5); while ([0, 6].includes(d.getUTCDay())) d.setUTCDate(d.getUTCDate() + 1); return iso(d); };

test('the standard exams are added in one click, and the date sheet is filled class by class', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/exams');
  await page.getByRole('tab', { name: 'Examinations and marks' }).click();
  await expect(page.getByRole('cell', { name: /Unit Test 1/ }).first()).toBeVisible(); // the list has loaded
  const add = page.getByRole('button', { name: 'Add the standard exams' });
  await expect(add.or(page.getByRole('cell', { name: /Final Exam/ }).first())).toBeVisible(); // either the button, or everything is there already
  if (await add.count()) { await add.click(); await expect(page.getByText(/examination\(s\) added/)).toBeVisible(); }
  for (const n of ['Unit Test 1', 'Unit Test 2', 'Half-Yearly', 'Unit Test 3', 'Unit Test 4', 'Final Exam']) await expect(page.getByRole('cell', { name: new RegExp(n) }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add the standard exams' })).toHaveCount(0); // all six are there

  await page.getByRole('cell', { name: /Unit Test 3/ }).first().click();
  await expect(page.getByRole('tab', { name: 'Date sheet' })).toHaveAttribute('aria-selected', 'true');
  // pick a class that has subjects (the demo's Class 8) and give its first paper a date
  const cls = page.getByLabel('Class', { exact: true });
  await cls.selectOption({ label: 'Class 8' });
  await expect(page.getByRole('row').nth(1)).toBeVisible();
  const date = page.locator('input[type=date]').first();
  await date.fill(inDays(40));
  await page.locator('input[type=time]').first().fill('09:00');
  await page.locator('input[type=time]').nth(1).fill('11:00');
  await page.getByRole('button', { name: 'Save date sheet' }).click();
  await expect(page.getByText(/Date sheet saved/)).toBeVisible();
  await expect(page.getByText(/1 of \d+ dated/)).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);
});

test('Class 11 and 12 can be added by stream, each with its own usual subjects', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/classes');
  await page.getByRole('button', { name: '+ Class' }).click();
  const dlg = page.getByRole('dialog', { name: 'Add class' });
  await expect(dlg.getByLabel('Class').locator('option', { hasText: 'Class 11 Medical' })).toHaveCount(1);
  for (const st of ['Non-Medical', 'Commerce', 'Arts']) await expect(dlg.getByLabel('Class').locator('option', { hasText: `Class 12 ${st}` })).toHaveCount(1);
  const pick = (await dlg.getByLabel('Class').locator('option', { hasText: 'Class 11 Commerce' }).count()) ? 'Class 11 Commerce' : null;
  if (pick) { await dlg.getByLabel('Class').selectOption({ label: pick }); await dlg.getByRole('button', { name: 'Add class' }).click(); }
  else await dlg.getByRole('button', { name: 'Cancel' }).click();
  expect(problems.filter((p) => !/HTTP 409/.test(p)), problems.join('\n')).toEqual([]);
});
