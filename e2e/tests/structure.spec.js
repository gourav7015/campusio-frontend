import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('the school makes its own houses; students and teachers can be put only in those', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/houses');
  await expect(page.getByRole('heading', { name: 'Houses' })).toBeVisible();
  for (const h of ['Aravali', 'Nilgiri', 'Himalaya', 'Vindhya']) await expect(page.getByText(h, { exact: true }).first()).toBeVisible();
  for (const generic of ['Red', 'Blue', 'Green', 'Yellow']) await expect(page.getByText(generic, { exact: true })).toHaveCount(0); // no built-in houses
  await page.getByRole('button', { name: 'Members' }).first().click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByText('Mentors (teachers)')).toBeVisible();
  await expect(dlg.getByText(/^Students \(\d+\)/)).toBeVisible();
  await dlg.locator('button.btn', { hasText: 'Close' }).click();
  // a new house
  await page.getByRole('button', { name: '+ Add house' }).click();
  const add = page.getByRole('dialog', { name: 'Add a house' });
  await add.getByLabel('House name').fill('Sahyadri');
  await add.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('Sahyadri', { exact: true })).toBeVisible();
  // the student form offers only the school's houses
  await page.goto('/admin/students');
  await page.getByRole('button', { name: /Admit|\+ Student|Add student/ }).first().click();
  const sel = page.getByRole('dialog').getByLabel('House');
  await expect(sel.locator('option', { hasText: 'Sahyadri' })).toHaveCount(1);
  await expect(sel.locator('option', { hasText: 'Red' })).toHaveCount(0);
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('ranks are registered once, and teachers can hold only those', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/designations');
  await expect(page.getByRole('heading', { name: 'Designations' })).toBeVisible();
  for (const r of ['PGT', 'TGT', 'PRT', 'Head of Department']) await expect(page.getByRole('cell', { name: r, exact: true })).toBeVisible();
  await page.getByRole('button', { name: '+ Add a designation' }).click();
  await page.getByRole('dialog').getByLabel('Name').fill('Sports Coordinator');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: 'Sports Coordinator', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Non-teaching jobs' }).click();
  await expect(page.getByRole('cell', { name: 'PT Teacher', exact: true })).toBeVisible();
  // the teacher form is a list of the registered ranks, not free text
  await page.goto('/admin/teachers');
  await page.getByRole('button', { name: /Add teacher|\+ Teacher/ }).first().click();
  const sel = page.getByRole('dialog').getByLabel('Designation');
  await expect(sel.locator('option', { hasText: 'Sports Coordinator' })).toHaveCount(1);
  await expect(sel.locator('option', { hasText: 'PGT' })).toHaveCount(1);
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('a teacher sees her house, and writes to the office; the office desk answers', async ({ browser }) => {
  const uid = Date.now().toString().slice(-6);
  const t = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const tp = await t.newPage(); const problems = watch(tp);
  await signIn(tp, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await tp.goto('/teacher/house');
  await expect(tp.getByRole('heading', { name: /house$/ }).first()).toBeVisible();
  await expect(tp.getByText('Students in the house')).toBeVisible();
  await tp.goto('/teacher/queries');
  await tp.getByRole('button', { name: '+ New query' }).click();
  await tp.getByLabel('Subject').fill(`Attendance question ${uid}`);
  await tp.getByLabel('Your question').fill('I was present on Tuesday but I am marked absent.');
  await tp.getByRole('button', { name: 'Send' }).click();
  await expect(tp.getByText(`Attendance question ${uid}`).first()).toBeVisible();
  const s = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const sp = await s.newPage(); watch(sp);
  await signIn(sp, 'staff', 'gps.s0001', 'Staff@12345');
  await sp.goto('/staff/queries');
  await sp.getByText(`Attendance question ${uid}`).first().click();
  await sp.getByRole('textbox').last().fill('Checked: corrected, sorry.');
  await sp.getByRole('button', { name: 'Send' }).click();
  await expect(sp.getByText('Checked: corrected, sorry.')).toBeVisible();
  await tp.goto('/teacher/queries');
  await tp.getByText(`Attendance question ${uid}`).first().click();
  await expect(tp.getByText('Checked: corrected, sorry.')).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
