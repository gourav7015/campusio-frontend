import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DayGrid, YourPeriods, ModeNotice, PeriodRegisterModal } from '../components/PeriodAttendance.jsx';
import { ToastProvider } from '../components/ui.jsx';
import { Q } from './helpers/Q.jsx';

let calls;
function mockApi(routes) {
  calls = [];
  globalThis.fetch = vi.fn(async (url, init = {}) => {
    const u = String(url); calls.push({ url: u, method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : undefined });
    const hit = Object.entries(routes).find(([k]) => u.includes(k));
    const body = hit ? hit[1] : { ok: true };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body, text: async () => JSON.stringify(body) };
  });
}
const mount = (ui) => render(<Q><MemoryRouter><ToastProvider>{ui}</ToastProvider></MemoryRouter></Q>);

const DAY = {
  enabled: true, date: '2026-11-26', complete: false, submitted: 1, expected: 2, rule: { presentPct: 75, halfPct: 40 },
  periods: [
    { periodId: 'p1', entryId: 'e1', period: 'Period 1', subject: 'Maths', teacher: 'Mr Sharma', covering: false, mine: true, state: 'submitted' },
    { periodId: 'p2', entryId: 'e2', period: 'Period 2', subject: 'English', teacher: 'Mrs Gupta', covering: false, mine: false, state: 'none' },
  ],
  students: [
    { studentId: 's1', name: 'Aarav Singh', rollNo: 1, cells: { p1: 'absent', p2: null }, day: null },
    { studentId: 's2', name: 'Bhavna Rao', rollNo: 2, cells: { p1: 'present', p2: null }, day: { status: 'present' } },
  ],
};

describe('Attendance period by period', () => {
  it('the day grid shows each student against each period, names the period still waiting, and never turns a missing mark into absent', async () => {
    mockApi({ '/api/school/period-attendance': DAY });
    mount(<DayGrid role="admin" sectionId="sec" date="2026-11-26" />);
    expect(await screen.findByText('1 of 2 periods submitted')).toBeInTheDocument();
    expect(screen.getByText(/Waiting: Period 2 \(Mrs Gupta\)/)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Aarav Singh, Period 1: Absent' })).toBeInTheDocument(); // the admin can open it to correct it
    expect(screen.getAllByRole('img', { name: /not marked yet/ })).toHaveLength(2);
    expect(screen.getByText('Not complete yet')).toBeInTheDocument(); // Aarav has no day yet
    expect(screen.getByText('Present', { selector: '.badge' })).toBeInTheDocument(); // Bhavna's day
  });

  it('the admin corrects one mark with a reason, and can ask the teacher of a waiting period', async () => {
    mockApi({ '/api/school/period-attendance': DAY });
    mount(<DayGrid role="admin" sectionId="sec" date="2026-11-26" />);
    await screen.findByText('1 of 2 periods submitted');
    fireEvent.click(screen.getByRole('button', { name: 'Ask Mrs Gupta to mark Period 2' }));
    await waitFor(() => expect(calls.some((c) => c.url.includes('/remind') && c.method === 'POST')).toBe(true));
    expect(calls.find((c) => c.url.includes('/remind')).body).toMatchObject({ sectionId: 'sec', periodId: 'p2', date: '2026-11-26' });
    fireEvent.click(screen.getByRole('button', { name: 'Aarav Singh, Period 1: Absent' }));
    const dlg = await screen.findByRole('dialog');
    const save = within(dlg).getByRole('button', { name: 'Save correction' });
    expect(save).toBeDisabled();
    fireEvent.change(within(dlg).getByRole('combobox'), { target: { value: 'present' } });
    fireEvent.change(within(dlg).getByLabelText(/Reason/), { target: { value: 'Was in the lab' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(calls.some((c) => c.url.includes('/correct') && c.method === 'PUT')).toBe(true));
    expect(calls.find((c) => c.url.includes('/correct')).body).toMatchObject({ studentId: 's1', periodId: 'p1', status: 'present', reason: 'Was in the lab' });
  });

  it('the class teacher marks only their own periods; a date taken once a day shows the daily register instead', async () => {
    mockApi({ '/api/teacher/class-periods': DAY });
    const { unmount } = mount(<DayGrid role="teacher" sectionId="sec" date="2026-11-26" />);
    await screen.findByText('1 of 2 periods submitted');
    expect(screen.getByRole('button', { name: 'Review' })).toBeInTheDocument(); // Period 1 is Mr Sharma's
    expect(screen.queryByRole('button', { name: 'Mark' })).toBeNull(); // Period 2 is someone else's
    unmount();
    mockApi({ '/api/teacher/class-periods': { enabled: false, periods: [], students: [], rule: DAY.rule } });
    mount(<DayGrid role="teacher" sectionId="sec" date="2026-11-01" fallback={<p>The daily register</p>} />);
    expect(await screen.findByText('The daily register')).toBeInTheDocument();
  });

  it('a teacher sees their lessons for the day; a period register starts unmarked, needs everyone before submitting, and shows who was away earlier', async () => {
    const reg = { entryId: 'e1', date: '2026-11-26', period: 'Period 3', subject: 'Maths', section: { id: 'sec', name: 'A', className: 'Class 8' }, covering: false, marked: false, status: null, submitted: false, blocked: null, canEdit: true,
      students: [{ studentId: 's1', name: 'Aarav Singh', rollNo: 1, status: null, earlier: [{ period: 'Period 1', status: 'absent' }] }, { studentId: 's2', name: 'Bhavna Rao', rollNo: 2, status: null, earlier: [] }] };
    mockApi({ '/api/teacher/period-attendance/register': reg, '/api/teacher/period-attendance': { enabled: true, date: '2026-11-26', periods: [{ entryId: 'e1', period: 'Period 3', startTime: '09:20', endTime: '10:00', className: 'Class 8', section: 'A', subject: 'Maths', covering: true, marked: false, submitted: false, status: null }] } });
    mount(<YourPeriods date="2026-11-26" />);
    expect(await screen.findByText(/Class 8 A · Maths/)).toBeInTheDocument();
    expect(screen.getByText('Covering')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Mark' }));
    expect(await screen.findByText('Absent in Period 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit this period' }));
    const review = await screen.findByText('Review before submitting');
    expect(review).toBeInTheDocument();
    expect(screen.getByText(/2 not marked/)).toBeInTheDocument(); // nothing was pre-filled
    expect(screen.getAllByRole('button', { name: 'Submit this period' }).find((b) => b.disabled)).toBeTruthy();
  });

  it('says plainly when the school takes attendance once a day, and announces a booked change', async () => {
    mockApi({ '/api/teacher/period-attendance': { enabled: false, date: '2026-11-26', periods: [] } });
    const { unmount } = mount(<YourPeriods date="2026-11-26" />);
    expect(await screen.findByText(/takes attendance once a day on this date/)).toBeInTheDocument();
    unmount();
    mount(<ModeNotice change={{ from: '2026-11-27', periodWise: true }} audience="teacher" />);
    expect(screen.getByRole('status')).toHaveTextContent(/period by period: you will mark each of your own periods/);
  });

  it('PeriodRegisterModal is exported for the pages that open it', () => { expect(typeof PeriodRegisterModal).toBe('function'); });
});
