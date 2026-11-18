import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

/** Online fee payment with the built-in test gateway: no Razorpay account is needed to try every step. */
test.describe('online fee payment (test gateway)', () => {
  test('a student pays one due; the receipt appears and finance sees it', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const page = await ctx.newPage(); const problems = watch(page);
    await signIn(page, 'student', 'gps.adm20260003', 'Student@12345');
    await page.goto('/student/fees');
    await expect(page.getByRole('heading', { name: 'Fee information' })).toBeVisible();
    await expect(page.getByText('is outstanding')).toBeVisible();
    await page.getByRole('button', { name: 'Pay online' }).click();
    const dialog = page.getByRole('dialog', { name: 'Pay fees online' });
    await expect(dialog.getByText('Test mode.')).toBeVisible();
    // pay only the first due
    const boxes = dialog.getByRole('checkbox');
    const n = await boxes.count();
    for (let i = 1; i < n; i++) await boxes.nth(i).uncheck();
    await dialog.getByRole('button', { name: /^Pay ₹/ }).click();
    await expect(dialog.getByLabel('Test payment window')).toBeVisible();

    // a declined payment first: nothing is paid and the person can try again
    await dialog.getByRole('button', { name: /Payment fails/ }).click();
    await expect(dialog.getByRole('alert')).toContainText('did not go through');
    await dialog.getByRole('button', { name: 'Try again' }).click();
    await dialog.getByRole('button', { name: /^Pay ₹/ }).click();
    await dialog.getByRole('button', { name: 'Pay successfully' }).click();
    await expect(dialog.getByText('Payment received.')).toBeVisible();
    await expect(dialog.getByText(/Your receipt number is/)).toBeVisible();
    await dialog.getByRole('button', { name: 'Done' }).click();
    await expect(page.getByRole('cell', { name: /^RCPT/ }).first()).toBeVisible();

    // the second route: the browser closes and only the bank's own message arrives
    await page.getByRole('button', { name: 'Pay online' }).click();
    const d2 = page.getByRole('dialog', { name: 'Pay fees online' });
    const b2 = d2.getByRole('checkbox');
    const m = await b2.count();
    for (let i = 1; i < m; i++) await b2.nth(i).uncheck();
    await d2.getByRole('button', { name: /^Pay ₹/ }).click();
    await d2.getByRole('button', { name: /browser closes/ }).click();
    await expect(d2.getByText('Payment received.')).toBeVisible({ timeout: 15000 });
    await d2.getByRole('button', { name: 'Done' }).click();

    const f = await browser.newContext({ viewport: { width: 1360, height: 900 } });
    const fp = await f.newPage(); const fproblems = watch(fp);
    await signIn(fp, 'finance', 'finance@gps.test', 'Finance@12345');
    await fp.goto('/finance/online');
    await expect(fp.getByRole('heading', { name: 'Online payments' })).toBeVisible();
    await expect(fp.getByRole('table').getByText('Paid', { exact: true }).first()).toBeVisible();
    await expect(fp.getByRole('table').getByText('Failed', { exact: true }).first()).toBeVisible();
    for (const x of [{ problems }, { problems: fproblems }]) expect(x.problems.filter((p) => !/HTTP 40[0-9] POST .*fees\/pay\/verify/.test(p)), x.problems.join('\n')).toEqual([]);
    await ctx.close(); await f.close();
  });
});
