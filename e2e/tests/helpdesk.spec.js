import { test, expect } from '@playwright/test';
import { signIn, watch } from './helpers.js';

const SHOTS = process.env.SHOTS_DIR || './shots';

/** A fresh browser session for each person, so sign-ins never leak into each other. */
async function as(browser, portal, loginId, password) {
  const ctx = await browser.newContext({ viewport: { width: 1360, height: 900 } });
  const page = await ctx.newPage();
  const problems = watch(page);
  await signIn(page, portal, loginId, password);
  return { ctx, page, problems };
}
const platform = (browser) => as(browser, 'platform', 'superadmin@erp.local', 'Super@12345');
const done = async (...people) => { for (const x of people) { expect(x.problems, x.problems.join('\n')).toEqual([]); await x.ctx.close(); } };

/** Everyone who signs in to a school writes to AtKaksha support; only the platform administrators answer. */
test.describe('help desk', () => {
  test('a student writes to AtKaksha support, the platform administrator answers, the student sees the reply', async ({ browser }) => {
    const s = await as(browser, 'student', 'gps.adm20260001', 'Student@12345');
    await s.page.goto('/student/helpdesk');
    await expect(s.page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await expect(s.page.getByText('Write to the AtKaksha support team')).toBeVisible();
    await s.page.getByRole('button', { name: '+ New ticket' }).click();
    await s.page.getByLabel('Subject').fill('Cannot open my timetable');
    await s.page.getByLabel('What happened?').fill('The timetable page stays empty on my phone.');
    await s.page.getByRole('button', { name: 'Send' }).click();
    await expect(s.page.getByText(/GPS-\d+ · Cannot open my timetable/)).toBeVisible();
    await expect(s.page.getByText('Waiting for us').first()).toBeVisible();
    await s.page.screenshot({ path: `${SHOTS}/helpdesk-student-ticket.png`, fullPage: true });

    // the school admin has no inbox for it: the school office is not involved
    const a = await as(browser, 'admin', 'admin@gps.test', 'Admin@12345');
    await a.page.goto('/admin/tickets');
    await expect(a.page.getByText(/not found|404/i).first()).toBeVisible();
    await a.page.goto('/admin/helpdesk');
    await expect(a.page.getByText('Cannot open my timetable')).toHaveCount(0);

    const p = await platform(browser);
    await p.page.goto('/platform/helpdesk');
    await expect(p.page.getByRole('navigation', { name: 'Main' }).getByLabel(/\d+ waiting/).first()).toBeVisible();
    await p.page.getByText('Cannot open my timetable').click();
    await expect(p.page.getByText(/Raised by Aarav Sharma \(Student\)/)).toBeVisible();
    await p.page.getByPlaceholder('Write your reply…').fill('Please refresh and tell us which phone you use.');
    await p.page.getByRole('button', { name: 'Send reply' }).click();
    await expect(p.page.getByText('Please refresh and tell us which phone you use.')).toBeVisible();
    await p.page.getByLabel('Private note').check();
    await p.page.getByPlaceholder('A private note for your team…').fill('Probably the old app version.');
    await p.page.getByRole('button', { name: 'Add note' }).click();
    await expect(p.page.getByText('Private note (the requester cannot see this)')).toBeVisible();
    await p.page.screenshot({ path: `${SHOTS}/helpdesk-platform-inbox-thread.png`, fullPage: true });

    await s.page.reload();
    await s.page.getByText('Cannot open my timetable').click();
    await expect(s.page.getByText('Please refresh and tell us which phone you use.')).toBeVisible();
    await expect(s.page.getByText('Probably the old app version.')).toHaveCount(0); // the private note never reaches the student
    await expect(s.page.getByText('Waiting for you').first()).toBeVisible();
    await s.page.getByPlaceholder('Write your reply…').fill('It is an old Android phone.');
    await s.page.getByRole('button', { name: 'Send reply' }).click();
    await expect(s.page.getByText('It is an old Android phone.')).toBeVisible();
    await done(s, a, p);
  });

  test('a school admin writes to AtKaksha support and the platform administrator answers', async ({ browser }) => {
    const a = await as(browser, 'admin', 'admin@gps.test', 'Admin@12345');
    await a.page.goto('/admin/helpdesk');
    await expect(a.page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await a.page.getByRole('button', { name: '+ New ticket' }).click();
    await a.page.getByLabel('Subject').fill('Question about our invoice');
    await a.page.getByLabel('About').selectOption('billing');
    await a.page.getByLabel('What happened?').fill('Please resend the March invoice.');
    await a.page.getByRole('button', { name: 'Send' }).click();
    await expect(a.page.getByText(/GPS-\d+ · Question about our invoice/i)).toBeVisible();

    const p = await platform(browser);
    await p.page.goto('/platform/helpdesk');
    await expect(p.page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await p.page.getByText('Question about our invoice').click();
    await expect(p.page.getByText(/Raised by/)).toBeVisible();
    await p.page.getByRole('button', { name: 'Assign to me' }).click();
    await p.page.getByPlaceholder('Write your reply…').fill('Done. The invoice has been resent.');
    await p.page.getByRole('button', { name: 'Send reply' }).click();
    await expect(p.page.getByText('Done. The invoice has been resent.')).toBeVisible();
    await p.page.getByRole('button', { name: 'Mark resolved' }).click();
    await expect(p.page.getByText('Resolved').first()).toBeVisible();

    await a.page.reload();
    await a.page.getByText('Question about our invoice').click();
    await expect(a.page.getByText('Done. The invoice has been resent.')).toBeVisible();
    await done(a, p);
  });

  test('every portal that can raise a ticket has the page, and a teacher and a staff member can use it', async ({ browser }) => {
    const t = await as(browser, 'teacher', 'sharma@gps.test', 'Teach@12345');
    await t.page.goto('/teacher/helpdesk');
    await expect(t.page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await t.page.getByRole('button', { name: '+ New ticket' }).click();
    await t.page.getByLabel('Subject').fill('Projector broken in 8-A');
    await t.page.getByLabel('What happened?').fill('Please send maintenance.');
    await t.page.getByRole('button', { name: 'Send' }).click();
    await expect(t.page.getByText(/GPS-\d+ · Projector broken in 8-A/)).toBeVisible();
    await t.page.getByRole('button', { name: 'Close ticket' }).click();
    await t.page.getByRole('button', { name: /^(Close ticket|Confirm|OK|Yes)/ }).last().click();
    await expect(t.page.getByText('Closed').first()).toBeVisible();
    const st = await as(browser, 'staff', 'gps.s0001', 'Staff@12345');
    await st.page.goto('/staff/helpdesk');
    await expect(st.page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await done(t, st);
  });

  test('a ticket can carry a screenshot, shows a count in the menu, and opens straight from a link', async ({ browser }) => {
    const s = await as(browser, 'student', 'gps.adm20260002', 'Student@12345');
    await s.page.goto('/student/helpdesk');
    await s.page.getByRole('button', { name: '+ New ticket' }).click();
    await s.page.getByLabel('Subject').fill('Broken picture on my profile');
    await s.page.getByLabel('What happened?').fill('See the screenshot please.');
    await s.page.getByLabel('Attach files').setInputFiles({ name: 'shot.png', mimeType: 'image/png', buffer: Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 1, 2, 3]) });
    await expect(s.page.getByText('shot.png')).toBeVisible();
    await s.page.getByRole('button', { name: 'Send' }).click();
    await expect(s.page.getByText(/GPS-\d+ · Broken picture on my profile/)).toBeVisible();
    await expect(s.page.getByRole('button', { name: 'Open shot.png' })).toBeVisible();

    const p = await platform(browser);
    await p.page.goto('/platform');
    await expect(p.page.getByRole('navigation', { name: 'Main' }).getByLabel(/\d+ waiting/).first()).toBeVisible(); // the menu shows that a ticket is waiting
    await p.page.goto('/platform/helpdesk');
    await p.page.getByText('Broken picture on my profile').click();
    const [popup] = await Promise.all([p.ctx.waitForEvent('page'), p.page.getByRole('button', { name: 'Open shot.png' }).click()]);
    await expect(popup).toHaveURL(/\/api\/files\/download\//);
    await popup.close();
    await p.page.getByPlaceholder('Write your reply…').fill('Thanks, we will fix it.');
    await p.page.getByRole('button', { name: 'Send reply' }).click();
    await expect(p.page.getByText('Thanks, we will fix it.')).toBeVisible();

    // the student now has a count, and a notification opens the ticket itself
    await s.page.goto('/student');
    await expect(s.page.getByRole('navigation', { name: 'Areas' }).getByLabel(/\d+ waiting/).first()).toBeVisible(); // the area that holds the Help desk shows the count
    await s.page.getByRole('button', { name: /Notifications/ }).click();
    await s.page.getByText(/Reply on your ticket/).first().click();
    await expect(s.page).toHaveURL(/helpdesk\?open=/);
    await expect(s.page.locator('#main-content').getByText('Thanks, we will fix it.')).toBeVisible();
    await done(s, p);
  });

  test('the finance desk has a help desk too', async ({ browser }) => {
    const f = await as(browser, 'finance', 'finance@gps.test', 'Finance@12345');
    await f.page.goto('/finance/helpdesk');
    await expect(f.page.getByRole('heading', { name: 'Help desk' })).toBeVisible();
    await f.page.getByRole('button', { name: '+ New ticket' }).click();
    await f.page.getByLabel('Subject').fill('Receipt printer is offline');
    await f.page.getByLabel('What happened?').fill('The printer at the fee counter shows offline.');
    await f.page.getByRole('button', { name: 'Send' }).click();
    await expect(f.page.getByText(/GPS-\d+ · Receipt printer is offline/)).toBeVisible();
    await done(f);
  });
});
