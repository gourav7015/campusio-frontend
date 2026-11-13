import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import StaffRegister from '../components/StaffRegister.jsx';
import { ToastProvider } from '../components/ui.jsx';

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
const mount = (props) => render(<ToastProvider><StaffRegister base="/api/school/staff-attendance" group="teachers" {...props} /></ToastProvider>);

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
    await waitFor(() => expect(screen.getByText(/1 absent · 0 half day/)).toBeInTheDocument());
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
});
