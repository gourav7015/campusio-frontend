import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import StaffManager from '../components/StaffManager.jsx';
import { ToastProvider } from '../components/ui.jsx';
import { Q } from './helpers/Q.jsx';

const DESIGNATIONS = [
  { _id: 'd1', name: 'Driver', group: 'transport', busRole: 'driver', status: 'active', staff: 1 },
  { _id: 'd2', name: 'Sweeper', group: 'general', busRole: null, status: 'active', staff: 1 },
];
const STAFF = { total: 2, items: [
  { _id: 's1', staffId: 'S0001', name: 'Ramesh Bhai', phone: '98765', designation: 'Driver', group: 'transport', busRole: 'driver', licenseNo: 'GJ01', licenseExpiry: '2099-01-01', status: 'active', bus: { busNo: 'B-1', as: 'driver' } },
  { _id: 's2', staffId: 'S0002', name: 'Kamla Devi', designation: 'Sweeper', group: 'general', status: 'active', bus: null },
] };

beforeEach(() => {
  globalThis.fetch = vi.fn(async (url) => {
    const body = String(url).includes('designations') ? DESIGNATIONS : STAFF;
    return { ok: true, status: 200, headers: { get: () => 'application/json' }, json: async () => body, text: async () => JSON.stringify(body) };
  });
});
const mount = (props) => render(<MemoryRouter><Q><ToastProvider><StaffManager staffBase="/api/school/support-staff" designationBase="/api/school/designations" {...props} /></ToastProvider></Q></MemoryRouter>);

describe('StaffManager', () => {
  it('lists non-teaching staff with their designation, bus and licence', async () => {
    mount({});
    expect(await screen.findByText('Ramesh Bhai')).toBeInTheDocument();
    expect(screen.getByText('Kamla Devi')).toBeInTheDocument();
    expect(screen.getByText('B-1 · driver')).toBeInTheDocument();
    expect(screen.getByText(/valid to/)).toBeInTheDocument();
  });

  it('the editing buttons exist for the people who manage staff and not for a read-only viewer', async () => {
    const { unmount } = mount({ canEdit: true });
    await screen.findByText('Ramesh Bhai');
    expect(screen.getByRole('button', { name: '+ Add staff member' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Designations' })).toBeInTheDocument();
    unmount();
    mount({ canEdit: false });
    await screen.findByText('Ramesh Bhai');
    expect(screen.queryByRole('button', { name: '+ Add staff member' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Edit' })).toBeNull();
  });

  it('the licence fields appear only for a designation that can drive', async () => {
    mount({});
    await screen.findByText('Ramesh Bhai');
    fireEvent.click(screen.getByRole('button', { name: '+ Add staff member' }));
    const modal = await screen.findByRole('dialog');
    expect(modal.textContent).not.toMatch(/Driving licence number/);
    fireEvent.change(modal.querySelector('select'), { target: { value: 'd1' } });
    await waitFor(() => expect(modal.textContent).toMatch(/Driving licence number/));
  });
});
