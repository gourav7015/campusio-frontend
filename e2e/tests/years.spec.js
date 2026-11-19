import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const API = process.env.API_URL || 'http://localhost:4010';
const call = async (token, method, path, body) => {
  const r = await fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

test.describe.configure({ mode: 'serial' });

test('a past session is read in its own section and nowhere else; classes can run on their own dates', async ({ page }) => {
  const problems = watch(page);
  const login = await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json();
  const token = login.token;
  const years = (await call(token, 'GET', '/api/school/years')).body;
  const original = years.find((y) => y.isCurrent);
  let created;
  try {
    // a newer year becomes the current one, so 2026-2027 turns into "the previous session"
    created = (await call(token, 'POST', '/api/school/years', { name: `2027-2028`, startDate: '2027-04-01', endDate: '2028-03-31' })).body;
    if (!created._id) created = years.find((y) => y.name === '2027-2028');
    await call(token, 'POST', `/api/school/years/${created._id}/set-current`, {});

    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    // the live pages show the current session only: no year picker, no "looking at an old year" banner, nobody in Class 8 yet
    await page.goto('/admin/students');
    await expect(page.getByRole('row').nth(1)).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Academic year shown')).toHaveCount(0);
    await expect(page.getByRole('row').filter({ hasText: 'Class 8' })).toHaveCount(0);
    await page.goto('/admin/classes');
    await expect(page.getByText('No sections for this year')).toBeVisible({ timeout: 10000 });
    await expect(page.getByLabel('Academic year')).toHaveCount(0);
    await page.goto('/admin');
    await expect(page.getByText('You are looking at')).toHaveCount(0);

    // the earlier session opens from "View data" on the Academic years page (there is no menu entry for it)
    await expect(page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Past sessions' })).toHaveCount(0);
    await page.goto('/admin/years');
    await page.getByRole('link', { name: 'View 2026-2027 data' }).click();
    await expect(page.getByRole('heading', { name: 'Past sessions' })).toBeVisible();
    await expect(page.getByLabel('Breadcrumb').getByText('Academic years')).toBeVisible(); // the breadcrumb says where it came from
    await page.getByLabel('Past session').selectOption({ label: '2026-2027' });
    await expect(page.getByText('Nothing here can be changed')).toBeVisible();
    await page.getByRole('row').filter({ hasText: 'Class 8' }).first().click();
    await expect(page.getByRole('cell', { name: 'Aarav Sharma' })).toBeVisible({ timeout: 10000 }); // last year's roster
    await page.getByRole('tab', { name: 'Exams and results' }).click();
    await expect(page.getByText(/Exams in 2026-2027/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Archive' })).toHaveCount(0);

    // years themselves are still managed normally
    await page.goto('/admin/years');
    await page.getByRole('button', { name: 'Class dates' }).first().click();
    const d = page.getByRole('dialog');
    await d.getByLabel('Class 8 starts').fill('2027-04-01');
    await d.getByLabel('Class 8 ends').fill('2028-02-28');
    await d.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('button', { name: /Class dates \(1\)/ })).toBeVisible({ timeout: 10000 });
    expect(problems.filter((p) => !/status of 4\d\d|Failed to load resource/i.test(String(p)))).toEqual([]);
  } finally {
    if (original) await call(token, 'POST', `/api/school/years/${original._id}/set-current`, {});
  }
});

test('the Academic years page has a "View data" button for every past year, which opens Past sessions', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/years');
  await expect(page.getByRole('heading', { name: 'Academic years' })).toBeVisible();
  const view = page.getByRole('link', { name: /^View .* data$/ });
  await expect(view.first()).toBeVisible();
  const name = (await view.first().getAttribute('aria-label')).replace(/^View /, '').replace(/ data$/, '');
  await view.first().click();
  await expect(page).toHaveURL(/\/admin\/past-sessions\?year=/);
  await expect(page.getByText(new RegExp(`You are looking at ${name}`))).toBeVisible();
  await expect(page.getByText(/read-only record/)).toBeVisible();
});
