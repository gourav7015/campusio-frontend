import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const API = process.env.API_URL || 'http://localhost:4010';
const adminToken = async () => (await (await fetch(`${API}/api/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ loginId: 'admin@gps.test', password: 'Admin@12345', portal: 'admin' }) })).json()).token;
const setPeriodWise = async (on) => fetch(`${API}/api/school/settings`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await adminToken()}` }, body: JSON.stringify({ attendance: { periodWise: on } }) });

async function signOut(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await expect(page).toHaveURL(/\/login$/);
}

test('a class teacher gets a My class tab with the register, students and monitors, the class report and the marks of every subject; a subject teacher does not', async ({ page }) => {
  const problems = watch(page);
  // Mr Sharma is the class teacher of 8-A
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.getByRole('navigation', { name: 'Areas' }).getByRole('link', { name: 'My class' }).click();
  await expect(page).toHaveURL(/\/teacher\/my-class/);
  await expect(page.getByRole('heading', { name: 'My class' })).toBeVisible();
  await expect(page.getByText(/you are the class teacher/)).toBeVisible();
  for (const t of ['Overview', 'Students', 'Attendance', 'Homework', 'Exam analysis', 'Enter marks', 'Class results', 'Library']) await expect(page.getByRole('tab', { name: t })).toBeVisible();
  // the overview is the school office's own: the same numbers it shows for a class
  await expect(page.getByText("Attendance today")).toBeVisible();
  await expect(page.getByText('Ride the school bus')).toBeVisible();
  await expect(page.getByText('Library books out')).toBeVisible();
  // the daily register of his own class, right here
  await page.getByRole('tab', { name: 'Attendance' }).click();
  await expect(page.getByRole('button', { name: 'Mark all present' })).toBeVisible();
  // the students, as the office lists them, with the monitors chooser
  await page.getByRole('tab', { name: 'Students' }).click();
  await expect(page.getByRole('button', { name: 'Choose monitors' })).toBeVisible();
  for (const h of ['Attendance', 'Latest exam', 'Bus', 'Library']) await expect(page.getByRole('columnheader', { name: h })).toBeVisible();
  // one student's full file, like the office's: profile and family, attendance, exams, homework, FEES, library, bus, history. Read-only.
  await page.getByRole('row').nth(1).click();
  await expect(page).toHaveURL(/\/teacher\/my-class\/students\//);
  await expect(page.getByText('Personal', { exact: true })).toBeVisible();
  await expect(page.getByText('Family', { exact: true })).toBeVisible();
  for (const t of ['Attendance', 'Exams and marks', 'Homework', 'Fees', 'Library', 'Bus', 'Enrolment history']) await expect(page.getByRole('tab', { name: t })).toBeVisible();
  await page.getByRole('tab', { name: 'Fees' }).click();
  await expect(page.getByText('Billed', { exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Exams and marks' }).click();
  await page.getByRole('tab', { name: 'Bus' }).click();
  await page.getByRole('tab', { name: 'Enrolment history' }).click();
  await expect(page.getByText('Academic enrolments')).toBeVisible();
  for (const name of ['Edit', 'Withdraw', 'Move section', 'Reset password']) await expect(page.getByRole('button', { name })).toHaveCount(0); // the office's buttons are not his
  await expect(page.getByRole('link', { name: /Remarks, contact details and message the family/ })).toBeVisible();
  await page.goBack(); await page.goBack();
  await page.getByRole('navigation', { name: 'Areas' }).getByRole('link', { name: 'My class' }).click();
  // homework of a day, the exam analysis and the library of his class
  await page.getByRole('tab', { name: 'Homework' }).click();
  await expect(page.getByText('Homework given per day')).toBeVisible();
  await page.getByRole('tab', { name: 'Exam analysis' }).click();
  // the student list narrows by name, result, marks (overall or in one exam), and monitors: all visible, nothing hidden behind an icon
  const heading = page.getByText(/^Every student, every exam \(/);
  await expect(heading).toBeVisible();
  const total = Number((await heading.innerText()).match(/\((\d+)/)[1]);
  for (const l of ['Find a student', 'Result filter', 'Marks basis', 'Marks from percent', 'Marks to percent']) await expect(page.getByLabel(l)).toBeVisible();
  await expect(page.getByLabel('Monitors only')).toBeVisible();
  await page.getByLabel('Marks from percent').fill('95'); // a high bar: only a few, or nobody
  await expect(heading).toContainText(`of ${total}`);
  await page.getByLabel('Marks from percent').fill('0');
  await page.getByLabel('Marks to percent').fill('100');
  await expect(heading).toContainText(`(${total})`); // everyone is between 0 and 100
  await page.getByLabel('Result filter').selectOption('below');
  await expect(heading).toContainText(`of ${total}`);
  await expect(page.getByRole('button', { name: /^Clear filters/ })).toBeVisible();
  await page.getByRole('button', { name: /^Clear filters/ }).click();
  await expect(heading).toContainText(`(${total})`);
  await page.getByLabel('Monitors only').check();
  await expect(page.getByText(/No student matches these filters|Monitor/).first()).toBeVisible();
  await page.getByLabel('Monitors only').uncheck();
  await page.getByRole('tab', { name: 'Library' }).click();
  // the class results (overall because he is the class teacher)
  await page.getByRole('tab', { name: 'Class results' }).click();
  await expect(page.getByText(/overall results \(you are the class teacher\)|No published results for this class yet/)).toBeVisible();
  // the marks of every subject of the class: more than the one he teaches
  await page.getByRole('tab', { name: 'Enter marks' }).click();
  await expect(page.getByText('Marks of every subject in this class')).toBeVisible();
  await expect(page.getByText("Other teacher's subject").first()).toBeVisible();
  await signOut(page);

  // a subject teacher who is nobody's class teacher has no such tab, and the page itself says why
  await signIn(page, 'teacher', 'khan@gps.test', 'Teach@12345');
  await expect(page.getByRole('navigation', { name: 'Areas' }).getByRole('link', { name: 'My class' })).toHaveCount(0);
  await page.goto('/teacher/my-class');
  await expect(page.getByText('You are not a class teacher')).toBeVisible();
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});

test('in a school that takes attendance period by period, My class opens on the periods and keeps the daily register one switch away', async ({ page }) => {
  const problems = watch(page);
  expect((await setPeriodWise(true)).status).toBe(200);
  try {
    await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
    await page.goto('/teacher/my-class?tab=attendance');
    // the period view first, not the whole-day register
    const view = page.getByRole('radiogroup', { name: 'Attendance view' });
    await expect(view.getByRole('radio', { name: 'By period' })).toHaveAttribute('aria-checked', 'true');
    await expect(page.getByRole('columnheader', { name: 'Teacher' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Mark all present' })).toHaveCount(0);
    // the daily register is still there, one switch away
    await view.getByRole('radio', { name: 'Daily register' }).click();
    await expect(page.getByRole('button', { name: 'Mark all present' })).toBeVisible();
    // and the menu names the two things differently
    await page.goto('/teacher/classes');
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Daily register', exact: true }).first()).toBeVisible();
    await expect(page.getByRole('navigation').getByRole('link', { name: 'Period attendance', exact: true }).first()).toBeVisible();
  } finally { await setPeriodWise(false); }
  expect(problems, problems.join('\n')).toEqual([]);
});
