import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { SkeletonScene } from '../design/ui';
import { Async } from '../components/ui.jsx';

afterEach(() => { vi.useRealTimers(); });

describe('loading skeletons', () => {
  it.each(['dashboard', 'table', 'list', 'cards', 'profile', 'form', 'roster', 'boot', 'stats', 'datatable', 'chart', 'calendar', 'facts', 'report', 'document'])('%s: announced once as "Loading", with every shape hidden from a screen reader', (kind) => {
    const { container } = render(<SkeletonScene kind={kind} />);
    expect(screen.getAllByRole('status')).toHaveLength(1);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    const shapes = container.querySelectorAll('.sk');
    expect(shapes.length).toBeGreaterThanOrEqual(3);
    shapes.forEach((s) => expect(s.getAttribute('aria-hidden')).toBe('true'));
    expect(container.textContent).toBe(''); // shapes only: no made-up words or numbers
  });

  it('Async shows the skeleton while loading with nothing yet, the content once it arrives, and keeps old content while refreshing', () => {
    const { rerender } = render(<Async state={{ loading: true, data: null }}>{() => <p>Done</p>}</Async>);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    rerender(<Async state={{ loading: false, data: [1] }}>{() => <p>Done</p>}</Async>);
    expect(screen.getByText('Done')).toBeInTheDocument();
    rerender(<Async state={{ loading: true, data: [1] }}>{() => <p>Done</p>}</Async>);
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('Async does not show the old answer as if it were the new one (another date, class or tab); `keep` opts out for a screen whose own controls sit inside', () => {
    const old = { loading: true, data: [1], stale: true };
    const { rerender } = render(<Async state={old}>{() => <p>Old answer</p>}</Async>);
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    expect(screen.queryByText('Old answer')).not.toBeInTheDocument();
    rerender(<Async keep state={old}>{() => <p>Old answer</p>}</Async>);
    expect(screen.getByText('Old answer')).toBeInTheDocument();
  });

  it('a skeleton that has been on screen only briefly stays up a little longer, so a quick answer never flashes; one nobody saw leaves at once', () => {
    vi.useFakeTimers();
    const { rerender } = render(<Async state={{ loading: true, data: null }}>{() => <p>Done</p>}</Async>);
    act(() => { vi.advanceTimersByTime(300); }); // it has appeared (0.2 s) ...
    rerender(<Async state={{ loading: false, data: [1] }}>{() => <p>Done</p>}</Async>); // ... and the answer arrives just after
    expect(screen.getByRole('status', { name: 'Loading' })).toBeInTheDocument();
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.getByText('Done')).toBeInTheDocument();
    vi.useRealTimers();
  });
});
