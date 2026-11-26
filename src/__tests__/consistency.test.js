import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PORTALS } from '../shell/portals';

/**
 * The app speaks one language: every word and every icon has one meaning (see "Words and icons" in DESIGN.md).
 * These checks fail when a screen drifts, so the rule is kept by the build and not by memory.
 */
const SRC = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const files = [];
(function walk(d) {
  for (const f of fs.readdirSync(d, { withFileTypes: true })) {
    if (f.name === '__tests__' || f.name === 'node_modules') continue;
    const p = path.join(d, f.name);
    if (f.isDirectory()) walk(p); else if (/\.(jsx?|tsx?)$/.test(f.name)) files.push(p);
  }
}(SRC));
const rel = (p) => path.relative(SRC, p);
const text = (p) => fs.readFileSync(p, 'utf8');

describe('wording', () => {
  it('says "and", never "&", in anything a person reads', () => {
    const hits = [];
    for (const f of files) text(f).split('\n').forEach((line, i) => { if (/[A-Za-z)'"] & [A-Za-z(]/.test(line) && !/&&/.test(line)) hits.push(`${rel(f)}:${i + 1}: ${line.trim().slice(0, 100)}`); });
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('keeps one word for one thing: receipts are money received, vouchers are money paid out', () => {
    const banned = [/Receipts of spending/, /Spending receipts/, /Search receipts/, /School licences/, /Issue and Return/, /Loans and Overdue/, /Back in use/];
    const hits = [];
    for (const f of files) { const t = text(f); for (const b of banned) if (b.test(t)) hits.push(`${rel(f)}: ${b}`); }
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('uses the app\'s own dialogs and toasts, never the browser\'s alert box', () => {
    const hits = [];
    for (const f of files) text(f).split('\n').forEach((line, i) => { if (/(^|[^.\w])alert\(/.test(line) && !/^\s*(\/\/|\*)/.test(line)) hits.push(`${rel(f)}:${i + 1}`); });
    expect(hits, hits.join('\n')).toEqual([]);
  });

  it('the Library says Delete for a book, never Archive (archiving is for things that can be brought back)', () => {
    const hits = files.filter((f) => /pages[\\/]library[\\/]/.test(f) && /archiv/i.test(text(f))).map(rel);
    expect(hits).toEqual([]);
  });
});

describe('menus', () => {
  const items = Object.values(PORTALS).flatMap((p) => p.groups.flatMap((g) => g.items.map((i) => ({ portal: p.key, label: i.label, icon: i.icon.displayName || String(i.icon.render?.name || i.icon) }))));

  it('labels are in sentence case', () => {
    const bad = items.filter((i) => i.label.split(/\s+/).slice(1).some((w) => /^[A-Z][a-z]/.test(w) && !/^(Admin)$/.test(w)));
    expect(bad.map((b) => `${b.portal}: ${b.label}`)).toEqual([]);
  });

  it('every portal calls the same page by the same name', () => {
    for (const label of ['School calendar', 'Help desk', 'School information']) {
      const icons = new Set(items.filter((i) => i.label === label).map((i) => i.icon));
      expect(icons.size, `${label} must have one icon everywhere`).toBe(1);
    }
    expect(items.filter((i) => /^(About the school|School licences)$/.test(i.label))).toEqual([]);
  });

  /** An icon is shared only by labels that mean the same thing. Adding a label to an icon that already means something else fails here: pick another icon, or list the new label with its family. */
  const FAMILIES = {
    'Reports': ['Reports', 'Reports and exports'], 'Books': ['Catalogue', 'Library', 'Library (view)'], 'Subjects': ['My subjects', 'Subjects and teachers'], 'Bus': ['Buses and riders', 'Transport (view)'],
    'Timetable': ['My timetable', 'Timetable'], 'Exams': ['Examinations', 'Examinations and marks'], 'House': ['Houses', 'My house'], 'Students': ['Students', 'Students and dues'],
    'Queries': ['Queries to the office', "Teachers' queries"], 'Fees': ['Fee information', 'Fees (view)'], 'Classes': ['By class', 'Classes and sections', 'My classes'],
    'Messages to a teacher': ['Message a teacher', 'Parent messages'], 'Remarks': ['Remarks', 'Teacher remarks'], 'Leave': ['Leave', 'Staff leave'], 'Rules': ['Fee policy', 'Library rules'],
    'Settings': ['School settings', 'Settings'], 'Performance': ['My performance', 'Student performance'], 'Attendance': ['Attendance', 'My attendance', 'Staff attendance'],
    'Staff': ['Drivers and staff', 'Employees'], 'Pay': ['Payroll (view)', 'Payroll and salaries', 'Salary and payslips'],
  };
  it('one icon, one meaning', () => {
    const byIcon = new Map();
    for (const i of items) byIcon.set(i.icon, [...(byIcon.get(i.icon) || new Set()), i.label].reduce((s, l) => s.add(l), new Set()));
    const families = Object.values(FAMILIES).map((f) => new Set(f));
    const bad = [];
    for (const [icon, labels] of byIcon) {
      const ls = [...labels].filter((l) => !['Dashboard', 'Overview'].includes(l));
      if (ls.length < 2) continue;
      if (!families.some((f) => ls.every((l) => f.has(l)))) bad.push(`${icon}: ${ls.join(' | ')}`);
    }
    expect(bad, bad.join('\n')).toEqual([]);
  });
});
