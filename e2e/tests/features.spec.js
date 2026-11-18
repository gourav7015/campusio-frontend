import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const uid = Date.now().toString().slice(-6);

async function signOut(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await expect(page).toHaveURL(/\/login$/);
}
const NEWPW = 'Brand-new-pass1';
async function chooseNewPassword(page, current) {
  await expect(page).toHaveURL(/account\?force=1/);
  await page.getByLabel('Current password').fill(current);
  await page.getByLabel('New password', { exact: true }).fill(NEWPW);
  await page.getByLabel('Confirm new password').fill(NEWPW);
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).not.toHaveURL(/force=1/, { timeout: 10000 });
}

test.describe.configure({ mode: 'serial' });

test('a teacher\'s remark reaches the family, who acknowledge it; the family messages the teacher and gets a reply', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/profile');
  const name = (await page.locator('dl.kv dd').first().textContent()).trim();
  await signOut(page);

  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/classes');
  await page.getByRole('row').filter({ hasText: 'Class teacher' }).first().click();
  await page.getByRole('tab', { name: 'Students' }).click();
  await page.getByRole('cell', { name }).click();
  await page.getByRole('tab', { name: 'Teacher remarks' }).click();
  await page.getByLabel('Remark', { exact: true }).fill(`Homework incomplete ${uid}`);
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.getByRole('cell', { name: `Homework incomplete ${uid}` })).toBeVisible();
  await expect(page.getByRole('row', { name: new RegExp(`Homework incomplete ${uid}`) })).toContainText('Not yet');
  await signOut(page);

  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await expect(page.getByText(/teacher remark.* waiting for you to read and acknowledge/)).toBeVisible();
  await page.goto('/student/remarks');
  await expect(page.getByText(`Homework incomplete ${uid}`)).toBeVisible();
  await page.getByRole('button', { name: 'I have read this' }).first().click();
  await expect(page.getByText('Acknowledged').first()).toBeVisible();
  // the family asks a teacher a question
  await page.goto('/student/chats');
  await page.getByRole('button', { name: '+ New message' }).click();
  const to = page.getByRole('dialog').locator('select').first();
  await to.selectOption(await to.locator('option').filter({ hasText: /Sharma/ }).first().getAttribute('value'));
  await page.getByRole('dialog').getByLabel('Message').fill(`Is there a test tomorrow? ${uid}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText(`Is there a test tomorrow? ${uid}`)).toBeVisible();
  await signOut(page);

  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/remarks');
  await expect(page.getByRole('row', { name: new RegExp(`Homework incomplete ${uid}`) })).toContainText('Acknowledged');
  await page.goto('/teacher/chats');
  await page.getByRole('button', { name: new RegExp(name.split(' ')[0]) }).first().click();
  await expect(page.getByText(`Is there a test tomorrow? ${uid}`)).toBeVisible();
  await page.getByLabel('Message', { exact: true }).fill('No test tomorrow');
  await page.getByRole('button', { name: 'Send', exact: true }).click();
  await expect(page.locator('[aria-live="polite"]').getByText('No test tomorrow')).toBeVisible();
  await signOut(page);
  expect(problems.filter((p) => !p.includes('dialog'))).toEqual([]);
});

test('the admin makes a sub-admin who sees only what was granted; Finance records an expense and the admin approves it', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/sub-admins');
  await page.getByRole('button', { name: '+ Add a sub-admin' }).click();
  await page.getByLabel('Name').fill(`Desk Clerk ${uid}`);
  await page.getByLabel('Email (their login)').fill(`desk${uid}@gps.test`);
  await page.getByRole('button', { name: /Attendance desk/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  const creds = page.getByRole('dialog', { name: /Login for/ });
  await expect(creds).toContainText('Temporary password');
  const [loginId, tempPw] = await creds.locator('dd b').allTextContents();
  await creds.getByRole('button', { name: 'Done' }).click();
  await signOut(page);

  await signIn(page, 'admin', loginId, tempPw);
  await chooseNewPassword(page, tempPw);
  await page.goto('/admin');
  const nav = page.getByRole('navigation').first();
  await expect(nav.getByRole('link', { name: 'Staff attendance' })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'Students', exact: true })).toHaveCount(0);
  await expect(nav.getByRole('link', { name: 'School settings' })).toHaveCount(0);
  await page.goto('/admin/staff-attendance');
  await expect(page.getByRole('tab', { name: 'Daily register' })).toBeVisible();
  await signOut(page);

  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/expenses');
  await page.getByRole('button', { name: '+ Add an expense' }).click();
  await page.getByLabel('Amount (₹)').fill('4500');
  await page.getByRole('dialog').getByLabel('Department').fill('Science');
  await page.getByLabel('What was it for?').fill(`Lab beakers ${uid}`);
  await page.getByRole('button', { name: 'Send for approval' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Lab beakers ${uid}`) })).toContainText('Waiting');
  await signOut(page);

  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/approvals');
  const row = page.getByRole('row', { name: new RegExp(`Lab beakers ${uid}`) });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(row).toHaveCount(0);
  await page.goto('/admin/fees?tab=expenses');
  await expect(page.getByRole('row', { name: new RegExp(`Lab beakers ${uid}`) })).toContainText('Approved');
  await signOut(page);
  expect(problems.filter((p) => !p.includes('dialog') && !/HTTP 40[13]/.test(p))).toEqual([]);
});

test('the school page the admin writes is read by students, and the sign-in page says who resets a forgotten password', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/school-info');
  await page.getByRole('tab', { name: 'Edit the page' }).click();
  await page.getByLabel('Tagline').fill(`Learning first ${uid}`);
  await page.getByRole('button', { name: 'Save', exact: true }).click();
  await page.getByRole('tab', { name: 'Licences and approvals' }).click();
  await page.getByRole('button', { name: '+ Add' }).click();
  await page.getByLabel('Licence or approval').fill(`Fire safety NOC ${uid}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: new RegExp(`Fire safety NOC ${uid}`) })).toBeVisible();
  await signOut(page);

  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/school-info');
  await expect(page.getByText(`Learning first ${uid}`)).toBeVisible();
  await expect(page.getByText(`Fire safety NOC ${uid}`)).toBeVisible();
  await signOut(page);

  await page.goto('/student/login');
  await page.getByText('Forgot your password?').click();
  await expect(page.getByText(/Ask the school office to reset it/)).toBeVisible();
  expect(problems.filter((p) => !p.includes('dialog'))).toEqual([]);
});
