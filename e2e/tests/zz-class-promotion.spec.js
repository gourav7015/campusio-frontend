import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

// runs last: it creates the next academic year and moves a class into it
test('a class moves to the next year on its own: the class teacher asks, the office approves, the teacher moves it; other classes stay put', async ({ browser }) => {
  const mk = async () => { const ctx = await browser.newContext(); const page = await ctx.newPage(); return { ctx, page, problems: watch(page) }; };
  const admin = await mk(); const teacher = await mk();

  // the office makes the next academic year, and sees every class and where it stands
  await signIn(admin.page, 'admin', 'admin@gps.test', 'Admin@12345');
  await admin.page.goto('/admin/promotion');
  await admin.page.getByLabel('From academic year').selectOption({ label: '2026-2027 (current)' });
  await admin.page.getByRole('button', { name: '+ Create next year' }).click();
  await admin.page.getByRole('dialog').getByRole('textbox', { name: 'Name' }).fill('2027-2028 B'); // its own name: earlier specs may have left a plain 2027-2028 behind
  await admin.page.getByRole('dialog').getByRole('button', { name: /^Create/ }).click();
  await expect(admin.page.getByRole('row').filter({ hasText: 'Class 7' })).toContainText('Active');

  // the class teacher tells the office the session is ending
  await signIn(teacher.page, 'teacher', 'sharma@gps.test', 'Teach@12345');
  await teacher.page.getByRole('navigation').first().getByRole('link', { name: 'Move my class on' }).click();
  await expect(teacher.page.getByRole('heading', { name: 'Move my class on' })).toBeVisible();
  await teacher.page.getByLabel('Next academic year').first().selectOption({ label: '2027-2028 B' });
  await teacher.page.getByLabel('Note for the office').first().fill('Exams are over');
  await teacher.page.getByRole('button', { name: /Session is ending/ }).first().click();
  await expect(teacher.page.getByText('Waiting for the office').first()).toBeVisible();
  await expect(teacher.page.getByRole('button', { name: 'Review the students' })).toHaveCount(0); // not before the office approves

  // the office approves it from Approvals
  await admin.page.goto('/admin/approvals');
  await expect(admin.page.getByText(/Classes ready to move to the next year \(1\)/)).toBeVisible();
  await expect(admin.page.getByRole('row').filter({ hasText: 'Exams are over' })).toContainText(/Finishes school|set up|needs teachers|no sections yet/); // where the class goes, and whether the next year is ready for it
  await admin.page.getByRole('row').filter({ hasText: 'Exams are over' }).getByRole('button', { name: 'Approve' }).click();
  await expect(admin.page.getByText(/Classes ready to move/)).toHaveCount(0);

  // now the class teacher reviews and moves the class
  await teacher.page.reload();
  await expect(teacher.page.getByText(/Approved by/).first()).toBeVisible();
  await teacher.page.getByRole('button', { name: 'Review the students' }).first().click();
  // whatever other specs left behind (a Class 9 without sections, say), the teacher can always mark the students as finished school
  const choices = teacher.page.getByLabel(/^What happens to /);
  await expect(choices.first()).toBeVisible(); // the review has loaded
  for (let i = 0, n = await choices.count(); i < n; i++) await choices.nth(i).selectOption({ label: 'Finished school' });
  await expect(teacher.page.getByRole('button', { name: 'Move the class on' })).toBeEnabled();
  const firstStudent = (await teacher.page.getByRole('row').nth(1).locator('b').first().innerText()).trim().split(/\s+/)[0];
  await teacher.page.getByRole('button', { name: 'Move the class on' }).click();
  await teacher.page.getByRole('dialog').getByRole('button', { name: /Move the class on|Confirm|Yes/ }).last().click();
  await expect(teacher.page.getByText(/^Done: /)).toBeVisible();

  // the office sees Class 8 partly moved (its other section is still waiting); Classes 6 and 7 are not touched, and the old year cannot be closed while they run
  await admin.page.goto('/admin/promotion');
  await admin.page.getByLabel('From academic year').selectOption({ label: '2026-2027 (current)' });
  await expect(admin.page.getByRole('row').filter({ hasText: 'Class 8' }).filter({ hasText: 'Promotion in progress' })).toBeVisible();
  await expect(admin.page.getByRole('row').filter({ hasText: 'Class 7' })).toContainText('Active');
  await expect(admin.page.getByRole('row').filter({ hasText: 'Class 7' })).toContainText(/6\s*0/); // waiting 6, moved 0
  await admin.page.getByLabel('To academic year').selectOption({ label: '2027-2028 B' });
  await admin.page.getByRole('checkbox', { name: /^Choose Class/ }).first().check();
  await admin.page.getByRole('button', { name: /^3\. Preview/ }).click();
  await expect(admin.page.getByText('Left as they are')).toBeVisible();
  // the next year has its sections and subjects but no teachers yet: the office is told, and has to confirm on purpose
  await expect(admin.page.getByText(/Is 2027-2028 B set up for the classes\?/)).toBeVisible();
  await expect(admin.page.getByText('The next year is not fully set up for these classes')).toBeVisible();
  await expect(admin.page.getByRole('button', { name: /^Promote \d+ students/ })).toBeDisabled();
  await admin.page.getByRole('checkbox', { name: /Promote anyway/ }).check();
  await expect(admin.page.getByRole('button', { name: /^Promote \d+ students/ })).toBeEnabled();
  await expect(admin.page.getByRole('checkbox', { name: /^Close / })).toBeDisabled();

  // the header offers both years while classes are in two; choosing one shows that year everywhere
  await admin.page.goto('/admin/classes');
  await admin.page.getByLabel('Show year').selectOption({ label: '2027-2028 B' });
  await expect(admin.page.getByText('No sections for this year')).toHaveCount(0); // the new year's sections are listed
  await admin.page.getByLabel('Show year').selectOption({ label: '2026-2027 (current)' });

  // in the new year the moved students are listed, and the office can put one back from their page
  await admin.page.goto('/admin/students');
  await admin.page.getByLabel('Show year').selectOption({ label: '2027-2028 B' });
  await admin.page.getByLabel('Status').selectOption({ label: 'Completed' }); // Class 8 is the top class in this demo school, so its students finish school
  await admin.page.getByLabel('Search students').fill(firstStudent);
  const movedRow = admin.page.getByRole('row').filter({ hasText: firstStudent }).first();
  await expect(movedRow).toBeVisible();
  await movedRow.click();
  await admin.page.getByRole('tab', { name: /Enrolment history/ }).click();
  await expect(admin.page.getByRole('button', { name: 'Put back' }).first()).toBeVisible();
  await admin.page.goto('/admin');
  await admin.page.getByLabel('Show year').selectOption({ label: '2026-2027 (current)' });

  expect(admin.problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
  expect(teacher.problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
  await admin.ctx.close(); await teacher.ctx.close();
});
