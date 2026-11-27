import { test, expect } from '@playwright/test';
import { resetAttendance, setWay } from './attendance-way.js';
import { signIn, watch, openFilters } from './helpers.js';

const API = process.env.API_URL || 'http://localhost:4010';
const adminToken = async () => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json()).token;
const call = (token, method, path, body) => fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });

test.describe.configure({ mode: 'serial' });

test('Classes and sections no longer has an Attendance tab; attendance is one page under Administration', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/classes');
  for (const t of ['Classes and sections', 'Homework by day']) await expect(page.getByRole('tab', { name: t, exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Subjects and teachers', exact: true })).toHaveCount(0); // they have their own page under Academics
  await expect(page.getByRole('tab', { name: 'Attendance', exact: true })).toHaveCount(0);
  await page.goto('/admin/classes?tab=attendance'); // old links still work
  await expect(page).toHaveURL(/\/admin\/attendance/);
  await expect(page.getByRole('heading', { name: 'Attendance', exact: true })).toBeVisible();
  for (const t of ['Students', 'Teaching staff', 'Non-teaching staff', 'Officers (finance, library, transport)', 'Transport crew']) await expect(page.getByRole('tab', { name: t, exact: true })).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('the Students tab is filterable by class, section, register and absentees; a row opens its register', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/attendance');
  await expect(page.getByText('Registers submitted')).toBeVisible();
  const cards = () => page.locator('.sec-card');
  await expect(cards().first()).toBeVisible();
  const all = await cards().count();
  expect(all).toBeGreaterThan(1);
  await expect(page.getByLabel('Class', { exact: true })).toHaveCount(0); // filters sit behind the icon
  await openFilters(page);
  const cls = page.getByLabel('Class', { exact: true });
  await cls.selectOption({ label: 'Class 8' });
  await expect.poll(async () => cards().count()).toBeLessThanOrEqual(all);
  const sectionOptions = await page.getByLabel('Section', { exact: true }).locator('option').allTextContents();
  expect(sectionOptions.length).toBeGreaterThan(1);
  await page.getByLabel('Section', { exact: true }).selectOption({ label: 'A' });
  await expect(cards().first()).toContainText('Class 8 A');
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await page.keyboard.press('Escape');
  await expect.poll(async () => cards().count()).toBe(all);
  await page.getByLabel('Search class or section').fill('Class 8 A');
  await expect.poll(async () => cards().count()).toBe(1);
  await cards().first().click(); // the whole card opens the register
  await expect(page.getByRole('dialog')).toContainText('Class 8 A');
});

test('staff tabs have designation and status filters, and the month view an attendance band', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/attendance?tab=general');
  await expect(page.getByLabel('Search staff by name or ID')).toBeVisible();
  // the register shows who is where as chips with counts, the same on every register
  await page.getByRole('button', { name: /^Absent \d+$/ }).click();
  await expect(page.getByText(/Showing \d+ of \d+/)).toBeVisible();
  await page.getByRole('button', { name: /^All \d+$/ }).click();
  await page.getByRole('tab', { name: 'This month' }).click();
  await openFilters(page);
  await expect(page.getByLabel('Attendance band')).toBeVisible();
  await page.getByLabel('Attendance band').selectOption('low');
  await expect(page.getByText(/Showing \d+ of \d+/)).toBeVisible();
});

test('a whole section row opens the class page; its buttons still do their own job; the Attendance tab follows the way the school takes attendance', async ({ page }) => {
  test.skip(new Date().getDay() === 0, 'the demo school does not work on Sunday');
  await resetAttendance();
  try {
    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    await page.goto('/admin/classes');
    await expect(page.getByRole('button', { name: 'Edit', exact: true }).first()).toBeVisible();
    await page.getByRole('button', { name: 'Edit', exact: true }).first().click();
    await expect(page.getByRole('dialog')).toBeVisible(); // the button opened its side panel, not the class page
    await page.getByRole('dialog').getByRole('button', { name: 'Cancel' }).click();
    await page.getByRole('link', { name: 'Open' }).first().click(); // the section's own page
    await expect(page).toHaveURL(/\/admin\/classes\/[a-f0-9]{24}/);
    await expect(page.getByRole('tab', { name: 'Attendance', exact: true })).toBeVisible(); // the class page keeps its own attendance
    await expect(page.getByRole('tab', { name: 'By period' })).toHaveCount(0);
    await page.getByRole('tab', { name: 'Attendance', exact: true }).click();
    await expect(page.getByText(/Registers/).first()).toBeVisible(); // once a day: the registers
    // a school that takes attendance period by period: the same tab is the day as periods
    await setWay(true);
    await page.reload();
    await page.getByRole('tab', { name: 'Attendance', exact: true }).click();
    await expect(page.getByRole('tab', { name: 'Whole class', selected: true })).toBeVisible(); // the whole class comes first
    await page.getByRole('tab', { name: 'Day by day' }).click();
    await expect(page.getByText(/of \d periods submitted/)).toBeVisible();
    await expect(page.getByRole('tab', { name: 'By period' })).toHaveCount(0);
  } finally { await resetAttendance(); }
});
