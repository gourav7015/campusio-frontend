import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const monday = (weeksAhead) => { const d = new Date(Date.now() + weeksAhead * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return d.toISOString().slice(0, 10); };

test('a teacher withdraws an application before it is decided, and the office no longer sees it waiting', async ({ browser }) => {
  const mk = async () => { const ctx = await browser.newContext(); const page = await ctx.newPage(); return { ctx, page, problems: watch(page) }; };
  const teacher = await mk(); const admin = await mk();
  const uid = Date.now().toString().slice(-6);
  await signIn(teacher.page, 'teacher', 'rao@gps.test', 'Teach@12345');
  await teacher.page.goto('/teacher/leave');
  await teacher.page.getByRole('button', { name: /Apply for leave/ }).click();
  const dlg = teacher.page.getByRole('dialog', { name: 'Apply for leave' });
  await dlg.getByLabel('Start date').fill(monday(9)); await dlg.getByLabel('End date').fill(monday(9));
  await dlg.getByLabel('Reason').fill(`Family function ${uid}`);
  await dlg.getByRole('button', { name: 'Save' }).click();
  const row = teacher.page.getByRole('row', { name: new RegExp(`Family function ${uid}`) });
  await expect(row).toContainText('Submitted');

  // it waits on the office's Leave page
  await signIn(admin.page, 'admin', 'admin@gps.test', 'Admin@12345');
  await admin.page.goto('/admin/leave');
  await expect(admin.page.getByRole('row', { name: new RegExp(`Family function ${uid}`) })).toBeVisible();

  // the teacher takes it back
  await row.getByRole('button', { name: 'Withdraw' }).click();
  await teacher.page.getByRole('dialog').getByRole('button', { name: /Withdraw|Confirm|Yes/ }).last().click();
  await expect(row).toContainText('Withdrawn');
  await expect(row.getByRole('button', { name: /Withdraw|Cancel leave/ })).toHaveCount(0);

  // no longer waiting for a decision
  await admin.page.reload();
  await expect(admin.page.getByRole('row', { name: new RegExp(`Family function ${uid}`) })).toHaveCount(0);
  await admin.page.getByRole('combobox', { name: 'Status' }).selectOption({ label: 'Withdrawn' });
  await expect(admin.page.getByRole('row', { name: new RegExp(`Family function ${uid}`) })).toContainText('Withdrawn');
  expect(teacher.problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
  await teacher.ctx.close(); await admin.ctx.close();
});

test('the office can end a running leave early, and the option is gone once its dates have all gone', async ({ browser }) => {
  const mk = async () => { const ctx = await browser.newContext(); const page = await ctx.newPage(); return { ctx, page, problems: watch(page) }; };
  const admin = await mk();
  const API = process.env.API_URL || 'http://localhost:4010';
  const login = async (id, pw, portal) => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw, portal }) })).json()).token;
  const T = await login('rao@gps.test', 'Teach@12345', 'teacher'); const A = await login('admin@gps.test', 'Admin@12345', 'admin');
  const day = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);
  const uid = Date.now().toString().slice(-6);
  const applied = await (await fetch(`${API}/api/teacher/leave`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${T}` }, body: JSON.stringify({ leaveType: 'casual', startDate: day(-1), endDate: day(2), reason: `Running ${uid}` }) })).json();
  await fetch(`${API}/api/school/leave/${applied._id}/decide`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${A}` }, body: JSON.stringify({ decision: 'approve' }) });
  await signIn(admin.page, 'admin', 'admin@gps.test', 'Admin@12345');
  await admin.page.goto('/admin/leave');
  const row = admin.page.getByRole('row', { name: new RegExp(`Running ${uid}`) });
  await row.getByRole('button', { name: 'End leave early' }).click();
  await admin.page.getByRole('dialog').getByRole('button', { name: /End leave early|Confirm|Yes/ }).last().click();
  await expect(admin.page.getByText('Leave ended').first()).toBeVisible();
  await expect(row.getByRole('button', { name: /End leave early|Cancel leave/ })).toHaveCount(0); // its dates have all gone now
  expect(admin.problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
  await admin.ctx.close();
});
