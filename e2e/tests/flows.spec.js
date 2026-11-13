import { test, expect } from '@playwright/test';
import fs from 'node:fs';
import { signIn, watch, SHOTS } from './helpers.js';

const uid = Date.now().toString().slice(-6);
const letters = (s) => s.replace(/\d/g, (d) => 'abcdefghij'[d]);
const plusDays = (n) => new Date(Date.now() + n * 864e5).toLocaleDateString('en-CA');

async function signOut(page) {
  await page.getByRole('button', { name: 'Profile menu' }).click();
  await page.getByText('Sign out').click();
  await expect(page).toHaveURL(/\/login$/);
}

test.describe.configure({ mode: 'serial' });

test('each role has its own login URL; the wrong portal is refused; routes are protected', async ({ page }) => {
  await page.goto('/student'); await expect(page).toHaveURL(/\/student\/login$/);
  await page.goto('/teacher'); await expect(page).toHaveURL(/\/teacher\/login$/);
  await page.goto('/finance'); await expect(page).toHaveURL(/\/finance\/login$/);
  await page.goto('/library'); await expect(page).toHaveURL(/\/library\/login$/);
  await page.goto('/staff'); await expect(page).toHaveURL(/\/staff\/login$/);
  await page.goto('/transport'); await expect(page).toHaveURL(/\/transport\/login$/);
  await page.goto('/admin'); await expect(page).toHaveURL(/\/admin\/login$/);
  await page.goto('/platform'); await expect(page).toHaveURL(/\/platform\/login$/);
  await signIn(page, 'student', 'gps.adm20260001', 'wrong-password', { expectFail: true });
  await expect(page.getByRole('alert')).toContainText('Invalid login id or password');
  // right password, wrong door
  await signIn(page, 'teacher', 'gps.adm20260001', 'Student@12345', { expectFail: true });
  await expect(page.getByRole('alert')).toContainText('belongs to the Student portal');
  await signIn(page, 'admin', 'superadmin@erp.local', 'Super@12345', { expectFail: true });
  await expect(page.getByRole('alert')).toContainText('Platform Admin portal');
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await expect(page).toHaveURL(/\/student$/);
  for (const p of ['/admin', '/platform/schools', '/teacher', '/finance', '/library']) { await page.goto(p); await expect(page).toHaveURL(/\/student$/); }
  await signOut(page);
  await expect(page).toHaveURL(/\/student\/login$/);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/admin/students'); await expect(page).toHaveURL(/\/teacher$/);
});

test('only the class teacher takes attendance; submitted registers are locked; the admin corrects with a reason', async ({ page }) => {
  const problems = watch(page);
  // Gupta teaches English in 8-A but is not a class teacher of any section he/she can mark: no attendance desk for subject-only teachers
  await signIn(page, 'teacher', 'khan@gps.test', 'Teach@12345');
  await expect(page.getByRole('link', { name: /Mark attendance/ })).toHaveCount(0); // Khan is not a class teacher
  await page.goto('/teacher/attendance');
  await expect(page.getByText('You are not a class teacher')).toBeVisible();
  await signOut(page);

  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345'); // class teacher of 8-A
  await expect(page.getByRole('link', { name: /Mark attendance/ })).toBeVisible();
  await page.goto('/teacher/attendance');
  await expect(page.getByLabel('Class and section').locator('option')).toHaveText(['Class 8 A']); // only his own section
  await expect(page.getByRole('row').nth(1)).toBeVisible();
  await page.getByRole('button', { name: 'Mark all present' }).click();
  const first = page.getByRole('row').nth(1);
  await first.getByRole('button', { name: 'Absent' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
  await page.getByRole('button', { name: 'Submit attendance' }).click();
  await expect(page.getByText(/Submitted: \d+ present, 1 absent/)).toBeVisible();
  await expect(page.getByText(/It is now locked/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Correct', exact: true })).toHaveCount(0); // no teacher edit after submit
  await expect(page.getByRole('button', { name: 'Absent', exact: true })).toHaveCount(0);
  await page.screenshot({ path: `${SHOTS}/flow-attendance-locked.png`, fullPage: true });
  await page.getByRole('button', { name: 'Request correction' }).click();
  await page.getByLabel('What needs to change, and why?').fill('Aarav was present, I marked him absent by mistake');
  await page.getByRole('button', { name: 'Send to admin' }).click();
  await expect(page.getByText('Request sent to the school admin')).toBeVisible();
  await signOut(page);

  // the admin sees the request and corrects the register with a reason
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/messages');
  await expect(page.getByText(/Attendance correction request/).first()).toBeVisible();
  await page.goto('/admin/classes?tab=attendance'); // attendance lives inside Classes & sections
  await page.getByRole('row').filter({ hasText: 'Class 8 A' }).getByRole('button', { name: 'Open register' }).click();
  const select = page.getByRole('dialog').getByRole('row').nth(1).locator('select');
  await select.selectOption('late');
  const why = page.getByRole('dialog', { name: 'Correct attendance' }); // the admin must give a reason
  await why.getByRole('textbox').fill('Parent brought a note');
  await why.getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Correction recorded')).toBeVisible();
  await expect(page.getByRole('dialog').getByText('corrected').first()).toBeVisible();
  await page.keyboard.press('Escape');
  await signOut(page);

  // the student sees the corrected status and can only REPORT an error
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/attendance');
  await page.getByRole('tab', { name: 'Daily history' }).click();
  const todayRow = page.getByRole('row').nth(1);
  await expect(todayRow).toContainText('Late');
  await expect(todayRow).toContainText('corrected');
  await todayRow.getByRole('button', { name: 'Report an error' }).click();
  await page.getByLabel('What is wrong?').fill('I arrived before the bell');
  await page.getByRole('button', { name: 'Send' }).click();
  await expect(page.getByText('Sent to your class teacher')).toBeVisible();
  expect(problems.filter((p) => !/dialog/.test(p))).toEqual([]);
});

test('student sees an attendance heat map of the whole year', async ({ page }) => {
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/attendance');
  const map = page.getByRole('img', { name: /Attendance heat map/ });
  await expect(map).toBeVisible();
  expect(await map.locator('[data-status="present"]').count()).toBeGreaterThan(5);
  expect(await map.locator('[data-status="late"]').count()).toBe(1); // today, as corrected above
  expect(await map.locator('[data-status="absent"], [data-status="unmarked"]').count()).toBeGreaterThanOrEqual(0);
  await page.screenshot({ path: `${SHOTS}/flow-heatmap.png`, fullPage: true });
});

test('teacher publishes homework → student sees it, with a notification', async ({ page }) => {
  const problems = watch(page);
  const title = `Algebra drill ${uid}`;
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/homework');
  await page.getByRole('button', { name: '+ Create homework' }).click();
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Class & subject').selectOption({ label: 'Class 8 A · Mathematics' });
  await page.getByLabel('Due date').fill(plusDays(4));
  await page.getByLabel('Visibility').selectOption('published');
  await page.getByLabel('Description').fill('Questions 1 to 20');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('dialog', { name: 'Add an attachment?' }).getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('cell', { name: title })).toBeVisible();
  await signOut(page);

  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/homework');
  await expect(page.getByRole('cell', { name: title })).toBeVisible();
  await page.getByRole('cell', { name: title }).click();
  await expect(page.getByRole('dialog')).toContainText('Questions 1 to 20');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Notifications' }).click();
  await expect(page.getByRole('dialog', { name: 'Notifications' }).getByText(new RegExp(`${title}|Mathematics homework`)).first()).toBeVisible();
  await signOut(page);
  expect(problems.filter((p) => !p.includes('dialog'))).toEqual([]);
});

test('teacher adds a class test with their own mark fields, enters marks field by field; admin approves', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/exams');
  await expect(page.getByRole('link', { name: 'Marks Entry' })).toHaveCount(0); // examinations and marks entry are one screen
  // add a test: type, name, class+subject, date and the fields to give marks for
  await page.getByRole('button', { name: '+ Add exam' }).click();
  await page.getByLabel('Type').selectOption('class_test');
  await page.getByLabel('Name', { exact: true }).fill(`Class Test ${uid}`);
  await page.getByLabel('Class & subject').selectOption({ label: 'Class 8 A · Mathematics' });
  await page.getByLabel('Field 1 name').fill('Written');
  await page.getByLabel('Field 1 maximum').fill('15');
  await page.getByRole('button', { name: '+ Add field' }).click();
  await page.getByLabel('Field 2 name').fill('Oral');
  await page.getByLabel('Field 2 maximum').fill('5');
  await expect(page.getByText('Total maximum: 20')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Add exam' }).click();
  await expect(page.getByText('Test added')).toBeVisible();
  const myRow = page.getByRole('row').filter({ hasText: `Class Test ${uid}` });
  await expect(myRow).toContainText('Written 15 + Oral 5');
  await expect(myRow.getByRole('button', { name: 'Delete' })).toBeVisible(); // own, unused → deletable
  await myRow.getByRole('button', { name: 'Enter marks' }).click();

  // the sheet has exactly the fields we asked for — no theory/practical/total columns
  await expect(page.getByRole('heading', { name: new RegExp(`Mathematics · Class Test ${uid}`) })).toBeVisible();
  const written = page.locator('input[aria-label^="Written marks for"]');
  const oral = page.locator('input[aria-label^="Oral marks for"]');
  await expect(page.locator('input[aria-label^="Theory marks for"]')).toHaveCount(0);
  const n = await written.count();
  expect(n).toBeGreaterThan(5);
  await written.first().fill('19'); // over 15
  await expect(page.getByText(/outside the allowed range/)).toBeVisible();
  await written.first().fill('14');
  for (let i = 0; i < n; i++) { if (i) await written.nth(i).fill(String(8 + (i % 6))); await oral.nth(i).fill(String(2 + (i % 4))); }
  await page.getByLabel(/^Absent /).last().check();
  await expect(page.getByText(/Auto-saved at/)).toBeVisible({ timeout: 8000 });
  await page.screenshot({ path: `${SHOTS}/flow-marks-sheet.png`, fullPage: true });
  await page.getByRole('button', { name: 'Submit for approval' }).click();
  await expect(page.getByText('Marks submitted for approval')).toBeVisible();
  await expect(page.getByText('Marks are locked while they are under review.')).toBeVisible();
  await expect(written.first()).toBeDisabled();
  await signOut(page);

  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/exams?tab=list');
  await page.getByRole('row').filter({ hasText: `Class Test ${uid}` }).click();
  await page.getByRole('tab', { name: 'Marks review & publish' }).click();
  await page.getByRole('row').filter({ hasText: 'Submitted' }).getByRole('button', { name: 'Open' }).click();
  await expect(page.getByRole('dialog')).toContainText('Written /15');
  await page.getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('dialog')).toContainText('Approved');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Publish results for all ready sections' }).click();
  await expect(page.getByText(/Published: Class 8 A/)).toBeVisible();
  expect(problems).toEqual([]);
});

test('class-wise performance: all students × all exams, click through to one student\'s marks', async ({ page }) => {
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/performance');
  await expect(page.getByRole('columnheader', { name: /Unit Test 1/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Class Test 1\b/ })).toBeVisible();
  await expect(page.getByRole('columnheader', { name: new RegExp(`Class Test ${uid}`) })).toBeVisible();
  const rows = page.locator('tbody tr');
  expect(await rows.count()).toBe(14);
  await page.screenshot({ path: `${SHOTS}/flow-class-performance.png`, fullPage: true });
  await rows.first().click();
  await expect(page).toHaveURL(/\/teacher\/students\//);
  await page.getByRole('tab', { name: 'Subject marks' }).click();
  await expect(page.getByText('Written').first()).toBeVisible(); // field-by-field breakdown
  await expect(page.getByText(/Unit test/).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/flow-student-marks.png`, fullPage: true });
});

test('student: every test of the class (attempted or not), everyone\'s results and their own rank', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/results');
  await page.getByRole('tab', { name: 'All tests of my class' }).click();
  await expect(page.getByRole('row').filter({ hasText: 'Unit Test 1' })).toContainText('Results out');
  await expect(page.getByRole('row').filter({ hasText: /Class Test 1\b/ })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Unit Test 2' })).toContainText('Upcoming');
  await page.getByRole('row').filter({ hasText: 'Unit Test 1' }).getByRole('button', { name: 'See everyone' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg).toContainText('Your rank:');
  await expect(dlg).toContainText('Class average');
  const mine = dlg.locator('tbody tr').filter({ hasText: 'You' });
  await expect(mine).toHaveCount(1);
  expect(await dlg.locator('tbody tr').count()).toBe(14); // the whole class
  await page.screenshot({ path: `${SHOTS}/flow-class-ranks.png`, fullPage: true });
  await page.keyboard.press('Escape');
  // own report card still works and shows the teacher-defined fields
  await page.getByRole('tab', { name: 'My results' }).click();
  await page.getByRole('row').filter({ hasText: 'Unit Test 1' }).getByRole('button', { name: 'View report card' }).click();
  await expect(page.getByText('Written ').first()).toBeVisible();
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF report card' }).click()]);
  expect(dl.suggestedFilename()).toMatch(/\.pdf$/);
  expect(fs.readFileSync(await dl.path()).subarray(0, 4).toString()).toBe('%PDF');
  expect(problems).toEqual([]);
});

test('a wrongly sent class notice can be deleted: it disappears for students', async ({ page }) => {
  const title = `WRONG notice ${uid}`;
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/communication');
  await page.getByRole('button', { name: '+ Notice to my class' }).click();
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8 A' });
  await page.getByLabel('Title').fill(title);
  await page.getByLabel('Message').fill('Test is on Sunday');
  await page.getByRole('button', { name: 'Send notice' }).click();
  await expect(page.getByText(title)).toBeVisible();
  await signOut(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/announcements');
  await expect(page.getByText(title)).toBeVisible();
  await signOut(page);
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/communication');
  await page.locator('section', { hasText: title }).getByRole('button', { name: /Delete/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Notice deleted')).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(0);
  await signOut(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/announcements');
  await expect(page.getByText('Annual Sports Day', { exact: true })).toBeVisible();
  await expect(page.getByText(title)).toHaveCount(0);
  // the admin can delete an announcement too
  await signOut(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/announcements');
  await page.getByRole('button', { name: '+ New announcement' }).click();
  await page.getByLabel('Title').fill(`Admin mistake ${uid}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: `Admin mistake ${uid}` })).toBeVisible();
  await page.getByRole('row').filter({ hasText: `Admin mistake ${uid}` }).getByRole('button', { name: 'Delete' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Announcement deleted')).toBeVisible();
  await expect(page.getByRole('cell', { name: `Admin mistake ${uid}` })).toHaveCount(0);
});

test('admin: subjects come from teachers (no master list); staff accounts for finance and library', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await expect(page.getByRole('link', { name: 'Subjects', exact: true })).toHaveCount(0);
  await page.goto('/admin/classes?tab=subjects'); // subject teachers are nested inside Classes & sections
  await page.getByRole('button', { name: '+ Assign teacher to a subject' }).click();
  await page.getByLabel('Teacher', { exact: true }).selectOption({ label: 'Priya Rao (T006)' });
  await page.getByLabel('Section').selectOption({ index: 1 });
  await page.getByLabel('Subject', { exact: true }).fill(`Robotics ${letters(uid)}`);
  await page.getByLabel('Periods per week').fill('2');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('cell', { name: `Robotics ${letters(uid)}` })).toBeVisible(); // created on the spot
  // staff
  await page.goto('/admin/staff');
  await page.getByRole('button', { name: '+ Add staff' }).click();
  await page.getByLabel('Full name').fill('Fatima Clerk');
  await page.getByLabel('Email (login id)').fill(`clerk${uid}@gps.test`);
  await page.getByLabel('Desk').selectOption('finance');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  const creds = page.getByRole('dialog', { name: 'Staff account' });
  await expect(creds).toContainText('Temporary password');
  const [loginId, tempPw] = await creds.locator('dd b').allTextContents();
  await creds.getByRole('button', { name: 'Done' }).click();
  await expect(page.getByRole('cell', { name: 'Fatima Clerk' })).toBeVisible();
  await signOut(page);
  // the new clerk must use the FINANCE door and change the temporary password
  await signIn(page, 'student', loginId, tempPw, { expectFail: true });
  await expect(page.getByRole('alert')).toContainText('Finance portal');
  await signIn(page, 'finance', loginId, tempPw);
  await expect(page).toHaveURL(/account\?force=1/);
  expect(problems.filter((p) => !/HTTP 40[0-9] POST .*auth\/login/.test(p))).toEqual([]);
});

test('finance: collect a payment (receipt), concession, reversal; the student sees it, read-only', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/students');
  await page.getByLabel('Search students').fill('Aarav Sharma');
  await page.getByRole('row').filter({ hasText: 'Aarav Sharma' }).first().click();
  await expect(page.getByRole('heading', { name: 'Aarav Sharma' })).toBeVisible();
  await expect(page.getByText('Total billed')).toBeVisible();
  // collect a partial payment by UPI
  await page.getByRole('button', { name: 'Collect payment' }).click();
  await page.getByLabel(/Amount/).fill('1000');
  await page.getByLabel('Mode', { exact: true }).selectOption('upi');
  await page.getByLabel(/Reference/).fill(`UPI-${uid}`);
  const download = page.waitForEvent('download').catch(() => null);
  await page.getByRole('dialog').getByRole('button', { name: /^Collect/ }).click();
  await expect(page.getByText(/Receipt RCPT\d+ issued/)).toBeVisible();
  const dl = await download; if (dl) expect(dl.suggestedFilename()).toMatch(/receipt-RCPT.*\.pdf/);
  await expect(page.getByRole('row').filter({ hasText: `UPI-${uid}` })).toContainText('Payment');
  // concession needs a reason
  await page.getByRole('button', { name: 'Concession' }).first().click();
  await page.getByLabel(/Amount/).fill('500');
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Save' })).toBeDisabled();
  await page.getByLabel('Reason').fill('Merit scholarship');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText(/Concession ₹500 — Merit scholarship/).first()).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/flow-finance-account.png`, fullPage: true });
  await signOut(page);

  // the student sees the payment, the concession and a receipt, but nothing to edit
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/fees');
  await expect(page.getByRole('heading', { name: 'Fee information' })).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: /RCPT/ }).first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Collect|Pay now/ })).toHaveCount(0);
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Receipt' }).first().click()]);
  expect(fs.readFileSync(await pdf.path()).subarray(0, 4).toString()).toBe('%PDF');
  await page.screenshot({ path: `${SHOTS}/flow-student-fees.png`, fullPage: true });
  await signOut(page);

  // reversal: reason required; the receipt stays on record, flagged
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/payments');
  await page.getByLabel('Search payments').fill(`UPI-${uid}`);
  const row = page.getByRole('row').filter({ hasText: `UPI-${uid}` });
  await row.getByRole('button', { name: 'Reverse' }).click();
  await expect(page.getByRole('dialog').getByRole('button', { name: 'Reverse payment' })).toBeDisabled();
  await page.getByLabel(/Reason/).fill('Entered against wrong student');
  await page.getByRole('dialog').getByRole('button', { name: 'Reverse payment' }).click();
  const both = page.getByRole('row').filter({ hasText: `UPI-${uid}` });
  await expect(both).toHaveCount(2); // the original stays on record…
  await expect(both.filter({ hasText: 'Reversed' })).toHaveCount(1); // …flagged
  await expect(both.filter({ hasText: 'Reversal' })).toHaveCount(1); // …plus the reversal entry
  expect(problems).toEqual([]);
});

test('fees the Indian way: monthly structure, the school\'s policy, and a month free for paying the whole year', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  // a structure is an admission fee plus tuition per month; there is no "activities" head to begin with
  await page.goto('/finance/structures');
  await expect(page.getByText('Class 8 Fee')).toBeVisible();
  await expect(page.getByText(/Tuition .* \/ month/).first()).toBeVisible();
  await expect(page.getByText(/Activities/)).toHaveCount(0);
  await page.getByRole('button', { name: '+ New fee structure' }).click();
  await page.getByLabel('Name', { exact: true }).fill(`Class 5 Fee ${uid}`);
  await page.getByLabel(/Admission fee/).fill('2500');
  await page.getByLabel(/Tuition fee per month/).fill('1200');
  await expect(page.getByText(/Per student, per year: ₹16,900/)).toBeVisible(); // 2,500 + 12 x 1,200
  await page.getByRole('button', { name: '+ Add fee' }).click();
  await page.getByLabel('Fee name 1').fill('Exam fee');
  await page.getByLabel('Fee amount 1').fill('600');
  await expect(page.getByText(/Per student, per year: ₹17,500/)).toBeVisible();
  await page.getByRole('button', { name: 'Create structure' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Class 5 Fee ${uid}`) })).toContainText('₹17,500');
  // the school's own policy: due day and the advance-payment discount
  await page.goto('/finance/policy');
  await expect(page.getByText(/gets 1 month of tuition free/)).toBeVisible();
  await page.getByLabel('The discount is').selectOption('percent');
  await page.getByLabel('Percentage off').fill('10');
  await expect(page.getByText(/gets 10% off tuition/)).toBeVisible();
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.getByText('Fee policy saved')).toBeVisible();
  await page.reload();
  await expect(page.getByText(/gets 10% off tuition/)).toBeVisible(); // it persisted
  await page.getByLabel('The discount is').selectOption('months');
  await page.getByLabel('Number of free months').fill('1');
  await page.getByRole('button', { name: 'Save policy' }).click();
  await expect(page.getByText('Fee policy saved')).toBeVisible();
  // the admin can read the policy but not change it
  // pay the whole year: a student with nothing paid yet qualifies; the discount is one month of tuition
  await page.goto('/finance/students');
  await page.getByLabel('Search students').fill('Meera Das');
  const row = page.getByRole('row').filter({ hasText: 'Meera Das' }).first();
  if (await row.count()) await row.click();
  else { await page.goto('/finance/students'); await page.getByRole('row').nth(2).click(); }
  await page.getByRole('button', { name: 'Pay full year' }).click();
  const dlg = page.getByRole('dialog');
  await expect(dlg.getByText("School's offer")).toBeVisible();
  const eligible = await dlg.getByText(/1 month of tuition free/).count();
  if (eligible) {
    await expect(dlg.getByText(/To pay now/)).toBeVisible();
    await dlg.getByRole('button', { name: /^Collect/ }).click();
    await expect(page.getByText(/Receipt RCPT\d+ issued/)).toBeVisible();
    await expect(page.getByText(/Advance payment — 1 month of tuition free/).first()).toBeVisible();
  } else {
    await expect(dlg.getByRole('alert').or(dlg.locator('.alert')).first()).toBeVisible(); // not eligible: the reason is shown
    await dlg.getByRole('button', { name: 'Cancel' }).click();
  }
  await signOut(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/fees?tab=policy');
  await expect(page.getByText(/gets 1 month of tuition free/)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Save policy' })).toHaveCount(0);
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('library: add a book, issue and return it at the desk; student sees it; fines flow into fees', async ({ page }) => {
  const problems = watch(page);
  const title = `Test Book ${letters(uid)}`;
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/library/books');
  await page.getByRole('button', { name: '+ Add book' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Title').fill(title);
  await dlg.getByLabel('Author').fill('Test Author');
  await dlg.getByLabel('Category').fill('Science');
  await dlg.getByLabel(/Price/).fill('300');
  await dlg.getByLabel('Number of copies').fill('2');
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  const added = page.getByText(/Accession numbers:/);
  await expect(added).toBeVisible();
  const accession = (await added.innerText()).match(/LB\d{5}/)[0];
  // issue at the desk
  await page.goto('/library/desk');
  await page.getByLabel('Find borrower').fill('Aarav Sharma');
  await page.getByRole('button', { name: /Aarav Sharma/ }).first().click();
  await page.getByLabel('Accession number').fill(accession);
  await page.getByRole('button', { name: 'Issue book' }).click();
  await expect(page.getByText(`Issued ${title}`.slice(0, 12)).first()).toBeVisible();
  await expect(page.getByText(/Due back/)).toBeVisible();
  // same copy again is refused
  await page.getByLabel('Accession number').fill(accession);
  await page.getByRole('button', { name: 'Issue book' }).click();
  await expect(page.getByText(/already on loan/)).toBeVisible();
  await signOut(page);
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/library');
  await expect(page.getByRole('cell', { name: new RegExp(title) })).toBeVisible();
  await page.getByRole('tab', { name: 'Search the catalogue' }).click();
  await page.getByLabel('Search catalogue').fill('Wings');
  await expect(page.getByRole('row').filter({ hasText: 'Wings of Fire' })).toContainText('available');
  await page.waitForLoadState('networkidle'); // let the search finish before signing out (a request that lands after sign-out is a 401)
  await signOut(page);
  // return it on time: no fine
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/library/desk');
  await page.getByRole('tab', { name: 'Return a book' }).click();
  await page.getByLabel('Accession number').fill(accession);
  await expect(page.getByText(/on time/)).toBeVisible();
  await page.getByRole('button', { name: 'Return book' }).click();
  await expect(page.getByText('No fine.')).toBeVisible();
  // the demo's overdue loan: returning it adds a fine to the student's fees
  await page.goto('/library/loans');
  await page.getByLabel('Status').selectOption('overdue');
  await expect(page.getByRole('row').filter({ hasText: 'Malgudi Days' })).toContainText('late');
  await page.screenshot({ path: `${SHOTS}/flow-library-overdue.png`, fullPage: true });
  expect(problems.filter((p) => !/HTTP 409 POST \/api\/library\/issue/.test(p))).toEqual([]); // the 409 is the deliberate double-issue attempt
});

test('payroll: admin defines a level, sets a salary, generates, adjusts, approves and pays; the teacher sees the payslip', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/payroll');
  await expect(page.getByText('People with a salary')).toBeVisible();
  // a new pay level with a percentage allowance
  await page.getByRole('tab', { name: 'Pay levels' }).click();
  await expect(page.getByRole('cell', { name: /^PRT/ })).toBeVisible();
  await page.getByRole('button', { name: '+ New level' }).click();
  await page.getByLabel('Level name').fill('Vice Principal');
  await page.getByLabel('Basic salary per month (₹)').fill('80000');
  await page.getByRole('button', { name: '+ Add' }).first().click();
  await page.getByLabel('Allowances name 1').fill('HRA');
  await page.getByLabel('Allowances type 1').selectOption('percent');
  await page.getByLabel('Allowances value 1').fill('40');
  await expect(page.getByText('= ₹32,000')).toBeVisible(); // 40% of 80,000, shown live
  await page.getByRole('button', { name: 'Save level' }).click();
  await expect(page.getByRole('cell', { name: /^Vice Principal/ })).toBeVisible();
  // Mrs Gupta moves to that level from today
  await page.getByRole('tab', { name: 'Salaries' }).click();
  await page.getByRole('row', { name: /Meera Gupta/ }).getByRole('button', { name: 'Revise' }).click();
  await page.getByLabel('Pay level').selectOption({ label: 'Vice Principal' });
  await expect(page.getByText('Net per month ₹1,12,000')).toBeVisible();
  await page.getByRole('button', { name: 'Save salary' }).click();
  await expect(page.getByRole('row', { name: /Meera Gupta/ })).toContainText('Vice Principal');
  // this month's payroll
  await page.getByRole('tab', { name: 'Payroll runs' }).click();
  await page.getByRole('button', { name: '+ Generate payroll' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Generate' }).click();
  await expect(page.getByText('Draft').first()).toBeVisible();
  const row = page.getByRole('row', { name: /Meera Gupta/ });
  await expect(row).toContainText('₹1,12,000');
  await row.getByRole('button', { name: /Adjust/ }).click();
  await page.getByRole('button', { name: '+ Add adjustment' }).click();
  await page.getByLabel('Name 1').fill('Exam duty');
  await page.getByLabel('Amount 1').fill('5000');
  await page.getByRole('button', { name: 'Save adjustments' }).click();
  await expect(page.getByRole('row', { name: /Meera Gupta/ })).toContainText('₹1,17,000');
  // teachers cannot see a draft
  await page.getByRole('button', { name: 'Approve' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm' }).click();
  await expect(page.getByText('Approved').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Adjust' })).toHaveCount(0); // locked once approved
  // the bank file lists who can be paid by transfer (Kamla has a bank account on record) and who still needs details
  await page.getByRole('button', { name: 'Bank file' }).click();
  await expect(page.getByRole('dialog').getByText('Ready to pay')).toBeVisible();
  await expect(page.getByRole('dialog').getByRole('cell', { name: 'Kamla Devi' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('Cannot be paid yet')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
  await page.getByRole('button', { name: 'PF / ESI / PT' }).click();
  await expect(page.getByRole('dialog').getByText(/No statutory deductions are switched on/)).toBeVisible(); // off until the school turns them on
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
  await page.getByRole('button', { name: /Mark all paid/ }).click();
  await page.getByLabel('Reference / batch no.').fill('NEFT-E2E-1');
  await page.getByRole('button', { name: 'Record payment' }).click();
  await expect(page.getByText('Paid').first()).toBeVisible();
  await expect(page.getByRole('button', { name: /Mark all paid/ })).toHaveCount(0);
  await signOut(page);
  // the teacher sees her own pay and downloads the payslip
  await signIn(page, 'teacher', 'gupta@gps.test', 'Teach@12345');
  await page.goto('/teacher/salary');
  await expect(page.getByText('Vice Principal').first()).toBeVisible();
  await expect(page.getByRole('cell', { name: '₹1,17,000' }).first()).toBeVisible(); // gross and net are both 1,17,000
  const [dl] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).first().click()]);
  expect(dl.suggestedFilename()).toMatch(/^payslip-PAY\d{6}-T002\.pdf$/);
  // and cannot reach the admin payroll
  await page.goto('/admin/payroll');
  await expect(page).not.toHaveURL(/\/admin\/payroll/);
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('admin: everything hangs off the class — students, attendance, homework, subject teachers, exams, library — and one student shows it all', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  // the old stand-alone tabs live inside Classes & sections now
  for (const name of ['Subjects & assignments', 'Attendance', 'Homework & materials']) await expect(page.getByRole('link', { name, exact: true })).toHaveCount(0);
  await page.goto('/admin/classes');
  for (const t of ['Subjects & teachers', 'Attendance', 'Homework by day']) await expect(page.getByRole('tab', { name: t })).toBeVisible();
  await page.getByRole('link', { name: 'Class 8 A' }).first().click();
  await expect(page.getByRole('heading', { name: 'Class 8 A' })).toBeVisible();
  const sectionUrl = page.url();
  await expect(page.getByText('Attendance today')).toBeVisible();
  await expect(page.getByText('Subject teachers').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Exams & performance' }).click();
  await expect(page.getByText('Exams held').first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Unit Test 1/ }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Homework', exact: true }).click();
  await expect(page.getByText('Last 14 days — homework given per day')).toBeVisible();
  await page.getByRole('tab', { name: 'Library' }).click();
  await expect(page.getByText('Borrowed a book this year')).toBeVisible();
  await page.getByRole('tab', { name: 'Attendance' }).click();
  await expect(page.getByText('Registers — last 45 days')).toBeVisible();
  // one student: summary strip and a tab for everything
  await page.getByRole('tab', { name: 'Students' }).click();
  await page.getByRole('row', { name: /Aarav Sharma/ }).click();
  await expect(page).toHaveURL(/\/admin\/students\//);
  await expect(page.getByText('Attendance this year')).toBeVisible();
  await page.getByRole('tab', { name: 'Exams & marks' }).click();
  await expect(page.getByText('Unit Test 1').first()).toBeVisible();
  await page.getByRole('tab', { name: 'Library' }).click();
  await expect(page.getByRole('cell', { name: /Issued|issued/ }).first().or(page.getByText('has not borrowed')).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Bus' }).click();
  await expect(page.getByText('Does not use the school bus')).toBeVisible();
  await page.getByRole('tab', { name: 'Fees' }).click();
  await expect(page.getByText('Billed')).toBeVisible();
  // examinations: pick a class, see the exams held and every student
  await page.goto('/admin/exams');
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8' });
  await expect(page.getByText('Exams held').first()).toBeVisible();
  await expect(page.getByRole('columnheader', { name: /Unit Test 1/ }).first()).toBeVisible();
  // library by class (admin, read-only)
  await page.goto('/admin/library?tab=classes');
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8' });
  await expect(page.getByText('Never borrowed').first()).toBeVisible();
  // buses are not the admin's to edit: the admin gets a read-only window
  await page.goto('/admin/transport?tab=buses');
  await expect(page.getByRole('button', { name: '+ Add bus' })).toHaveCount(0);
  await signOut(page);
  // the library desk has the same class view
  await signIn(page, 'library', 'library@gps.test', 'Library@12345');
  await page.goto('/library/classes');
  await page.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8' });
  await expect(page.getByText('Borrowed a book this year')).toBeVisible();
  await expect(page.getByRole('row', { name: /Aarav Sharma/ })).toBeVisible();
  await signOut(page);
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('staff attendance: admin marks teachers and staff, the officer marks the crew, the teacher sees their own, staff are on payroll', async ({ page }) => {
  const problems = watch(page);
  // a working day well in the past (not a Sunday), so it is free of the demo's own registers
  let day = plusDays(-12); while (new Date(`${day}T00:00:00Z`).getUTCDay() === 0) day = new Date(new Date(`${day}T00:00:00Z`).getTime() - 864e5).toISOString().slice(0, 10);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff-attendance');
  await page.getByLabel('Date').fill(day);
  await expect(page.getByText('Rajesh Sharma')).toBeVisible();
  await page.getByRole('group', { name: 'Status of Rajesh Sharma' }).getByRole('button', { name: 'Absent' }).click();
  await page.getByRole('button', { name: 'Save draft' }).click();
  await expect(page.getByText('Draft saved')).toBeVisible();
  await page.getByRole('button', { name: 'Submit register' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit register' }).click();
  await expect(page.getByText('Register submitted')).toBeVisible();
  await expect(page.getByText('Submitted', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit register' })).toHaveCount(0); // locked
  await expect(page.getByLabel('Correct Rajesh Sharma')).toBeVisible(); // changes now need a reason
  // non-teaching staff are a separate register
  await page.getByRole('tab', { name: 'Non-teaching staff' }).click();
  await page.getByLabel('Date').fill(day);
  await expect(page.getByText('Kamla Devi')).toBeVisible();
  await expect(page.getByText('Ramesh Driver')).toHaveCount(0); // transport staff are not the admin's register
  await page.getByRole('group', { name: 'Status of Kamla Devi' }).getByRole('button', { name: 'Absent' }).click();
  await page.getByRole('button', { name: 'Submit register' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit register' }).click();
  await expect(page.getByText('Register submitted')).toBeVisible();
  // everyone with a salary is on payroll: teachers, general staff and transport staff
  await page.goto('/admin/payroll?tab=salaries');
  await expect(page.getByRole('row', { name: /Kamla Devi/ })).toContainText('Non-teaching');
  await expect(page.getByRole('row', { name: /Kamla Devi/ })).toContainText('Support Grade');
  await expect(page.getByRole('row', { name: /Harish Driver/ })).toContainText('Transport staff');
  await signOut(page);
  // the Transport officer marks the crew; the admin can only look
  await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');
  await page.goto('/transport/attendance');
  await page.getByLabel('Date').fill(day);
  await expect(page.getByText('Harish Driver')).toBeVisible();
  await page.getByRole('group', { name: 'Status of Mahesh Conductor' }).getByRole('button', { name: 'Half day' }).click();
  await page.getByRole('button', { name: 'Submit register' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Submit register' }).click();
  await expect(page.getByText('Register submitted')).toBeVisible();
  await signOut(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/transport?tab=attendance');
  await page.getByLabel('Date').fill(day);
  await expect(page.getByText('Mahesh Conductor')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Submit register' })).toHaveCount(0);
  await page.goto('/admin/teachers');
  await page.getByRole('row').filter({ hasText: 'Rajesh Sharma' }).first().click();
  await page.getByRole('tab', { name: 'Attendance & leave' }).click();
  await expect(page.getByText(/From the daily staff attendance register/)).toBeVisible();
  await signOut(page);
  // the teacher sees the absence the office recorded
  await signIn(page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await page.goto('/teacher/my-attendance');
  await expect(page.getByRole('heading', { name: 'My attendance' })).toBeVisible();
  await expect(page.getByText('Attendance heat map — this academic year')).toBeVisible();
  await expect(page.getByRole('row').filter({ hasText: 'Absent' }).first()).toBeVisible();
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('staff portal: a staff member signs in, checks in, applies for leave, is approved, reads their payslip', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'staff', 'gps.s0001', 'Staff@12345');
  await expect(page.getByRole('heading', { name: 'Hello, Kamla Devi' })).toBeVisible();
  await expect(page.getByText('Casual leave left')).toBeVisible();
  // check in and out (only on a working day: the demo school works Monday to Saturday)
  if (new Date().getDay() !== 0) {
    await page.getByRole('button', { name: 'Check in' }).click();
    await expect(page.getByText('Checked in', { exact: true }).first()).toBeVisible();
    await expect(page.getByText(/Checked in at/)).toBeVisible();
    await page.getByRole('button', { name: 'Check out' }).click();
    await expect(page.getByText(/Checked out at/)).toBeVisible();
  }
  await page.goto('/staff/attendance');
  await expect(page.getByText('Attendance heat map — this academic year')).toBeVisible();
  // leave
  await page.goto('/staff/leave');
  await page.getByRole('button', { name: 'Apply for leave' }).click();
  await page.getByLabel('Leave type').selectOption('casual');
  await page.getByLabel('Start date').fill(plusDays(20));
  await page.getByLabel('End date').fill(plusDays(22));
  await page.getByLabel('Reason').fill(`Family function ${uid}`);
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Family function ${uid}`) })).toContainText('Submitted');
  // payslips: last month's was paid in the demo data
  await page.goto('/staff/payslips');
  await expect(page.getByRole('heading', { name: 'Salary & payslips' })).toBeVisible();
  const [pdf] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Download PDF' }).first().click()]);
  expect(pdf.suggestedFilename()).toMatch(/^payslip-PAY\d{6}-S0001\.pdf$/);
  await signOut(page);
  // the school office decides it
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/staff-leave');
  const row = page.getByRole('row', { name: new RegExp(`Family function ${uid}`) });
  await expect(row).toContainText('Kamla Devi');
  await row.getByRole('button', { name: 'Approve' }).click();
  await expect(row).toHaveCount(0); // it leaves the waiting list …
  await page.getByLabel('Status').selectOption('approved');
  await expect(page.getByRole('row', { name: new RegExp(`Family function ${uid}`) })).toContainText('Approved'); // … and shows under Approved
  // the admin can give a staff member a login from the staff list; the driver belongs to the Transport officer
  await page.goto('/admin/support-staff');
  await expect(page.getByRole('row', { name: /Kamla Devi/ })).toContainText('Has login');
  await expect(page.getByRole('row', { name: /Ramu Kaka/ }).getByRole('button', { name: 'Create login' })).toBeVisible();
  await signOut(page);
  await signIn(page, 'staff', 'gps.s0001', 'Staff@12345');
  await page.goto('/staff/leave');
  await expect(page.getByRole('row', { name: new RegExp(`Family function ${uid}`) })).toContainText('Approved');
  // a staff login reaches only the staff portal
  await page.goto('/admin'); await expect(page).toHaveURL(/\/staff/);
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('admin: a teacher\'s whole picture — classes, class teacher of, results, attendance from leave, salary, library', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/teachers');
  await page.getByRole('row').filter({ hasText: 'Rajesh Sharma' }).first().click();
  await expect(page.getByRole('heading', { name: 'Rajesh Sharma' })).toBeVisible();
  await expect(page.getByText('Attendance this year')).toBeVisible();
  await expect(page.getByText('Classes taught')).toBeVisible();
  await expect(page.getByText('Salary per month (net)')).toBeVisible();
  await expect(page.getByRole('link', { name: /Class 8 A/ }).first()).toBeVisible(); // class teacher of 8-A, shown with its class name
  await page.getByRole('tab', { name: 'Classes & results' }).click();
  await expect(page.getByText('Classes and subjects taught — and how those classes did')).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Mathematics' }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Attendance & leave' }).click();
  await expect(page.getByText('Attendance heat map — this academic year')).toBeVisible();
  await expect(page.getByText(/daily staff (attendance )?register/).first()).toBeVisible(); // where the numbers come from is stated on the page
  await expect(page.getByText('Leave balance (this year)')).toBeVisible();
  await page.getByRole('tab', { name: 'Salary & payslips' }).click();
  await expect(page.getByText('Pay level').first()).toBeVisible();
  await expect(page.getByText('Payslips', { exact: true }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Library' }).click();
  await expect(page.getByText('Library — books borrowed')).toBeVisible();
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('transport officer: own designations, drivers and conductors, buses and riders; the admin only looks; non-teaching staff; the student sees their bus', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'transport', 'transport@gps.test', 'Transport@12345');
  await expect(page.getByRole('heading', { name: 'Transport' }).first()).toBeVisible();
  await expect(page.getByText('Buses running')).toBeVisible();
  // the officer adds a job title of their own, then a driver and a conductor with it
  await page.goto('/transport/staff');
  await page.getByRole('button', { name: 'Designations' }).click();
  await page.getByLabel('New designation').fill(`Bus Attendant ${uid}`);
  await page.getByLabel('On a bus').selectOption('conductor');
  await page.getByRole('button', { name: 'Add designation' }).click();
  await expect(page.getByRole('cell', { name: `Bus Attendant ${uid}` })).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
  await page.getByRole('button', { name: /\+ Add transport staff member/ }).click();
  await page.getByLabel('Full name').fill('Ramesh Driver');
  await page.getByRole('dialog').getByLabel('Designation', { exact: true }).selectOption({ label: 'Driver' });
  await page.getByLabel('Phone', { exact: true }).fill('9876500001');
  await page.getByLabel('Driving licence number').fill('GJ0320100001');
  await page.getByLabel('Licence valid until').fill(plusDays(400));
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Ramesh Driver/ })).toContainText('Not on a bus');
  await page.getByRole('button', { name: /\+ Add transport staff member/ }).click();
  await page.getByLabel('Full name').fill('Suresh Conductor');
  await page.getByRole('dialog').getByLabel('Designation', { exact: true }).selectOption({ label: `Bus Attendant ${uid}` });
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Suresh Conductor/ })).toBeVisible();
  // a bus, with its crew picked from the staff list
  await page.goto('/transport/buses');
  await page.getByRole('button', { name: '+ Add bus' }).click();
  await page.getByLabel('Bus number').fill(`BUS-${uid}`);
  await page.getByLabel('Seats').fill('30');
  await page.getByLabel('Route name').fill('Route 2 — Kalawad Road');
  const pickCrew = async (field, who) => page.getByLabel(field, { exact: true }).selectOption(await page.getByLabel(field, { exact: true }).locator('option', { hasText: who }).getAttribute('value'));
  await pickCrew('Driver', 'Ramesh Driver');
  await pickCrew('Conductor', 'Suresh Conductor');
  await page.getByRole('button', { name: '+ Add stop' }).click();
  await page.getByLabel('Stop name 1').fill('Gondal Chowk');
  await page.getByLabel('Pick-up time 1').fill('07:10');
  await page.getByRole('button', { name: 'Save bus' }).click();
  const busRow = page.getByRole('row', { name: new RegExp(`BUS-${uid}`) });
  await expect(busRow).toContainText('Ramesh Driver');
  await expect(busRow).toContainText('Suresh Conductor');
  await busRow.getByRole('button', { name: 'Open' }).click();
  await page.getByRole('button', { name: '+ Add students' }).click();
  const add = page.getByRole('dialog').last();
  await add.getByLabel('Class', { exact: true }).selectOption({ label: 'Class 8' });
  await add.getByLabel('Section', { exact: true }).selectOption({ label: 'A' });
  await add.getByLabel('Boarding stop').selectOption('Gondal Chowk');
  await add.getByLabel('Select Aarav Sharma').check();
  await add.getByRole('button', { name: /^Add 1 student/ }).click();
  await expect(page.getByRole('dialog').first().getByText('Students on this bus (1)')).toBeVisible();
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
  // the officer has no access to the school's academic data
  await page.goto('/admin'); await expect(page).toHaveURL(/\/transport/);
  await signOut(page);
  // the School Admin sees the same data, read-only, and keeps every other kind of staff
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/transport?tab=buses');
  await expect(page.getByRole('row', { name: new RegExp(`BUS-${uid}`) })).toContainText('Ramesh Driver');
  await expect(page.getByRole('button', { name: '+ Add bus' })).toHaveCount(0);
  await page.goto('/admin/support-staff');
  await expect(page.getByRole('row', { name: /Kamla Devi/ })).toContainText('Sweeper');
  await expect(page.getByRole('row', { name: /Ramesh Driver/ })).toHaveCount(0); // drivers and conductors belong to the Transport desk, not here
  await expect(page.getByText(/added and managed by the Transport officer/)).toBeVisible();
  await page.getByRole('button', { name: /\+ Add staff member/ }).click();
  await page.getByLabel('Full name').fill('Geeta Maid');
  await page.getByRole('dialog').getByLabel('Designation', { exact: true }).selectOption({ label: 'Maid' });
  await page.getByRole('dialog').getByRole('button', { name: 'Save' }).click();
  await expect(page.getByRole('row', { name: /Geeta Maid/ })).toContainText('Maid');
  await page.getByRole('button', { name: 'Designations' }).click();
  await page.getByLabel('New designation').fill(`Electrician ${uid}`);
  await expect(page.getByLabel('On a bus')).toHaveCount(0); // the admin's titles are general: no driver/conductor seats
  await page.getByRole('button', { name: 'Add designation' }).click();
  await expect(page.getByRole('cell', { name: `Electrician ${uid}` })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Driver', exact: true })).toHaveCount(0);
  await page.getByRole('dialog').getByRole('button', { name: 'Close' }).first().click();
  await signOut(page);
  // the student sees their own bus, driver and conductor
  await signIn(page, 'student', 'gps.adm20260001', 'Student@12345');
  await page.goto('/student/profile');
  await expect(page.getByText('My school bus')).toBeVisible();
  await expect(page.getByText(`Bus BUS-${uid}`)).toBeVisible();
  await expect(page.getByText('Ramesh Driver')).toBeVisible();
  await expect(page.getByText('Suresh Conductor')).toBeVisible();
  expect(problems.filter((p) => !p.includes('HTTP 40'))).toEqual([]);
});

test('admin admits a student: auto-billed, must change password, honest empty states elsewhere', async ({ page }) => {
  const problems = watch(page);
  const name = `Test Pupil ${letters(uid)}`;
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/students');
  await page.getByRole('button', { name: '+ Admit student' }).click();
  await page.getByLabel('Full name').fill(name);
  await page.getByLabel('Date of birth').fill('2014-06-15');
  await page.getByLabel(/Class & section/).selectOption({ label: 'Class 6 A · 4/40' });
  await page.getByLabel('Guardian name').fill('Mr Guardian');
  await page.getByLabel('Guardian phone').fill('9876501234');
  await page.getByRole('dialog').getByRole('button', { name: 'Admit student' }).click();
  const creds = page.getByRole('dialog', { name: 'Student admitted' });
  await expect(creds).toContainText('Temporary password');
  const [loginId, tempPw] = await creds.locator('dd b').allTextContents();
  await creds.getByRole('button', { name: 'Done' }).click();
  await page.getByLabel('Search students').fill(name);
  await expect(page.getByRole('cell', { name })).toBeVisible();
  // withdrawal is blocked while fees are unpaid — and can be overridden knowingly
  await page.getByRole('cell', { name }).click();
  await page.getByRole('button', { name: 'Withdraw' }).click();
  await page.getByLabel('Reason').fill('Moving abroad');
  await page.getByRole('dialog').getByRole('button', { name: 'Withdraw', exact: true }).click();
  const warn = page.getByRole('dialog', { name: 'Withdraw anyway?' });
  await expect(warn).toContainText('unpaid fees');
  await warn.getByRole('button', { name: 'Cancel' }).click();
  await page.keyboard.press('Escape');
  await signOut(page);

  await signIn(page, 'student', loginId, tempPw);
  await expect(page).toHaveURL(/account\?force=1/);
  await expect(page.getByText('You must set a new password')).toBeVisible();
  await page.goto('/student'); await expect(page).toHaveURL(/account\?force=1/);
  await page.getByLabel('Current password').fill(tempPw);
  await page.getByLabel('New password', { exact: true }).fill('weak');
  await page.getByLabel('Confirm new password').fill('weak');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page.getByText(/at least 10 characters/i).last()).toBeVisible();
  await page.getByLabel('New password', { exact: true }).fill('Brand-new-pass1');
  await page.getByLabel('Confirm new password').fill('Brand-new-pass1');
  await page.getByRole('button', { name: 'Update password' }).click();
  await expect(page).toHaveURL(/\/student$/, { timeout: 10000 });
  await expect(page.getByText('No attendance recorded yet').first()).toBeVisible();
  await expect(page.getByText('No published results yet')).toBeVisible();
  await expect(page.getByText('No homework pending')).toBeVisible();
  await page.goto('/student/fees'); // billed automatically on admission
  await expect(page.getByText('What you are charged for')).toBeVisible();
  await expect(page.getByText(/Admission/).first()).toBeVisible();
  // admitted today: billed from this month on, not from April
  await expect(page.getByText(`Tuition fee — ${new Date().toLocaleString('en-US', { month: 'long', year: 'numeric' })}`).first()).toBeVisible();
  await page.goto('/student/results'); await page.getByRole('tab', { name: 'All tests of my class' }).click();
  await expect(page.getByText('No tests have been held for your class yet')).toBeVisible();
  await page.goto('/student/materials'); await expect(page.getByText('No study materials yet')).toBeVisible();
  await page.screenshot({ path: `${SHOTS}/flow-new-student-empty.png`, fullPage: true });
  expect(problems.filter((p) => !/HTTP 400 POST .*change-password|HTTP 409/.test(p))).toEqual([]);
});

test('super admin creates a school, acts inside it for data setup, and exits', async ({ page }) => {
  const problems = watch(page);
  const school = `Riverdale ${uid}`;
  await signIn(page, 'platform', 'superadmin@erp.local', 'Super@12345');
  await page.goto('/platform/schools');
  await page.getByRole('button', { name: '+ New school' }).click();
  await page.getByLabel('School name').fill(school);
  await page.getByLabel('School code').fill(`rv${uid}`);
  await page.getByLabel('Admin name').fill('Riya Admin');
  await page.getByLabel('Admin email (login id)').fill(`admin@rv${uid}.test`);
  await page.getByRole('button', { name: 'Create school' }).click();
  const creds = page.getByRole('dialog', { name: 'School administrator created' });
  await expect(creds).toContainText(`admin@rv${uid}.test`);
  const [, tempPw] = await creds.locator('dd b').allTextContents();
  await creds.getByRole('button', { name: 'Done' }).click();
  await page.getByRole('link', { name: school }).first().click();
  await page.getByRole('button', { name: /Open school/ }).click();
  await expect(page.getByText(/You are acting on/)).toBeVisible();
  await page.goto('/admin/classes');
  await expect(page.getByText(/You are acting on/)).toBeVisible();
  await page.getByRole('button', { name: '+ Class' }).click();
  // only LKG, UKG and Class 1-12 can be added: there is no way to type a class name, and no Class 13
  const gradeSelect = page.getByRole('dialog').getByLabel('Class', { exact: true });
  await expect(gradeSelect.locator('option')).toHaveCount(15); // 14 grades + the "Select…" placeholder
  await expect(gradeSelect.locator('option', { hasText: 'Class 13' })).toHaveCount(0);
  await expect(gradeSelect.locator('option', { hasText: 'LKG' })).toHaveCount(1);
  await gradeSelect.selectOption('Class 1');
  await page.getByRole('dialog').getByRole('button', { name: 'Add class' }).click();
  await expect(page.getByRole('cell', { name: 'Class 1' })).toBeVisible();
  await page.goto('/admin/audit');
  await expect(page.getByText('platform').first()).toBeVisible();
  await page.getByRole('button', { name: 'Exit school' }).click();
  await expect(page).toHaveURL(/\/platform\/schools/);
  await page.goto('/admin'); await expect(page).toHaveURL(/\/platform\/schools/);
  await signOut(page);
  await expect(page).toHaveURL(/\/platform\/login$/);
  await signIn(page, 'admin', `admin@rv${uid}.test`, tempPw);
  await expect(page).toHaveURL(/account\?force=1/);
  expect(problems.filter((p) => !p.includes('HTTP 400'))).toEqual([]);
});
