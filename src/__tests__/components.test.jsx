import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { DataTable, Field, Input, Async, Empty, ToastProvider, useAction, Button } from '../components/ui.jsx';
import { DayList } from '../components/Timetable.jsx';
import FormModal from '../components/FormModal.jsx';
import { MonthCalendar } from '../pages/student/Student1.jsx';

describe('DataTable', () => {
  it('shows an empty state instead of an empty table, and supports function row keys', () => {
    const { rerender } = render(<DataTable columns={[{ label: 'A', key: 'a' }]} rows={[]} empty="Nothing here" />);
    expect(screen.getByText('Nothing here')).toBeInTheDocument();
    expect(screen.queryByRole('table')).toBeNull();
    rerender(<DataTable columns={[{ label: 'A', key: 'a' }]} rows={[{ a: 1, id: 'x' }, { a: 2, id: 'x' }]} rowKey={(r) => `${r.id}-${r.a}`} />);
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });
  it('calls onRowClick', () => {
    const fn = vi.fn();
    render(<DataTable columns={[{ label: 'A', key: 'a' }]} rows={[{ _id: '1', a: 'row-one' }]} onRowClick={fn} />);
    fireEvent.click(screen.getByText('row-one'));
    expect(fn).toHaveBeenCalledWith({ _id: '1', a: 'row-one' });
  });
});

describe('Field', () => {
  it('keeps the hint out of the accessible label', () => {
    render(<Field label="New status" hint="The original status, the new status and your name are kept."><Input /></Field>);
    expect(screen.getByLabelText('New status')).toBeInTheDocument();
    expect(screen.getByText(/are kept/)).toBeInTheDocument();
  });
});

describe('Async', () => {
  it('renders loading, error, empty and data states', () => {
    const { rerender } = render(<Async state={{ loading: true, data: null }}>{() => 'data'}</Async>);
    expect(screen.getByRole('status')).toBeInTheDocument();
    rerender(<Async state={{ loading: false, data: null, error: new Error('Boom') }}>{() => 'data'}</Async>);
    expect(screen.getByRole('alert')).toHaveTextContent('Boom');
    rerender(<Async state={{ loading: false, data: [], error: null }} empty={<Empty title="No rows" />}>{() => 'data'}</Async>);
    expect(screen.getByText('No rows')).toBeInTheDocument();
    rerender(<Async state={{ loading: false, data: [1], error: null }}>{(d) => `has ${d.length}`}</Async>);
    expect(screen.getByText('has 1')).toBeInTheDocument();
  });
});

describe('DayList (timetable)', () => {
  it('shows "No scheduled classes" rather than an empty list', () => {
    render(<DayList rows={[]} />);
    expect(screen.getByText('No scheduled classes')).toBeInTheDocument();
    render(<DayList rows={[{ isBreak: true, period: 'Break', startTime: '10:00', endTime: '10:20', periodOrder: 4 }]} />);
    expect(screen.getAllByText('No scheduled classes').length).toBe(2); // a break alone is not a lesson
  });
  it('marks substitutes, free periods, breaks and the current period', () => {
    render(<DayList showTeacher rows={[
      { period: 'Period 1', periodOrder: 1, startTime: '08:00', endTime: '08:40', subject: 'Maths', teacher: 'Mrs Gupta', originalTeacher: 'Mr Sharma', substitute: true, status: 'current', room: '101' },
      { period: 'Period 2', periodOrder: 2, startTime: '08:40', endTime: '09:20', free: true },
      { period: 'Break', periodOrder: 3, startTime: '09:20', endTime: '09:40', isBreak: true },
    ]} />);
    expect(screen.getByText(/Substitute · was Mr Sharma/)).toBeInTheDocument();
    expect(screen.getByText('Now')).toBeInTheDocument();
    expect(screen.getByText(/Free period/)).toBeInTheDocument();
    expect(screen.getByText(/Break/)).toBeInTheDocument();
  });
});

describe('FormModal', () => {
  beforeEach(() => { vi.restoreAllMocks(); });
  it('disables save until required fields are filled, coerces numbers and drops empty optionals', async () => {
    const onSubmit = vi.fn().mockResolvedValue(true);
    const onClose = vi.fn();
    render(<ToastProvider><FormModal title="New class" onClose={onClose} onSubmit={onSubmit} fields={[{ name: 'name', label: 'Name', required: true }, { name: 'level', label: 'Level', type: 'number' }, { name: 'note', label: 'Note' }]} /></ToastProvider>);
    const save = screen.getByRole('button', { name: 'Save' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Name'), { target: { value: 'Class 8' } });
    fireEvent.change(screen.getByLabelText('Level'), { target: { value: '8' } });
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await waitFor(() => expect(onSubmit).toHaveBeenCalledWith({ name: 'Class 8', level: 8 }));
    await waitFor(() => expect(onClose).toHaveBeenCalled());
  });
  it('keeps the modal open and shows the server error when saving fails', async () => {
    const onClose = vi.fn();
    render(<ToastProvider><FormModal title="X" onClose={onClose} onSubmit={() => Promise.reject(new Error('Section is full'))} fields={[{ name: 'name', label: 'Name' }]} /></ToastProvider>);
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(await screen.findByText('Section is full')).toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
  it('closes on Escape', () => {
    const onClose = vi.fn();
    render(<ToastProvider><FormModal title="X" onClose={onClose} onSubmit={vi.fn()} fields={[]} /></ToastProvider>);
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('useAction', () => {
  it('reports success and failure via toasts and never throws', async () => {
    function Probe() {
      const [run, busy] = useAction();
      return <><Button onClick={() => run(async () => 'ok', 'Saved!')}>good</Button><Button onClick={() => run(async () => { throw new Error('Nope'); })}>bad</Button><span>{busy ? 'busy' : 'idle'}</span></>;
    }
    render(<ToastProvider><Probe /></ToastProvider>);
    fireEvent.click(screen.getByText('good'));
    expect(await screen.findByText('Saved!')).toBeInTheDocument();
    fireEvent.click(screen.getByText('bad'));
    expect(await screen.findByText('Nope')).toBeInTheDocument();
  });
});

describe('attendance calendar', () => {
  it('colours days by status and never treats an unmarked day as absent', () => {
    const days = [
      { date: '2026-11-02', day: 1, status: 'present', working: true }, { date: '2026-11-03', day: 2, status: 'absent', working: true },
      { date: '2026-11-04', day: 3, status: null, working: true }, { date: '2026-11-08', day: 7, status: null, working: false },
    ];
    const { container } = render(<MemoryRouter><MonthCalendar cal={{ month: '2026-11', days }} /></MemoryRouter>);
    const cell = (n) => [...container.querySelectorAll('.d')].find((e) => e.textContent === String(n));
    expect(cell(2)).toHaveClass('present');
    expect(cell(3)).toHaveClass('absent');
    expect(cell(4).className).not.toMatch(/absent|present|late/);
    expect(cell(8)).toHaveClass('off');
  });
});

describe('DataTable keys', () => {
  it('never warns when rows share a key value (e.g. the same exam name for every class)', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    render(<DataTable columns={[{ label: 'Exam', key: 'exam' }]} rows={[{ exam: 'Unit Test 1' }, { exam: 'Unit Test 1' }, { exam: 'Unit Test 1' }]} rowKey="exam" />);
    expect(screen.getAllByText('Unit Test 1')).toHaveLength(3);
    expect(err.mock.calls.flat().join(' ')).not.toMatch(/same key/);
    err.mockRestore();
  });
});
