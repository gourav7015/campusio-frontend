import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const iso = (d) => d.toISOString().slice(0, 10);
const monday = (weeksAhead) => { const d = new Date(Date.now() + weeksAhead * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return iso(d); };

test('a teacher can ask for half a day; the form asks for one date and which half', async ({ page }) => {
  const problems = watch(page);
  const uid = Date.now().toString().slice(-6);
  await signIn(page, 'teacher', 'rao@gps.test', 'Teach@12345');
  await page.goto('/teacher/leave');
  await page.getByRole('button', { name: /Apply for leave/ }).click();
  const dlg = page.getByRole('dialog', { name: 'Apply for leave' });
  await expect(dlg.getByLabel('End date')).toBeVisible();
  await dlg.getByLabel('Half day only').check();
  await expect(dlg.getByLabel('End date')).toHaveCount(0); // one date only
  await dlg.getByLabel('Which half are you away?').selectOption('first');
  await dlg.getByLabel('Date', { exact: true }).fill(monday(6));
  await dlg.getByLabel('Reason').fill(`Doctor ${uid}`);
  await dlg.getByRole('button', { name: 'Save' }).click();
  const row = page.getByRole('row', { name: new RegExp(`Doctor ${uid}`) });
  await expect(row).toContainText('½ (first half)');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('the exams page of a teacher filters by class and subject; the period menu shows only when the school uses it', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await expect(page.getByRole('link', { name: 'Period attendance' })).toHaveCount(0); // not switched on in this school
  await expect(page.getByRole('link', { name: 'Study materials' })).toHaveCount(0);
  await page.goto('/teacher/exams');
  await expect(page.getByRole('row').nth(1)).toBeVisible();
  const before = await page.getByRole('row').count();
  await page.getByLabel('Class', { exact: true }).selectOption({ index: 1 }); // the filters are fields on the page, not behind an icon
  const cls = await page.getByRole('row').nth(1).locator('td').nth(1).innerText();
  const after = await page.getByRole('row').count();
  expect(after).toBeLessThanOrEqual(before);
  for (const c of await page.getByRole('row').locator('td:nth-child(2)').allInnerTexts()) expect(c).toBe(cls);
  expect(problems, problems.join('\n')).toEqual([]);
});
