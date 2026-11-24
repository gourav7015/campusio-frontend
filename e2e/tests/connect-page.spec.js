import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

test.describe.configure({ mode: 'serial' });

test('the platform administrator adds, hides, reorders and removes people on the public Connect page, and reads the messages sent from it', async ({ browser }) => {
  const mk = async () => { const ctx = await browser.newContext(); const page = await ctx.newPage(); return { ctx, page, problems: watch(page, ['/api/auth/me']) }; };
  const visitor = await mk(); const platform = await mk();
  const uid = Date.now().toString().slice(-6);

  // anyone can open the page without signing in
  await visitor.page.goto('/connect');
  await expect(visitor.page.getByRole('heading', { level: 1 })).toContainText('Talk to the people');
  await expect(visitor.page.getByRole('radio', { name: /Gourav Sharma/ })).toBeVisible();
  await expect(visitor.page.getByRole('article', { name: /Contact details for Gourav Sharma/ })).toBeVisible();

  // the platform administrator adds a person
  await signIn(platform.page, 'platform', 'superadmin@erp.local', 'Super@12345');
  await platform.page.getByRole('navigation').first().getByRole('link', { name: 'Connect page' }).click();
  await expect(platform.page.getByRole('heading', { name: 'Connect page', exact: true })).toBeVisible();
  await platform.page.getByRole('button', { name: '+ Add a person' }).click();
  const dlg = platform.page.getByRole('dialog');
  await dlg.getByLabel('Name', { exact: true }).fill(`Rohit Verma ${uid}`);
  await dlg.getByLabel('Role').fill('Demos and onboarding');
  await dlg.getByLabel('Good for').fill('Live demo, Importing data');
  await dlg.getByLabel('Mobile').fill('+91 98765 43210');
  await dlg.getByLabel('Email').fill(`rohit${uid}@atkaksha.com`);
  await dlg.getByRole('button', { name: 'Save' }).click();
  await expect(platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) })).toContainText('Shown');

  // the visitor sees them, with the details that were typed
  await visitor.page.reload();
  await visitor.page.getByRole('radio', { name: new RegExp(`Rohit Verma ${uid}`) }).click();
  const card = visitor.page.getByRole('article', { name: new RegExp(`Contact details for Rohit Verma ${uid}`) });
  await expect(card).toContainText('Demos and onboarding'); await expect(card).toContainText('Live demo'); await expect(card).toContainText(`rohit${uid}@atkaksha.com`);
  await expect(card.getByRole('link', { name: /^Call Rohit/ })).toHaveAttribute('href', 'tel:+919876543210');

  // hidden: gone from the page, still in the list
  await platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) }).getByRole('button', { name: 'Hide' }).click();
  await expect(platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) })).toContainText('Hidden');
  await visitor.page.reload();
  await expect(visitor.page.getByRole('radio', { name: new RegExp(`Rohit Verma ${uid}`) })).toHaveCount(0);
  await platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) }).getByRole('button', { name: 'Show' }).click();
  await expect(platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) })).toContainText('Shown');

  // order: moved up above the founder
  await platform.page.getByRole('button', { name: `Move Rohit Verma ${uid} up` }).click();
  await visitor.page.reload();
  await expect(visitor.page.getByRole('radio').first()).toContainText(`Rohit Verma ${uid}`);

  // a visitor sends a message: it is checked, then kept for the administrator
  await visitor.page.getByRole('tab', { name: 'Send a message' }).click();
  await visitor.page.getByRole('button', { name: 'Request a demo' }).click();
  await expect(visitor.page.getByText('Enter your name.')).toBeVisible();
  await visitor.page.getByLabel('Your name').fill('Anita Sharma');
  await visitor.page.getByLabel('Email', { exact: true }).fill('anita@school.edu.in');
  await visitor.page.getByLabel('School name').fill(`St Mary ${uid}`);
  await visitor.page.getByRole('button', { name: 'Request a demo' }).click();
  await expect(visitor.page.getByRole('heading', { name: 'Thank you, we have your message' })).toBeVisible();
  await expect(visitor.page.getByText(/AK-\d{5}/).first()).toBeVisible();

  await platform.page.getByRole('tab', { name: /^Messages/ }).click();
  const msg = platform.page.getByRole('row', { name: new RegExp(`St Mary ${uid}`) });
  await expect(msg).toContainText('New');
  await msg.getByRole('button', { name: 'Open' }).click();
  await platform.page.getByRole('dialog').getByRole('button', { name: 'Mark as handled' }).click();
  await expect(platform.page.getByRole('row', { name: new RegExp(`St Mary ${uid}`) })).toHaveCount(0); // handled ones leave the "New" list

  // wording and hours
  await platform.page.getByRole('tab', { name: 'Page settings' }).click();
  await platform.page.getByLabel('Headline').fill(`Say hello ${uid}`);
  await platform.page.getByRole('button', { name: 'Save page settings' }).click();
  await visitor.page.reload();
  await expect(visitor.page.getByRole('heading', { level: 1 })).toContainText(`Say hello ${uid}`);

  // removed
  await platform.page.getByRole('tab', { name: 'Team' }).click();
  await platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) }).getByRole('button', { name: 'Remove' }).click();
  await platform.page.getByRole('button', { name: 'Confirm' }).click();
  await expect(platform.page.getByRole('row', { name: new RegExp(`Rohit Verma ${uid}`) })).toHaveCount(0);
  await visitor.page.reload();
  await expect(visitor.page.getByRole('radio', { name: new RegExp(`Rohit Verma ${uid}`) })).toHaveCount(0);
  expect(visitor.problems.filter((p) => !/HTTP 4\d\d/.test(p))).toEqual([]);
  await visitor.ctx.close(); await platform.ctx.close();
});
