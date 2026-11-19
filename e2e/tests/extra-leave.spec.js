import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('the admin gives one teacher extra leave; the teacher sees it in the balance and in a list', async ({ browser }) => {
  const uid = Date.now().toString().slice(-6);
  const a = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const ap = await a.newPage(); const problems = watch(ap);
  await signIn(ap, 'admin', 'admin@gps.test', 'Admin@12345');
  await ap.goto('/admin/leave?tab=balances');
  await expect(ap.getByText('Everyone gets the same yearly allowance')).toBeVisible();
  const row = ap.getByRole('row', { name: /Priya Rao/ });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: 'Give extra leave' }).click();
  const dlg = ap.getByRole('dialog', { name: /Give extra leave/ });
  await dlg.getByLabel('Leave type').selectOption('casual');
  await dlg.getByLabel('Days').fill('2');
  await dlg.getByLabel(/Reason/).fill(`Worked on Annual Day ${uid}`);
  await dlg.getByRole('button', { name: 'Add to balance' }).click();
  await expect(ap.getByRole('row', { name: /Priya Rao/ })).toContainText('+2 extra');

  // history, with the option to take it back
  await ap.getByRole('row', { name: /Priya Rao/ }).getByRole('button', { name: 'History' }).click();
  await expect(ap.getByRole('dialog').getByText(`Worked on Annual Day ${uid}`)).toBeVisible();
  await ap.getByRole('dialog').locator('button.btn', { hasText: 'Close' }).click();

  // the teacher sees 14 and the reason
  const t = await browser.newContext({ viewport: { width: 1360, height: 900 } }); const tp = await t.newPage(); watch(tp);
  await signIn(tp, 'teacher', 'rao@gps.test', 'Teach@12345');
  await tp.goto('/teacher/leave');
  await expect(tp.getByText('(2 extra from the school)').first()).toBeVisible();
  await expect(tp.getByText(`Worked on Annual Day ${uid}`)).toBeVisible();
  expect(problems, problems.join('\n')).toEqual([]);

  // tidy up: withdraw it so a re-run starts clean
  await ap.getByRole('row', { name: /Priya Rao/ }).getByRole('button', { name: 'History' }).click();
  await ap.getByRole('dialog').getByRole('row', { name: new RegExp(uid) }).getByRole('button', { name: 'Withdraw' }).click();
  await ap.getByRole('button', { name: 'Confirm' }).click();
  await expect(ap.getByRole('dialog').getByText(`Worked on Annual Day ${uid}`)).toHaveCount(0);
});
