import { test, expect } from '@playwright/test';
import { signIn, watch, SHOTS } from './helpers.js';
import { ADMIN, FINANCE, STAFFP, TRANSPORT, LIBRARY, TEACHER, STUDENT, PLATFORM } from './pages.js';

/**
 * A slow server must never read as "nothing here".
 * Every page of every portal is opened while each data request takes 1.6 s. Part-way through (0.9 s) no page may show
 * an empty-state message ("Nothing here yet", "No timetable yet" ...): it must still be drawing its loading shapes.
 */
const PORTALS = [
  ['platform', 'superadmin@erp.local', 'Super@12345', PLATFORM],
  ['admin', 'admin@gps.test', 'Admin@12345', ADMIN],
  ['finance', 'finance@gps.test', 'Finance@12345', FINANCE],
  ['transport', 'transport@gps.test', 'Transport@12345', TRANSPORT],
  ['staff', 'gps.s0001', 'Staff@12345', STAFFP],
  ['library', 'library@gps.test', 'Library@12345', LIBRARY],
  ['teacher', 'sharma@gps.test', 'Teach@12345', TEACHER],
  ['student', 'gps.adm20260001', 'Student@12345', STUDENT],
];
// Messages that are the page's own words, not an answer to a question (none yet)
const ALLOWED = ['Choose a conversation']; // the chat page's own prompt before one is picked

for (const [portal, id, pw, pages] of PORTALS) {
  test(`${portal}: no page says "nothing here" while its data is still on the way`, async ({ page }) => {
    test.setTimeout(10 * 60_000);
    watch(page);
    await signIn(page, portal, id, pw);
    await page.route('**/api/**', async (route) => {
      const r = route.request();
      if (r.method() === 'GET' && !/\/api\/(auth|me)\b/.test(r.url())) await new Promise((res) => setTimeout(res, 1600));
      await route.continue();
    });
    const bad = [];
    for (const path of [...new Set(pages)]) {
      await page.goto(path, { waitUntil: 'domcontentloaded' });
      await page.waitForTimeout(900);
      const empties = await page.locator('main [data-empty], main .empty').evaluateAll((els) => els.filter((e) => e.offsetParent !== null).map((e) => e.textContent.trim().slice(0, 90)));
      empties.filter((t) => !ALLOWED.some((a) => t.includes(a))).forEach((t) => bad.push(`${path}: "${t}"`));
      const loading = await page.getByRole('status', { name: 'Loading' }).count();
      if (process.env.SKELETON_SHOTS && loading) await page.screenshot({ path: `${SHOTS}/skeleton-${portal}-${path.replace(/\W+/g, '_')}.png` });
    }
    expect(bad, `Pages that showed an empty message while still loading:\n${bad.join('\n')}`).toEqual([]);
  });
}
