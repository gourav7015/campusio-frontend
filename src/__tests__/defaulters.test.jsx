import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { FinanceReports } from '../pages/finance/Finance.jsx';
import { ToastProvider } from '../components/ui.jsx';

const stu = (i, over = {}) => ({ studentId: `s${i}`, name: `Student ${i}`, className: 'Class 8', section: 'A', guardian: 'Parent', guardianPhone: '98', overdue: 1000 * i, pending: 2000 * i, daysOverdue: 10 * i, nextDue: '2026-12-10', ...over });
let calls;
beforeEach(() => {
  calls = [];
  globalThis.fetch = vi.fn(async (url) => {
    const u = String(url); calls.push(u);
    let body = { items: [], total: 0 };
    if (u.includes('/lookups')) body = { classes: [{ _id: 'c8', name: 'Class 8' }, { _id: 'c9', name: 'Class 9' }], sections: [] };
    else if (u.includes('/reports/defaulters-by-class')) body = { items: [
      { classId: 'c8', className: 'Class 8', studentsBilled: 60, defaulters: 3, percentDefaulting: 5, overdueAmount: 6000, sections: [{ sectionId: 'a', name: 'A', defaulters: 3 }] },
      { classId: 'c9', className: 'Class 9', studentsBilled: 40, defaulters: 0, percentDefaulting: 0, overdueAmount: 0, sections: [] }], totals: { classes: 2, studentsBilled: 100, defaulters: 3, overdueAmount: 6000 } };
    else if (u.includes('/students')) body = u.includes('classId=c8') ? { items: [stu(1), stu(2), stu(3)], total: 3 } : { items: [stu(1), stu(2)], total: 120 };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body, text: async () => JSON.stringify(body) };
  });
});
const mount = (readOnly) => render(<MemoryRouter><ToastProvider><FinanceReports readOnly={readOnly} /></ToastProvider></MemoryRouter>);
const openTab = async () => { fireEvent.click(await screen.findByRole('tab', { name: 'Defaulters' }).catch(() => screen.getByText('Defaulters'))); };

describe('Defaulters', () => {
  it('lists every defaulter with paging (no silent cap of 200) and a class filter', async () => {
    mount(false); await openTab();
    expect(await screen.findByText('Student 1')).toBeInTheDocument();
    expect(await screen.findByText(/1–50 of 120/)).toBeInTheDocument(); // the real total, not "200"
    expect(calls.some((u) => u.includes('/students') && u.includes('limit=50') && u.includes('page=1'))).toBe(true);
    fireEvent.change(screen.getByLabelText('Class'), { target: { value: 'c9' } });
    await waitFor(() => expect(calls.some((u) => u.includes('classId=c9'))).toBe(true));
  });

  it('groups by class, keeps classes with no defaulters, and opens a class to show its students', async () => {
    mount(false); await openTab();
    fireEvent.click(await screen.findByText('Group by class'));
    expect(await screen.findByText('Class 9')).toBeInTheDocument(); // zero defaulters, still listed
    expect(screen.getByText(/3 defaulter\(s\) of 100 billed students/)).toBeInTheDocument();
    fireEvent.click(screen.getByText('Class 8'));
    expect(await screen.findByText(/Defaulters in Class 8/)).toBeInTheDocument();
    expect(await screen.findByText('Student 3')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Export by class' })).toBeInTheDocument();
  });

  it('the School Admin\'s read-only copy has no reminders button', async () => {
    mount(true); await openTab();
    await screen.findByText('Student 1');
    expect(screen.queryByRole('button', { name: 'Send reminders to all' })).toBeNull();
    expect(screen.getByRole('button', { name: 'Export CSV' })).toBeInTheDocument();
    expect(calls.every((u) => u.startsWith('/api/school/finance') || !u.includes('/api/'))).toBe(true);
  });
});
