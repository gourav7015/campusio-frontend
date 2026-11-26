import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test('subjects are listed once for the school, given to classes from a dropdown, teachers are assigned by hand, and gaps show on the dashboard', async ({ page }) => {
  const problems = watch(page);
  const uid = Date.now().toString().slice(-5);
  await signIn(page, 'admin', 'admin@gps.test', 'Admin@12345');
  await page.getByRole('navigation', { name: 'Areas' }).getByRole('link', { name: /^Academics/ }).click();
  await page.getByRole('navigation', { name: 'Main' }).getByRole('link', { name: 'Subjects and teachers' }).click();
  await expect(page.getByRole('heading', { name: 'Subjects and teachers by class' })).toBeVisible();

  // the school's list of subjects: add one, then give it to a class
  const subject = `Robotics ${uid}`;
  await page.getByRole('tab', { name: 'Subjects' }).click();
  await page.getByLabel('New subject name').fill(subject);
  await page.getByRole('button', { name: 'Add subject' }).click();
  const listed = page.getByRole('row').filter({ hasText: subject });
  await expect(listed).toContainText('No class yet');
  await listed.getByRole('button', { name: 'Add to classes' }).click();
  await page.getByRole('dialog').getByRole('group', { name: 'Classes' }).getByRole('button').first().click();
  await page.getByRole('dialog').getByRole('button', { name: /^Add to 1 class/ }).click();
  await expect(page.getByRole('row').filter({ hasText: subject })).not.toContainText('No class yet');

  // by class: it has no teacher yet, and the class is marked
  await page.getByRole('tab', { name: 'By class' }).click();
  await expect(page.getByText(/subjects have no teacher/)).toBeVisible();

  // the filters: show only what is missing (the class opens by itself), narrow by search, clear
  const listed1 = () => page.getByRole('listitem').filter({ hasText: subject });
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption({ label: 'Subject with no teacher' });
  await expect(listed1().first()).toBeVisible();
  await expect(listed1().first().getByText('Choose teacher')).toBeVisible();
  await page.getByRole('combobox', { name: 'Show', exact: true }).selectOption({ label: 'Class with no subjects' });
  await expect(listed1()).toHaveCount(0); // the class has a subject now, so it no longer matches
  await page.getByRole('button', { name: 'Clear' }).click();
  await page.getByLabel('Search subjects and teachers').fill(subject);
  await expect(listed1().first()).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: /^1 of \d+ classes$/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();

  // the office sees it on the dashboard
  await page.goto('/admin');
  await expect(page.getByText('Subjects with no teacher in a section')).toBeVisible();

  // a teacher is assigned by hand, from the picker
  await page.goto('/admin/class-structure');
  await page.getByLabel('Search subjects and teachers').fill(subject);
  await page.getByRole('listitem').filter({ hasText: subject }).getByRole('button', { name: /^Assign teacher of/ }).first().click();
  await page.getByRole('dialog').getByRole('listitem').first().getByRole('button').click();
  await expect(page.getByRole('listitem').filter({ hasText: subject }).getByRole('button', { name: /^Change teacher of/ })).toBeVisible();
  await page.getByRole('button', { name: 'Clear' }).click();

  // in a class, a subject is chosen from a dropdown, never typed; one nobody teaches can be removed
  const spare = `Chess ${uid}`;
  await page.getByRole('tab', { name: 'Subjects' }).click();
  await page.getByLabel('New subject name').fill(spare);
  await page.getByRole('button', { name: 'Add subject' }).click();
  await expect(page.getByRole('row').filter({ hasText: spare })).toBeVisible();
  await page.getByRole('tab', { name: 'By class' }).click();
  await page.locator('section > button[aria-expanded="false"]').first().click(); // open the first class
  await page.getByRole('button', { name: 'Add subject', exact: true }).first().click();
  await page.getByRole('dialog').getByLabel('Subject').selectOption({ label: spare });
  await page.getByRole('dialog').getByRole('button', { name: /Save|Add/ }).click();
  const spareRow = page.getByRole('listitem').filter({ hasText: spare });
  await expect(spareRow).toBeVisible();
  await spareRow.getByRole('button', { name: `More for ${spare}` }).click();
  await page.getByRole('menuitem', { name: 'Remove subject' }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Remove|Confirm|Yes/ }).last().click();
  await expect(page.getByRole('listitem').filter({ hasText: spare })).toHaveCount(0);
  expect(problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
});
