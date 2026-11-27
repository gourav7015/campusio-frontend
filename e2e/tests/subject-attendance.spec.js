import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';
import { API, adminToken, setWay } from './attendance-way.js';

test.describe.configure({ mode: 'serial' });

/** When the school takes attendance period by period, a student, the School Admin and the class teacher see subjects, not days. */
test('period by period: subjects with what to do next, no heat map, and every period of a subject; the office sees the same', async ({ page }) => {
  const problems = watch(page);
  await setWay(true);
  const login = async (id, pw, portal) => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: id, password: pw, portal }) })).json()).token;
  const T = await login('sharma@gps.test', 'Teach@12345', 'teacher');
  const get = async (path, token) => (await fetch(`${API}${path}`, { headers: { Authorization: `Bearer ${token}` } })).json();
  const list = await get('/api/teacher/period-attendance', T);
  const mine = list.periods.find((p) => p.className === 'Class 8' && p.section === 'A');
  const reg = await get(`/api/teacher/period-attendance/register?entryId=${mine.entryId}&date=${list.date}`, T);
  const sent = await fetch(`${API}/api/teacher/period-attendance/register/submit`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${T}` }, body: JSON.stringify({ entryId: mine.entryId, date: reg.date, entries: reg.students.map((s, i) => ({ studentId: s.studentId, status: i === 0 ? 'absent' : 'present' })) }) });
  expect(sent.status).toBe(200);

  // the student: subjects first
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/attendance');
  await expect(page.getByRole('tab', { name: 'Subjects', selected: true })).toBeVisible();
  const cards = page.getByRole('list', { name: 'Attendance by subject' }).getByRole('listitem');
  await expect(cards.first()).toBeVisible();
  await expect(page.getByText('Attendance heat map')).toHaveCount(0);
  await expect(page.getByRole('tab', { name: 'Daily history' })).toHaveCount(0);
  await expect(page.getByText('Attendance in periods')).toBeVisible();
  await cards.first().click();
  const sheet = page.getByRole('dialog', { name: /, period by period$/ });
  await expect(sheet.getByRole('row').nth(1)).toBeVisible();
  await page.keyboard.press('Escape');
  await page.getByRole('tab', { name: 'Period by period' }).click();
  await expect(page.getByRole('button', { name: 'Previous day' })).toBeVisible();
  await expect(page.getByText(/Present in \d+ of \d+ periods? marked|No period has been marked/)).toBeVisible();

  // the School Admin: the same subjects on the student's Attendance tab
  const A = await adminToken();
  const students = await get('/api/school/students?limit=100', A);
  const id = (students.items || students).find((s) => /20260001$/.test(s.admissionNo))?._id;
  expect(id).toBeTruthy();
  const admin = await page.context().browser().newContext(); const ap = await admin.newPage();
  await signIn(ap, 'admin', 'admin@gps.test', 'Admin@12345');
  await ap.goto(`/admin/students/${id}`);
  await ap.getByRole('tab', { name: 'Attendance' }).click();
  await expect(ap.getByRole('list', { name: 'Attendance by subject' })).toBeVisible();
  await expect(ap.getByText('Attendance heat map')).toHaveCount(0);
  await expect(ap.getByText('Attendance in periods').first()).toBeVisible();
  await admin.close();

  // the class teacher: no daily register anywhere; his class's attendance, every student
  const tp = await page.context().browser().newContext({ viewport: { width: 1280, height: 900 } }); const tpg = await tp.newPage();
  await signIn(tpg, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await tpg.goto('/teacher');
  await expect(tpg.getByRole('link', { name: 'Daily register' })).toHaveCount(0);
  await expect(tpg.getByText(/^Today.s register/)).toHaveCount(0);
  await expect(tpg.getByText('Your periods today')).toBeVisible();
  await expect(tpg.getByRole('button', { name: /Mark|Open/ }).first()).toBeVisible();
  await tpg.waitForTimeout(800);
  await tpg.screenshot({ path: `${process.env.SHOTS_DIR || './shots'}/pw-teacher-today.png`, fullPage: true });
  await tpg.goto('/teacher/my-class?tab=attendance');
  await expect(tpg.getByRole('tab', { name: 'Whole class', selected: true })).toBeVisible();
  await expect(tpg.getByRole('button', { name: 'Daily register' })).toHaveCount(0);
  await expect(tpg.getByText('The class, subject by subject')).toBeVisible();
  await expect(tpg.getByRole('table').getByRole('row').nth(1)).toContainText(/\d+%|—/);
  await tpg.screenshot({ path: `${process.env.SHOTS_DIR || './shots'}/pw-teacher-class.png`, fullPage: true });
  await tpg.getByRole('tab', { name: 'Day by day' }).click();
  await expect(tpg.getByLabel('Date')).toBeVisible();
  await tp.close();
  await setWay(false);
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});

/** Once a day: the class teacher and the office also get the whole class at once (every student's days, who needs a word). */
test('once a day: the whole class in one table for the class teacher and the office, with the register one tab over', async ({ page }) => {
  const problems = watch(page);
  await setWay(false);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/my-class?tab=attendance');
  await expect(page.getByRole('tab', { name: 'Whole class', selected: true })).toBeVisible();
  await expect(page.getByText('Needs a word', { exact: true })).toBeVisible();
  await expect(page.getByText('Class attendance by month', { exact: true })).toBeVisible();
  await expect(page.getByRole('table').first().getByRole('row').nth(1)).toContainText(/%|—/);
  await page.getByLabel('Find a student').fill('zzzz');
  await expect(page.getByText('No student matches')).toBeVisible();
  await page.getByLabel('Find a student').fill('');
  await page.getByRole('tab', { name: "Today's register" }).click();
  await expect(page.getByRole('button', { name: 'Mark all present' })).toBeVisible();
  // the office: the same, with the registers one tab over
  const admin = await page.context().browser().newContext(); const ap = await admin.newPage();
  await signIn(ap, 'admin', 'admin@gps.test', 'Admin@12345');
  await ap.goto('/admin/classes');
  await ap.getByRole('navigation', { name: 'Classes' }).getByText('Class 8', { exact: true }).first().click();
  await ap.getByRole('link', { name: 'Open' }).first().click();
  await expect(ap.getByRole('heading', { name: 'Class 8 A' })).toBeVisible();
  await ap.getByRole('tab', { name: 'Attendance' }).click();
  await expect(ap.getByRole('tab', { name: 'Whole class', selected: true })).toBeVisible();
  await ap.getByRole('tab', { name: 'Registers' }).click();
  await expect(ap.getByText(/Registers/).first()).toBeVisible();
  await admin.close();
  expect(problems.filter((p) => !/HTTP 40/.test(p)), problems.join('\n')).toEqual([]);
});
