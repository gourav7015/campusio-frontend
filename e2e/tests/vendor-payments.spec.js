import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

const uid = Date.now().toString(36);
const signOut = async (page) => { await page.getByRole('button', { name: 'Profile menu' }).click(); await page.getByRole('menuitem', { name: /sign out/i }).click(); };
const inDays = (n) => new Date(Date.now() + n * 864e5).toISOString().slice(0, 10);

test('a vendor is paid in two parts from its account; paid and upcoming money show by day, month and year', async ({ page }) => {
  const problems = watch(page, ['/api/auth/me']);
  const vendor = `Part Payments Ltd ${uid}`;
  // a vendor and a bill with a due date, both approved by the School Admin first
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/vendors');
  await page.getByRole('button', { name: '+ Add vendor' }).click();
  await page.getByRole('dialog').getByLabel('Vendor name').fill(vendor);
  await page.getByRole('dialog').getByRole('button', { name: 'Save and send for approval' }).click();
  await expect(page.getByRole('row', { name: new RegExp(vendor) })).toContainText('Waiting');
  await signOut(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/approvals');
  await page.getByRole('row', { name: new RegExp(vendor) }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('row', { name: new RegExp(vendor) })).toContainText('Approved');
  await signOut(page);
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/expenses');
  await page.getByRole('button', { name: '+ Add expense' }).click();
  let dlg = page.getByRole('dialog');
  await dlg.getByLabel('Amount (₹)').fill('10000');
  await dlg.getByLabel('Pay by (due date)').fill(inDays(10));
  await dlg.getByLabel('Department').fill('Supplies');
  await dlg.getByLabel('What was it for?').fill(`Furniture ${uid}`);
  const opt = dlg.getByLabel('Paid to (approved vendor)').locator('option', { hasText: vendor });
  await dlg.getByLabel('Paid to (approved vendor)').selectOption(await opt.getAttribute('value'));
  await dlg.getByRole('button', { name: 'Save and add bills' }).click();
  await page.getByRole('button', { name: 'Close', exact: true }).last().click();
  await expect(page.getByRole('row', { name: new RegExp(`Furniture ${uid}`) })).toContainText('Waiting');
  await signOut(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/approvals');
  await page.getByRole('row', { name: new RegExp(`Furniture ${uid}`) }).getByRole('button', { name: 'Approve' }).click();
  await expect(page.getByRole('row', { name: new RegExp(`Furniture ${uid}`) })).toContainText('Approved');
  await signOut(page);

  // from the vendor's account: pay part of the bill
  await signIn(page, 'finance', 'finance@gps.test', 'Finance@12345');
  await page.goto('/finance/vendors');
  await page.getByRole('row', { name: new RegExp(vendor) }).getByRole('button', { name: 'Account and pay' }).click();
  dlg = page.getByRole('dialog', { name: new RegExp(`${vendor} · account`) });
  await expect(dlg.getByText('Still to pay').locator('..')).toContainText('₹10,000');
  await dlg.getByRole('row', { name: new RegExp(`Furniture ${uid}`) }).getByRole('button', { name: 'Pay', exact: true }).click();
  await dlg.getByLabel('Amount to pay').fill('11000');
  await expect(dlg.getByRole('button', { name: /Record/ })).toBeDisabled(); // more than is owed
  await dlg.getByLabel('Amount to pay').fill('4000');
  await dlg.getByLabel('Reference (UTR / cheque no.)').fill('UTR-PART-1');
  await dlg.getByRole('button', { name: 'Record part payment of ₹4,000' }).click();
  await expect(dlg.getByRole('row', { name: new RegExp(`Furniture ${uid}`) })).toContainText('₹6,000'); // what is still owed
  await expect(dlg.getByRole('row', { name: new RegExp(`Furniture ${uid}`) }).getByRole('button', { name: 'Pay more' })).toBeVisible();
  await dlg.getByRole('tab', { name: /^Paid/ }).click();
  await expect(dlg.getByRole('row', { name: /UTR-PART-1/ })).toContainText(/PV\d{9}/); // a voucher number for every payment
  await dlg.getByLabel('Period').selectOption('today');
  await expect(dlg.getByText('Paid in this period').locator('..')).toContainText('₹4,000');
  await page.keyboard.press('Escape');

  // the report: this vendor alone, by month, day and year
  await page.goto('/finance/vendors?sub=payments');
  await page.getByLabel('Vendor', { exact: true }).selectOption({ label: vendor });
  const stat = (label) => page.locator('.stat', { hasText: label });
  await expect(stat('Paid in this range')).toContainText('₹4,000');
  await expect(stat('Falls due in this range')).toContainText('₹6,000'); // the rest, due in ten days
  await expect(page.getByRole('row', { name: new RegExp(new Date().getFullYear().toString()) }).first()).toBeVisible();
  await page.getByRole('tab', { name: 'Daily' }).click();
  await expect(stat('Paid in this range')).toContainText('₹4,000');
  await page.getByRole('tab', { name: 'Yearly' }).click();
  await expect(stat('Paid in this range')).toContainText('₹4,000');

  // the payment vouchers: every payment, with its voucher, narrowed by filters
  await page.goto('/finance/spending-receipts');
  await page.getByLabel('Vendor', { exact: true }).selectOption({ label: vendor });
  const rrow = page.getByRole('row', { name: /UTR-PART-1/ });
  await expect(rrow).toContainText(/PV\d{9}/);
  await expect(rrow).toContainText('₹4,000');
  await page.getByLabel('Paid by', { exact: true }).selectOption('cash');
  await expect(page.getByText('No vouchers match')).toBeVisible();
  await page.getByLabel('Paid by', { exact: true }).selectOption('');
  await page.getByLabel('Search vouchers').fill('UTR-PART-1');
  await expect(rrow).toBeVisible();
  const [voucher] = await Promise.all([page.waitForEvent('download'), rrow.getByRole('button', { name: 'Voucher' }).click()]);
  expect(voucher.suggestedFilename()).toMatch(/^voucher-PV\d{9}\.pdf$/);

  // pay the rest from the account: nothing is left to pay
  await page.goto('/finance/vendors');
  await page.getByRole('row', { name: new RegExp(vendor) }).getByRole('button', { name: 'Account and pay' }).click();
  dlg = page.getByRole('dialog', { name: new RegExp(`${vendor} · account`) });
  await dlg.getByRole('row', { name: new RegExp(`Furniture ${uid}`) }).getByRole('button', { name: 'Pay more' }).click();
  await dlg.getByRole('button', { name: 'Record payment of ₹6,000' }).click();
  await expect(dlg.getByText('Nothing is waiting to be paid to this vendor')).toBeVisible();
  await page.keyboard.press('Escape');
  await signOut(page);

  // the School Admin can look at the same account and report, but cannot pay
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/fees?tab=vendors');
  await page.getByRole('row', { name: new RegExp(vendor) }).getByText(vendor).click();
  dlg = page.getByRole('dialog', { name: new RegExp(`${vendor} · account`) });
  await expect(dlg.getByText('Paid so far').locator('..')).toContainText('₹10,000');
  await expect(dlg.getByRole('button', { name: /^Pay/ })).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.goto('/admin/fees?tab=spending-receipts');
  await expect(page.getByRole('heading', { name: 'Payment vouchers' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Voucher' }).first()).toBeVisible();
  await page.goto('/admin/fees?tab=vendors&sub=payments');
  await expect(page.getByText('Paid in this range')).toBeVisible();
  expect(problems.filter((p) => !p.includes('dialog') && !/HTTP 40[13]/.test(p))).toEqual([]);
});
