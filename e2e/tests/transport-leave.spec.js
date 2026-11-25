import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const API = process.env.API_URL || 'http://localhost:4010';
const iso = (d) => d.toISOString().slice(0, 10);
const pick = async (dlg, name) => dlg.getByLabel('Staff member').selectOption(await dlg.getByLabel('Staff member').locator('option', { hasText: name }).getAttribute('value'));
const monday = (weeksAhead) => { const d = new Date(Date.now() + weeksAhead * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return iso(d); };

test.describe.configure({ mode: 'serial' });

test('transport crew have no login controls, and leave goes to the admin when the officer passes it on', async ({ browser }) => {
  const uid = Date.now().toString().slice(-6);
  const t = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const tp = await t.newPage(); const tproblems = watch(tp);
  await signIn(tp, 'transport', 'transport@gps.test', 'Transport@12345');
  await tp.goto('/transport/staff');
  await expect(tp.getByRole('row', { name: /Harish Driver/ })).toBeVisible();
  await expect(tp.getByRole('columnheader', { name: 'Sign-in' })).toHaveCount(0);
  await expect(tp.getByRole('button', { name: /Create login|Reset password/ })).toHaveCount(0);

  // one leave passed to the admin
  await tp.goto('/transport/leave');
  await tp.getByRole('button', { name: 'Record leave' }).click();
  let dlg = tp.getByRole('dialog', { name: 'Record a leave' });
  await pick(dlg, 'Harish Driver');
  await dlg.getByLabel('From', { exact: true }).fill(monday(3)); await dlg.getByLabel('To', { exact: true }).fill(monday(3));
  await dlg.getByLabel('Reason').fill(`Passed on ${uid}`);
  await dlg.getByLabel('Send to the school admin to approve').check();
  await dlg.getByRole('button', { name: 'Record' }).click();
  await tp.getByLabel('Status').selectOption('submitted');
  const waiting = tp.getByRole('row', { name: new RegExp(`Passed on ${uid}`) });
  await expect(waiting).toContainText('With the school admin');
  await expect(waiting.getByRole('button', { name: 'Approve' })).toHaveCount(0); // out of the officer's hands

  // one the officer approves herself: it is approved straight away
  await tp.getByRole('button', { name: 'Record leave' }).click();
  dlg = tp.getByRole('dialog', { name: 'Record a leave' });
  await pick(dlg, 'Mahesh Conductor');
  await dlg.getByLabel('From', { exact: true }).fill(monday(4)); await dlg.getByLabel('To', { exact: true }).fill(monday(4));
  await dlg.getByLabel('Reason').fill(`Own decision ${uid}`);
  await dlg.getByRole('button', { name: 'Record' }).click();
  await tp.getByLabel('Status').selectOption('approved');
  await expect(tp.getByRole('row', { name: new RegExp(`Own decision ${uid}`) })).toContainText('Approved');

  // the School Admin was told about both, and decides the one passed on
  const a = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const ap = await a.newPage(); const aproblems = watch(ap);
  await signIn(ap, 'admin', 'admin@gps.test', 'Admin@12345');
  await ap.goto('/admin/notifications');
  await expect(ap.getByText('Transport staff leave needs your approval').first()).toBeVisible();
  await expect(ap.getByText(/recorded and approved by the Transport officer/).first()).toBeVisible();
  await ap.goto('/admin/staff-leave');
  await ap.getByRole('tab', { name: 'Transport crew', exact: true }).click();
  const row = ap.getByRole('row', { name: new RegExp(`Passed on ${uid}`) });
  await expect(row).toContainText('Harish Driver');
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(row.getByRole('button', { name: 'Approve' })).toHaveCount(0); // it stays in the list (the filter is on All), now approved
  await ap.getByLabel('Status').selectOption('approved');
  await expect(ap.getByRole('row', { name: new RegExp(`Passed on ${uid}`) })).toContainText('Approved');
  for (const x of [{ problems: tproblems }, { problems: aproblems }]) expect(x.problems.filter((p) => !/HTTP 40[0-9]/.test(p)), x.problems.join('\n')).toEqual([]);
  await t.close(); await a.close();
});

test('the admin keeps transport leave approval: the officer can only pass it on', async ({ browser }) => {
  const login = await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json();
  const put = (body) => fetch(`${API}/api/school/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }, body: JSON.stringify(body) });
  try {
    expect((await put({ transportLeaveApprover: 'admin' })).status).toBe(200);
    const t = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const tp = await t.newPage();
    await signIn(tp, 'transport', 'transport@gps.test', 'Transport@12345');
    await tp.goto('/transport/leave');
    await expect(tp.getByText('The school has kept leave approval for the School Admin')).toBeVisible();
    await tp.getByRole('button', { name: 'Record leave' }).click();
    const dlg = tp.getByRole('dialog', { name: 'Record a leave' });
    await expect(dlg.getByLabel('Send to the school admin to approve')).toHaveCount(0); // no choice: the school's rule decides
    await dlg.getByRole('button', { name: 'Cancel' }).click();
    await t.close();
  } finally { await put({ transportLeaveApprover: 'officer' }); }
});

test('the school calendar is in every portal, kept up to date by the admin', async ({ browser }) => {
  const login = await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json();
  const title = `Sports Day ${Date.now().toString().slice(-5)}`;
  const day = new Date(Date.now() + 3 * 864e5).toISOString().slice(0, 10);
  const r = await fetch(`${API}/api/school/events`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${login.token}` }, body: JSON.stringify({ title, type: 'event', startDate: day }) });
  expect(r.status).toBe(201);
  for (const [portal, id, pw] of [['finance', 'finance@gps.test', 'Finance@12345'], ['library', 'library@gps.test', 'Library@12345'], ['transport', 'transport@gps.test', 'Transport@12345'], ['staff', 'gps.s0001', 'Staff@12345'], ['teacher', 'sharma@gps.test', 'Teach@12345']]) {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const page = await ctx.newPage(); const problems = watch(page);
    await signIn(page, portal, id, pw);
    await page.goto(`/${portal}/calendar`);
    await expect(page.getByRole('heading', { name: 'School calendar' }), portal).toBeVisible();
    await page.getByRole('tab', { name: 'Agenda' }).click();
    await expect(page.getByText(title), `${portal} sees the event`).toBeVisible();
    expect(problems, problems.join('\n')).toEqual([]);
    await ctx.close();
  }
});
