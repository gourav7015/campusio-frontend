import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';
import { resetAttendance, setWay } from './attendance-way.js';

// Not a school day on a Sunday: the demo school does not work then, so nothing can be marked
test.skip(new Date().getDay() === 0, 'the demo school does not work on Sunday');

test.describe.configure({ mode: 'serial' });
test.afterAll(async () => { await resetAttendance(); }); // leave the shared demo school the way it was found

test('the School Admin switches the school to period by period, with a dialog that says what will happen', async ({ page }) => {
  const problems = watch(page);
  await resetAttendance();
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/settings');
  const way = page.getByRole('radiogroup', { name: 'How student attendance is taken' });
  await expect(way.getByRole('radio', { name: /Once a day/ })).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('How a day is worked out')).toHaveCount(0); // only for period by period
  await way.getByRole('radio', { name: /Period by period/ }).click();
  await expect(page.getByText('How a day is worked out')).toBeVisible();
  await expect(page.getByText(/5 to 6 present is Present, 3 to 4 is Half day/)).toBeVisible();
  await page.getByRole('button', { name: 'Review and switch to period by period' }).click();
  const dlg = page.getByRole('dialog', { name: 'Switch to period by period?' });
  await expect(dlg.getByText('Recommended')).toBeVisible();
  await expect(dlg.getByText(/Records before that date stay exactly as they are/)).toBeVisible();
  await dlg.getByRole('radio', { name: /From today/ }).check(); // nothing has been taken today in the freshly reset demo
  await dlg.getByRole('button', { name: 'Switch from today' }).click();
  const done = page.getByRole('dialog', { name: 'Done' }); // the answer comes at once: it never waits for the notices
  await expect(done.getByText(/From today attendance is taken period by period/)).toBeVisible();
  await done.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByRole('radio', { name: /Period by period/ })).toContainText('In use now');
  expect(problems, problems.join('\n')).toEqual([]);
});

test('a teacher marks their own period; the class teacher has no daily register; the student, the board and the day follow', async ({ page, browser }) => {
  const problems = watch(page);
  await setWay(true);
  // the teacher: the menu says Attendance and opens "your periods"; a period is marked from nothing and submitted after a review
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/classes'); // the Classes area of the top bar holds the Attendance entry
  await expect(page.getByRole('navigation').getByRole('link', { name: 'Attendance', exact: true }).first()).toBeVisible();
  await page.getByRole('navigation').getByRole('link', { name: 'Attendance', exact: true }).first().click();
  await expect(page).toHaveURL(/\/teacher\/period-attendance/);
  await expect(page.getByRole('list', { name: 'Your periods' })).toBeVisible();
  await page.getByRole('listitem').filter({ hasText: 'Class 8 A' }).getByRole('button', { name: 'Mark', exact: true }).click(); // his period in 8-A, where the student is
  const reg = page.getByRole('dialog');
  await expect(reg.getByText(/not marked/i).first()).toBeVisible(); // nothing is pre-filled
  await expect(reg.getByRole('button', { name: 'Submit this period' })).toBeVisible();
  await reg.getByRole('button', { name: 'Mark all present' }).click();
  await reg.getByRole('button', { name: 'Submit this period' }).click();
  await page.getByRole('dialog', { name: 'Review before submitting' }).getByRole('button', { name: 'Submit this period' }).click();
  await expect(page.getByText(/^Submitted: \d+ absent of \d+/)).toBeVisible();
  await expect(page.getByText(/Submitted/).first()).toBeVisible();
  // the class teacher has the day as a grid of periods, and no whole-day register
  await page.goto('/teacher/my-class?tab=attendance');
  await expect(page.getByRole('tab', { name: 'Whole class', selected: true })).toBeVisible(); // the whole class comes first
  await page.getByRole('tab', { name: 'Day by day' }).click();
  await expect(page.getByText(/of 6 periods submitted/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Mark all present' })).toHaveCount(0);
  await expect(page.getByRole('columnheader', { name: /Day/ })).toBeVisible();
  await page.goto('/teacher/attendance');
  await expect(page.getByText('There is no daily register')).toBeVisible();
  // the student of 8-A sees today period by period and what has not been marked yet is not counted as absent
  const ctx = await browser.newContext(); const sp = await ctx.newPage(); const sproblems = watch(sp);
  await signIn(sp, 'student', 'gps.adm20260001', 'Student@12345');
  await sp.goto('/student/attendance');
  await expect(sp.getByText('Today, period by period')).toBeVisible();
  await expect(sp.getByText(/Present in 1 of 1 period so far/)).toBeVisible();
  await expect(sp.getByText(/never counted as absent/).first()).toBeVisible();
  await expect(sp.getByRole('tab', { name: 'Period by period' })).toBeVisible();
  await expect(sp.getByText('Attendance by subject')).toBeVisible();
  await sp.close(); await ctx.close();
  expect(sproblems.filter((p) => !/HTTP 40/.test(p)), sproblems.join('\n')).toEqual([]);
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});

test('the School Admin sees how far each class is, asks for a waiting period and corrects one mark with a reason', async ({ page }) => {
  const problems = watch(page);
  await setWay(true);
  // one period submitted by the teacher, through the API (the earlier test covers the screen)
  const tok = async (id, pw, portal) => (await (await fetch(`${process.env.API_URL || 'http://localhost:4010'}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw, portal }) })).json()).token;
  const API = process.env.API_URL || 'http://localhost:4010';
  const T = await tok('sharma@gps.test', 'Teach@12345', 'teacher');
  const get = async (path, token) => (await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const day = (await get('/api/teacher/period-attendance', T)).periods;
  const mine = day.find((p) => p.className === 'Class 8' && p.section === 'A');
  const reg = await get(`/api/teacher/period-attendance/register?entryId=${mine.entryId}&date=${(await get('/api/teacher/period-attendance', T)).date}`, T);
  const res = await fetch(`${API}/api/teacher/period-attendance/register/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${T}` }, body: JSON.stringify({ entryId: mine.entryId, date: reg.date, entries: reg.students.map((s, i) => ({ studentId: s.studentId, status: i === 0 ? 'absent' : 'present' })) }) });
  expect(res.status).toBe(200);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/attendance');
  await expect(page.getByText(/takes attendance period by period/)).toBeVisible();
  const card = page.getByRole('group', { name: /^Class 8 A$|^Class 8-A$|8 A/ }).first();
  await expect(card).toContainText(/\d of \d periods marked/);
  await card.getByRole('button', { name: 'Open day' }).click();
  const grid = page.getByRole('dialog');
  await expect(grid.getByText(/of \d periods submitted/)).toBeVisible();
  await expect(grid.getByText(/Waiting:/)).toBeVisible();
  await expect(grid.getByRole('button', { name: /^Ask .* to mark Period/ }).first()).toBeVisible();
  await grid.getByRole('button', { name: /^Ask .* to mark Period/ }).first().click();
  await expect(page.getByText(/Asked .* to mark it|was already asked/)).toBeVisible();
  // correct the first student's mark in the submitted period
  await grid.getByRole('button', { name: /, Period \d: Absent$/ }).first().click();
  const fix = page.getByRole('dialog', { name: /^Correct / });
  await fix.getByRole('combobox').selectOption('present');
  await fix.getByLabel(/Reason/).fill('Was in the lab');
  await fix.getByRole('button', { name: 'Save correction' }).click();
  await expect(page.getByText('Correction recorded')).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});

test('switching back is booked for tomorrow once a period was marked today, and the booking can be withdrawn', async ({ page }) => {
  const problems = watch(page);
  await setWay(true);
  const API = process.env.API_URL || 'http://localhost:4010';
  const login = async (id, pw, portal) => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw, portal }) })).json()).token;
  const T = await login('sharma@gps.test', 'Teach@12345', 'teacher');
  const list = await (await fetch(`${API}/api/teacher/period-attendance`, { headers: { Authorization: `Bearer ${T}` } })).json();
  const mine8A = list.periods.find((p) => p.className === 'Class 8' && p.section === 'A');
  const reg = await (await fetch(`${API}/api/teacher/period-attendance/register?entryId=${mine8A.entryId}&date=${list.date}`, { headers: { Authorization: `Bearer ${T}` } })).json();
  await fetch(`${API}/api/teacher/period-attendance/register/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${T}` }, body: JSON.stringify({ entryId: mine8A.entryId, date: list.date, entries: reg.students.map((s) => ({ studentId: s.studentId, status: 'present' })) }) });
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/settings');
  const way = page.getByRole('radiogroup', { name: 'How student attendance is taken' });
  await way.getByRole('radio', { name: /Once a day/ }).click();
  await page.getByRole('button', { name: 'Review and switch to once a day' }).click();
  const dlg = page.getByRole('dialog', { name: 'Switch to once a day?' });
  await expect(dlg.getByRole('radio', { name: /From today/ })).toHaveCount(0); // period registers were started today
  await expect(dlg.getByText(/Still open today/)).toBeVisible();
  await dlg.getByRole('button', { name: /^Switch from / }).click();
  const booked = page.getByRole('dialog', { name: 'Done' });
  await expect(booked.getByText(/Booked: once a day from/)).toBeVisible();
  await booked.getByRole('button', { name: 'Close' }).last().click();
  await expect(page.getByText(/A change is booked: once a day from/)).toBeVisible();
  await page.getByRole('button', { name: 'Withdraw it' }).click();
  await expect(page.getByText(/A change is booked/)).toHaveCount(0);
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});
