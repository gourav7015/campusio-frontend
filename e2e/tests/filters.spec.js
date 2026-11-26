import { test, expect } from '@playwright/test';
import { signIn, watch, openFilters } from './helpers.js';

const rank = (n) => { n = String(n); if (/^lkg/i.test(n)) return -2; if (/^ukg/i.test(n)) return -1; const m = /(\d+)/.exec(n); return m ? Number(m[1]) : 999; };

test('teacher assignments are in school order and can be filtered; choosing a filter keeps the other choices', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/assignments');
  await expect(page.getByRole('heading', { name: 'Subjects & teacher assignments' })).toBeVisible();
  const table = page.getByRole('table').first();
  await expect(table.getByRole('row').nth(1)).toBeVisible();
  const classes = await table.getByRole('row').evaluateAll((rows) => rows.slice(1).map((r) => r.querySelector('td')?.textContent?.trim()));
  const keys = classes.map((c) => [rank(c), c.split(' ').pop()]);
  expect(keys).toEqual([...keys].sort((a, b) => a[0] - b[0] || String(a[1]).localeCompare(String(b[1])))); // by class, then section
  // filters sit behind an icon; choosing one keeps every other choice available
  await expect(page.getByLabel('Subject', { exact: true })).toHaveCount(0);
  await openFilters(page);
  const subject = page.getByLabel('Subject', { exact: true });
  const before = await subject.locator('option').count();
  expect(before).toBeGreaterThan(2);
  const pick = await subject.locator('option').nth(1).textContent();
  await subject.selectOption({ index: 1 });
  const subjectCol = await table.getByRole('row').evaluateAll((rows) => rows.slice(1).map((r) => r.querySelectorAll('td')[1]?.textContent?.trim()));
  expect(new Set(subjectCol)).toEqual(new Set([pick]));
  expect(await subject.locator('option').count()).toBe(before); // the bug: it used to shrink to "All" and the chosen one
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(subject).toHaveValue('');
  await page.keyboard.press('Escape');
  // columns sort on click
  await table.getByRole('button', { name: 'Teacher' }).click();
  const teachers = await table.getByRole('row').evaluateAll((rows) => rows.slice(1).map((r) => r.querySelectorAll('td')[2]?.textContent?.trim()));
  expect(teachers).toEqual([...teachers].sort((a, b) => a.localeCompare(b)));
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('Employees filters belong to the tab, and choosing one never shrinks the other choices', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/employees?tab=non_teaching');
  await expect(page.getByLabel('Designation', { exact: true })).toHaveCount(0); // hidden until the filter icon is used
  await openFilters(page);
  const des = page.getByLabel('Designation', { exact: true });
  await expect.poll(async () => des.locator('option').count()).toBeGreaterThan(2); // the choices have loaded
  const names = async () => (await des.locator('option').allTextContents()).map((t) => t.replace(/ \(\d+\)$/, ''));
  const before = await names();
  expect(before).not.toContain('Driver'); // other tabs' titles are not offered here
  await des.selectOption({ index: 1 });
  await expect(page.getByRole('table').first().getByRole('row').nth(1)).toBeVisible();
  expect(await names()).toEqual(before); // after choosing one, the others are still there
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /^Teaching staff/ }).click();
  await openFilters(page);
  await expect(page.getByLabel('Subject', { exact: true })).toBeVisible(); // teaching-only filters
  await expect(page.getByLabel('Class teachers')).toBeVisible();
  expect(await names()).not.toContain('Sweeper');
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /^Transport crew/ }).click();
  await openFilters(page);
  await expect(page.getByLabel('Bus', { exact: true })).toBeVisible();
  await expect(page.getByLabel('Licence', { exact: true })).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: /^Desk holders/ }).click();
  await openFilters(page);
  await expect(page.getByLabel('Desk', { exact: true })).toBeVisible();
});

test('one Leave page for teachers, non-teaching staff and the transport crew', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.getByRole('navigation', { name: 'Areas' }).getByRole('link', { name: /^People/ }).click();
  const nav = page.getByRole('navigation', { name: 'Main' });
  await expect(nav.getByRole('link', { name: 'Leave', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Staff leave', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Teacher leave', exact: true })).toHaveCount(0);
  await nav.getByRole('link', { name: 'Leave', exact: true }).click();
  for (const t of ['Teaching staff', 'Non-teaching staff', 'Transport crew']) await expect(page.getByRole('tab', { name: t, exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Transport crew', exact: true }).click();
  await expect(page.getByText('Staff leave').first()).toBeVisible();
  await page.goto('/admin/staff-leave'); // old links still land on the right tab
  await expect(page).toHaveURL(/\/admin\/leave\?tab=general/);
});

test('Defaulters is a main tab of Fees, next to Reports', async ({ browser, page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/fees');
  await expect(page.getByRole('tab', { name: 'Defaulters', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Reports', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Defaulters', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Defaulters' })).toBeVisible();
  await page.getByRole('tab', { name: 'Reports', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Reports', exact: true })).toBeVisible();
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const f = await ctx.newPage();
  await signIn(f, 'finance', 'finance@gps.test', 'Finance@12345');
  // the Finance portal has a top bar of areas; Defaulters sits under Fees and Reports is its own area
  await expect(f.getByRole('link', { name: 'Reports', exact: true }).first()).toBeVisible();
  await f.goto('/finance/defaulters');
  await expect(f.getByRole('heading', { name: 'Defaulters' })).toBeVisible();
  await ctx.close();
});

test('a discount can be given while collecting a payment', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/students');
  await page.getByRole('row').nth(1).click();
  await page.getByRole('button', { name: 'Collect payment' }).last().click(); // the one on the open account (the rows have their own too)
  const dlg = page.getByRole('dialog', { name: 'Collect payment' });
  await dlg.getByLabel(/Give a discount or concession/).check();
  await dlg.getByLabel('Discount value').fill('500');
  await expect(dlg.getByRole('button', { name: /^Collect/ })).toBeDisabled(); // a reason is needed
  await dlg.getByLabel('Discount reason').fill('Sibling discount');
  await expect(dlg.getByRole('status')).toContainText('discount');
  const [download] = await Promise.all([page.waitForEvent('download').catch(() => null), dlg.getByRole('button', { name: /^Collect/ }).click()]);
  await expect(page.getByText(/Receipt .* issued/)).toBeVisible({ timeout: 10000 });
  void download;
  await expect(page.getByText('Sibling discount').first()).toBeVisible(); // kept on the dues with its reason
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('the desk logins page can add a Staff portal login', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff');
  await page.getByRole('button', { name: '+ Add sign-in' }).click();
  const dlg = page.getByRole('dialog', { name: 'Add a desk login' });
  await dlg.getByLabel('Desk', { exact: true }).selectOption('staff');
  await expect(dlg.getByTestId('login-id-preview')).toContainText('Choose the employee');
  await dlg.getByLabel('Employee who works the office desk').selectOption({ index: 1 });
  await expect(dlg.getByTestId('login-id-preview')).toContainText(/gps\.s\d{4}/); // the login id is shown before anything is saved
  await expect(dlg.getByLabel('Email', { exact: true })).toHaveCount(0); // no personal details are asked for a desk login
  await dlg.getByRole('button', { name: 'Create login' }).click();
  const creds = page.getByRole('dialog', { name: 'Staff account' });
  await expect(creds).toContainText('Temporary password');
  await expect(creds).toContainText(/gps\.s\d{4}/);
});
