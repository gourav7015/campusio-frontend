import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const API = process.env.API_URL || 'http://localhost:4010';
const call = async (token, method, path, body) => {
  const r = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

test.describe.configure({ mode: 'serial' });

test('the admin menu is grouped by people, daily work and administration', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  const nav = page.getByRole('navigation', { name: 'Main' });
  for (const l of ['Students', 'Classes and sections', 'Employees', 'Attendance', 'Academic years', 'Desk logins']) await expect(nav.getByRole('link', { name: l, exact: true })).toBeVisible();
  // one Employees entry replaces separate Teachers and Non-teaching staff entries
  await expect(nav.getByRole('link', { name: 'Teachers', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'Non-teaching staff', exact: true })).toHaveCount(0);
  // Past sessions has no menu entry of its own: it opens from "View data" on the Academic years page
  await expect(nav.getByRole('link', { name: 'Past sessions', exact: true })).toHaveCount(0);
  // Academic years sits in the Administration group, below Daily operations
  const order = await nav.getByRole('link').allTextContents();
  expect(order.indexOf('Academic years')).toBeGreaterThan(order.indexOf('Timetable'));
  expect(order.indexOf('Attendance')).toBeGreaterThan(order.indexOf('Examinations')); // attendance is under Administration, not Daily operations
  await expect(nav.getByRole('link', { name: 'Staff attendance', exact: true })).toHaveCount(0);
  expect(order.indexOf('Classes and sections')).toBeLessThan(order.indexOf('Timetable'));
  expect(problems).toEqual([]);
});

test('Employees lists everyone: teaching, non-teaching, officers and transport crew', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/employees');
  await expect(page.getByRole('heading', { name: 'Employees' })).toBeVisible();
  await expect(page.getByRole('tab', { name: /^Everyone \(\d+\)/ })).toBeVisible();
  await page.getByRole('tab', { name: /^Desk holders/ }).click();
  await expect(page.getByRole('columnheader', { name: 'Last active' })).toBeVisible(); // desk holders show when they were last active, not just that they have a login
  await expect(page.getByRole('row', { name: /Farah Accounts/ })).toContainText('Finance desk holder'); // the desk they hold, in the Group column
  await expect(page.getByRole('row', { name: /Tarun Transport/ })).toContainText('Transport desk holder');
  await page.getByRole('tab', { name: /^Transport crew/ }).click();
  await expect(page.getByRole('row', { name: /Harish Driver/ })).toContainText('Driver');
  await page.getByRole('tab', { name: /^Non-teaching staff/ }).click();
  await expect(page.getByRole('row', { name: /Kamla Devi/ })).toBeVisible();
  await page.getByRole('tab', { name: /^Teaching staff/ }).click();
  await expect(page.getByRole('row', { name: /Rajesh Sharma/ })).toBeVisible();
  await page.getByLabel('Search employees').fill('Harish');
  await page.getByRole('tab', { name: /^Everyone/ }).click();
  await expect(page.getByRole('row', { name: /Harish Driver/ })).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('Staff attendance has a tab for every kind of employee', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff-attendance'); // the old address opens the Attendance page
  await expect(page).toHaveURL(/\/admin\/attendance\?tab=teachers/);
  for (const t of ['Teaching staff', 'Non-teaching staff', 'Officers (finance, library, transport)', 'Transport crew']) {
    await page.getByRole('tab', { name: t, exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Daily register' })).toBeVisible();
  }
  await page.getByRole('tab', { name: 'Officers (finance, library, transport)' }).click();
  await expect(page.getByText('Farah Accounts')).toBeVisible();
  await page.getByRole('tab', { name: 'Transport crew' }).click();
  await expect(page.getByText('Harish Driver')).toBeVisible();
});

test('the Staff portal is the office desk: attendance, leave, employees and queries, nothing personal', async ({ browser, page }) => {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const sp = await ctx.newPage(); const problems = watch(sp);
  try {
    await signIn(sp, 'staff', 'gps.s0001', 'Staff@12345'); // Neha Shah, the office clerk
    const nav = sp.getByRole('navigation', { name: 'Main' });
    for (const n of ['Attendance', 'Leave', 'Employees', 'Teachers\' queries']) await expect(nav.getByRole('link', { name: new RegExp(`^${n}( \\d+ \\w+)?$`) })).toBeVisible(); // a count badge may be part of the name
    for (const n of ['My attendance', 'Salary and payslips']) await expect(nav.getByRole('link', { name: n })).toHaveCount(0); // not a personal portal
    await expect(sp.getByText("Today's attendance")).toBeVisible();
    await expect(sp.getByText('Non-teaching leave waiting')).toBeVisible();
    // employees: no transport crew
    await nav.getByRole('link', { name: 'Employees', exact: true }).click();
    await expect(sp.getByRole('row', { name: /Rajesh Sharma/ })).toBeVisible();
    await sp.getByRole('tab', { name: 'Non-teaching staff' }).click();
    await expect(sp.getByRole('row', { name: /Vikram Chauhan/ })).toBeVisible(); // the PT teacher
    await expect(sp.getByRole('tab', { name: /Transport/ })).toHaveCount(0);
    // attendance of teachers
    await nav.getByRole('link', { name: 'Attendance', exact: true }).click();
    await expect(sp.getByRole('heading', { name: 'Mark attendance' })).toBeVisible();
    for (const t of ['Teaching staff', 'Non-teaching staff', 'Officers (finance, library, transport)']) await expect(sp.getByRole('tab', { name: t, exact: true })).toBeVisible();
    await expect(sp.getByRole('tab', { name: 'Transport crew' })).toHaveCount(0); // never the crew
    await expect(sp.getByRole('row', { name: /Rajesh Sharma/ })).toBeVisible();
    await sp.getByRole('row', { name: /Rajesh Sharma/ }).getByRole('button', { name: 'Absent' }).click();
    await sp.getByRole('button', { name: 'Submit register' }).click();
    const dlg = sp.getByRole('dialog');
    if (await dlg.count()) await dlg.getByRole('button', { name: /Submit|Confirm|Yes/ }).last().click();
    // the admin sees the same register
    await page.goto('/');
    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    await page.goto('/admin/staff-attendance');
    await expect(page.getByRole('row', { name: /Rajesh Sharma/ })).toContainText(/Absent/i, { timeout: 10000 });
    expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
  } finally { await ctx.close(); }
});
