import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { useState } from 'react';
import { ComponentsEditor, cleanComponents, componentsText } from '../components/Marks.jsx';
import Heatmap from '../components/Heatmap.jsx';

const login = vi.fn();
vi.mock('../auth/AuthContext.jsx', () => ({ useAuth: () => ({ user: null, login }) }));
const { default: PortalLogin, Landing, homeFor, loginFor, PORTALS } = await import('../pages/Login.jsx');

describe('one sign-in page per role', () => {
  it('the landing page shows a row per role and a separate link for the platform administrator', () => {
    render(<MemoryRouter><Landing /></MemoryRouter>);
    for (const t of ['Student and parent', 'Teacher', 'Staff', 'Finance', 'Library', 'Transport', 'School admin']) expect(screen.getByRole('link', { name: `Login as ${t}` })).toBeInTheDocument();
    expect(screen.getAllByRole('link', { name: /^Login as/ }).map((a) => a.getAttribute('href')).sort()).toEqual(['/admin/login', '/finance/login', '/library/login', '/staff/login', '/student/login', '/teacher/login', '/transport/login']);
    expect(screen.getByRole('link', { name: 'Platform administrator' })).toHaveAttribute('href', '/platform/login');
    expect(screen.queryByRole('link', { name: /Login as Platform/ })).toBeNull(); // not advertised as a row
  });
  it('the sign-in form is one the browser can remember: named fields, the right autocomplete hints, a real form', () => {
    render(<MemoryRouter initialEntries={['/admin/login']}><Routes><Route path="/admin/login" element={<PortalLogin portal="admin" />} /></Routes></MemoryRouter>);
    const id = screen.getByLabelText('Login ID'); const pw = screen.getByLabelText('Password');
    expect(id).toHaveAttribute('name', 'username'); expect(id).toHaveAttribute('autocomplete', 'username');
    expect(pw).toHaveAttribute('name', 'password'); expect(pw).toHaveAttribute('autocomplete', 'current-password');
    expect(pw.closest('form')).toBe(id.closest('form')); // both fields sit in the same form, which is what lets the browser offer to save them
    expect(pw.closest('form')).toHaveAttribute('method', 'post');
  });
  it('maps every role to its own home and login URL', () => {
    expect(Object.keys(PORTALS).sort()).toEqual(['admin', 'finance', 'library', 'platform', 'staff', 'student', 'teacher', 'transport']);
    expect(homeFor('school_admin')).toBe('/admin'); expect(loginFor('super_admin')).toBe('/platform/login'); expect(loginFor('finance')).toBe('/finance/login'); expect(loginFor('transport')).toBe('/transport/login'); expect(loginFor('staff')).toBe('/staff/login'); expect(homeFor('unknown')).toBe('/');
  });
  it('a portal login sends the portal with the credentials and shows the server error', async () => {
    login.mockRejectedValueOnce(new Error('Invalid login id or password'));
    render(<MemoryRouter initialEntries={['/teacher/login']}><Routes><Route path="/teacher/login" element={<PortalLogin portal="teacher" />} /></Routes></MemoryRouter>);
    expect(screen.getByRole('heading', { name: 'Sign in to Teacher' })).toBeInTheDocument();
    expect(screen.getByRole('form', { name: 'Teacher sign in' })).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Login ID'), { target: { value: 'sharma@gps.test' } });
    fireEvent.change(screen.getByLabelText('Password'), { target: { value: 'secret' } });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    await waitFor(() => expect(login).toHaveBeenCalledWith('sharma@gps.test', 'secret', 'teacher', false));
    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid login id or password');
    expect(screen.getByRole('alert')).toHaveTextContent('sign-in page for your role'); // a hint, shown for every failed sign-in, so nothing about the account is revealed
  });
});

describe('marks fields editor (no hard-coded theory/practical)', () => {
  function Harness({ initial = [{ label: 'Marks', max: 100 }], locked }) {
    const [v, setV] = useState(initial);
    return <><ComponentsEditor value={v} onChange={setV} locked={locked} /><output data-testid="out">{JSON.stringify(cleanComponents(v))}</output></>;
  }
  it('adds, edits and removes fields and keeps a running total', () => {
    render(<Harness />);
    expect(screen.getByText(/Total maximum:/).textContent).toContain('100');
    fireEvent.click(screen.getByRole('button', { name: '+ Add field' }));
    fireEvent.change(screen.getByLabelText('Field 2 name'), { target: { value: ' Oral ' } });
    fireEvent.change(screen.getByLabelText('Field 2 maximum'), { target: { value: '10' } });
    expect(screen.getByText(/Total maximum:/).textContent).toContain('110');
    expect(JSON.parse(screen.getByTestId('out').textContent)).toEqual([{ label: 'Marks', max: 100 }, { label: 'Oral', max: 10 }]);
    fireEvent.click(screen.getByRole('button', { name: 'Remove field 1' }));
    expect(screen.queryByLabelText('Field 2 name')).toBeNull();
    expect(screen.getByRole('button', { name: 'Remove field 1' })).toBeDisabled(); // can't remove the last one
  });
  it('quick-start presets split the current total', () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole('button', { name: 'Written + Oral' }));
    expect(JSON.parse(screen.getByTestId('out').textContent)).toEqual([{ label: 'Written', max: 80 }, { label: 'Oral', max: 20 }]);
  });
  it('is read-only when locked (marks entry has started)', () => {
    render(<Harness locked initial={[{ label: 'Written', max: 40 }]} />);
    expect(screen.getByLabelText('Field 1 name')).toBeDisabled();
    expect(screen.queryByRole('button', { name: '+ Add field' })).toBeNull();
    expect(componentsText([{ label: 'Written', max: 40 }, { label: 'Oral', max: 10 }])).toBe('Written 40 + Oral 10');
  });
});

describe('attendance heat map', () => {
  const days = [
    { date: '2026-11-02', status: 'present', working: true }, { date: '2026-11-03', status: 'absent', working: true }, { date: '2026-11-04', status: 'late', working: true },
    { date: '2026-11-05', status: 'leave', working: true }, { date: '2026-11-06', status: null, working: true }, { date: '2026-11-08', status: null, working: false },
  ];
  it('draws one square per day, coloured by status; unmarked days are never shown as absent', () => {
    const { container } = render(<Heatmap days={days} />);
    expect(screen.getByRole('img', { name: /Attendance heat map/ })).toBeInTheDocument();
    const status = (d) => container.querySelector(`[title^="${d}"]`)?.getAttribute('data-status');
    expect(container.querySelectorAll('[data-status]')).toHaveLength(6);
    expect(['present', 'absent', 'late', 'leave', 'unmarked', 'off']).toEqual([status('2 Nov'), status('3 Nov'), status('4 Nov'), status('5 Nov'), status('6 Nov'), status('8 Nov')]);
    expect(container.querySelector('[data-status="unmarked"]').getAttribute('title')).toMatch(/Not recorded/);
  });
  it('shows an honest empty state when nothing has been recorded', () => {
    render(<Heatmap days={[]} />);
    expect(screen.getByText(/No attendance has been recorded yet/)).toBeInTheDocument();
  });
});
