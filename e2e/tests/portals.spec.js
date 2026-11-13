import { test, expect } from '@playwright/test';
import { signIn, visit, watch } from './helpers.js';
import { ADMIN, FINANCE, STAFFP, TRANSPORT, LIBRARY, TEACHER, STUDENT } from './pages.js';


test.describe('every page of every portal renders against real data', () => {
  test('landing page offers one sign-in card per role; each role has its own URL', async ({ page }) => {
    await page.goto('/');
    await page.screenshot({ path: `${process.env.SHOTS_DIR || './shots'}/landing.png` });
    for (const t of ['Login as Student', 'Login as Teacher', 'Login as Finance', 'Login as Library', 'Login as Transport', 'Login as Staff', 'Login as School Admin']) await expect(page.getByRole('heading', { name: t })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Platform administrator' })).toBeVisible();
    await page.getByRole('heading', { name: 'Login as Teacher' }).click();
    await expect(page).toHaveURL(/\/teacher\/login$/);
    await expect(page.getByRole('heading', { name: 'Teacher sign in' })).toBeVisible();
    await page.goto('/platform/login');
    await expect(page.getByRole('heading', { name: 'Platform Admin sign in' })).toBeVisible();
  });

  test('super admin', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'platform', 'superadmin@erp.local', 'Super@12345');
    await expect(page.getByRole('heading', { name: 'Platform overview' })).toBeVisible();
    for (const p of ['/platform', '/platform/schools', '/platform/audit']) await visit(page, p, problems, { shot: `super-${p.replace(/\W+/g, '_')}` });
  });

  test('school admin', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
    await expect(page.getByRole('heading', { name: 'School overview' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Subjects', exact: true })).toHaveCount(0); // no master subject tab
    for (const p of ADMIN) await visit(page, p, problems, { shot: `admin-${p.replace(/\W+/g, '_')}` });
  });

  test('finance', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
    await expect(page.getByRole('heading', { name: 'Fees overview' })).toBeVisible();
    for (const p of FINANCE) await visit(page, p, problems, { shot: `finance-${p.replace(/\W+/g, '_')}` });
  });

  test('transport officer', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');
    await expect(page.getByText('Buses running')).toBeVisible();
    for (const p of TRANSPORT) await visit(page, p, problems, { shot: `transport-${p.replace(/\W+/g, '_')}` });
  });

  test('staff', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'staff', 'gps.s0001', 'Staff@12345');
    await expect(page.getByRole('heading', { name: /Hello, Kamla Devi/ })).toBeVisible();
    for (const p of STAFFP) await visit(page, p, problems, { shot: `staff-${p.replace(/\W+/g, '_')}` });
  });

  test('library', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'library', 'library@gps.test', 'Library@12345');
    await expect(page.getByRole('heading', { name: 'Library overview' })).toBeVisible();
    for (const p of LIBRARY) await visit(page, p, problems, { shot: `library-${p.replace(/\W+/g, '_')}` });
  });

  test('teacher', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
    await expect(page.getByRole('heading', { name: 'Today', exact: true })).toBeVisible();
    for (const p of TEACHER) await visit(page, p, problems, { shot: `teacher-${p.replace(/\W+/g, '_')}` });
  });

  test('student', async ({ page }) => {
    const problems = watch(page);
    await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
    await expect(page.getByRole('heading', { name: /Good (morning|afternoon|evening), Aarav/ })).toBeVisible();
    for (const p of STUDENT) await visit(page, p, problems, { shot: `student-${p.replace(/\W+/g, '_')}` });
  });
});
