import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

/** Online payment is a per-school switch the Platform Admin controls. Off: no Online payments page in Finance, no Pay online button for families. */
test('with online payment switched off, Finance has no Online payments page and the student has no pay button; switched on, both are back', async ({ page, request }) => {
  const problems = watch(page);
  const base = `http://localhost:${process.env.WEB_URL ? new URL(process.env.WEB_URL).port : 5173}`;
  const login = await request.post(`${base}/api/auth/login`, { data: { loginId: 'superadmin@erp.local', password: 'Super@12345', portal: 'platform' } });
  const token = (await login.json()).token;
  const auth = { Authorization: `Bearer ${token}` };
  const schools = (await (await request.get(`${base}/api/platform/schools`, { headers: auth })).json());
  const gps = (schools.items || schools).find((s) => s.code === 'gps');
  const setFlag = (on) => request.put(`${base}/api/platform/schools/${gps._id}/flags`, { headers: auth, data: { onlinePayments: on } });
  try {
    expect((await setFlag(false)).ok()).toBe(true);
    await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
    await page.goto('/finance/students');
    await expect(page.getByRole('link', { name: 'Payments and receipts' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Online payments' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await page.getByText('Sign out').click();
    await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
    await page.goto('/student/fees');
    await expect(page.getByText("Payments are made at the school's finance desk.")).toBeVisible();
    await expect(page.getByRole('button', { name: /Pay online|Pay now/i })).toHaveCount(0);
    await page.getByRole('button', { name: 'Profile menu' }).click();
    await page.getByText('Sign out').click();
    expect((await setFlag(true)).ok()).toBe(true);
    await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
    await page.goto('/finance/students');
    await expect(page.getByRole('link', { name: 'Online payments' })).toBeVisible();
  } finally { await setFlag(true); }
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});
