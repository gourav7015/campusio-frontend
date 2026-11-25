import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('a new examination can be made for one class, several, or all classes at once', async ({ page }) => {
  const problems = watch(page);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.goto('/admin/exams?tab=list');
  await page.getByRole('button', { name: '+ New examination' }).click();
  const dlg = page.getByRole('dialog');
  await dlg.getByLabel('Name').fill('School-wide Test');
  const save = dlg.getByRole('button', { name: 'Save' });
  await expect(save).toBeDisabled();                      // no class chosen yet
  await expect(dlg.getByText('None chosen yet')).toBeVisible();
  await dlg.getByRole('button', { name: 'All classes' }).click();
  await expect(dlg.getByText(/^All \d+ chosen$/)).toBeVisible();
  const total = Number((await dlg.getByText(/^All \d+ chosen$/).innerText()).match(/\d+/)[0]);
  expect(total).toBeGreaterThan(1);
  await dlg.getByRole('button', { name: 'Clear' }).click();
  await dlg.getByRole('checkbox').nth(0).check();
  await dlg.getByRole('checkbox').nth(1).check();
  await expect(dlg.getByText(`2 of ${total} chosen`)).toBeVisible();
  await dlg.getByRole('button', { name: 'All classes' }).click();
  const [req] = await Promise.all([page.waitForRequest((r) => r.url().endsWith('/api/school/exams') && r.method() === 'POST'), save.click()]);
  expect(req.postDataJSON().classIds).toHaveLength(total);
  await expect(page).toHaveURL(/\/admin\/exams\/[a-f0-9]{24}/);
  expect(problems.filter((p) => !/HTTP 40/.test(p))).toEqual([]);
});
