import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const uid = Date.now().toString().slice(-6);
const monday = (weeksAhead) => { const d = new Date(Date.now() + weeksAhead * 7 * 864e5); d.setUTCDate(d.getUTCDate() + ((8 - d.getUTCDay()) % 7 || 7)); return d.toISOString().slice(0, 10); };
async function signOut(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await expect(page).toHaveURL(/\/login$/);
}
const NEWPW = 'Brand-new-pass1';

test('a sub-admin who only approves leave decides a teacher\'s leave; a teacher sends a query to that one person', async ({ browser }) => {
  const mk = async () => { const ctx = await browser.newContext(); const page = await ctx.newPage(); return { ctx, page, problems: watch(page) }; };
  const admin = await mk(); const teacher = await mk(); const approver = await mk();

  // the School Admin gives one person the right to approve leave, and nothing else
  await signIn(admin.page, 'admin', 'admin@gps.test', 'Admin@12345');
  await admin.page.goto('/admin/sub-admins');
  await admin.page.getByRole('button', { name: '+ Add a sub-admin' }).click();
  const form = admin.page.getByRole('dialog');
  await form.getByLabel('Name').fill(`Leave Officer ${uid}`);
  await form.getByLabel("Approve teachers' leave").check();
  await form.getByRole('button', { name: 'Save' }).click();
  const creds = admin.page.getByRole('dialog', { name: /Login for/ });
  await expect(creds).toContainText('Temporary password');
  const [loginId, tempPw] = await creds.locator('dd b').allTextContents();
  await creds.getByRole('button', { name: 'Done' }).click();
  await admin.page.getByRole('button', { name: 'Close anyway' }).click();
  await expect(admin.page.getByRole('row', { name: new RegExp(`Leave Officer ${uid}`) })).toContainText("Approve teachers' leave");

  // a teacher applies and addresses a query to that person
  await signIn(teacher.page, 'teacher', 'rao@gps.test', 'Teach@12345');
  await teacher.page.goto('/teacher/leave');
  await teacher.page.getByRole('button', { name: /Apply for leave/ }).click();
  const dlg = teacher.page.getByRole('dialog', { name: 'Apply for leave' });
  await dlg.getByLabel('Start date').fill(monday(11)); await dlg.getByLabel('End date').fill(monday(11));
  await dlg.getByLabel('Reason').fill(`Wedding ${uid}`);
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(teacher.page.getByRole('row', { name: new RegExp(`Wedding ${uid}`) })).toContainText('Submitted');
  await teacher.page.goto('/teacher/queries');
  await teacher.page.getByRole('button', { name: /New query/ }).click();
  const q = teacher.page.getByRole('dialog', { name: 'New query' });
  await q.getByLabel('Send to').selectOption({ label: `Leave Officer ${uid} · Sub-admin` });
  await q.getByLabel('Subject').fill(`Leave balance ${uid}`);
  await q.getByLabel('Your question').fill('How many casual days do I have left this year?');
  await q.getByRole('button', { name: 'Send' }).click();
  await expect(teacher.page.getByText(/Only they and the School Admin can see it/)).toBeVisible();

  // the sub-admin opens an account with leave and queries only, decides the leave and answers the query
  await signIn(approver.page, 'admin', loginId, tempPw);
  await expect(approver.page).toHaveURL(/account\?force=1/);
  await approver.page.getByLabel('New password', { exact: true }).fill(NEWPW);
  await approver.page.getByLabel('Confirm new password').fill(NEWPW);
  await approver.page.getByRole('button', { name: 'Update password' }).click();
  await expect(approver.page).not.toHaveURL(/force=1/, { timeout: 10000 });
  await approver.page.goto('/admin/students');
  await expect(approver.page.getByText('This part of the portal is not open to your account')).toBeVisible();
  await approver.page.goto('/admin/leave');
  await expect(approver.page.getByRole('tab', { name: 'Teaching staff' })).toBeVisible();
  await expect(approver.page.getByRole('tab', { name: 'Leave balances' })).toHaveCount(0); // giving extra leave is not part of approving
  await approver.page.getByRole('row', { name: new RegExp(`Wedding ${uid}`) }).getByRole('button', { name: 'Review' }).click();
  const review = approver.page.getByRole('dialog');
  await review.getByRole('button', { name: 'Approve' }).click();
  await expect(review.getByText(/approved/i).first()).toBeVisible();
  await approver.page.keyboard.press('Escape');
  await approver.page.goto('/admin/queries');
  await approver.page.getByRole('row', { name: new RegExp(`Leave balance ${uid}`) }).click();
  await approver.page.getByPlaceholder('Write your reply…').fill('You have 9 casual days left.');
  await approver.page.getByRole('button', { name: 'Send reply' }).click();
  await expect(approver.page.getByText('You have 9 casual days left.')).toBeVisible();

  // the teacher reads the answer
  await teacher.page.reload();
  await teacher.page.getByRole('row', { name: new RegExp(`Leave balance ${uid}`) }).click();
  await expect(teacher.page.getByText('You have 9 casual days left.')).toBeVisible();

  for (const x of [admin, teacher, approver]) expect(x.problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
  await admin.ctx.close(); await teacher.ctx.close(); await approver.ctx.close();
});
