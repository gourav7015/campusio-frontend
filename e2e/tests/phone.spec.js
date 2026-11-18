import { test, expect } from '@playwright/test';
import { signIn } from './helpers.js';
import { ADMIN, FINANCE, STAFFP, TRANSPORT, LIBRARY, TEACHER, STUDENT } from './pages.js';

// A phone is 390 px wide. No page may need sideways scrolling (a wide table scrolls inside its own box).
const LOGINS = [
  ['admin', 'admin@gps.test', 'Admin@12345', ADMIN], ['teacher', 'sharma@gps.test', 'Teach@12345', TEACHER], ['student', 'gps.adm20260001', 'Student@12345', STUDENT],
  ['finance', 'finance@gps.test', 'Finance@12345', FINANCE], ['library', 'library@gps.test', 'Library@12345', LIBRARY], ['transport', 'transport@gps.test', 'Transport@12345', TRANSPORT], ['staff', 'gps.s0001', 'Staff@12345', STAFFP],
];

test.use({ viewport: { width: 390, height: 800 } });
for (const [portal, id, pw, pages] of LOGINS) {
  test(`${portal}: no page overflows a 390 px phone`, async ({ page }) => {
    await signIn(page, portal, id, pw);
    const wide = [];
    for (const p of pages) {
      await page.goto(p);
      await page.waitForLoadState('networkidle');
      const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      if (over > 1) wide.push(`${p} (+${over}px)`);
    }
    expect(wide, wide.join('\n')).toEqual([]);
  });
}
