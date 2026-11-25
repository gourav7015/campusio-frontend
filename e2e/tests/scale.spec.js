import { test, expect } from '@playwright/test';
import { signIn, visit, watch } from './helpers.js';

async function signOut(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await expect(page).toHaveURL(/\/login$/);
}

/**
 * Runs against the bulk dump (npm run db:start && npm run dump, API on :4000, web on :5173):
 *   SCALE=1 WEB_URL=http://localhost:5173 npx playwright test scale.spec.js
 */
test.skip(!process.env.SCALE, 'needs the bulk dump (SCALE=1)');

const SCHOOL = process.env.SCALE_SCHOOL || 'dpsr';
const ADMIN = ['/admin', '/admin/classes', '/admin/students', '/admin/teachers', '/admin/timetable', '/admin/exams', '/admin/fees', '/admin/fees?tab=students', '/admin/library', '/admin/library?tab=books', '/admin/reports', '/admin/promotion', '/admin/audit'];

test('school admin on a 2,500-student school', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', `admin@${SCHOOL}.school`, 'Admin@12345');
  await expect(page.getByRole('heading', { name: /^Good (morning|afternoon|evening)/ })).toBeVisible();
  await expect(page.getByText(/2,?500|2500/).first()).toBeVisible();
  for (const p of ADMIN) await visit(page, p, problems, { shot: `scale-admin-${p.replace(/\W+/g, '_')}` });
  await page.goto('/admin/students');
  await expect(page.getByText('2500 student(s)')).toBeVisible();
  await page.getByLabel('Search students').fill('Sharma');
  await expect(page.getByText(/\d+ student\(s\)/)).toBeVisible();
  await page.goto('/admin/classes');
  for (const c of ['LKG', 'UKG', 'Class 1', 'Class 12']) await expect(page.getByRole('navigation', { name: 'Classes' }).getByText(c, { exact: true }).first()).toBeVisible();
  expect(problems).toEqual([]);
});

test('finance and library on the big school', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', `finance@${SCHOOL}.school`, 'Finance@12345');
  for (const p of ['/finance', '/finance/structures', '/finance/students', '/finance/payments', '/finance/reports']) await visit(page, p, problems, { shot: `scale-finance-${p.replace(/\W+/g, '_')}` });
  await signOut(page);
  await signIn(page, 'library', `library@${SCHOOL}.school`, 'Library@12345');
  for (const p of ['/library', '/library/books', '/library/loans', '/library/desk']) await visit(page, p, problems, { shot: `scale-library-${p.replace(/\W+/g, '_')}` });
  expect(problems).toEqual([]);
});

test('a class teacher and a student', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', `${SCHOOL}.t0001`, 'Teach@12345');
  for (const p of ['/teacher', '/teacher/timetable', '/teacher/classes', '/teacher/attendance', '/teacher/exams', '/teacher/performance']) await visit(page, p, problems, { shot: `scale-teacher-${p.replace(/\W+/g, '_')}` });
  await signOut(page);
  await signIn(page, 'student', `${SCHOOL}.adm20260100`, 'Student@12345');
  for (const p of ['/student', '/student/timetable', '/student/attendance', '/student/results', '/student/fees', '/student/library']) await visit(page, p, problems, { shot: `scale-student-${p.replace(/\W+/g, '_')}` });
  expect(problems).toEqual([]);
});
