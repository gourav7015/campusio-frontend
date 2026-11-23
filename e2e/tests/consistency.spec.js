import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const API = process.env.API_URL || 'http://localhost:4010';
const login = async (loginId, password, portal) => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId, password, portal }) })).json()).token;
const call = (token, method, path, body) => fetch(`${API}${path}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });

test.describe.configure({ mode: 'serial' });

test('every register has the same controls: mark all present / absent, and a half day that says which session', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');

  // students: the admin's register window is the same register the class teacher uses
  await page.goto('/admin/attendance');
  await page.getByLabel('Search class or section').fill('Class 8 A');
  await page.getByRole('table').first().getByRole('row').nth(1).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByRole('button', { name: 'Mark all present' })).toBeVisible();
  await expect(dlg.getByRole('button', { name: 'Mark all absent' })).toBeVisible();
  const first = dlg.getByRole('group', { name: /^Status of / }).first();
  await first.getByRole('button', { name: 'Half day' }).click();
  await expect(dlg.getByRole('group', { name: /^Session attended by / }).first()).toBeVisible();
  await dlg.getByRole('group', { name: /^Session attended by / }).first().getByRole('button', { name: 'Second session' }).click();
  await expect(dlg.getByRole('group', { name: /^Session attended by / }).first().getByRole('button', { name: 'Second session' })).toHaveAttribute('aria-pressed', 'true');
  await dlg.getByRole('button', { name: 'Mark all absent' }).click();
  await expect(dlg.getByRole('group', { name: /^Session attended by / })).toHaveCount(0); // everyone is absent now, so no session is asked
  await dlg.getByRole('button', { name: 'Mark all present' }).click();
  await expect(dlg.getByRole('button', { name: 'Absent', exact: true }).first()).toHaveAttribute('aria-pressed', 'false');
  await page.keyboard.press('Escape');

  // staff: the same buttons, in the same order
  for (const [tab, name] of [['teachers', 'Teaching staff'], ['general', 'Non-teaching staff'], ['office', 'Officers (finance, library, transport)']]) {
    await page.goto(`/admin/attendance?tab=${tab}`);
    await expect(page.getByRole('button', { name: 'Mark all present' }), name).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark all absent' }), name).toBeVisible();
    const row = page.getByRole('group', { name: /^Status of / }).first();
    const labels = await row.getByRole('button').allTextContents();
    expect(labels, name).toEqual(['Present', 'Absent', 'Late', 'Half day', 'Leave']);
    await row.getByRole('button', { name: 'Half day' }).click();
    await expect(page.getByRole('group', { name: /^Session attended by / }).first().getByRole('button', { name: 'First session' })).toBeVisible();
  }
  // the transport officer's register for the crew
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('a half day with its session is saved and shown the same way for students and staff', async ({ page }) => {
  const token = await login('admin@gps.test', 'Admin@12345', 'admin');
  // the most recent day whose teachers' register is still open (not yet submitted, and a working day)
  let day = null;
  for (let i = 0; i < 20 && !day; i++) {
    const d = new Date(Date.now() - i * 864e5).toISOString().slice(0, 10);
    const r = await (await call(token, 'GET', `/api/school/staff-attendance/register?group=teachers&date=${d}`)).json();
    if (r.canEdit) day = d;
  }
  expect(day, 'an open register to practise on').toBeTruthy();
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/attendance?tab=teachers');
  await page.getByLabel('Date', { exact: true }).fill(day);
  const row = page.getByRole('row', { name: /Rajesh Sharma/ });
  await row.getByRole('button', { name: 'Half day' }).click();
  await row.getByRole('group', { name: /^Session attended by / }).getByRole('button', { name: 'Second session' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
  const reg = await (await call(token, 'GET', `/api/school/staff-attendance/register?group=teachers&date=${day}`)).json();
  expect(reg.rows.find((r) => r.name === 'Rajesh Sharma')).toMatchObject({ status: 'half_day', halfSession: 'second' });
  await page.reload();
  await page.getByLabel('Date', { exact: true }).fill(day);
  await expect(page.getByRole('row', { name: /Rajesh Sharma/ }).getByRole('group', { name: /^Session attended by / }).getByRole('button', { name: 'Second session' })).toHaveAttribute('aria-pressed', 'true');
});

test('an officer role is held by a person: give it to someone on the staff list, or name the person', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff');
  await expect(page.getByRole('columnheader', { name: /Person/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Role held/ })).toBeVisible();
  await page.getByRole('button', { name: '+ Add sign-in' }).click();
  const dlg = page.getByRole('dialog', { name: 'Add a login' });
  await dlg.getByLabel('Portal').selectOption('library');
  const who = dlg.getByLabel('Who holds this role?');
  await expect(who).toBeVisible();
  await expect.poll(async () => who.locator('option').count()).toBeGreaterThan(1); // people already on the staff list
  await who.selectOption({ index: 1 });
  await expect(dlg.getByLabel('Full name')).toHaveCount(0); // the person already has a name
  await dlg.getByLabel('Email', { exact: true }).fill(`holder${Date.now().toString().slice(-6)}@gps.test`);
  await dlg.getByLabel('Mobile number').fill('9876500011');
  await dlg.getByLabel('Date of birth').fill('1988-08-08');
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('dialog', { name: 'Staff account' })).toContainText('Temporary password');
  await page.getByRole('dialog', { name: 'Staff account' }).getByRole('button', { name: 'Done' }).click();
  // a role-named account can be given the person's real name
  await page.getByRole('row', { name: /Farah Accounts/ }).getByRole('button', { name: 'Edit person' }).click();
  await page.getByRole('dialog').getByLabel('Person\'s name').fill('Farah Khan');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Farah Khan/ })).toContainText('Finance Officer');
  // put the demo name back so the other tests find it
  await page.getByRole('row', { name: /Farah Khan/ }).getByRole('button', { name: 'Edit person' }).click();
  await page.getByRole('dialog').getByLabel('Person\'s name').fill('Farah Accounts');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Farah Accounts/ })).toBeVisible();
});

test('the timetable can be downloaded for every section, one class or one section, as PDF or CSV', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/timetable');
  const open = page.getByLabel('Section', { exact: true }).first();
  const current = (await open.locator('option:checked').textContent()).replace(/\s*·.*$/, '').trim(); // e.g. "Class 8 A"
  await page.getByRole('button', { name: 'Download timetable' }).click();
  const dlg = page.getByRole('dialog', { name: 'Download timetable' });
  await expect(dlg.getByText(`timetable of ${current}`, { exact: false })).toBeVisible(); // starts on the section that is open
  const slug = (t) => t.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  let [file] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Download PDF' }).click()]);
  expect(file.suggestedFilename()).toBe(`timetable-${slug(current)}.pdf`);
  await page.getByRole('button', { name: 'Download timetable' }).click();
  await dlg.getByLabel('Section to download').selectOption('');
  const cls = current.replace(/\s+\S+$/, ''); // "Class 8"
  await expect(dlg.getByText(`all of ${cls}`, { exact: false })).toBeVisible();
  await dlg.getByLabel('Format').selectOption('csv');
  [file] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: 'Download CSV' }).click()]);
  expect(file.suggestedFilename()).toBe(`timetable-${slug(cls)}.csv`);
  await page.getByRole('button', { name: 'Download timetable' }).click();
  await dlg.getByLabel('Class', { exact: true }).selectOption('');
  await expect(dlg.getByText(/every section/)).toBeVisible();
  [file] = await Promise.all([page.waitForEvent('download'), dlg.getByRole('button', { name: /^Download/ }).click()]);
  expect(file.suggestedFilename()).toBe('timetable-all-sections.pdf');
});

test('filters stay behind an icon, with a count of what is switched on', async ({ page }) => {
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/employees?tab=teaching');
  const icon = page.getByRole('button', { name: /^Filters/ });
  await expect(icon).toBeVisible();
  await expect(page.getByLabel('Designation', { exact: true })).toHaveCount(0);
  await icon.click();
  await page.getByLabel('Class teachers').selectOption('yes');
  await expect(page.getByRole('button', { name: 'Filters, 1 on' })).toBeVisible();
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(page.getByRole('button', { name: /^Filters$/ })).toBeVisible();
});
