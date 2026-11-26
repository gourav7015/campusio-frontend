import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffRegister from '../components/StaffRegister.jsx';
import RegisterEditor from '../components/Register.jsx';
import { ToastProvider } from '../components/ui.jsx';
import { Q } from './helpers/Q.jsx';

const row = (id, name, over = {}) => ({ personType: 'teacher', personId: id, name, code: `T${id}`, designation: 'Teacher', status: 'present', source: 'default', remark: '', ...over });
const REGISTER = (over = {}) => ({ group: 'teachers', date: '2026-10-05', session: null, blocked: null, canEdit: true, canCorrect: false, rows: [row('1', 'Mr Sharma'), row('2', 'Mrs Gupta', { status: 'leave', source: 'leave', remark: 'Approved sick leave' })], totals: {}, ...over });

let calls;
function mockApi(register) {
  calls = [];
  globalThis.fetch = vi.fn(async (url, init = {}) => {
    calls.push({ url: String(url), method: init.method || 'GET', body: init.body ? JSON.parse(init.body) : undefined });
    const body = String(url).includes('/register') ? register : { ok: true };
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body, text: async () => JSON.stringify(body) };
  });
}
const mount = (props) => render(<Q><ToastProvider><StaffRegister base="/api/school/staff-attendance" group="teachers" {...props} /></ToastProvider></Q>);

describe('StaffRegister', () => {
  beforeEach(() => { window.confirm = () => true; });

  it('starts everyone as present, fills approved leave in by itself, and counts the exceptions as you mark them', async () => {
    mockApi(REGISTER());
    mount();
    expect(await screen.findByText('Mr Sharma')).toBeInTheDocument();
    expect(screen.getByLabelText('Remark for Mrs Gupta')).toHaveValue('Approved sick leave');
    expect(screen.getByRole('group', { name: 'Status of Mrs Gupta' }).querySelector('button.on')).toHaveTextContent('Leave');
    const sharma = screen.getByRole('group', { name: 'Status of Mr Sharma' });
    fireEvent.click(sharma.querySelector('button.absent'));
    await waitFor(() => expect(screen.getByRole('button', { name: /^Absent 1$/ })).toBeInTheDocument());
    expect(screen.getByText(/of 2 here/)).toBeInTheDocument();
  });

  it('saves only the exceptions as a draft, and a submitted register offers corrections instead of editing', async () => {
    mockApi(REGISTER());
    const { unmount } = mount();
    await screen.findByText('Mr Sharma');
    expect(screen.getByRole('button', { name: 'Save draft' })).toBeDisabled(); // nothing changed yet
    fireEvent.click(screen.getByRole('group', { name: 'Status of Mr Sharma' }).querySelector('button.half_day'));
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT').body).toMatchObject({ group: 'teachers', submit: false, entries: [{ personId: '1', status: 'half_day' }] });
    unmount();
    mockApi(REGISTER({ session: { status: 'submitted' }, canEdit: false, canCorrect: true }));
    mount();
    await screen.findByText('Mr Sharma');
    expect(screen.queryByRole('button', { name: 'Submit register' })).toBeNull();
    expect(screen.getByLabelText('Correct Mr Sharma')).toBeInTheDocument();
  });

  it('is read-only for a viewer and explains why a holiday cannot be marked', async () => {
    mockApi(REGISTER({ blocked: 'holiday:Diwali', canEdit: false }));
    mount({ canEdit: false });
    expect(await screen.findByText(/This date is a holiday \(Diwali\)/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Submit register' })).toBeNull();
    expect(screen.queryByRole('group', { name: 'Status of Mr Sharma' })).toBeNull();
  });

  const MANY = () => REGISTER({ policy: { shiftStart: '08:00', shiftEnd: '15:00' }, rows: [
    row('1', 'Mr Sharma', { code: 'dpsr.t0012' }), row('2', 'Mrs Gupta', { code: 'dpsr.t0013', status: 'leave', source: 'leave', remark: 'Approved sick leave' }),
    row('3', 'Ms Rao', { code: 'dpsr.t0014', checkIn: '08:05' }), row('4', 'Mr Das', { code: 'dpsr.t0120', status: 'absent', source: 'register' }),
  ] });

  it('search finds people by name or by part of their id, counts them, and never loses an unsaved edit', async () => {
    mockApi(MANY());
    mount();
    await screen.findByText('Mr Sharma');
    expect(screen.getByText('Showing 4 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('group', { name: 'Status of Mr Sharma' }).querySelector('button.absent')); // an unsaved edit
    const box = screen.getByLabelText('Search staff by name or ID');
    fireEvent.change(box, { target: { value: '  0014 ' } }); // partial id, stray spaces
    expect(screen.getByText('Showing 1 of 4')).toBeInTheDocument();
    expect(screen.getByText('Ms Rao')).toBeInTheDocument(); expect(screen.queryByText('Mr Sharma')).toBeNull();
    fireEvent.change(box, { target: { value: 'GUPTA' } }); // name, any case
    expect(screen.getByText('Mrs Gupta')).toBeInTheDocument();
    fireEvent.change(box, { target: { value: 'nobody' } });
    expect(screen.getByText('No one matches')).toBeInTheDocument();
    fireEvent.change(box, { target: { value: '' } });
    expect(screen.getByText('Showing 4 of 4')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    expect(calls.find((c) => c.method === 'PUT').body.entries).toEqual([expect.objectContaining({ personId: '1', status: 'absent' })]); // the absence survived the filter
  });

  it('"Mark all present" and "Apply to all" fill the whole register but leave approved leave alone, and keep filled-in times', async () => {
    mockApi(MANY());
    mount();
    await screen.findByText('Mr Sharma');
    fireEvent.change(screen.getByLabelText('Search staff by name or ID'), { target: { value: 'rao' } }); // only one row is on screen
    fireEvent.click(screen.getByRole('button', { name: 'Mark all present' }));
    expect(screen.getByRole('status')).toHaveTextContent(/Marked 3 present, 1 on approved leave left as is \(everyone in the register, not only the 1 shown\)/);
    fireEvent.change(screen.getByLabelText('Search staff by name or ID'), { target: { value: '' } });
    expect(screen.getByRole('group', { name: 'Status of Mr Das' }).querySelector('button.on')).toHaveTextContent('Present'); // was absent
    expect(screen.getByRole('group', { name: 'Status of Mrs Gupta' }).querySelector('button.on')).toHaveTextContent('Leave');
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all' })); // 08:00 – 15:00, keeping existing times
    expect(screen.getByLabelText('Check-in of Mr Sharma')).toHaveValue('08:00'); expect(screen.getByLabelText('Check-out of Mr Sharma')).toHaveValue('15:00');
    expect(screen.getByLabelText('Check-in of Ms Rao')).toHaveValue('08:05'); // kept
    expect(screen.getByLabelText('Check-out of Ms Rao')).toHaveValue('15:00');
    expect(screen.getByLabelText('Check-in of Mrs Gupta')).toHaveValue(''); // on leave: untouched
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT')).toBe(true));
    const sent = calls.find((c) => c.method === 'PUT').body.entries;
    expect(sent).toHaveLength(3); expect(sent.find((e) => e.personId === '2')).toBeUndefined();
    expect(sent.find((e) => e.personId === '3')).toMatchObject({ status: 'present', checkIn: '08:05', checkOut: '15:00' });
  });

  it('can overwrite filled-in times when asked, refuses an Out earlier than In, and shows no bulk tools on a locked register', async () => {
    mockApi(MANY());
    const { unmount } = mount();
    await screen.findByText('Mr Sharma');
    fireEvent.click(screen.getByLabelText(/Keep times that are already filled in/));
    fireEvent.click(screen.getByRole('button', { name: 'Apply to all' }));
    expect(screen.getByLabelText('Check-in of Ms Rao')).toHaveValue('08:00');
    fireEvent.change(screen.getByLabelText('Time out for everyone'), { target: { value: '07:00' } });
    expect(screen.getByRole('button', { name: 'Apply to all' })).toBeDisabled();
    expect(screen.getByRole('alert')).toHaveTextContent(/Out cannot be earlier than In/);
    unmount();
    mockApi({ ...MANY(), session: { status: 'submitted' }, canEdit: false, canCorrect: true });
    mount();
    await screen.findByText('Mr Sharma');
    expect(screen.queryByRole('button', { name: 'Mark all present' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Apply to all' })).toBeNull();
  });

  it('Mark all absent and Mark all present both exist, and Undo takes the last change back', async () => {
    mockApi(MANY());
    mount();
    await screen.findByText('Mr Sharma');
    expect(screen.getByRole('button', { name: 'Undo the last change' })).toBeDisabled();
    fireEvent.click(screen.getByRole('button', { name: 'Mark all absent' }));
    expect(screen.getByRole('group', { name: 'Status of Mr Sharma' }).querySelector('button.on')).toHaveTextContent('Absent');
    fireEvent.click(screen.getByRole('button', { name: 'Undo the last change' }));
    expect(screen.getByRole('group', { name: 'Status of Mr Sharma' }).querySelector('button.on')).toHaveTextContent('Present');
    expect(screen.getByRole('group', { name: 'Status of Mr Das' }).querySelector('button.on')).toHaveTextContent('Absent'); // as it was before
  });

  it('Submit register shows a review first, and only the review submits', async () => {
    mockApi(MANY());
    mount();
    await screen.findByText('Mr Sharma');
    fireEvent.click(screen.getByRole('button', { name: 'Submit register' }));
    const dlg = await screen.findByRole('dialog');
    expect(dlg).toHaveTextContent(/Not here \(2\)/);
    expect(calls.some((c) => c.method === 'PUT')).toBe(false);
    fireEvent.click(screen.getByRole('dialog').querySelector('button.btn-primary, button[class*="primary"]') || screen.getAllByRole('button', { name: 'Submit register' }).pop());
    await waitFor(() => expect(calls.some((c) => c.method === 'PUT' && c.body.submit === true)).toBe(true));
  });
});

const STUDENTS = (rows) => ({ date: '2026-10-05', session: null, blocked: null, canEdit: true, canCorrect: false, isClassTeacher: true, students: rows });
const stu = (id, name, roll, status = null) => ({ studentId: id, name, rollNo: roll, status });

describe('Student register', () => {
  const mountStudents = (rows) => { mockApi(STUDENTS(rows)); return render(<Q><ToastProvider><RegisterEditor base="/api/teacher" sectionId="s1" date="2026-10-05" /></ToastProvider></Q>); };

  it('does not treat a student who is not marked as present, and will not submit until everyone is marked', async () => {
    mountStudents([stu('a', 'Aarav Mehta', 1, 'present'), stu('b', 'Bhavya Verma', 2), stu('c', 'Charvi Iyer', 3)]);
    await screen.findByText('Aarav Mehta');
    expect(screen.getByText(/2 students not marked yet/)).toBeInTheDocument();
    expect(screen.getByText('of 3 marked')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Submit attendance' }));
    const dlg = await screen.findByRole('dialog');
    expect(dlg).toHaveTextContent(/2 not marked/);
    const submit = Array.from(dlg.querySelectorAll('button')).find((b) => b.textContent === 'Submit attendance');
    expect(submit).toBeDisabled();
    fireEvent.click(Array.from(dlg.querySelectorAll('button')).find((b) => /Mark 2 as present/.test(b.textContent)));
    await waitFor(() => expect(Array.from(screen.getByRole('dialog').querySelectorAll('button')).find((b) => b.textContent === 'Submit attendance')).not.toBeDisabled());
  });

  it('has both bulk buttons and a status pill for phones on every row', async () => {
    mountStudents([stu('a', 'Aarav Mehta', 1, 'present'), stu('b', 'Bhavya Verma', 2, 'absent')]);
    await screen.findByText('Aarav Mehta');
    expect(screen.getByRole('button', { name: 'Mark all present' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Mark all absent' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /Bhavya Verma: Absent\. Change/ }));
    const sheet = await screen.findByRole('dialog');
    expect(sheet).toHaveTextContent('Bhavya Verma');
    fireEvent.click(Array.from(sheet.querySelectorAll('button')).find((b) => b.textContent === 'Late'));
    expect(screen.getByRole('button', { name: /Bhavya Verma: Late\. Change/, hidden: true })).toBeInTheDocument(); // behind the open sheet
  });
});
